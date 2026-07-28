import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import { sha256 } from "@/lib/security/hash";

export const analyticsEventSchema = z.object({
  eventType: z.enum([
    "PAGE_VIEW",
    "GAME_IMPRESSION",
    "GAME_OPEN",
    "GAME_READY",
    "GAME_START",
    "GAME_END",
    "GAME_ERROR",
    "AD_REQUEST",
    "AD_RESULT",
  ]),
  gameId: z.string().max(64).optional().nullable(),
  gameVersion: z.string().max(32).optional().nullable(),
  visitorId: z.string().uuid(),
  sessionId: z.string().min(8).max(128),
  path: z.string().max(500),
  deviceType: z.enum(["mobile", "tablet", "desktop", "unknown"]).optional(),
  browser: z.string().max(100).optional().nullable(),
  os: z.string().max(100).optional().nullable(),
  referrer: z.string().max(500).optional().nullable(),
  properties: z.record(z.unknown()).optional(),
});

export const analyticsBatchSchema = z.object({
  events: z.array(analyticsEventSchema).min(1).max(50),
});

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;

export async function recordEvents(events: AnalyticsEventInput[]) {
  const rows = [];

  for (const event of events) {
    let gameVersionId: string | null = null;
    let gameDbId: string | null = null;

    if (event.gameId) {
      const game = await prisma.game.findFirst({
        where: {
          OR: [{ id: event.gameId }, { slug: event.gameId }],
        },
        include: {
          versions: event.gameVersion
            ? { where: { version: event.gameVersion }, take: 1 }
            : false,
          currentVersion: true,
        },
      });
      if (game) {
        gameDbId = game.id;
        if (event.gameVersion && Array.isArray(game.versions) && game.versions[0]) {
          gameVersionId = game.versions[0].id;
        } else {
          gameVersionId = game.currentVersionId;
        }
      }
    }

    rows.push({
      eventType: event.eventType,
      gameId: gameDbId,
      gameVersionId,
      visitorIdHash: sha256(event.visitorId),
      sessionId: event.sessionId,
      path: event.path,
      deviceType: event.deviceType ?? null,
      browser: event.browser ?? null,
      os: event.os ?? null,
      referrer: event.referrer ?? null,
      propertiesJson: (event.properties ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
    });
  }

  await prisma.analyticsEvent.createMany({
    data: rows as Prisma.AnalyticsEventCreateManyInput[],
  });
  return { accepted: rows.length };
}
