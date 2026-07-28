import AdmZip from "adm-zip";
import { describe, expect, it } from "vitest";
import { validateGamePackage } from "@/lib/validation/game-package";

function zipWith(files: Record<string, string | Buffer>) {
  const zip = new AdmZip();
  for (const [name, content] of Object.entries(files)) {
    zip.addFile(name, Buffer.isBuffer(content) ? content : Buffer.from(content));
  }
  return zip.toBuffer();
}

const baseManifest = {
  schemaVersion: "1.0",
  id: "memory-card",
  slug: "memory-card",
  title: "记忆翻翻乐",
  shortDescription: "翻开卡片，找出所有相同图案。",
  description: "一个适合手机和电脑游玩的记忆小游戏。",
  version: "1.0.0",
  entry: "index.html",
  cover: "cover.webp",
  tags: ["益智"],
  orientation: "any",
  controls: ["touch", "mouse"],
  permissions: { networkDomains: [] },
};

describe("validateGamePackage", () => {
  it("rejects missing manifest", () => {
    const buf = zipWith({
      "index.html": "<html><head><meta name='viewport' content='width=device-width'></head><body></body></html>",
    });
    const report = validateGamePackage(buf);
    expect(report.passed).toBe(false);
    expect(report.issues.some((i) => i.code === "MANIFEST_MISSING")).toBe(true);
  });

  it("rejects path traversal entries", () => {
    const zip = new AdmZip();
    zip.addFile("evil.js", Buffer.from("alert(1)"));
    const evil = zip.getEntry("evil.js");
    if (evil) evil.entryName = "../evil.js";
    zip.addFile(
      "manifest.json",
      Buffer.from(JSON.stringify(baseManifest)),
    );
    zip.addFile("index.html", Buffer.from("<html></html>"));
    zip.addFile("cover.webp", Buffer.from("WEBP"));
    const report = validateGamePackage(zip.toBuffer());
    expect(report.issues.some((i) => i.code === "ZIP_PATH_TRAVERSAL")).toBe(true);
  });

  it("accepts a minimal valid package", () => {
    const html = `<!doctype html><html><head>
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head><body><script src="./js/game-bridge.js"></script></body></html>`;
    const buf = zipWith({
      "manifest.json": JSON.stringify(baseManifest),
      "index.html": html,
      "cover.webp": Buffer.from("RIFF....WEBP"),
      "js/game-bridge.js": "window.PanPanBridge={}",
    });
    const report = validateGamePackage(buf);
    expect(report.passed).toBe(true);
    expect(report.manifest?.slug).toBe("memory-card");
  });

  it("flattens a single nested root folder", () => {
    const html = `<!doctype html><html><head>
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head><body><script src="./js/game-bridge.js"></script></body></html>`;
    const buf = zipWith({
      "game-demo-v1/manifest.json": JSON.stringify(baseManifest),
      "game-demo-v1/index.html": html,
      "game-demo-v1/cover.webp": Buffer.from("RIFF....WEBP"),
      "game-demo-v1/js/game-bridge.js": "window.PanPanBridge={}",
      "__MACOSX/game-demo-v1/._index.html": Buffer.from("junk"),
    });
    const report = validateGamePackage(buf);
    expect(report.passed).toBe(true);
    expect(report.manifest?.slug).toBe("memory-card");
    expect(report.issues.some((i) => i.code === "ZIP_NESTED_ROOT_FLATTENED")).toBe(
      true,
    );
  });

  it("rejects external CDN scripts", () => {
    const html = `<!doctype html><html><head>
      <meta name="viewport" content="width=device-width" />
      <script src="https://cdn.example.com/game.js"></script>
      </head><body></body></html>`;
    const buf = zipWith({
      "manifest.json": JSON.stringify(baseManifest),
      "index.html": html,
      "cover.webp": Buffer.from("WEBP"),
    });
    const report = validateGamePackage(buf);
    expect(report.passed).toBe(false);
    expect(
      report.issues.some((i) => i.code === "EXTERNAL_RESOURCE_NOT_ALLOWED"),
    ).toBe(true);
  });
});
