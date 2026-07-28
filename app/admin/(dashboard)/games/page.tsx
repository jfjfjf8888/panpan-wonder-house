"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin/client";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type GameRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  heatScore: number;
  publishedAt?: string | null;
  updatedAt: string;
  currentVersion?: { version: string } | null;
  coverUrl?: string | null;
  _count?: { analyticsEvents: number };
};

const STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  PUBLISHED: {
    label: "已上架",
    className: "bg-[rgba(15,118,110,0.16)] text-[var(--accent)] ring-1 ring-[rgba(15,118,110,0.35)]",
  },
  UNPUBLISHED: {
    label: "已下架",
    className: "bg-[rgba(124,106,93,0.14)] text-[var(--muted)] ring-1 ring-[rgba(124,106,93,0.28)]",
  },
  READY: {
    label: "待上架",
    className: "bg-[rgba(234,179,8,0.18)] text-[#a16207] ring-1 ring-[rgba(234,179,8,0.4)]",
  },
  DRAFT: {
    label: "草稿",
    className: "bg-[var(--surface)] text-[var(--muted)] ring-1 ring-[var(--line)]",
  },
  ARCHIVED: {
    label: "已归档",
    className: "bg-[rgba(124,106,93,0.1)] text-[var(--muted)] ring-1 ring-[var(--line)]",
  },
};

function statusMeta(status: string) {
  return (
    STATUS_META[status] || {
      label: status,
      className: "bg-[var(--surface)] text-[var(--muted)] ring-1 ring-[var(--line)]",
    }
  );
}

export default function AdminGamesPage() {
  const confirm = useConfirm();
  const [games, setGames] = useState<GameRow[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const d = await adminFetch("/api/admin/games");
    setGames(d.games);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function removeGame(game: GameRow) {
    const ok = await confirm({
      title: "删除游戏",
      message: `确认删除「${game.title}」？此操作不可恢复。`,
      confirmLabel: "确认删除",
      tone: "danger",
    });
    if (!ok) return;
    setBusyId(game.id);
    setError("");
    try {
      await adminFetch(`/api/admin/games/${game.id}`, { method: "DELETE" });
      setGames((prev) => prev.filter((g) => g.id !== game.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBusyId(null);
    }
  }

  async function togglePublish(game: GameRow) {
    if (!game.currentVersion) {
      setError("该游戏还没有版本，请先上传游戏包");
      return;
    }
    const publish = game.status !== "PUBLISHED";
    const ok = await confirm({
      title: publish ? "上架游戏" : "下架游戏",
      message: publish
        ? `确认上架「${game.title}」？上架后首页可见。`
        : `确认下架「${game.title}」？下架后首页不再展示。`,
      confirmLabel: publish ? "确认上架" : "确认下架",
      tone: publish ? "accent" : "default",
    });
    if (!ok) return;
    setBusyId(game.id);
    setError("");
    try {
      const path = publish
        ? `/api/admin/games/${game.id}/publish`
        : `/api/admin/games/${game.id}/unpublish`;
      const data = await adminFetch(path, { method: "POST" });
      const nextStatus = data.game?.status || (publish ? "PUBLISHED" : "UNPUBLISHED");
      setGames((prev) =>
        prev.map((g) => (g.id === game.id ? { ...g, status: nextStatus } : g)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="brand-title text-3xl text-[var(--brand-deep)]">游戏管理</h1>
        <Link href="/admin/uploads" className="btn btn-primary">
          上传新游戏
        </Link>
      </div>
      {error ? <p className="text-red-600">{error}</p> : null}
      <div className="overflow-x-auto soft-panel rounded-2xl">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--line)] text-[var(--muted)]">
            <tr>
              <th className="p-3">封面</th>
              <th className="p-3">标题</th>
              <th className="p-3">slug</th>
              <th className="p-3">版本</th>
              <th className="p-3">状态</th>
              <th className="p-3">热度</th>
              <th className="p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {games.map((g) => {
              const meta = statusMeta(g.status);
              const published = g.status === "PUBLISHED";
              const canToggle = Boolean(g.currentVersion);
              const busy = busyId === g.id;
              return (
                <tr
                  key={g.id}
                  className={`border-b border-[var(--line)] transition-colors duration-200 hover:bg-[var(--surface)] ${
                    published ? "bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]" : ""
                  }`}
                >
                  <td className="p-3">
                    {g.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.coverUrl} alt="" className="h-12 w-16 rounded object-cover" />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-3 font-bold">{g.title}</td>
                  <td className="p-3">{g.slug}</td>
                  <td className="p-3">{g.currentVersion?.version || "-"}</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                  </td>
                  <td className="p-3">{g.heatScore}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className={`rounded-full px-3 py-1 text-xs font-extrabold disabled:opacity-50 ${
                          published
                            ? "bg-[rgba(124,106,93,0.12)] text-[var(--muted)]"
                            : "bg-[rgba(15,118,110,0.14)] text-[var(--accent)]"
                        }`}
                        disabled={busy || !canToggle}
                        onClick={() => togglePublish(g)}
                        title={!canToggle ? "请先上传游戏包" : undefined}
                      >
                        {busy ? "处理中…" : published ? "下架" : "上架"}
                      </button>
                      <Link
                        className="rounded-full bg-[rgba(232,93,76,0.12)] px-3 py-1 text-xs font-extrabold text-[var(--brand-deep)]"
                        href={`/admin/games/${g.id}`}
                      >
                        管理
                      </Link>
                      <button
                        type="button"
                        className="rounded-full bg-red-50 px-3 py-1 text-xs font-extrabold text-red-600 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => removeGame(g)}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
