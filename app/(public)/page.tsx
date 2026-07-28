import { HomeGames } from "@/components/public/HomeGames";
import { AdSlot } from "@/components/ads/AdSlot";
import { listPublishedGames } from "@/lib/games/service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let games: Awaited<ReturnType<typeof listPublishedGames>> = [];
  try {
    games = await listPublishedGames();
  } catch {
    games = [];
  }

  const cards = games.map((g) => ({
    slug: g.slug,
    title: g.title,
    shortDescription: g.shortDescription,
    coverUrl: g.coverUrl,
    entryUrl: g.currentVersion?.entryUrl ?? null,
    heatScore: g.heatScore,
    featured: g.featured,
    isNew:
      !!g.publishedAt &&
      Date.now() - g.publishedAt.getTime() < 14 * 24 * 60 * 60 * 1000,
    tags: g.tagRelations.map((r) => r.tag),
  }));

  return (
    <div className="safe-pad">
      <section className="relative overflow-hidden">
        <div className="site-shell grid min-h-[72vh] items-center gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="fade-up space-y-5">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
              PanPan Wonder House
            </p>
            <h1 className="brand-title whitespace-nowrap text-[clamp(1.65rem,4.6vw+0.4rem,4.5rem)] leading-none text-[var(--brand-deep)]">
              盼盼与熊大的妙妙屋
            </h1>
            <p className="max-w-xl text-base text-[var(--muted)] sm:text-lg">
              一座装满原创小游戏的温暖小屋。不用登录，点开就能玩。
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#games" className="btn btn-primary">
                开始逛游戏
              </a>
              <a href="/admin" className="btn btn-secondary">
                管理后台
              </a>
            </div>
          </div>
          <div
            className="relative mx-auto h-72 w-full max-w-md floaty fade-up sm:h-96"
            style={{ animationDelay: "120ms" }}
          >
            <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-[#fdba74] via-[#fb7185] to-[#2dd4bf] opacity-90" />
            <div className="absolute inset-4 rounded-[2rem] bg-[rgba(255,255,255,0.35)] backdrop-blur-sm" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
              <div className="h-16 w-20 rounded-t-2xl rounded-b-md bg-white/85 shadow-lg" />
              <p className="brand-title text-2xl">妙妙屋营业中</p>
              <p className="text-sm text-white/90">星星、云朵和脑洞都在里面</p>
            </div>
          </div>
        </div>
      </section>

      <div className="site-shell space-y-8 pb-10">
        <AdSlot slot="HOME_TOP" />
        <HomeGames games={cards} />
        <AdSlot slot="HOME_FEED" />
      </div>
    </div>
  );
}
