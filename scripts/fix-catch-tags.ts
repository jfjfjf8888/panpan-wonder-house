import { prisma } from "../lib/database/prisma";

async function main() {
  const game = await prisma.game.findUnique({ where: { slug: "catch-stars" } });
  if (!game) return;
  for (const name of ["反应", "休闲"]) {
    const tag = await prisma.gameTag.findFirst({ where: { name } });
    if (!tag) continue;
    await prisma.gameTagRelation.upsert({
      where: { gameId_tagId: { gameId: game.id, tagId: tag.id } },
      update: {},
      create: { gameId: game.id, tagId: tag.id },
    });
  }
  console.log("tags fixed");
}

main().finally(() => prisma.$disconnect());
