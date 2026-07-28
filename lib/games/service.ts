import AdmZip from "adm-zip";
import { GameStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { env } from "@/lib/env";
import {
  gamesBucket,
  putObject,
  publicObjectUrl,
  uploadsBucket,
  getObjectBuffer,
  deleteObject,
} from "@/lib/storage/s3";
import {
  normalizeGameZipBuffer,
  sha256Buffer,
  validateGamePackage,
  type ValidateOptions,
} from "@/lib/validation/game-package";
import type { GameManifest, ValidationReport } from "@/packages/shared-types";
import { writeAuditLog } from "@/lib/audit/log";

export async function listPublishedGames(params?: {
  q?: string;
  tag?: string;
}) {
  return prisma.game.findMany({
    where: {
      status: "PUBLISHED",
      ...(params?.q
        ? {
            OR: [
              { title: { contains: params.q, mode: "insensitive" } },
              { shortDescription: { contains: params.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(params?.tag
        ? { tagRelations: { some: { tag: { slug: params.tag } } } }
        : {}),
    },
    include: {
      tagRelations: { include: { tag: true } },
      currentVersion: true,
    },
    orderBy: [{ featured: "desc" }, { heatScore: "desc" }, { sortOrder: "asc" }],
  });
}

export async function getPublishedGameBySlug(slug: string) {
  return prisma.game.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      tagRelations: { include: { tag: true } },
      currentVersion: true,
    },
  });
}

async function uploadZipEntries(
  buffer: Buffer,
  slug: string,
  version: string,
) {
  const flat = normalizeGameZipBuffer(buffer).buffer;
  const zip = new AdmZip(flat);
  const entries = zip.getEntries().filter((e) => !e.isDirectory);
  const prefix = `${slug}/${version}`;

  for (const entry of entries) {
    const name = entry.entryName.replace(/\\/g, "/").replace(/^\.\//, "");
    if (name.includes("..") || !name) continue;
    const data = entry.getData();
    const contentType = guessContentType(name);
    await putObject({
      bucket: gamesBucket(),
      key: `${prefix}/${name}`,
      body: data,
      contentType,
    });
  }

  await putObject({
    bucket: gamesBucket(),
    key: `${slug}/current.json`,
    body: JSON.stringify(
      { version, publishedAt: new Date().toISOString() },
      null,
      2,
    ),
    contentType: "application/json",
  });

  return {
    entryUrl: publicObjectUrl(
      gamesBucket(),
      `${prefix}/index.html`,
    ),
    packageUrl: publicObjectUrl(gamesBucket(), `${prefix}/package.zip`),
  };
}

function guessContentType(name: string) {
  if (name.endsWith(".html")) return "text/html; charset=utf-8";
  if (name.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (name.endsWith(".css")) return "text/css; charset=utf-8";
  if (name.endsWith(".json")) return "application/json";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".mp3")) return "audio/mpeg";
  if (name.endsWith(".wav")) return "audio/wav";
  return "application/octet-stream";
}

export async function validateUploadBuffer(
  buffer: Buffer,
  options: ValidateOptions,
) {
  const report = validateGamePackage(buffer, options);
  return { report, sha256: sha256Buffer(buffer) };
}

export async function saveValidatedGame(params: {
  adminId: string;
  buffer: Buffer;
  report: ValidationReport;
  publish: boolean;
  targetGameId?: string | null;
  featured?: boolean;
}) {
  if (!params.report.passed || !params.report.manifest) {
    throw new Error("Validation did not pass");
  }

  const manifest = params.report.manifest;
  const sha = sha256Buffer(params.buffer);
  const urls = await uploadZipEntries(params.buffer, manifest.slug, manifest.version);

  await putObject({
    bucket: gamesBucket(),
    key: `${manifest.slug}/${manifest.version}/package.zip`,
    body: params.buffer,
    contentType: "application/zip",
  });

  const coverKey = `${manifest.slug}/${manifest.version}/${manifest.cover}`;
  const iconKey = manifest.icon
    ? `${manifest.slug}/${manifest.version}/${manifest.icon}`
    : null;

  let game = params.targetGameId
    ? await prisma.game.findUnique({ where: { id: params.targetGameId } })
    : await prisma.game.findUnique({ where: { slug: manifest.slug } });

  if (!game) {
    game = await prisma.game.create({
      data: {
        slug: manifest.slug,
        title: manifest.title,
        shortDescription: manifest.shortDescription,
        description: manifest.description,
        coverUrl: publicObjectUrl(gamesBucket(), coverKey),
        iconUrl: iconKey ? publicObjectUrl(gamesBucket(), iconKey) : null,
        status: params.publish ? "PUBLISHED" : "READY",
        featured: params.featured ?? false,
        publishedAt: params.publish ? new Date() : null,
      },
    });
  } else {
    game = await prisma.game.update({
      where: { id: game.id },
      data: {
        title: manifest.title,
        shortDescription: manifest.shortDescription,
        description: manifest.description,
        coverUrl: publicObjectUrl(gamesBucket(), coverKey),
        iconUrl: iconKey ? publicObjectUrl(gamesBucket(), iconKey) : game.iconUrl,
        featured: params.featured ?? game.featured,
      },
    });
  }

  const versionData = {
    manifestJson: manifest as unknown as Prisma.InputJsonValue,
    entryUrl: publicObjectUrl(
      gamesBucket(),
      `${manifest.slug}/${manifest.version}/${manifest.entry || "index.html"}`,
    ),
    packageUrl: urls.packageUrl,
    packageSha256: sha,
    compressedSize: params.report.compressedSize,
    uncompressedSize: params.report.uncompressedSize,
    validationStatus:
      params.report.warningCount > 0
        ? ("WARNING" as const)
        : ("PASSED" as const),
    validationReportJson: params.report as unknown as Prisma.InputJsonValue,
    publishedAt: params.publish ? new Date() : null,
  };

  // Same game_id + version may already exist after「保存草稿」再点「发布」,
  // or re-uploading a deleted-then-restored package with the same version.
  const version = await prisma.gameVersion.upsert({
    where: {
      gameId_version: {
        gameId: game.id,
        version: manifest.version,
      },
    },
    create: {
      gameId: game.id,
      version: manifest.version,
      ...versionData,
    },
    update: versionData,
  });

  const status: GameStatus = params.publish ? "PUBLISHED" : "READY";
  game = await prisma.game.update({
    where: { id: game.id },
    data: {
      currentVersionId: version.id,
      status,
      publishedAt: params.publish ? new Date() : game.publishedAt,
    },
  });

  await syncTags(game.id, manifest.tags || []);

  await writeAuditLog({
    adminId: params.adminId,
    action: params.publish ? "game.publish" : "game.save_draft",
    targetType: "game",
    targetId: game.id,
    detail: { version: manifest.version, slug: manifest.slug },
  });

  return { game, version };
}

async function syncTags(gameId: string, tags: string[]) {
  await prisma.gameTagRelation.deleteMany({ where: { gameId } });
  for (const name of tags.slice(0, 5)) {
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, "");
    let tag = await prisma.gameTag.findFirst({
      where: { OR: [{ name }, { slug: slug || name }] },
    });
    if (!tag) {
      tag = await prisma.gameTag.create({
        data: { name, slug: slug || `tag-${Date.now()}` },
      });
    }
    await prisma.gameTagRelation.create({
      data: { gameId, tagId: tag.id },
    });
  }
}

export async function publishGame(gameId: string, adminId: string) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { currentVersion: true },
  });
  if (!game || !game.currentVersion) throw new Error("游戏或版本不存在");

  const updated = await prisma.game.update({
    where: { id: gameId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  await prisma.gameVersion.update({
    where: { id: game.currentVersion.id },
    data: { publishedAt: new Date() },
  });
  await writeAuditLog({
    adminId,
    action: "game.publish",
    targetType: "game",
    targetId: gameId,
  });
  return updated;
}

export async function unpublishGame(gameId: string, adminId: string) {
  const updated = await prisma.game.update({
    where: { id: gameId },
    data: { status: "UNPUBLISHED" },
  });
  await writeAuditLog({
    adminId,
    action: "game.unpublish",
    targetType: "game",
    targetId: gameId,
  });
  return updated;
}

export async function deleteGame(gameId: string, adminId: string) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { versions: true },
  });
  if (!game) throw new Error("游戏不存在");

  // Break CurrentVersion FK before cascade delete of versions.
  await prisma.game.update({
    where: { id: gameId },
    data: { currentVersionId: null },
  });
  await prisma.game.delete({ where: { id: gameId } });

  // Best-effort cleanup of published objects (ignore missing keys).
  const keys = new Set<string>([`${game.slug}/current.json`]);
  for (const v of game.versions) {
    keys.add(`${game.slug}/${v.version}/index.html`);
    keys.add(`${game.slug}/${v.version}/package.zip`);
    keys.add(`${game.slug}/${v.version}/cover.webp`);
    keys.add(`${game.slug}/${v.version}/icon.png`);
  }
  await Promise.allSettled(
    [...keys].map((key) => deleteObject(gamesBucket(), key)),
  );

  await writeAuditLog({
    adminId,
    action: "game.delete",
    targetType: "game",
    targetId: gameId,
    detail: { slug: game.slug, title: game.title },
  });
}

export async function rollbackGame(
  gameId: string,
  versionId: string,
  adminId: string,
) {
  const version = await prisma.gameVersion.findFirst({
    where: { id: versionId, gameId },
  });
  if (!version) throw new Error("版本不存在");

  const manifest = version.manifestJson as GameManifest;
  await putObject({
    bucket: gamesBucket(),
    key: `${manifest.slug}/current.json`,
    body: JSON.stringify(
      { version: version.version, publishedAt: new Date().toISOString() },
      null,
      2,
    ),
    contentType: "application/json",
  });

  const updated = await prisma.game.update({
    where: { id: gameId },
    data: {
      currentVersionId: version.id,
      title: manifest.title,
      shortDescription: manifest.shortDescription,
      description: manifest.description,
      status: "PUBLISHED",
      coverUrl: publicObjectUrl(
        gamesBucket(),
        `${manifest.slug}/${version.version}/${manifest.cover}`,
      ),
    },
  });

  await writeAuditLog({
    adminId,
    action: "game.rollback",
    targetType: "game",
    targetId: gameId,
    detail: { version: version.version },
  });

  return updated;
}

export function gamePlayUrl(entryUrl: string) {
  // Prefer GAME_ORIGIN based URL if entry already absolute
  if (entryUrl.startsWith("http")) return entryUrl;
  return `${env.GAME_ORIGIN}/${entryUrl}`;
}

export async function loadUploadBuffer(storageKey: string) {
  return getObjectBuffer(uploadsBucket(), storageKey);
}
