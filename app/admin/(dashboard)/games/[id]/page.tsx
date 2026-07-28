"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin/client";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Version = {
  id: string;
  version: string;
  createdAt: string;
  publishedAt?: string | null;
  packageSha256: string;
  compressedSize: number;
  validationStatus: string;
};

type Game = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  status: string;
  featured: boolean;
  currentVersionId?: string | null;
  versions: Version[];
};

export default function AdminGameDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const confirm = useConfirm();
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const data = await adminFetch(`/api/admin/games/${params.id}`);
    setGame(data.game);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [params.id]);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!game) return;
    const form = new FormData(e.currentTarget);
    await adminFetch(`/api/admin/games/${game.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: form.get("title"),
        shortDescription: form.get("shortDescription"),
        description: form.get("description"),
        featured: form.get("featured") === "on",
      }),
    });
    setMessage("已保存");
    await load();
  }

  async function publish() {
    await adminFetch(`/api/admin/games/${params.id}/publish`, { method: "POST" });
    setMessage("已发布");
    await load();
  }

  async function unpublish() {
    await adminFetch(`/api/admin/games/${params.id}/unpublish`, { method: "POST" });
    setMessage("已下架");
    await load();
  }

  async function rollback(versionId: string) {
    const ok = await confirm({
      title: "回滚版本",
      message: "确认回滚到该版本？当前线上版本将被替换。",
      confirmLabel: "确认回滚",
      tone: "default",
    });
    if (!ok) return;
    await adminFetch(`/api/admin/games/${params.id}/rollback`, {
      method: "POST",
      body: JSON.stringify({ versionId }),
    });
    setMessage("已回滚");
    await load();
  }

  async function removeGame() {
    if (!game) return;
    const ok = await confirm({
      title: "删除游戏",
      message: `确认删除「${game.title}」？此操作不可恢复。`,
      confirmLabel: "确认删除",
      tone: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/admin/games/${game.id}`, { method: "DELETE" });
      router.replace("/admin/games");
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
      setDeleting(false);
    }
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!game) return <p>加载中…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="brand-title text-3xl text-[var(--brand-deep)]">{game.title}</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/uploads?gameId=${game.id}`}
            className="btn btn-secondary"
          >
            更新游戏包
          </Link>
          {game.status === "PUBLISHED" ? (
            <button type="button" className="btn btn-secondary" onClick={unpublish}>
              下架
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={publish}>
              发布
            </button>
          )}
          <button
            type="button"
            className="btn btn-danger"
            disabled={deleting}
            onClick={removeGame}
          >
            {deleting ? "删除中…" : "删除游戏"}
          </button>
        </div>
      </div>
      {message ? <p className="text-[var(--accent)]">{message}</p> : null}

      <form onSubmit={save} className="soft-panel space-y-3 rounded-2xl p-4">
        <p className="text-sm text-[var(--muted)]">slug: {game.slug} · 状态: {game.status}</p>
        <input name="title" defaultValue={game.title} className="w-full rounded-xl border px-3 py-2" />
        <input
          name="shortDescription"
          defaultValue={game.shortDescription}
          className="w-full rounded-xl border px-3 py-2"
        />
        <textarea
          name="description"
          defaultValue={game.description}
          className="min-h-28 w-full rounded-xl border px-3 py-2"
        />
        <label className="flex items-center gap-2 text-sm font-bold">
          <input name="featured" type="checkbox" defaultChecked={game.featured} />
          盼盼推荐
        </label>
        <button type="submit" className="btn btn-primary">
          保存信息
        </button>
      </form>

      <section className="soft-panel rounded-2xl p-4">
        <h2 className="font-extrabold">历史版本</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {game.versions.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
              <div>
                <p className="font-bold">
                  v{v.version}
                  {game.currentVersionId === v.id ? "（当前）" : ""}
                </p>
                <p className="text-[var(--muted)]">
                  SHA {v.packageSha256.slice(0, 12)}… · {(v.compressedSize / 1024).toFixed(1)} KB ·{" "}
                  {v.validationStatus}
                </p>
              </div>
              {game.currentVersionId !== v.id ? (
                <button type="button" className="btn btn-secondary" onClick={() => rollback(v.id)}>
                  回滚
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
