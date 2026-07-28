import { notFound } from "next/navigation";
import { PlayShell } from "@/components/game/PlayShell";
import { getPublishedGameBySlug } from "@/lib/games/service";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const game = await getPublishedGameBySlug(slug).catch(() => null);
  if (!game || !game.currentVersion) notFound();

  const manifest = game.currentVersion.manifestJson as {
    orientation?: string;
  };

  return (
    <PlayShell
      game={{
        id: game.id,
        slug: game.slug,
        title: game.title,
        version: game.currentVersion.version,
        entryUrl: game.currentVersion.entryUrl,
        gameOrigin: env.GAME_ORIGIN,
        orientation: manifest.orientation,
      }}
    />
  );
}
