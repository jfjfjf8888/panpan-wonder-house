import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";
import { generateToken } from "@/lib/security/hash";

export function createCsrfToken(sessionId: string): string {
  const nonce = generateToken(16);
  const sig = createHmac("sha256", env.CSRF_SECRET)
    .update(`${sessionId}:${nonce}`)
    .digest("hex");
  return `${nonce}.${sig}`;
}

export function verifyCsrfToken(sessionId: string, token: string | null): boolean {
  if (!token) return false;
  const [nonce, sig] = token.split(".");
  if (!nonce || !sig) return false;
  const expected = createHmac("sha256", env.CSRF_SECRET)
    .update(`${sessionId}:${nonce}`)
    .digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}
