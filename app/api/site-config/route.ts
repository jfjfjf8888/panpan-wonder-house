import { NextResponse } from "next/server";
import { getAdConfig } from "@/lib/ads/config";
import { env } from "@/lib/env";

export async function GET() {
  const ads = await getAdConfig();
  return NextResponse.json({
    siteName: "盼盼与熊大的妙妙屋",
    gameOrigin: env.GAME_ORIGIN,
    ads: {
      globalEnabled: ads.globalEnabled && env.ADS_ENABLED,
      siteAdsEnabled: ads.siteAdsEnabled,
      gameAdsEnabled: ads.gameAdsEnabled,
    },
  });
}
