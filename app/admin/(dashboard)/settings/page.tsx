"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin/client";

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<{
    globalEnabled: boolean;
    siteAdsEnabled: boolean;
    gameAdsEnabled: boolean;
    provider?: string | null;
  } | null>(null);
  const [logs, setLogs] = useState<{ action: string; createdAt: string }[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      adminFetch("/api/admin/ad-config"),
      adminFetch("/api/admin/audit-logs"),
    ])
      .then(([ad, audit]) => {
        setConfig(ad.config);
        setLogs(audit.logs || []);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function save() {
    if (!config) return;
    try {
      const data = await adminFetch("/api/admin/ad-config", {
        method: "PUT",
        body: JSON.stringify(config),
      });
      setConfig(data.config);
      setMessage("广告配置已保存（MVP 默认建议全部关闭）");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    }
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!config) return <p>加载中…</p>;

  return (
    <div className="space-y-6">
      <h1 className="brand-title text-3xl text-[var(--brand-deep)]">系统设置</h1>
      <section className="soft-panel space-y-3 rounded-2xl p-4">
        <h2 className="font-extrabold">广告配置</h2>
        {(
          [
            ["globalEnabled", "广告总开关"],
            ["siteAdsEnabled", "网站广告开关"],
            ["gameAdsEnabled", "游戏广告开关"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={Boolean(config[key])}
              onChange={(e) =>
                setConfig({ ...config, [key]: e.target.checked })
              }
            />
            {label}
          </label>
        ))}
        <input
          className="w-full rounded-xl border px-3 py-2 text-sm"
          placeholder="广告供应商（预留）"
          value={config.provider || ""}
          onChange={(e) => setConfig({ ...config, provider: e.target.value })}
        />
        <button type="button" className="btn btn-primary" onClick={save}>
          保存配置
        </button>
        {message ? <p className="text-[var(--accent)]">{message}</p> : null}
      </section>

      <section className="soft-panel rounded-2xl p-4">
        <h2 className="font-extrabold">操作记录</h2>
        <ul className="mt-3 max-h-96 space-y-2 overflow-auto text-sm">
          {logs.map((log, idx) => (
            <li key={`${log.action}-${idx}`} className="flex justify-between gap-3">
              <span>{log.action}</span>
              <span className="text-[var(--muted)]">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
