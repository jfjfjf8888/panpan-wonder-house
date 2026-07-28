"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin/client";

export default function AdminAnalyticsPage() {
  const [site, setSite] = useState<{
    daily: { date: string; pageViews: number; uniqueVisitors: number; gameStarts: number }[];
    devices: Record<string, number>;
  } | null>(null);
  const [games, setGames] = useState<{ title: string; heatScore: number; slug: string }[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      adminFetch("/api/admin/analytics/site?days=30"),
      adminFetch("/api/admin/analytics/games"),
    ])
      .then(([siteData, gamesData]) => {
        setSite(siteData);
        setGames(gamesData.games || []);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!site) return <p>加载中…</p>;

  return (
    <div className="space-y-6">
      <h1 className="brand-title text-3xl text-[var(--brand-deep)]">数据分析</h1>
      <section className="soft-panel rounded-2xl p-4">
        <h2 className="font-extrabold">近 30 日趋势</h2>
        <div className="mt-3 max-h-80 overflow-auto text-sm">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-[var(--muted)]">
                <th className="py-1">日期</th>
                <th>PV</th>
                <th>UV</th>
                <th>启动</th>
              </tr>
            </thead>
            <tbody>
              {site.daily.map((d) => (
                <tr key={d.date}>
                  <td className="py-1">{d.date}</td>
                  <td>{d.pageViews}</td>
                  <td>{d.uniqueVisitors}</td>
                  <td>{d.gameStarts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="soft-panel rounded-2xl p-4">
          <h2 className="font-extrabold">设备占比</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {Object.entries(site.devices).map(([k, v]) => (
              <li key={k} className="flex justify-between">
                <span>{k}</span>
                <span>{v}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="soft-panel rounded-2xl p-4">
          <h2 className="font-extrabold">游戏热度</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {games.map((g) => (
              <li key={g.slug} className="flex justify-between">
                <span>{g.title}</span>
                <span>{g.heatScore}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
