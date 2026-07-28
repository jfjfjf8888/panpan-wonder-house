import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const errors = await prisma.analyticsEvent.findMany({
    where: { eventType: "GAME_ERROR" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { game: { select: { title: true, slug: true } } },
  });

  return NextResponse.json({ errors });
}
