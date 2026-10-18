const WINDOW_MS = 10 * 60_000;
const LIMIT = 60;
const hits = new Map<string, number[]>();

/** In-memory rolling-window limiter. Per server instance; good enough for a demo. */
export function allow(ip: string, now = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) hits.delete(hits.keys().next().value!);
  return true;
}

/**
 * Client address for rate limiting. Prefers x-real-ip (set by the platform on Vercel); otherwise the
 * last x-forwarded-for hop, i.e. the one our own proxy appended, which the client can't forge.
 */
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const hops = req.headers.get("x-forwarded-for")?.split(",").map((h) => h.trim()).filter(Boolean);
  return hops?.at(-1) || "local";
}
