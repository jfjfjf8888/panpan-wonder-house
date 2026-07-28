import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="safe-pad mt-16 border-t border-[var(--line)] py-10 text-sm text-[var(--muted)]">
      <div className="site-shell flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="brand-title text-lg text-[var(--brand-deep)]">盼盼与熊大的妙妙屋</p>
        <div className="flex gap-4 font-semibold">
          <Link href="/about">关于妙妙屋</Link>
          <Link href="/privacy">隐私说明</Link>
        </div>
      </div>
    </footer>
  );
}
