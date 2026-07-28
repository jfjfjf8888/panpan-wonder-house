import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { env } from "@/lib/env";
import {
  ensureBuckets,
  getPresignedPutUrl,
  uploadsBucket,
} from "@/lib/storage/s3";

const schema = z.object({
  filename: z.string().min(1).max(200),
  size: z.number().int().positive().max(100 * 1024 * 1024),
  mode: z.enum(["create", "update"]).default("create"),
  targetGameId: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  try {
    const body = schema.parse(await request.json());
    if (!body.filename.toLowerCase().endsWith(".zip")) {
      return NextResponse.json({ error: "仅支持 ZIP 文件" }, { status: 400 });
    }

    await ensureBuckets();
    const job = await prisma.uploadJob.create({
      data: {
        adminId: auth.session.adminId,
        originalFilename: body.filename,
        status: "CREATED",
        mode: body.mode,
        targetGameId: body.targetGameId ?? null,
        expiresAt: new Date(
          Date.now() + env.UPLOAD_TEMP_RETENTION_HOURS * 60 * 60 * 1000,
        ),
      },
    });

    const storageKey = `uploads/${job.id}/${body.filename}`;
    const uploadUrl = await getPresignedPutUrl({
      bucket: uploadsBucket(),
      key: storageKey,
      contentType: "application/zip",
    });

    await prisma.uploadJob.update({
      where: { id: job.id },
      data: { storageKey, status: "UPLOADING" },
    });

    return NextResponse.json({
      uploadId: job.id,
      uploadUrl,
      storageKey,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "创建上传失败" },
      { status: 400 },
    );
  }
}
