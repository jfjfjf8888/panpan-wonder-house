import { NextResponse } from "next/server";
import { getPublishedGameBySlug, listPublishedGames } from "@/lib/games/service";
import { env } from "@/lib/env";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const game = await getPublishedGameBySlug(slug);
  if (!game || !game.currentVersion) {
    return NextResponse.json({ error: "游戏不存在" }, { status: 404 });
  }

  const others = (await listPublishedGames())
    .filter((g) => g.slug !== slug)
    .slice(0, 6);

  const manifest = game.currentVersion.manifestJson as {
    orientation?: string;
    controls?: string[];
    description?: string;
  };

  return NextResponse.json({
    game: {
      id: game.id,
      slug: game.slug,
      title: game.title,
      shortDescription: game.shortDescription,
      description: game.description || manifest.description || "",
      coverUrl: game.coverUrl,
      heatScore: game.heatScore,
      featured: game.featured,
      tags: game.tagRelations.map((r) => r.tag),
      version: game.currentVersion.version,
      entryUrl: game.currentVersion.entryUrl,
      gameOrigin: env.GAME_ORIGIN,
      orientation: manifest.orientation ?? "any",
      controls: manifest.controls ?? [],
    },
    recommendations: others.map((g) => ({
      id: g.id,
      slug: g.slug,
      title: g.title,
      shortDescription: g.shortDescription,
      coverUrl: g.coverUrl,
      heatScore: g.heatScore,
    })),
  });
}
