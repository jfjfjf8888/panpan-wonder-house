import { prisma } from "../lib/database/prisma";

async function main() {
  const games = await prisma.game.findMany({
    include: {
      currentVersion: true,
      tagRelations: { include: { tag: true } },
    },
  });
  console.log(
    JSON.stringify(
      games.map((g) => ({
        slug: g.slug,
        status: g.status,
        ver: g.currentVersion?.version,
        entry: g.currentVersion?.entryUrl,
        tags: g.tagRelations.map((t) => t.tag.name),
      })),
      null,
      2,
    ),
  );
}

main()
  .finally(() => prisma.$disconnect());
