import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

// Short-lived signed session token: the AI routes only answer requests that carry one, so the
// paid endpoints can't be called anonymously, and limits can be applied per session.
export const SESSION_TTL_MS = 6 * 60 * 60_000;
const CLOCK_SKEW_MS = 60_000;

const sign = (body: string, secret: string) => createHmac("sha256", secret).update(body).digest("base64url");

export function signSession(secret: string, now = Date.now(), sid = randomUUID()): string {
  const body = Buffer.from(JSON.stringify({ sid, iat: now })).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function verifySession(token: string | null | undefined, secret: string, now = Date.now()): { sid: string } | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [body, sig] = parts;
  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { sid, iat } = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { sid?: unknown; iat?: unknown };
    if (typeof sid !== "string" || typeof iat !== "number") return null;
    if (iat > now + CLOCK_SKEW_MS || now - iat > SESSION_TTL_MS) return null;
    return { sid };
  } catch {
    return null;
  }
}

let devSecret: string | undefined;

/** SESSION_SECRET in production; a per-process random secret in development. Null means misconfigured. */
export function sessionSecret(): string | null {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") return null;
  devSecret ??= randomBytes(32).toString("hex");
  return devSecret;
}
