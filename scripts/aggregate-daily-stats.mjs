import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalize(value, max) {
  if (max <= 0) return 0;
  return Math.min(1, value / max);
}

function computeHeatScore(item, cohortMax) {
  const score =
    normalize(item.starts7d, cohortMax.starts7d) * 45 +
    normalize(item.uniquePlayers7d, cohortMax.uniquePlayers7d) * 25 +
    normalize(item.averageDuration, cohortMax.averageDuration) * 15 +
    normalize(item.completionRate, Math.max(cohortMax.completionRate, 1)) * 10 +
    normalize(item.repeatRate, Math.max(cohortMax.repeatRate, 1)) * 5;
  return Math.round(Math.min(100, Math.max(0, score)) * 10) / 10;
}

function dayStart(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function main() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const games = await prisma.game.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true },
  });

  const inputs = [];
  for (const game of games) {
    const starts = await prisma.analyticsEvent.findMany({
      where: {
        gameId: game.id,
        eventType: "GAME_START",
        createdAt: { gte: since },
      },
      select: { visitorIdHash: true },
    });
    const ends = await prisma.analyticsEvent.findMany({
      where: {
        gameId: game.id,
        eventType: "GAME_END",
        createdAt: { gte: since },
      },
      select: { propertiesJson: true, visitorIdHash: true },
    });
    const uniquePlayers7d = new Set(starts.map((s) => s.visitorIdHash)).size;
    const durations = ends
      .map((e) => {
        const p = e.propertiesJson || {};
        return Number(p.durationSeconds || 0);
      })
      .filter((n) => n > 0);
    const averageDuration =
      durations.length === 0
        ? 0
        : durations.reduce((a, b) => a + b, 0) / durations.length;
    const completed = ends.filter((e) => {
      const p = e.propertiesJson || {};
      return p.result === "completed";
    }).length;
    const completionRate = ends.length ? completed / ends.length : 0;
    const visitorStarts = new Map();
    for (const s of starts) {
      visitorStarts.set(
        s.visitorIdHash,
        (visitorStarts.get(s.visitorIdHash) || 0) + 1,
      );
    }
    const repeatPlayers = [...visitorStarts.values()].filter((n) => n > 1).length;
    const repeatRate = uniquePlayers7d ? repeatPlayers / uniquePlayers7d : 0;

    inputs.push({
      gameId: game.id,
      starts7d: starts.length,
      uniquePlayers7d,
      averageDuration,
      completionRate,
      repeatRate,
    });
  }

  const cohortMax = inputs.reduce(
    (acc, cur) => ({
      starts7d: Math.max(acc.starts7d, cur.starts7d),
      uniquePlayers7d: Math.max(acc.uniquePlayers7d, cur.uniquePlayers7d),
      averageDuration: Math.max(acc.averageDuration, cur.averageDuration),
      completionRate: Math.max(acc.completionRate, cur.completionRate),
      repeatRate: Math.max(acc.repeatRate, cur.repeatRate),
    }),
    {
      starts7d: 0,
      uniquePlayers7d: 0,
      averageDuration: 0,
      completionRate: 0,
      repeatRate: 0,
    },
  );

  const today = dayStart();
  for (const item of inputs) {
    const heatScore = computeHeatScore(item, cohortMax);
    await prisma.game.update({
      where: { id: item.gameId },
      data: { heatScore },
    });
    await prisma.dailyGameStat.upsert({
      where: { date_gameId: { date: today, gameId: item.gameId } },
      update: {
        gameStarts: item.starts7d,
        uniqueVisitors: item.uniquePlayers7d,
        averageDuration: item.averageDuration,
        completionRate: item.completionRate,
        repeatRate: item.repeatRate,
        heatScore,
      },
      create: {
        date: today,
        gameId: item.gameId,
        gameStarts: item.starts7d,
        uniqueVisitors: item.uniquePlayers7d,
        averageDuration: item.averageDuration,
        completionRate: item.completionRate,
        repeatRate: item.repeatRate,
        heatScore,
      },
    });
  }

  console.log(`Updated heat for ${inputs.length} games`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
