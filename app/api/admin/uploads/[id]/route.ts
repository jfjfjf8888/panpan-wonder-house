import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { getObjectBuffer, uploadsBucket } from "@/lib/storage/s3";
import { saveValidatedGame } from "@/lib/games/service";
import type { ValidationReport } from "@/packages/shared-types";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const job = await prisma.uploadJob.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({ job });
}

const saveSchema = z.object({
  publish: z.boolean().default(false),
  featured: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const job = await prisma.uploadJob.findUnique({ where: { id } });
  if (!job || !job.storageKey || !job.validationReportJson) {
    return NextResponse.json({ error: "上传任务未就绪" }, { status: 400 });
  }

  try {
    const body = saveSchema.parse(await request.json().catch(() => ({})));
    const report = job.validationReportJson as unknown as ValidationReport;
    if (!report.passed) {
      return NextResponse.json({ error: "校验未通过，不能保存" }, { status: 400 });
    }

    const buffer = await getObjectBuffer(uploadsBucket(), job.storageKey);
    const result = await saveValidatedGame({
      adminId: auth.session.adminId,
      buffer,
      report,
      publish: body.publish,
      targetGameId: job.targetGameId,
      featured: body.featured,
    });

    await prisma.uploadJob.update({
      where: { id },
      data: { status: "SAVED" },
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "保存失败" },
      { status: 400 },
    );
  }
}
