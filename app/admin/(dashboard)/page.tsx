"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin/client";

type DashboardData = {
  metrics: {
    todayPv: number;
    todayUv: number;
    todayGameStarts: number;
    weekGameStarts: number;
    averageDuration: number;
    completionRate: number;
    publishedGames: number;
    errorCount: number;
  };
  hotGames: { title: string; slug: string; heatScore: number }[];
  recentUploads: { originalFilename: string; status: string; createdAt: string }[];
  recentErrors: { createdAt: string; propertiesJson?: { message?: string } }[];
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch("/api/admin/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p>加载中…</p>;

  const cards = [
    ["今日 PV", data.metrics.todayPv],
    ["今日 UV", data.metrics.todayUv],
    ["今日启动", data.metrics.todayGameStarts],
    ["近7日启动", data.metrics.weekGameStarts],
    ["平均时长(秒)", data.metrics.averageDuration],
    ["完成率%", data.metrics.completionRate],
    ["已发布游戏", data.metrics.publishedGames],
    ["今日错误", data.metrics.errorCount],
  ] as const;

  return (
    <div className="space-y-8">
      <h1 className="brand-title text-3xl text-[var(--brand-deep)]">仪表盘</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="soft-panel rounded-2xl p-4">
            <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
            <p className="mt-2 text-2xl font-extrabold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="soft-panel rounded-2xl p-4">
          <h2 className="font-extrabold">热门游戏</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.hotGames.map((g) => (
              <li key={g.slug} className="flex justify-between">
                <span>{g.title}</span>
                <span>热度 {g.heatScore}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="soft-panel rounded-2xl p-4">
          <h2 className="font-extrabold">最近上传</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.recentUploads.map((u, i) => (
              <li key={`${u.originalFilename}-${i}`} className="flex justify-between gap-2">
                <span className="truncate">{u.originalFilename}</span>
                <span>{u.status}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
