import { notFound } from "next/navigation";
import { GamePlayClient } from "@/components/game/GamePlayClient";
import { getPublishedGameBySlug, listPublishedGames } from "@/lib/games/service";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = await getPublishedGameBySlug(slug).catch(() => null);
  if (!game || !game.currentVersion) notFound();

  const manifest = game.currentVersion.manifestJson as {
    orientation?: string;
    controls?: string[];
    description?: string;
  };

  const others = (await listPublishedGames().catch(() => []))
    .filter((g) => g.slug !== slug)
    .slice(0, 6);

  return (
    <GamePlayClient
      game={{
        id: game.id,
        slug: game.slug,
        title: game.title,
        shortDescription: game.shortDescription,
        description: game.description || manifest.description || "",
        version: game.currentVersion.version,
        entryUrl: game.currentVersion.entryUrl,
        gameOrigin: env.GAME_ORIGIN,
        orientation: manifest.orientation,
        controls: manifest.controls,
      }}
      recommendations={others.map((g) => ({
        slug: g.slug,
        title: g.title,
        shortDescription: g.shortDescription,
        coverUrl: g.coverUrl,
        entryUrl: g.currentVersion?.entryUrl ?? null,
        heatScore: g.heatScore,
      }))}
    />
  );
}
