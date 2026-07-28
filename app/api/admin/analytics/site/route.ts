import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const days = Number(request.nextUrl.searchParams.get("days") || "30");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const events = await prisma.analyticsEvent.findMany({
    where: { createdAt: { gte: since } },
    select: {
      eventType: true,
      deviceType: true,
      browser: true,
      os: true,
      referrer: true,
      createdAt: true,
      visitorIdHash: true,
    },
  });

  const daily = new Map<string, { pv: number; starts: number; visitors: Set<string> }>();
  const devices: Record<string, number> = {};
  const browsers: Record<string, number> = {};
  const oses: Record<string, number> = {};

  for (const e of events) {
    const day = e.createdAt.toISOString().slice(0, 10);
    if (!daily.has(day)) {
      daily.set(day, { pv: 0, starts: 0, visitors: new Set() });
    }
    const row = daily.get(day)!;
    if (e.eventType === "PAGE_VIEW") {
      row.pv += 1;
      row.visitors.add(e.visitorIdHash);
    }
    if (e.eventType === "GAME_START") row.starts += 1;
    if (e.deviceType) devices[e.deviceType] = (devices[e.deviceType] || 0) + 1;
    if (e.browser) browsers[e.browser] = (browsers[e.browser] || 0) + 1;
    if (e.os) oses[e.os] = (oses[e.os] || 0) + 1;
  }

  return NextResponse.json({
    daily: [...daily.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({
        date,
        pageViews: v.pv,
        uniqueVisitors: v.visitors.size,
        gameStarts: v.starts,
      })),
    devices,
    browsers,
    oses,
  });
}
