import { NextRequest, NextResponse } from "next/server";
import { listPublishedGames } from "@/lib/games/service";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || undefined;
  const tag = request.nextUrl.searchParams.get("tag") || undefined;
  const games = await listPublishedGames({ q, tag });

  return NextResponse.json({
    games: games.map((g) => ({
      id: g.id,
      slug: g.slug,
      title: g.title,
      shortDescription: g.shortDescription,
      coverUrl: g.coverUrl,
      iconUrl: g.iconUrl,
      featured: g.featured,
      heatScore: g.heatScore,
      publishedAt: g.publishedAt,
      tags: g.tagRelations.map((r) => r.tag),
      version: g.currentVersion?.version ?? null,
      entryUrl: g.currentVersion?.entryUrl ?? null,
      isNew:
        !!g.publishedAt &&
        Date.now() - g.publishedAt.getTime() < 14 * 24 * 60 * 60 * 1000,
    })),
  });
}
