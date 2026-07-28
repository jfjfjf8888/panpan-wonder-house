import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const games = await prisma.game.findMany({
    where: { status: { in: ["PUBLISHED", "UNPUBLISHED"] } },
    select: {
      id: true,
      title: true,
      slug: true,
      heatScore: true,
      status: true,
      dailyStats: {
        orderBy: { date: "desc" },
        take: 30,
      },
    },
    orderBy: { heatScore: "desc" },
  });

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const starts = await prisma.analyticsEvent.groupBy({
    by: ["gameId"],
    where: {
      eventType: "GAME_START",
      createdAt: { gte: since },
      gameId: { not: null },
    },
    _count: { _all: true },
  });

  return NextResponse.json({ games, starts7d: starts });
}
