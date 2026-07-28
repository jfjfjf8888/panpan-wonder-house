import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdminApi } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { getObjectBuffer, publicObjectUrl, putObject, uploadsBucket } from "@/lib/storage/s3";
import {
  normalizeGameZipBuffer,
  validateGamePackage,
  sha256Buffer,
} from "@/lib/validation/game-package";
import AdmZip from "adm-zip";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const job = await prisma.uploadJob.findUnique({ where: { id } });
  if (!job || !job.storageKey) {
    return NextResponse.json({ error: "上传任务不存在" }, { status: 404 });
  }

  await prisma.uploadJob.update({
    where: { id },
    data: { status: "VALIDATING" },
  });

  try {
    let options: {
      mode?: "create" | "update";
      existingGameId?: string;
      existingSlug?: string;
      currentVersion?: string;
    } = { mode: job.mode === "update" ? "update" : "create" };

    if (job.targetGameId) {
      const game = await prisma.game.findUnique({
        where: { id: job.targetGameId },
        include: { currentVersion: true },
      });
      if (game) {
        options = {
          mode: "update",
          existingGameId: (game.currentVersion?.manifestJson as { id?: string })?.id || game.slug,
          existingSlug: game.slug,
          currentVersion: game.currentVersion?.version,
        };
      }
    }

    const rawBuffer = await getObjectBuffer(uploadsBucket(), job.storageKey);
    const buffer = normalizeGameZipBuffer(rawBuffer).buffer;
    const report = validateGamePackage(buffer, options);

    // Same slug already in DB: keep validation pass, but warn and reuse that game on save.
    if (report.passed && report.manifest && job.mode !== "update") {
      const existing = await prisma.game.findFirst({
        where: {
          OR: [{ slug: report.manifest.slug }, { slug: report.manifest.id }],
        },
        include: { currentVersion: true },
      });
      if (existing) {
        report.issues.push({
          code: "GAME_EXISTS_WILL_UPDATE",
          level: "WARNING",
          message:
            "同名游戏已存在，保存/发布时会覆盖同版本或追加更高版本，不会新建第二条游戏。",
          current: `${existing.slug} · 当前 v${existing.currentVersion?.version || "?"}`,
          suggestion: "若要更新请在游戏管理页点「更新游戏包」；若版本号相同会覆盖该版本。",
        });
        report.warningCount += 1;
        // Remember target so save upserts the existing row.
        await prisma.uploadJob.update({
          where: { id },
          data: { targetGameId: existing.id },
        });
        job.targetGameId = existing.id;
      }
    }

    // Include overwrite warning counts from validator.
    report.warningCount = report.issues.filter((i) => i.level === "WARNING").length;
    report.infoCount = report.issues.filter((i) => i.level === "INFO").length;
    report.errorCount = report.issues.filter((i) => i.level === "ERROR").length;
    report.passed = report.errorCount === 0;

    let previewUrl: string | null = null;
    if (report.passed && report.manifest) {
      const zip = new AdmZip(buffer);
      const prefix = `preview/${id}`;
      for (const entry of zip.getEntries().filter((e) => !e.isDirectory)) {
        const name = entry.entryName.replace(/\\/g, "/");
        if (name.includes("..") || !name) continue;
        await putObject({
          bucket: uploadsBucket(),
          key: `${prefix}/${name}`,
          body: entry.getData(),
          contentType: name.endsWith(".html")
            ? "text/html; charset=utf-8"
            : undefined,
        });
      }
      previewUrl = publicObjectUrl(
        uploadsBucket(),
        `${prefix}/${report.manifest.entry || "index.html"}`,
      );
    }

    const updated = await prisma.uploadJob.update({
      where: { id },
      data: {
        status: report.passed ? "PREVIEW_READY" : "INVALID",
        validationReportJson: {
          ...report,
          previewUrl,
        } as unknown as Prisma.InputJsonValue,
        packageSha256: sha256Buffer(buffer),
        compressedSize: buffer.byteLength,
      },
    });

    return NextResponse.json({ job: updated, report: { ...report, previewUrl } });
  } catch (e) {
    await prisma.uploadJob.update({
      where: { id },
      data: { status: "FAILED" },
    });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "校验失败" },
      { status: 400 },
    );
  }
}
