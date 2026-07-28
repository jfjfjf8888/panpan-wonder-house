export type AiBriefInput = {
  title: string;
  idea: string;
  special: string;
  slug?: string;
  shortDescription?: string;
  tags?: string;
  orientation?: "any" | "portrait" | "landscape" | "";
  aspectRatio?: string;
  extraNotes?: string;
};

export function buildAiBriefPrompt(template: string, input: AiBriefInput): string {
  const title = input.title.trim() || "【填写游戏名称】";
  const idea = input.idea.trim() || "【填写具体玩法、目标、规则和脑洞】";
  const special = input.special.trim() || "无";

  let out = template
    .replace("【填写游戏名称】", title)
    .replace("【填写具体玩法、目标、规则和脑洞】", idea)
    .replace("【没有则填写“无”】", special);

  const extras: string[] = [];

  if (input.slug?.trim()) {
    extras.push(
      ["建议 slug（用于 id/slug 与 ZIP 文件名）：", "", "```text", input.slug.trim(), "```"].join(
        "\n",
      ),
    );
  }
  if (input.shortDescription?.trim()) {
    extras.push(
      [
        "一句话介绍（shortDescription，最多 60 字）：",
        "",
        "```text",
        input.shortDescription.trim(),
        "```",
      ].join("\n"),
    );
  }
  if (input.tags?.trim()) {
    extras.push(
      [
        "建议标签（最多 5 个，用逗号分隔）：",
        "",
        "```text",
        input.tags.trim(),
        "```",
      ].join("\n"),
    );
  }
  if (input.orientation) {
    extras.push(
      ["画面方向：", "", "```text", input.orientation, "```"].join("\n"),
    );
  }
  if (input.aspectRatio?.trim()) {
    extras.push(
      ["建议画面比例：", "", "```text", input.aspectRatio.trim(), "```"].join(
        "\n",
      ),
    );
  }
  if (input.extraNotes?.trim()) {
    extras.push(
      ["补充说明：", "", "```text", input.extraNotes.trim(), "```"].join("\n"),
    );
  }

  if (extras.length) {
    const block = extras.join("\n\n") + "\n\n";
    const anchor = "请先根据以上需求完成游戏设计";
    if (out.includes(anchor)) {
      out = out.replace(anchor, `${block}${anchor}`);
    } else {
      out = `${out}\n\n# 补充需求\n\n${block}`;
    }
  }

  return out;
}
