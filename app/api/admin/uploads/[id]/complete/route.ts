import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { getObjectBuffer, uploadsBucket } from "@/lib/storage/s3";
import { sha256Buffer } from "@/lib/validation/game-package";

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

  try {
    const buffer = await getObjectBuffer(uploadsBucket(), job.storageKey);
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
  } catch {
    await prisma.uploadJob.update({
      where: { id },
      data: { status: "FAILED" },
    });
    return NextResponse.json({ error: "读取上传文件失败" }, { status: 400 });
  }
}
