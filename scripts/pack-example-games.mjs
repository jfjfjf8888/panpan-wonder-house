import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";

const games = ["memory-card", "catch-stars"];
const outDir = path.resolve("examples/dist");
fs.mkdirSync(outDir, { recursive: true });

for (const slug of games) {
  const root = path.resolve("examples", slug);
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "manifest.json"), "utf8"),
  );
  const bridgeSrc = path.resolve("packages/game-sdk/game-bridge.js");
  fs.mkdirSync(path.join(root, "js"), { recursive: true });
  fs.copyFileSync(bridgeSrc, path.join(root, "js", "game-bridge.js"));

  const zip = new AdmZip();
  const walk = (dir, prefix = "") => {
    for (const name of fs.readdirSync(dir)) {
      if (name === ".DS_Store") continue;
      const full = path.join(dir, name);
      const rel = prefix ? `${prefix}/${name}` : name;
      if (fs.statSync(full).isDirectory()) walk(full, rel);
      else zip.addLocalFile(full, prefix || undefined, name);
    }
  };
  walk(root);

  const out = path.join(outDir, `game-${slug}-v${manifest.version}.zip`);
  zip.writeZip(out);
  console.log("packed", out);
}
