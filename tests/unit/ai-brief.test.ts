import { describe, expect, it } from "vitest";
import { buildAiBriefPrompt } from "@/lib/ai-brief/build-prompt";

const template = `游戏名称：

\`\`\`text
【填写游戏名称】
\`\`\`

游戏创意和玩法：

\`\`\`text
【填写具体玩法、目标、规则和脑洞】
\`\`\`

特殊要求：

\`\`\`text
【没有则填写“无”】
\`\`\`

请先根据以上需求完成游戏设计，然后直接开发完整游戏。
`;

describe("buildAiBriefPrompt", () => {
  it("fills required placeholders", () => {
    const out = buildAiBriefPrompt(template, {
      title: "测试游戏",
      idea: "收集星星",
      special: "无",
    });
    expect(out).toContain("测试游戏");
    expect(out).toContain("收集星星");
    expect(out).not.toContain("【填写游戏名称】");
  });

  it("injects optional fields before design instruction", () => {
    const out = buildAiBriefPrompt(template, {
      title: "测试游戏",
      idea: "收集星星",
      special: "无",
      slug: "test-game",
      tags: "休闲, 益智",
      orientation: "portrait",
    });
    expect(out).toContain("test-game");
    expect(out).toContain("portrait");
    expect(out.indexOf("建议 slug")).toBeLessThan(
      out.indexOf("请先根据以上需求完成游戏设计"),
    );
  });
});
