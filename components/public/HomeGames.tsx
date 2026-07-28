"use client";

import { useMemo, useState } from "react";
import { GameCard, type GameCardData } from "@/components/public/GameCard";

export function HomeGames({ games }: { games: GameCardData[] }) {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("all");

  const tags = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of games) {
      for (const t of g.tags || []) map.set(t.slug, t.name);
    }
    return [...map.entries()];
  }, [games]);

  const filtered = games.filter((g) => {
    const text = `${g.title} ${g.shortDescription}`.toLowerCase();
    const okQ = !q || text.includes(q.toLowerCase());
    const okTag = tag === "all" || (g.tags || []).some((t) => t.slug === tag);
    return okQ && okTag;
  });

  const featured = filtered.filter((g) => g.featured);

  return (
    <div className="space-y-10">
      <section className="fade-up space-y-4" style={{ animationDelay: "80ms" }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="brand-title text-2xl text-[var(--brand-deep)] sm:text-3xl">
              全部游戏
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">点开直接进入游戏，不用登录。</p>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索游戏标题…"
            className="w-full rounded-full border border-[var(--line)] bg-white/80 px-4 py-2.5 text-sm outline-none transition duration-200 ring-[var(--brand)] focus:ring-2 sm:w-72"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTag("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition duration-200 ${
              tag === "all"
                ? "bg-[var(--brand)] text-white shadow-sm"
                : "bg-white/70 text-[var(--muted)] hover:bg-white"
            }`}
          >
            全部
          </button>
          {tags.map(([slug, name]) => (
            <button
              key={slug}
              type="button"
              onClick={() => setTag(slug)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition duration-200 ${
                tag === slug
                  ? "bg-[var(--brand)] text-white shadow-sm"
                  : "bg-white/70 text-[var(--muted)] hover:bg-white"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="space-y-4">
          <h3 className="text-xl font-extrabold">盼盼推荐</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {featured.map((game, i) => (
              <GameCard key={game.slug} game={game} index={i} />
            ))}
          </div>
        </section>
      ) : null}

      <section id="games" className="scroll-mt-24 space-y-4">
        <h3 className="text-xl font-extrabold">游戏列表</h3>
        {filtered.length === 0 ? (
          <div className="soft-panel rounded-3xl p-8 text-center text-[var(--muted)]">
            暂时还没有符合条件的游戏，过一会儿再来看看吧。
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {filtered.map((game, i) => (
              <GameCard key={game.slug} game={game} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
