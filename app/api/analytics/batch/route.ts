import { NextRequest, NextResponse } from "next/server";
import {
  analyticsBatchSchema,
  recordEvents,
} from "@/lib/analytics/events";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "local";
  const limit = checkRateLimit(
    `analytics-batch:${ip}`,
    env.ANALYTICS_RATE_LIMIT_PER_MINUTE,
  );
  if (!limit.ok) {
    return NextResponse.json({ error: "请求过于频繁" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = analyticsBatchSchema.parse(body);
    const result = await recordEvents(parsed.events);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "事件格式无效" }, { status: 400 });
  }
}
