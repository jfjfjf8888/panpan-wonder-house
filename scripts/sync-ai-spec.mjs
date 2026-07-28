import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const text = readFileSync(resolve(root, "content/game-ai-spec.txt"), "utf8").replace(
  /\r\n/g,
  "\n",
);
const escaped = text.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
const out = `export const GAME_AI_SPEC = '${escaped}' as string;\n`;
writeFileSync(resolve(root, "lib/ai-brief/spec-text.ts"), out, "utf8");
console.log("synced", text.includes("每次重新打包并准备上传后台"));
