import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { putObject, uploadsBucket } from "@/lib/storage/s3";
import { sha256Buffer } from "@/lib/validation/game-package";

export const runtime = "nodejs";

export async function PUT(
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

  try {
    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength) {
      return NextResponse.json({ error: "空文件" }, { status: 400 });
    }
    if (bytes.byteLength > 100 * 1024 * 1024) {
      return NextResponse.json({ error: "文件超过 100MB" }, { status: 400 });
    }

    const buffer = Buffer.from(bytes);
    await putObject({
      bucket: uploadsBucket(),
      key: job.storageKey,
      body: buffer,
      contentType: "application/zip",
    });

    const updated = await prisma.uploadJob.update({
      where: { id },
      data: {
        status: "UPLOADED",
        progress: 100,
        compressedSize: buffer.byteLength,
        packageSha256: sha256Buffer(buffer),
      },
    });

    return NextResponse.json({ job: updated });
  } catch (e) {
    await prisma.uploadJob.update({
      where: { id },
      data: { status: "FAILED" },
    });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "上传失败" },
      { status: 400 },
    );
  }
}
