import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/session";
import { publishGame } from "@/lib/games/service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  try {
    const game = await publishGame(id, auth.session.adminId);
    return NextResponse.json({ game });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "发布失败" },
      { status: 400 },
    );
  }
}
