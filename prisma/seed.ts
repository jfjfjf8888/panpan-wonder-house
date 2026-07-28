import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123456";

  const passwordHash = await hashPassword(password);
  await prisma.admin.upsert({
    where: { username },
    update: { passwordHash, status: "ACTIVE" },
    create: { username, passwordHash, status: "ACTIVE" },
  });

  const ad = await prisma.adConfig.findFirst();
  if (!ad) {
    await prisma.adConfig.create({
      data: {
        globalEnabled: false,
        siteAdsEnabled: false,
        gameAdsEnabled: false,
        configJson: {
          slots: {
            HOME_TOP: false,
            HOME_FEED: false,
            GAME_TOP: false,
            GAME_BOTTOM: false,
            GAME_DESKTOP_SIDE: false,
          },
          testMode: true,
        },
      },
    });
  }

  const tags = [
    { name: "益智", slug: "puzzle" },
    { name: "休闲", slug: "casual" },
    { name: "反应", slug: "reflex" },
  ];
  for (const tag of tags) {
    await prisma.gameTag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name },
      create: tag,
    });
  }

  console.log(`Seed complete. Admin user: ${username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
