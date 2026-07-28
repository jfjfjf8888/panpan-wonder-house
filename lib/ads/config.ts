import { prisma } from "@/lib/database/prisma";

export async function getAdConfig() {
  let config = await prisma.adConfig.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!config) {
    config = await prisma.adConfig.create({
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
          interstitialMaxPerSession: 1,
          rewardedCooldownSeconds: 60,
        },
      },
    });
  }
  return config;
}

export async function updateAdConfig(data: {
  globalEnabled?: boolean;
  siteAdsEnabled?: boolean;
  gameAdsEnabled?: boolean;
  provider?: string | null;
  configJson?: object;
}) {
  const current = await getAdConfig();
  return prisma.adConfig.update({
    where: { id: current.id },
    data: {
      globalEnabled: data.globalEnabled ?? current.globalEnabled,
      siteAdsEnabled: data.siteAdsEnabled ?? current.siteAdsEnabled,
      gameAdsEnabled: data.gameAdsEnabled ?? current.gameAdsEnabled,
      provider: data.provider === undefined ? current.provider : data.provider,
      configJson: data.configJson ?? current.configJson ?? undefined,
    },
  });
}

export function isSiteAdEnabled(
  config: Awaited<ReturnType<typeof getAdConfig>>,
  slot: string,
) {
  if (!config.globalEnabled || !config.siteAdsEnabled) return false;
  const slots = (config.configJson as { slots?: Record<string, boolean> } | null)
    ?.slots;
  return Boolean(slots?.[slot]);
}
