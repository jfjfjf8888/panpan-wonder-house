import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { env } from "@/lib/env";
import { verifyPassword } from "@/lib/auth/password";
import { createCsrfToken, verifyCsrfToken } from "@/lib/security/csrf";
import { generateToken, hashIp, sha256 } from "@/lib/security/hash";

export const SESSION_COOKIE = "panpan_admin_session";
export const CSRF_COOKIE = "panpan_csrf";
const SESSION_DAYS = 1;

export type AdminSessionInfo = {
  sessionId: string;
  adminId: string;
  username: string;
  csrfToken: string;
};

function sessionExpiry() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export async function loginAdmin(params: {
  username: string;
  password: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ ok: true; token: string; csrfToken: string } | { ok: false; error: string }> {
  const admin = await prisma.admin.findUnique({
    where: { username: params.username },
  });

  if (!admin || admin.status !== "ACTIVE") {
    return { ok: false, error: "用户名或密码错误" };
  }

  const valid = await verifyPassword(params.password, admin.passwordHash);
  if (!valid) {
    return { ok: false, error: "用户名或密码错误" };
  }

  const token = generateToken(32);
  const session = await prisma.adminSession.create({
    data: {
      adminId: admin.id,
      tokenHash: sha256(token),
      ipHash: hashIp(params.ip),
      userAgent: params.userAgent?.slice(0, 500) ?? null,
      expiresAt: sessionExpiry(),
    },
  });

  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const csrfToken = createCsrfToken(session.id);
  return { ok: true, token, csrfToken };
}

export async function logoutAdmin(token: string | undefined) {
  if (!token) return;
  await prisma.adminSession.deleteMany({
    where: { tokenHash: sha256(token) },
  });
}

export async function getSessionFromToken(
  token: string | undefined,
): Promise<AdminSessionInfo | null> {
  if (!token) return null;
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { admin: true },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.adminSession.delete({ where: { id: session.id } });
    return null;
  }
  if (session.admin.status !== "ACTIVE") return null;

  return {
    sessionId: session.id,
    adminId: session.adminId,
    username: session.admin.username,
    csrfToken: createCsrfToken(session.id),
  };
}

export async function getAdminSession(): Promise<AdminSessionInfo | null> {
  const jar = await cookies();
  return getSessionFromToken(jar.get(SESSION_COOKIE)?.value);
}

export async function requireAdmin(): Promise<AdminSessionInfo> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export function applySessionCookies(
  response: NextResponse,
  token: string,
  csrfToken: string,
) {
  const secure = env.NODE_ENV === "production";
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  response.cookies.set(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return response;
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set(CSRF_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

export async function requireAdminApi(request: NextRequest): Promise<
  | { ok: true; session: AdminSessionInfo }
  | { ok: false; response: NextResponse }
> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await getSessionFromToken(token);
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "未登录" }, { status: 401 }),
    };
  }

  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    const headerToken = request.headers.get("x-csrf-token");
    if (!verifyCsrfToken(session.sessionId, headerToken)) {
      return {
        ok: false,
        response: NextResponse.json({ error: "CSRF 校验失败" }, { status: 403 }),
      };
    }
  }

  return { ok: true, session };
}
