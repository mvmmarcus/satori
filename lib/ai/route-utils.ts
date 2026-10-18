import type { z } from "zod";
import { allow, clientIp } from "./ratelimit";

/** Rate-limit, parse JSON and validate. Returns the data or an error Response. */
const MAX_BODY = 1_000_000; // the largest real event log is ~500 KB

export async function readBody<T>(req: Request, schema: z.ZodType<T>): Promise<{ data: T } | { error: Response }> {
  const tooBig = () => ({ error: Response.json({ error: "too_large" }, { status: 413 }) });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return tooBig();
  if (!allow(clientIp(req))) return { error: Response.json({ error: "rate_limited" }, { status: 429 }) };
  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return tooBig();
    body = JSON.parse(text);
  } catch {
    return { error: Response.json({ error: "invalid_json" }, { status: 400 }) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { error: Response.json({ error: "invalid_request" }, { status: 400 }) };
  return { data: parsed.data };
}
