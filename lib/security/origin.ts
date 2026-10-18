/**
 * Accept only requests made by our own pages. Browsers always send Origin on these POSTs; a missing
 * or foreign Origin means another site or a bare script. ALLOWED_ORIGINS adds extra origins.
 */
export function isAllowedOrigin(req: Request, extra: string | undefined = process.env.ALLOWED_ORIGINS): boolean {
  const origin = req.headers.get("origin");
  if (!origin || origin === "null") return false;
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  const self = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (self && host === self) return true;
  return (extra ?? "").split(",").map((o) => o.trim()).filter(Boolean).includes(origin);
}
