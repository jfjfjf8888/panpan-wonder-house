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
    <div className="fixed inset-0 z-[100] h-[100dvh] w-screen bg-black">
      <div className="play-chrome">
        <Link href="/" className="play-back-btn">
          ← 返回妙妙屋
        </Link>
        <p className="play-title-chip" title={game.title}>
          {game.title}
        </p>
      </div>

      <div className="h-full min-h-0">
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
