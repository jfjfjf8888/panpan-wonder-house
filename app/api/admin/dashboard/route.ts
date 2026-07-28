import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    todayEvents,
    todayVisitors,
    todayStarts,
    weekStarts,
    publishedCount,
    errorCount,
    recentUploads,
    recentErrors,
    hotGames,
  ] = await Promise.all([
    prisma.analyticsEvent.count({
      where: { createdAt: { gte: startOfDay }, eventType: "PAGE_VIEW" },
    }),
    prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: startOfDay }, eventType: "PAGE_VIEW" },
      distinct: ["visitorIdHash"],
      select: { visitorIdHash: true },
    }),
    prisma.analyticsEvent.count({
      where: { createdAt: { gte: startOfDay }, eventType: "GAME_START" },
    }),
    prisma.analyticsEvent.count({
      where: { createdAt: { gte: sevenDaysAgo }, eventType: "GAME_START" },
    }),
    prisma.game.count({ where: { status: "PUBLISHED" } }),
    prisma.analyticsEvent.count({
      where: { createdAt: { gte: startOfDay }, eventType: "GAME_ERROR" },
    }),
    prisma.uploadJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { admin: { select: { username: true } } },
    }),
    prisma.analyticsEvent.findMany({
      where: { eventType: "GAME_ERROR" },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.game.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { heatScore: "desc" },
      take: 8,
      select: { id: true, title: true, slug: true, heatScore: true },
    }),
  ]);

  const ends = await prisma.analyticsEvent.findMany({
    where: { createdAt: { gte: sevenDaysAgo }, eventType: "GAME_END" },
    select: { propertiesJson: true },
  });
  const durations = ends
    .map((e) => {
      const p = e.propertiesJson as { durationSeconds?: number } | null;
      return p?.durationSeconds ?? 0;
    })
    .filter((n) => n > 0);
  const averageDuration =
    durations.length === 0
      ? 0
      : durations.reduce((a, b) => a + b, 0) / durations.length;

  const completed = ends.filter((e) => {
    const p = e.propertiesJson as { result?: string } | null;
    return p?.result === "completed";
  }).length;
  const completionRate = ends.length ? completed / ends.length : 0;

  const trend = await prisma.analyticsEvent.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
      eventType: { in: ["PAGE_VIEW", "GAME_START"] },
    },
    select: { eventType: true, createdAt: true },
  });

  return NextResponse.json({
    metrics: {
      todayPv: todayEvents,
      todayUv: todayVisitors.length,
      todayGameStarts: todayStarts,
      weekGameStarts: weekStarts,
      averageDuration: Math.round(averageDuration),
      completionRate: Math.round(completionRate * 1000) / 10,
      publishedGames: publishedCount,
      errorCount,
    },
    hotGames,
    recentUploads,
    recentErrors,
    trend,
  });
}
