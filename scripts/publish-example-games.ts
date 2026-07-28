import fs from "fs";
import path from "path";
import { prisma } from "../lib/database/prisma";
import { ensureBuckets } from "../lib/storage/s3";
import { validateGamePackage } from "../lib/validation/game-package";
import { saveValidatedGame } from "../lib/games/service";

async function main() {
  await ensureBuckets();
  const admin = await prisma.admin.findFirst({ where: { status: "ACTIVE" } });
  if (!admin) throw new Error("No admin user. Run npm run db:seed first.");

  const dist = path.resolve("examples/dist");
  const files = fs
    .readdirSync(dist)
    .filter((f) => f.endsWith(".zip"))
    .sort();

  for (const file of files) {
    const buffer = fs.readFileSync(path.join(dist, file));
    const preview = validateGamePackage(buffer, { mode: "create" });
    if (!preview.manifest) {
      throw new Error(`No manifest in ${file}`);
    }

    const existing = await prisma.game.findUnique({
      where: { slug: preview.manifest.slug },
      include: { currentVersion: true },
    });

    const options = existing
      ? {
          mode: "update" as const,
          existingGameId: preview.manifest.id,
          existingSlug: existing.slug,
          currentVersion: existing.currentVersion?.version,
        }
      : { mode: "create" as const };

    const report = validateGamePackage(buffer, options);
    if (!report.passed) {
      console.error(
        "Validation failed for",
        file,
        report.issues.filter((i) => i.level === "ERROR"),
      );
      throw new Error(`Invalid package: ${file}`);
    }

    if (
      existing?.currentVersion?.version &&
      existing.currentVersion.version === report.manifest!.version
    ) {
      console.log("Skip same version", existing.slug, report.manifest!.version);
      continue;
    }

    const result = await saveValidatedGame({
      adminId: admin.id,
      buffer,
      report,
      publish: true,
      targetGameId: existing?.id,
      featured: report.manifest!.slug === "memory-card",
    });
    console.log(
      existing ? "Updated" : "Published",
      result.game.slug,
      result.version.version,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
