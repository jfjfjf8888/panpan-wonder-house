export type HeatInput = {
  starts7d: number;
  uniquePlayers7d: number;
  averageDuration: number;
  completionRate: number;
  repeatRate: number;
};

function normalize(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.min(1, value / max);
}

export function computeHeatScore(
  item: HeatInput,
  cohortMax: HeatInput,
): number {
  const score =
    normalize(item.starts7d, cohortMax.starts7d) * 45 +
    normalize(item.uniquePlayers7d, cohortMax.uniquePlayers7d) * 25 +
    normalize(item.averageDuration, cohortMax.averageDuration) * 15 +
    normalize(item.completionRate, Math.max(cohortMax.completionRate, 1)) * 10 +
    normalize(item.repeatRate, Math.max(cohortMax.repeatRate, 1)) * 5;

  return Math.round(Math.min(100, Math.max(0, score)) * 10) / 10;
}

export function maxHeatInputs(items: HeatInput[]): HeatInput {
  return items.reduce(
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
}
