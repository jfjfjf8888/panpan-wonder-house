export type GameCardData = {
  slug: string;
  title: string;
  shortDescription: string;
  coverUrl?: string | null;
  entryUrl?: string | null;
  heatScore?: number;
  featured?: boolean;
  isNew?: boolean;
  tags?: { name: string; slug: string }[];
};

export function GameCard({
  game,
  index = 0,
}: {
  game: GameCardData;
  index?: number;
}) {
  // Use site play shell so players always get「返回妙妙屋」.
  const href = `/play/${game.slug}`;

  return (
    <a
      href={href}
      className="group soft-panel card-enter block overflow-hidden rounded-3xl transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_40px_rgba(194,65,12,0.14)]"
      style={{ animationDelay: `${Math.min(index, 12) * 55}ms` }}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[rgba(255,237,213,0.8)]">
        {game.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.coverUrl}
            alt={game.title}
            className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--muted)]">
            暂无封面
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {game.featured ? (
            <span className="rounded-full bg-[var(--brand)] px-2 py-0.5 text-xs font-bold text-white">
              盼盼推荐
            </span>
          ) : null}
          {game.isNew ? (
            <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-white">
              新游戏
            </span>
          ) : null}
          {(game.heatScore ?? 0) >= 70 ? (
            <span className="rounded-full bg-[var(--surface-strong)] px-2 py-0.5 text-xs font-bold text-[var(--brand-deep)]">
              热度 {Math.round(game.heatScore ?? 0)}
            </span>
          ) : null}
        </div>
      </div>
      <div className="space-y-2 p-3 sm:p-4">
        <h3 className="line-clamp-1 text-base font-extrabold transition-colors duration-200 group-hover:text-[var(--brand-deep)] sm:text-lg">
          {game.title}
        </h3>
        <p className="line-clamp-2 text-sm text-[var(--muted)]">{game.shortDescription}</p>
        {game.tags?.length ? (
          <div className="flex flex-wrap gap-1">
            {game.tags.map((tag) => (
              <span
                key={tag.slug}
                className="rounded-full bg-[rgba(15,118,110,0.08)] px-2 py-0.5 text-xs font-bold text-[var(--accent)]"
              >
                {tag.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </a>
  );
}
