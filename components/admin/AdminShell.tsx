"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin/client";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";

const links = [
  { href: "/admin", label: "仪表盘" },
  { href: "/admin/games", label: "游戏管理" },
  { href: "/admin/uploads", label: "上传游戏" },
  { href: "/admin/ai-brief", label: "AI 做游戏规范" },
  { href: "/admin/analytics", label: "数据分析" },
  { href: "/admin/errors", label: "错误日志" },
  { href: "/admin/settings", label: "系统设置" },
];

export function AdminShell({
  username,
  children,
}: {
  username: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    try {
      await adminFetch("/api/admin/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.replace("/admin/login");
  }

  return (
    <ConfirmProvider>
      <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
        <aside className="border-r border-[var(--line)] bg-white/70 p-4">
          <p className="brand-title text-xl text-[var(--brand-deep)]">妙妙屋后台</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{username}</p>
          <nav className="mt-6 space-y-1">
            {links.map((link) => {
              const active =
                link.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block rounded-xl px-3 py-2 text-sm font-bold ${
                    active
                      ? "bg-[rgba(232,93,76,0.12)] text-[var(--brand-deep)]"
                      : "hover:bg-[rgba(232,93,76,0.08)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[rgba(255,247,237,0.92)] px-4 py-3 backdrop-blur-md sm:px-8">
            <p className="truncate text-sm text-[var(--muted)]">
              已登录：<span className="font-bold text-[var(--ink)]">{username}</span>
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Link href="/" className="btn btn-secondary !px-3 !py-2 text-sm">
                妙妙屋首页
              </Link>
              <button
                type="button"
                onClick={logout}
                className="btn btn-primary !px-3 !py-2 text-sm"
              >
                退出登录
              </button>
            </div>
          </header>
          <div className="p-4 sm:p-8">{children}</div>
        </div>
      </div>
    </ConfirmProvider>
  );
}
