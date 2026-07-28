"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { adminFetch, getCsrfToken } from "@/lib/admin/client";

type Issue = {
  code: string;
  level: string;
  file?: string;
  message: string;
  current?: string;
  expected?: string;
  suggestion?: string;
};

type Report = {
  passed: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  compressedSize: number;
  uncompressedSize: number;
  fileCount: number;
  previewUrl?: string | null;
  manifest?: { title: string; slug: string; version: string };
  issues: Issue[];
};

export default function UploadsClientImpl() {
  const search = useSearchParams();
  const targetGameId = search.get("gameId");
  const mode = targetGameId ? "update" : "create";

  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [filter, setFilter] = useState<"all" | "ERROR" | "WARNING" | "INFO">("all");
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);

  const issues = useMemo(() => {
    if (!report) return [];
    if (filter === "all") return report.issues;
    return report.issues.filter((i) => i.level === filter);
  }, [report, filter]);

  async function startUpload() {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setDone("");
    setReport(null);
    setStatus("创建上传任务…");
    setProgress(5);
    try {
      const created = await adminFetch("/api/admin/uploads/create", {
        method: "POST",
        body: JSON.stringify({
          filename: file.name,
          size: file.size,
          mode,
          targetGameId,
        }),
      });
      setUploadId(created.uploadId);
      setStatus("经服务器上传 ZIP 中…");
      setProgress(20);

      // Browser cannot reach MinIO (127.0.0.1:9000); upload via Next.js API.
      const put = await fetch(`/api/admin/uploads/${created.uploadId}/file`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/zip",
          "x-csrf-token": getCsrfToken(),
        },
        body: file,
        credentials: "include",
      });
      const putData = await put.json().catch(() => ({}));
      if (!put.ok) {
        throw new Error(putData.error || "上传到服务器失败");
      }
      setProgress(65);

      await adminFetch(`/api/admin/uploads/${created.uploadId}/complete`, {
        method: "POST",
      });
      setProgress(75);
      setStatus("自动校验中…");

      const validated = await adminFetch(
        `/api/admin/uploads/${created.uploadId}/validate`,
        { method: "POST" },
      );
      setReport(validated.report);
      setProgress(100);
      setStatus(validated.report.passed ? "校验通过，可预览并发布" : "校验未通过");
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  async function save(publish: boolean) {
    if (!uploadId || busy) return;
    setBusy(true);
    setError("");
    setDone("");
    try {
      const result = await adminFetch(`/api/admin/uploads/${uploadId}`, {
        method: "POST",
        body: JSON.stringify({ publish }),
      });
      setDone(
        publish
          ? `已发布：${result.game.title}`
          : `已保存草稿：${result.game.title}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="brand-title text-3xl text-[var(--brand-deep)]">
        {mode === "update" ? "更新游戏包" : "上传新游戏"}
      </h1>
      <div className="soft-panel space-y-4 rounded-2xl p-4">
        <p className="text-sm text-[var(--muted)]">
          先选择 ZIP，再点「上传并校验」。推荐命名：game-&#123;slug&#125;-v&#123;version&#125;.zip
        </p>

        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
            busy
              ? "cursor-not-allowed border-[var(--line)] bg-white/40 opacity-60"
              : file
                ? "border-[var(--accent)] bg-[rgba(15,118,110,0.06)] hover:bg-[rgba(15,118,110,0.1)]"
                : "border-[var(--brand)] bg-[rgba(232,93,76,0.06)] hover:bg-[rgba(232,93,76,0.12)]"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (busy) return;
            const dropped = e.dataTransfer.files?.[0];
            if (dropped && /\.zip$/i.test(dropped.name)) {
              setFile(dropped);
            } else {
              setError("请选择 ZIP 文件");
            }
          }}
        >
          <span className="btn btn-primary pointer-events-none !px-5 !py-2.5">
            {file ? "重新选择 ZIP" : "选择游戏 ZIP"}
          </span>
          <span className="text-sm font-bold text-[var(--brand-deep)]">
            {file
              ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`
              : "点击这里选择文件，或把 ZIP 拖到此区域"}
          </span>
          <span className="text-xs text-[var(--muted)]">仅支持 .zip，最大 100 MB</span>
          <input
            type="file"
            accept=".zip,application/zip"
            disabled={busy}
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        {!file ? (
          <p className="text-sm text-[var(--muted)]">
            尚未选择文件时，「上传并校验」不可用。
          </p>
        ) : null}

        <button
          type="button"
          className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          onClick={startUpload}
          disabled={!file || busy}
        >
          {busy ? "处理中…" : "上传并校验"}
        </button>
        {status ? (
          <p>
            {status} {progress ? `(${progress}%)` : ""}
          </p>
        ) : null}
        {error ? <p className="text-red-600">{error}</p> : null}
        {done ? <p className="text-[var(--accent)]">{done}</p> : null}
      </div>

      {report ? (
        <div className="space-y-4">
          <div className="soft-panel rounded-2xl p-4">
            <p className="font-extrabold">
              总体结果：{report.passed ? "通过" : "未通过"}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              ERROR {report.errorCount} · WARNING {report.warningCount} · INFO{" "}
              {report.infoCount} · 文件 {report.fileCount} · ZIP{" "}
              {(report.compressedSize / 1024).toFixed(1)} KB
            </p>
            {report.manifest ? (
              <p className="mt-2 text-sm">
                {report.manifest.title} / {report.manifest.slug} / v
                {report.manifest.version}
              </p>
            ) : null}
            {report.previewUrl ? (
              <iframe
                title="preview"
                src={report.previewUrl}
                className="mt-4 h-80 w-full rounded-xl border"
                sandbox="allow-scripts allow-same-origin"
              />
            ) : null}
            {report.passed ? (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => save(false)}
                >
                  保存草稿
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => save(true)}
                >
                  {mode === "update" ? "发布更新" : "发布"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex gap-2">
            {(["all", "ERROR", "WARNING", "INFO"] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  filter === f ? "bg-[var(--brand)] text-white" : "bg-white"
                }`}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "全部" : f}
              </button>
            ))}
            <button
              type="button"
              className="rounded-full bg-white px-3 py-1 text-xs font-bold"
              onClick={() => navigator.clipboard.writeText(JSON.stringify(report, null, 2))}
            >
              复制报告
            </button>
          </div>

          <ul className="space-y-2">
            {issues.map((issue, idx) => (
              <li key={`${issue.code}-${idx}`} className="soft-panel rounded-xl p-3 text-sm">
                <p className="font-bold">
                  [{issue.level}] {issue.code}
                </p>
                <p>{issue.message}</p>
                {issue.file ? <p>文件：{issue.file}</p> : null}
                {issue.current ? <p>当前：{issue.current}</p> : null}
                {issue.expected ? <p>要求：{issue.expected}</p> : null}
                {issue.suggestion ? <p>建议：{issue.suggestion}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
