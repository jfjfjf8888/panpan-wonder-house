import AdmZip from "adm-zip";

function normalizePath(entryName: string) {
  return entryName.replace(/\\/g, "/").replace(/^\.\//, "");
}

function isJunkPath(name: string) {
  const n = normalizePath(name);
  if (!n || n.startsWith("__MACOSX/") || n === "__MACOSX") return true;
  const base = n.split("/").pop() || "";
  return base.startsWith("._") || base === ".DS_Store";
}

/**
 * Flatten a single nested root folder and drop macOS junk entries.
 * Many packages ship as `game-slug-v1/manifest.json` instead of root-level files.
 */
export function normalizeGameZipBuffer(buffer: Buffer): {
  buffer: Buffer;
  nestedRoot: string | null;
  removedJunk: number;
} {
  const source = new AdmZip(buffer);
  const entries = source.getEntries().filter((e) => !e.isDirectory);
  let removedJunk = 0;
  const useful: { name: string; data: Buffer }[] = [];

  for (const entry of entries) {
    const name = normalizePath(entry.entryName);
    if (
      isJunkPath(name) ||
      name.includes("..") ||
      name.startsWith("/") ||
      name.split("/").some((p) => p === "..")
    ) {
      removedJunk += 1;
      continue;
    }
    useful.push({ name, data: entry.getData() });
  }

  const tops = new Set(
    useful.map((e) => e.name.split("/")[0]).filter(Boolean),
  );
  let nestedRoot: string | null = null;
  if (
    tops.size === 1 &&
    !useful.some((e) => e.name === "manifest.json" || e.name === "index.html")
  ) {
    const root = [...tops][0];
    if (useful.some((e) => e.name.startsWith(`${root}/`))) {
      nestedRoot = root;
    }
  }

  const out = new AdmZip();
  for (const item of useful) {
    let name = item.name;
    if (nestedRoot && name.startsWith(`${nestedRoot}/`)) {
      name = name.slice(nestedRoot.length + 1);
    }
    if (!name) continue;
    out.addFile(name, item.data);
  }

  return {
    buffer: out.toBuffer(),
    nestedRoot,
    removedJunk,
  };
}
