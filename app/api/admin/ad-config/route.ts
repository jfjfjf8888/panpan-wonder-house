import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/session";
import { getAdConfig, updateAdConfig } from "@/lib/ads/config";
import { writeAuditLog } from "@/lib/audit/log";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  const config = await getAdConfig();
  return NextResponse.json({ config });
}

const schema = z.object({
  globalEnabled: z.boolean().optional(),
  siteAdsEnabled: z.boolean().optional(),
  gameAdsEnabled: z.boolean().optional(),
  provider: z.string().nullable().optional(),
  configJson: z.record(z.unknown()).optional(),
});

export async function PUT(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  try {
    const body = schema.parse(await request.json());
    const config = await updateAdConfig({
      ...body,
      configJson: body.configJson as object | undefined,
    });
    await writeAuditLog({
      adminId: auth.session.adminId,
      action: "ad_config.update",
      targetType: "ad_config",
      targetId: config.id,
      detail: body as Prisma.InputJsonValue,
    });
    return NextResponse.json({ config });
  } catch {
    return NextResponse.json({ error: "更新失败" }, { status: 400 });
  }
}
