"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin/client";

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState<
    {
      id: string;
      createdAt: string;
      path: string;
      propertiesJson?: { message?: string };
      game?: { title: string; slug: string } | null;
    }[]
  >([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch("/api/admin/errors")
      .then((d) => setErrors(d.errors))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="brand-title text-3xl text-[var(--brand-deep)]">错误日志</h1>
      {error ? <p className="text-red-600">{error}</p> : null}
      <ul className="space-y-2">
        {errors.map((e) => (
          <li key={e.id} className="soft-panel rounded-xl p-3 text-sm">
            <p className="font-bold">
              {e.game?.title || "未知游戏"} · {new Date(e.createdAt).toLocaleString()}
            </p>
            <p className="text-[var(--muted)]">{e.path}</p>
            <p>{e.propertiesJson?.message || "无详细信息"}</p>
          </li>
        ))}
        {errors.length === 0 ? (
          <li className="text-[var(--muted)]">暂无错误记录</li>
        ) : null}
      </ul>
    </div>
  );
}
