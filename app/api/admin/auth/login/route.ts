import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import {
  applySessionCookies,
  loginAdmin,
} from "@/lib/auth/session";
import { env } from "@/lib/env";
import { writeAuditLog } from "@/lib/audit/log";
import { hashIp } from "@/lib/security/hash";

const schema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "local";
  const limited = checkRateLimit(
    `login:${ip}`,
    env.LOGIN_RATE_LIMIT_PER_MINUTE,
  );
  if (!limited.ok) {
    return NextResponse.json({ error: "登录尝试过多，请稍后再试" }, { status: 429 });
  }

  try {
    const body = schema.parse(await request.json());
    const result = await loginAdmin({
      username: body.username,
      password: body.password,
      ip,
      userAgent: request.headers.get("user-agent"),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    await writeAuditLog({
      action: "admin.login",
      ipHash: hashIp(ip),
      detail: { username: body.username },
    });

    const response = NextResponse.json({
      ok: true,
      csrfToken: result.csrfToken,
    });
    return applySessionCookies(response, result.token, result.csrfToken);
  } catch {
    return NextResponse.json({ error: "请求无效" }, { status: 400 });
  }
}
