import AdmZip from "adm-zip";
import { createHash } from "crypto";
import semver from "semver";
import type {
  GameManifest,
  ValidationIssue,
  ValidationReport,
} from "@/packages/shared-types";
import { normalizeGameZipBuffer } from "@/lib/validation/normalize-zip";

export { normalizeGameZipBuffer } from "@/lib/validation/normalize-zip";

const MAX_ZIP_BYTES = 100 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 300 * 1024 * 1024;
const MAX_FILE_BYTES = 30 * 1024 * 1024;
const MAX_FILES = 2000;
const MAX_COVER_BYTES = 2 * 1024 * 1024;

const FORBIDDEN_EXT = new Set([
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".apk",
  ".ipa",
  ".php",
  ".jsp",
  ".asp",
  ".aspx",
  ".sh",
  ".bat",
  ".cmd",
  ".ps1",
  ".py",
  ".jar",
]);

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ValidateOptions = {
  existingGameId?: string;
  existingSlug?: string;
  currentVersion?: string;
  mode?: "create" | "update";
};

function issue(
  partial: Omit<ValidationIssue, "level"> & { level?: ValidationIssue["level"] },
): ValidationIssue {
  return {
    level: partial.level ?? "ERROR",
    code: partial.code,
    file: partial.file,
    field: partial.field,
    message: partial.message,
    current: partial.current,
    expected: partial.expected,
    suggestion: partial.suggestion,
    line: partial.line,
  };
}

function normalizePath(entryName: string) {
  return entryName.replace(/\\/g, "/").replace(/^\.\//, "");
}

function isPathTraversal(name: string) {
  const n = normalizePath(name);
  if (n.startsWith("/") || n === ".." || n.startsWith("../")) return true;
  const parts = n.split("/");
  return parts.some((part) => part === "..");
}

function extOf(name: string) {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx).toLowerCase() : "";
}

function readText(zip: AdmZip, name: string) {
  const entry = zip.getEntry(name);
  if (!entry) return null;
  return entry.getData().toString("utf8");
}

function parseManifest(raw: string, issues: ValidationIssue[]): GameManifest | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    issues.push(
      issue({
        code: "MANIFEST_JSON_INVALID",
        file: "manifest.json",
        message: "manifest.json 不是合法 JSON。",
        suggestion: "使用 JSON 校验器修复语法错误。",
      }),
    );
    return null;
  }

  if (!data || typeof data !== "object") {
    issues.push(
      issue({
        code: "MANIFEST_NOT_OBJECT",
        file: "manifest.json",
        message: "manifest.json 根节点必须是对象。",
      }),
    );
    return null;
  }

  const m = data as Record<string, unknown>;
  const required = [
    "schemaVersion",
    "id",
    "slug",
    "title",
    "shortDescription",
    "description",
    "version",
    "entry",
    "cover",
    "tags",
    "orientation",
    "controls",
  ];

  for (const key of required) {
    if (m[key] === undefined || m[key] === null || m[key] === "") {
      issues.push(
        issue({
          code: "MANIFEST_FIELD_MISSING",
          file: "manifest.json",
          field: key,
          message: `缺少必填字段 ${key}。`,
          expected: `必须提供 ${key}`,
        }),
      );
    }
  }

  if (m.schemaVersion !== "1.0") {
    issues.push(
      issue({
        code: "MANIFEST_SCHEMA_UNSUPPORTED",
        file: "manifest.json",
        field: "schemaVersion",
        message: "不支持的 schemaVersion。",
        current: String(m.schemaVersion),
        expected: "1.0",
      }),
    );
  }

  if (typeof m.id === "string" && !SLUG_RE.test(m.id)) {
    issues.push(
      issue({
        code: "MANIFEST_ID_INVALID",
        file: "manifest.json",
        field: "id",
        message: "id 格式不正确。",
        current: m.id,
        expected: "小写字母、数字和短横线",
      }),
    );
  }

  if (typeof m.slug === "string" && !SLUG_RE.test(m.slug)) {
    issues.push(
      issue({
        code: "MANIFEST_SLUG_INVALID",
        file: "manifest.json",
        field: "slug",
        message: "slug 格式不正确。",
        current: m.slug,
        expected: "小写字母、数字和短横线",
      }),
    );
  }

  if (typeof m.title === "string" && (m.title.length < 2 || m.title.length > 30)) {
    issues.push(
      issue({
        code: "MANIFEST_TITLE_LENGTH",
        file: "manifest.json",
        field: "title",
        message: "title 长度必须在 2 至 30 个字符。",
        current: String(m.title.length),
      }),
    );
  }

  if (typeof m.shortDescription === "string" && m.shortDescription.length > 60) {
    issues.push(
      issue({
        code: "MANIFEST_SHORT_DESC_LENGTH",
        file: "manifest.json",
        field: "shortDescription",
        message: "shortDescription 最多 60 个字符。",
        current: String(m.shortDescription.length),
      }),
    );
  }

  if (typeof m.description === "string" && m.description.length > 500) {
    issues.push(
      issue({
        code: "MANIFEST_DESC_LENGTH",
        file: "manifest.json",
        field: "description",
        message: "description 最多 500 个字符。",
        current: String(m.description.length),
      }),
    );
  }

  if (typeof m.version !== "string" || !semver.valid(m.version)) {
    issues.push(
      issue({
        code: "MANIFEST_VERSION_INVALID",
        file: "manifest.json",
        field: "version",
        message: "version 必须是语义化版本 x.y.z。",
        current: String(m.version),
        expected: "1.0.0",
      }),
    );
  }

  if (!Array.isArray(m.tags) || m.tags.length > 5) {
    issues.push(
      issue({
        code: "MANIFEST_TAGS_INVALID",
        file: "manifest.json",
        field: "tags",
        message: "tags 必须是数组，最多 5 个。",
      }),
    );
  }

  if (
    typeof m.orientation === "string" &&
    !["portrait", "landscape", "any"].includes(m.orientation)
  ) {
    issues.push(
      issue({
        code: "MANIFEST_ORIENTATION_INVALID",
        file: "manifest.json",
        field: "orientation",
        message: "orientation 无效。",
        current: m.orientation,
        expected: "portrait | landscape | any",
      }),
    );
  }

  if (typeof m.cover === "string" && !m.cover.toLowerCase().endsWith(".webp")) {
    issues.push(
      issue({
        code: "MANIFEST_COVER_FORMAT",
        file: "manifest.json",
        field: "cover",
        message: "封面必须为 WebP。",
        current: m.cover,
        expected: "*.webp",
      }),
    );
  }

  return m as unknown as GameManifest;
}

function scanTextForRisks(
  file: string,
  content: string,
  issues: ValidationIssue[],
  networkDomains: string[],
) {
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    const lineNo = index + 1;
    if (/\beval\s*\(/.test(line)) {
      issues.push(
        issue({
          code: "JS_EVAL_FORBIDDEN",
          file,
          line: lineNo,
          message: "禁止使用 eval()。",
          current: line.trim().slice(0, 200),
          suggestion: "删除 eval，改用安全逻辑。",
        }),
      );
    }
    if (/new\s+Function\s*\(/.test(line)) {
      issues.push(
        issue({
          code: "JS_NEW_FUNCTION_FORBIDDEN",
          file,
          line: lineNo,
          message: "禁止使用 new Function()。",
          current: line.trim().slice(0, 200),
        }),
      );
    }
    if (/window\.parent\.document|parent\.document|top\.document/.test(line)) {
      issues.push(
        issue({
          code: "PARENT_DOM_ACCESS",
          file,
          line: lineNo,
          message: "禁止访问父页面 DOM。",
          current: line.trim().slice(0, 200),
        }),
      );
    }
    if (/top\.location|parent\.location\s*=/.test(line)) {
      issues.push(
        issue({
          code: "TOP_NAVIGATION_FORBIDDEN",
          file,
          line: lineNo,
          message: "禁止修改顶层页面地址。",
          current: line.trim().slice(0, 200),
        }),
      );
    }
    if (/googletagmanager|google-analytics|gtag\(|baidu\.com\/hm\.js|facebook\.net/.test(line)) {
      issues.push(
        issue({
          code: "THIRD_PARTY_ANALYTICS",
          file,
          line: lineNo,
          message: "禁止第三方统计脚本。",
          current: line.trim().slice(0, 200),
        }),
      );
    }
    if (/adsbygoogle|doubleclick\.net|googlesyndication/.test(line)) {
      issues.push(
        issue({
          code: "THIRD_PARTY_ADS",
          file,
          line: lineNo,
          message: "禁止第三方广告脚本。",
          current: line.trim().slice(0, 200),
        }),
      );
    }
  });

  const urlRe = /https?:\/\/[^\s"'`)]+/gi;
  let match: RegExpExecArray | null;
  while ((match = urlRe.exec(content))) {
    const url = match[0];
    try {
      const host = new URL(url).hostname;
      if (!networkDomains.includes(host) && !networkDomains.includes(`*.${host}`)) {
        issues.push(
          issue({
            code: "EXTERNAL_RESOURCE_NOT_ALLOWED",
            file,
            message: "检测到未声明的外部资源。",
            current: url,
            expected: "游戏资源必须打包在 ZIP 内，或写入 networkDomains。",
            suggestion: "下载该资源并改为相对路径引用。",
          }),
        );
      }
    } catch {
      // ignore invalid URL fragments
    }
  }

  if (/<iframe[\s>]/i.test(content)) {
    issues.push(
      issue({
        code: "EXTERNAL_IFRAME_FORBIDDEN",
        file,
        message: "禁止外部 iframe。",
      }),
    );
  }
}

export function validateGamePackage(
  buffer: Buffer,
  options: ValidateOptions = {},
): ValidationReport {
  const issues: ValidationIssue[] = [];
  // Scan original entries first (normalize may drop unsafe paths).
  try {
    const rawZip = new AdmZip(buffer);
    for (const entry of rawZip.getEntries().filter((e) => !e.isDirectory)) {
      const name = normalizePath(entry.entryName);
      if (isPathTraversal(entry.entryName) || isPathTraversal(name)) {
        issues.push(
          issue({
            code: "ZIP_PATH_TRAVERSAL",
            file: entry.entryName,
            message: "检测到路径穿越。",
            current: entry.entryName,
            suggestion: "ZIP 内路径不得包含 ../ 或绝对路径。",
          }),
        );
      }
    }
  } catch {
    // ignore; handled below
  }

  let working = buffer;
  try {
    const normalized = normalizeGameZipBuffer(buffer);
    working = normalized.buffer;
    if (normalized.nestedRoot) {
      issues.push(
        issue({
          level: "INFO",
          code: "ZIP_NESTED_ROOT_FLATTENED",
          message: "已自动展开 ZIP 内层目录。",
          current: normalized.nestedRoot,
          suggestion: "建议以后直接把 manifest.json 放在 ZIP 根目录。",
        }),
      );
    }
  } catch {
    // keep original buffer; parse step will report ZIP_INVALID
  }
  const compressedSize = working.byteLength;

  if (compressedSize > MAX_ZIP_BYTES) {
    issues.push(
      issue({
        code: "ZIP_TOO_LARGE",
        message: "ZIP 压缩包超过 100 MB。",
        current: String(compressedSize),
        expected: String(MAX_ZIP_BYTES),
      }),
    );
  }

  let zip: AdmZip;
  try {
    zip = new AdmZip(working);
  } catch {
    return {
      passed: false,
      errorCount: 1,
      warningCount: 0,
      infoCount: 0,
      compressedSize,
      uncompressedSize: 0,
      fileCount: 0,
      issues: [
        issue({
          code: "ZIP_INVALID",
          message: "无法解析 ZIP 文件。",
          suggestion: "确认上传的是未加密的标准 ZIP。",
        }),
      ],
    };
  }

  const entries = zip.getEntries().filter((e) => !e.isDirectory);
  const fileCount = entries.length;
  let uncompressedSize = 0;
  const fileSet = new Set<string>();

  for (const entry of entries) {
    const name = normalizePath(entry.entryName);
    if (isPathTraversal(entry.entryName) || isPathTraversal(name)) {
      issues.push(
        issue({
          code: "ZIP_PATH_TRAVERSAL",
          file: entry.entryName,
          message: "检测到路径穿越。",
          current: entry.entryName,
          suggestion: "ZIP 内路径不得包含 ../ 或绝对路径。",
        }),
      );
      continue;
    }

    if (name.includes("/")) {
      // ok
    }

    const size = entry.header.size;
    uncompressedSize += size;
    if (size > MAX_FILE_BYTES) {
      issues.push(
        issue({
          code: "FILE_TOO_LARGE",
          file: name,
          message: "单个文件超过 30 MB。",
          current: String(size),
        }),
      );
    }

    const ext = extOf(name);
    if (FORBIDDEN_EXT.has(ext)) {
      issues.push(
        issue({
          code: "FORBIDDEN_EXTENSION",
          file: name,
          message: `禁止的文件扩展名 ${ext}。`,
        }),
      );
    }

    fileSet.add(name);
  }

  if (fileCount > MAX_FILES) {
    issues.push(
      issue({
        code: "TOO_MANY_FILES",
        message: "文件数量超过 2000。",
        current: String(fileCount),
      }),
    );
  }

  if (uncompressedSize > MAX_UNCOMPRESSED_BYTES) {
    issues.push(
      issue({
        code: "UNCOMPRESSED_TOO_LARGE",
        message: "解压后总大小超过 300 MB。",
        current: String(uncompressedSize),
      }),
    );
  }

  if (compressedSize > 0 && uncompressedSize / compressedSize > 100) {
    issues.push(
      issue({
        code: "ZIP_BOMB_RISK",
        message: "压缩比异常，疑似 ZIP 炸弹。",
        current: `ratio=${(uncompressedSize / compressedSize).toFixed(1)}`,
      }),
    );
  }

  if (!fileSet.has("manifest.json")) {
    issues.push(
      issue({
        code: "MANIFEST_MISSING",
        file: "manifest.json",
        message: "缺少 manifest.json。",
      }),
    );
  }

  if (!fileSet.has("index.html") && !entries.some((e) => normalizePath(e.entryName).endsWith(".html"))) {
    issues.push(
      issue({
        code: "ENTRY_HTML_MISSING",
        file: "index.html",
        message: "缺少入口 HTML。",
      }),
    );
  }

  let manifest: GameManifest | undefined;
  const manifestRaw = readText(zip, "manifest.json");
  if (manifestRaw) {
    const parsed = parseManifest(manifestRaw, issues);
    if (parsed) manifest = parsed;
  }

  if (manifest) {
    if (options.mode === "update" || options.existingGameId) {
      if (options.existingGameId && manifest.id !== options.existingGameId) {
        issues.push(
          issue({
            code: "GAME_ID_MISMATCH",
            file: "manifest.json",
            field: "id",
            message: "更新失败：游戏 ID 不一致。",
            current: manifest.id,
            expected: options.existingGameId,
            suggestion: `请将 manifest.json 中的 id 修改为 ${options.existingGameId}。`,
          }),
        );
      }
      if (options.existingSlug && manifest.slug !== options.existingSlug) {
        issues.push(
          issue({
            code: "GAME_SLUG_MISMATCH",
            file: "manifest.json",
            field: "slug",
            message: "更新失败：游戏 slug 不一致。",
            current: manifest.slug,
            expected: options.existingSlug,
          }),
        );
      }
      if (
        options.currentVersion &&
        semver.valid(manifest.version) &&
        semver.valid(options.currentVersion)
      ) {
        if (semver.lt(manifest.version, options.currentVersion)) {
          issues.push(
            issue({
              code: "VERSION_NOT_GREATER",
              file: "manifest.json",
              field: "version",
              message: "新版本号不能低于当前版本号。",
              current: manifest.version,
              expected: `>= ${options.currentVersion}`,
            }),
          );
        } else if (semver.eq(manifest.version, options.currentVersion)) {
          issues.push(
            issue({
              level: "WARNING",
              code: "VERSION_OVERWRITE",
              file: "manifest.json",
              field: "version",
              message: "版本号与当前相同，保存时将覆盖该版本文件。",
              current: manifest.version,
              suggestion: "若是小更新，建议升到更高版本号，例如 1.0.1。",
            }),
          );
        }
      }
    }

    const entry = manifest.entry || "index.html";
    if (!fileSet.has(normalizePath(entry))) {
      issues.push(
        issue({
          code: "MANIFEST_ENTRY_NOT_FOUND",
          file: "manifest.json",
          field: "entry",
          message: `压缩包内不存在 ${entry}。`,
          current: `"entry": "${entry}"`,
          expected: "entry 必须指向 ZIP 包内实际存在的 HTML 文件。",
          suggestion: `将 ${entry} 放入 ZIP 根目录，或者将 entry 修改为 index.html。`,
        }),
      );
    }

    const cover = normalizePath(manifest.cover || "cover.webp");
    if (!fileSet.has(cover)) {
      issues.push(
        issue({
          code: "COVER_MISSING",
          file: cover,
          message: "缺少封面图。",
        }),
      );
    } else {
      const coverEntry = zip.getEntry(cover);
      if (coverEntry && coverEntry.header.size > MAX_COVER_BYTES) {
        issues.push(
          issue({
            code: "COVER_TOO_LARGE",
            file: cover,
            message: "封面大小超过 2 MB。",
            current: String(coverEntry.header.size),
          }),
        );
      }
    }

    if (manifest.icon) {
      const icon = normalizePath(manifest.icon);
      if (!fileSet.has(icon)) {
        issues.push(
          issue({
            code: "ICON_MISSING",
            level: "WARNING",
            file: icon,
            message: "manifest 声明了 icon，但文件不存在。",
          }),
        );
      } else if (!icon.toLowerCase().endsWith(".png")) {
        issues.push(
          issue({
            code: "ICON_FORMAT",
            level: "WARNING",
            file: icon,
            message: "图标建议使用 PNG。",
          }),
        );
      }
    } else {
      issues.push(
        issue({
          code: "ICON_NOT_PROVIDED",
          level: "WARNING",
          message: "未提供游戏图标。",
        }),
      );
    }

    if (!manifest.controls?.includes("touch")) {
      issues.push(
        issue({
          code: "TOUCH_NOT_DECLARED",
          level: "WARNING",
          file: "manifest.json",
          field: "controls",
          message: "游戏未声明支持触摸操作。",
        }),
      );
    }

    if (manifest.orientation === "landscape") {
      issues.push(
        issue({
          code: "LANDSCAPE_ONLY",
          level: "WARNING",
          file: "manifest.json",
          field: "orientation",
          message: "游戏只支持横屏。",
        }),
      );
    }

    const networkDomains = manifest.permissions?.networkDomains ?? [];
    for (const name of fileSet) {
      if (/\.(html?|js|css)$/i.test(name)) {
        const text = readText(zip, name);
        if (text) scanTextForRisks(name, text, issues, networkDomains);
      }
    }

    const entryName = normalizePath(manifest.entry || "index.html");
    const html = readText(zip, entryName);
    if (html && !/name=["']viewport["']/i.test(html)) {
      issues.push(
        issue({
          code: "VIEWPORT_MISSING",
          level: "WARNING",
          file: entryName,
          message: "入口 HTML 未配置 viewport。",
          suggestion:
            '添加 <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
        }),
      );
    }

    const hasBridge =
      [...fileSet].some((f) => /game-bridge\.js$/i.test(f)) ||
      Boolean(html && /PanPanBridge|game-bridge/.test(html));
    if (!hasBridge) {
      issues.push(
        issue({
          code: "BRIDGE_MISSING",
          level: "WARNING",
          message: "未检测到游戏通信脚本 game-bridge。",
          suggestion: "引入 packages/game-sdk/game-bridge.js 并调用 PanPanBridge.ready()。",
        }),
      );
    }

    // local asset existence for relative refs in entry html
    if (html) {
      const refRe = /(?:src|href)=["'](\.\/[^"']+|[^https?:/][^"']+\.(?:js|css|png|jpe?g|webp|gif|mp3|wav|ogg|woff2?|ttf))["']/gi;
      let m: RegExpExecArray | null;
      while ((m = refRe.exec(html))) {
        const ref = normalizePath(m[1]);
        if (ref.startsWith("http") || ref.startsWith("//") || ref.startsWith("data:")) continue;
        if (!fileSet.has(ref)) {
          issues.push(
            issue({
              code: "ASSET_FILE_NOT_FOUND",
              file: entryName,
              message: "ZIP 包内不存在该文件。",
              current: m[1],
              suggestion: `补充 ${ref}，或者修改引用路径。`,
            }),
          );
        }
      }
    }
  }

  issues.push(
    issue({
      code: "PACKAGE_STATS",
      level: "INFO",
      message: `文件总数 ${fileCount}，解压后 ${uncompressedSize} 字节，压缩包 ${compressedSize} 字节。`,
    }),
  );

  const errorCount = issues.filter((i) => i.level === "ERROR").length;
  const warningCount = issues.filter((i) => i.level === "WARNING").length;
  const infoCount = issues.filter((i) => i.level === "INFO").length;

  return {
    passed: errorCount === 0,
    errorCount,
    warningCount,
    infoCount,
    compressedSize,
    uncompressedSize,
    fileCount,
    manifest,
    issues,
  };
}

export function sha256Buffer(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}
