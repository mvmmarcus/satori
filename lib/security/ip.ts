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
