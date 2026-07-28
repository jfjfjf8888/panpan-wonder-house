import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";

export async function writeAuditLog(params: {
  adminId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  detail?: Prisma.InputJsonValue;
  ipHash?: string | null;
}) {
  return prisma.auditLog.create({
    data: {
      adminId: params.adminId ?? null,
      action: params.action,
      targetType: params.targetType ?? null,
      targetId: params.targetId ?? null,
      detailJson: params.detail ?? undefined,
      ipHash: params.ipHash ?? null,
    },
  });
}
