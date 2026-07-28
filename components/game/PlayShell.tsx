"use client";

import Link from "next/link";
import { useEffect } from "react";
import { GameFrame } from "@/components/game/GameFrame";

type Props = {
  game: {
    id: string;
    slug: string;
    title: string;
    version: string;
    entryUrl: string;
    gameOrigin: string;
    orientation?: string;
  };
};

export function PlayShell({ game }: Props) {
  useEffect(() => {
    document.documentElement.classList.add("immersive-play");
    document.body.classList.add("immersive-play");
    return () => {
      document.documentElement.classList.remove("immersive-play");
      document.body.classList.remove("immersive-play");
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex h-[100dvh] w-screen flex-col bg-black">
      <div className="safe-pad pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 bg-gradient-to-b from-black/75 to-transparent px-3 py-3">
        <Link
          href="/"
          className="pointer-events-auto rounded-full bg-white/95 px-3 py-1.5 text-xs font-extrabold text-[var(--brand-deep)] shadow-md transition hover:bg-white"
        >
          ← 返回妙妙屋
        </Link>
        <p className="pointer-events-none truncate text-sm font-bold text-white/90">
          {game.title}
        </p>
      </div>

      <div className="min-h-0 flex-1 pt-12">
        <GameFrame
          gameId={game.id}
          slug={game.slug}
          version={game.version}
          entryUrl={game.entryUrl}
          gameOrigin={game.gameOrigin}
          muted={false}
          orientation={game.orientation}
          immersive
        />
      </div>
    </div>
  );
}
