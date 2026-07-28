import { createHash, randomBytes } from "crypto";

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return sha256(ip.trim().toLowerCase());
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}
