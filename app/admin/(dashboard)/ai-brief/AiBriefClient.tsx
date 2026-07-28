"use client";

import { useMemo, useState } from "react";
import {
  buildAiBriefPrompt,
  type AiBriefInput,
} from "@/lib/ai-brief/build-prompt";

const empty: AiBriefInput = {
  title: "",
  idea: "",
  special: "无",
  slug: "",
  shortDescription: "",
  tags: "",
  orientation: "",
  aspectRatio: "",
  extraNotes: "",
};

export function AiBriefClient({ template }: { template: string }) {
  const [form, setForm] = useState<AiBriefInput>(empty);
  const [copied, setCopied] = useState(false);

  const prompt = useMemo(
    () => buildAiBriefPrompt(template, form),
    [template, form],
  );

  function update<K extends keyof AiBriefInput>(key: K, value: AiBriefInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setCopied(false);
  }

  async function copyAll() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
  }

  function reset() {
    setForm(empty);
    setCopied(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="brand-title text-3xl text-[var(--brand-deep)]">
            AI 做游戏规范
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            填写创意后生成完整提示词，复制给游戏制作 AI 使用。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={reset}>
            清空填写
          </button>
          <button type="button" className="btn btn-primary" onClick={copyAll}>
            {copied ? "已复制" : "复制完整提示词"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,420px)_1fr]">
        <form
          className="soft-panel space-y-4 rounded-2xl p-4"
          onSubmit={(e) => {
            e.preventDefault();
            copyAll();
          }}
        >
          <label className="block space-y-1.5">
            <span className="text-sm font-bold">游戏名称 *</span>
            <input
              className="field-input"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="例如：拉了坨大的"
              maxLength={30}
              required
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-bold">游戏创意和玩法 *</span>
            <textarea
              className="field-input min-h-36"
              value={form.idea}
              onChange={(e) => update("idea", e.target.value)}
              placeholder="写清玩法、目标、规则和脑洞…"
              required
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-bold">特殊要求</span>
            <textarea
              className="field-input min-h-24"
              value={form.special}
              onChange={(e) => update("special", e.target.value)}
              placeholder="没有就填「无」"
            />
          </label>

          <div className="border-t border-[var(--line)] pt-4">
            <p className="mb-3 text-sm font-bold text-[var(--muted)]">可选补充</p>
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-bold">建议 slug</span>
                <input
                  className="field-input"
                  value={form.slug}
                  onChange={(e) => update("slug", e.target.value)}
                  placeholder="la-le-tuo-da-de"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-bold">一句话介绍</span>
                <input
                  className="field-input"
                  value={form.shortDescription}
                  onChange={(e) => update("shortDescription", e.target.value)}
                  placeholder="最多 60 字"
                  maxLength={60}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-bold">标签</span>
                <input
                  className="field-input"
                  value={form.tags}
                  onChange={(e) => update("tags", e.target.value)}
                  placeholder="休闲, 益智, 合成"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-bold">画面方向</span>
                <select
                  className="field-input"
                  value={form.orientation || ""}
                  onChange={(e) =>
                    update(
                      "orientation",
                      e.target.value as AiBriefInput["orientation"],
                    )
                  }
                >
                  <option value="">不指定</option>
                  <option value="any">any（自适应）</option>
                  <option value="portrait">portrait（竖屏）</option>
                  <option value="landscape">landscape（横屏）</option>
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-bold">画面比例</span>
                <input
                  className="field-input"
                  value={form.aspectRatio}
                  onChange={(e) => update("aspectRatio", e.target.value)}
                  placeholder="例如 9:16 或 16:9"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-bold">补充说明</span>
                <textarea
                  className="field-input min-h-20"
                  value={form.extraNotes}
                  onChange={(e) => update("extraNotes", e.target.value)}
                  placeholder="角色设定、难度、禁止事项等"
                />
              </label>
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full">
            {copied ? "已复制到剪贴板" : "复制完整提示词"}
          </button>
        </form>

        <section className="soft-panel flex min-h-[60vh] flex-col rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-extrabold">合并预览</h2>
            <p className="text-xs text-[var(--muted)]">
              {prompt.length.toLocaleString()} 字
            </p>
          </div>
          <textarea
            readOnly
            value={prompt}
            className="field-input min-h-[50vh] flex-1 resize-y p-3 font-mono text-xs leading-relaxed text-[var(--ink)]"
          />
        </section>
      </div>
    </div>
  );
}
