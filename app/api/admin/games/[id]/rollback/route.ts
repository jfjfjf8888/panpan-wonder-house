import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth/session";
import { rollbackGame } from "@/lib/games/service";

const schema = z.object({ versionId: z.string().min(1) });

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  try {
    const body = schema.parse(await request.json());
    const game = await rollbackGame(id, body.versionId, auth.session.adminId);
    return NextResponse.json({ game });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "回滚失败" },
      { status: 400 },
    );
  }
}
