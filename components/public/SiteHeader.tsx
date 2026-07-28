import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="safe-pad sticky top-0 z-30 border-b border-[var(--line)] bg-[rgba(255,247,237,0.82)] backdrop-blur-md">
      <div className="site-shell flex items-center justify-between gap-3 py-3">
        <Link
          href="/"
          className="brand-title whitespace-nowrap text-lg text-[var(--brand-deep)] transition-opacity hover:opacity-80 sm:text-2xl"
        >
          盼盼与熊大的妙妙屋
        </Link>
        <nav className="flex shrink-0 items-center gap-2 text-sm font-bold text-[var(--muted)] sm:gap-4">
          <Link
            href="/#games"
            className="transition-colors duration-200 hover:text-[var(--brand)]"
          >
            游戏
          </Link>
          <Link
            href="/about"
            className="transition-colors duration-200 hover:text-[var(--brand)]"
          >
            关于
          </Link>
          <a
            href="/admin"
            className="rounded-full bg-[rgba(232,93,76,0.12)] px-3 py-1.5 text-[var(--brand-deep)] transition duration-200 hover:bg-[var(--brand)] hover:text-white"
          >
            管理后台
          </a>
        </nav>
      </div>
    </header>
  );
}
