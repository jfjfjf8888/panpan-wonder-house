"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { GameFrame } from "@/components/game/GameFrame";
import { GameCard, type GameCardData } from "@/components/public/GameCard";
import { AdSlot } from "@/components/ads/AdSlot";

type GameDetail = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  version: string;
  entryUrl: string;
  gameOrigin: string;
  orientation?: string;
  controls?: string[];
};

export function GamePlayClient({
  game,
  recommendations,
}: {
  game: GameDetail;
  recommendations: GameCardData[];
}) {
  const [muted, setMuted] = useState(false);
  const [immersive, setImmersive] = useState(false);

  const enterImmersive = useCallback(async () => {
    setImmersive(true);
    document.documentElement.classList.add("immersive-play");
    document.body.classList.add("immersive-play");
    const stage = document.getElementById("game-stage");
    if (stage && !document.fullscreenElement) {
      try {
        await stage.requestFullscreen();
      } catch {
        // CSS immersive still works when browser blocks fullscreen
      }
    }
  }, []);

  const exitImmersive = useCallback(async () => {
    setImmersive(false);
    document.documentElement.classList.remove("immersive-play");
    document.body.classList.remove("immersive-play");
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setImmersive(false);
        document.documentElement.classList.remove("immersive-play");
        document.body.classList.remove("immersive-play");
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitImmersive();
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("keydown", onKeyDown);
      document.documentElement.classList.remove("immersive-play");
      document.body.classList.remove("immersive-play");
    };
  }, [exitImmersive]);

  return (
    <div className={immersive ? "" : "site-shell safe-pad space-y-8 py-6"}>
      {!immersive ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="btn btn-secondary">
              ← 返回妙妙屋
            </Link>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setMuted((v) => !v)}
              >
                {muted ? "取消静音" : "静音"}
              </button>
              <button type="button" className="btn btn-primary" onClick={enterImmersive}>
                沉浸模式
              </button>
            </div>
          </div>

          <div>
            <h1 className="brand-title text-3xl text-[var(--brand-deep)] sm:text-4xl">
              {game.title}
            </h1>
            <p className="mt-2 text-[var(--muted)]">{game.shortDescription}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              点游戏里的「开始游戏」后会自动进入沉浸式游玩。
            </p>
          </div>

          <AdSlot slot="GAME_TOP" />
        </>
      ) : null}

      <div
        id="game-stage"
        className={
          immersive
            ? "fixed inset-0 z-[100] flex h-[100dvh] w-screen flex-col bg-black"
            : "mx-auto w-full max-w-5xl"
        }
      >
        {immersive ? (
          <div className="safe-pad absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent px-3 py-3">
            <Link
              href="/"
              className="shrink-0 rounded-full bg-white/95 px-3 py-1.5 text-xs font-extrabold text-[var(--brand-deep)]"
            >
              ← 返回妙妙屋
            </Link>
            <p className="truncate text-sm font-bold text-white/95">{game.title}</p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur"
                onClick={() => setMuted((v) => !v)}
              >
                {muted ? "取消静音" : "静音"}
              </button>
              <button
                type="button"
                className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-[var(--brand-deep)]"
                onClick={exitImmersive}
              >
                退出沉浸
              </button>
            </div>
          </div>
        ) : null}

        <div className={immersive ? "min-h-0 flex-1 pt-12" : ""}>
          <GameFrame
            gameId={game.id}
            slug={game.slug}
            version={game.version}
            entryUrl={game.entryUrl}
            gameOrigin={game.gameOrigin}
            muted={muted}
            orientation={game.orientation}
            immersive={immersive}
            onGameStart={enterImmersive}
            onFullscreenRequest={enterImmersive}
          />
        </div>
      </div>

      {!immersive ? (
        <>
          <AdSlot slot="GAME_BOTTOM" />

          <section className="soft-panel rounded-3xl p-5">
            <h2 className="text-xl font-extrabold">游戏简介</h2>
            <p className="mt-2 whitespace-pre-wrap text-[var(--muted)]">{game.description}</p>
            {game.controls?.length ? (
              <p className="mt-3 text-sm font-bold text-[var(--accent)]">
                操作方式：{game.controls.join(" / ")}
              </p>
            ) : null}
          </section>

          {recommendations.length ? (
            <section className="space-y-4">
              <h2 className="text-xl font-extrabold">其他游戏推荐</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {recommendations.map((g, i) => (
                  <GameCard key={g.slug} game={g} index={i} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
