import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { writeAuditLog } from "@/lib/audit/log";
import { deleteGame } from "@/lib/games/service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      versions: { orderBy: { createdAt: "desc" } },
      tagRelations: { include: { tag: true } },
      currentVersion: true,
    },
  });
  if (!game) return NextResponse.json({ error: "未找到" }, { status: 404 });
  return NextResponse.json({ game });
}

const patchSchema = z.object({
  title: z.string().min(2).max(30).optional(),
  shortDescription: z.string().max(60).optional(),
  description: z.string().max(500).optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  coverUrl: z.string().url().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  try {
    const body = patchSchema.parse(await request.json());
    const game = await prisma.game.update({ where: { id }, data: body });
    await writeAuditLog({
      adminId: auth.session.adminId,
      action: "game.update",
      targetType: "game",
      targetId: id,
      detail: body,
    });
    return NextResponse.json({ game });
  } catch {
    return NextResponse.json({ error: "更新失败" }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;

  try {
    await deleteGame(id, auth.session.adminId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "删除失败";
    const status = message === "游戏不存在" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
