import type { z } from "zod";
import { allow, clientIp } from "./ratelimit";

/** Rate-limit, parse JSON and validate. Returns the data or an error Response. */
export async function readBody<T>(req: Request, schema: z.ZodType<T>): Promise<{ data: T } | { error: Response }> {
  if (!allow(clientIp(req))) return { error: Response.json({ error: "rate_limited" }, { status: 429 }) };
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { error: Response.json({ error: "invalid_json" }, { status: 400 }) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { error: Response.json({ error: "invalid_request" }, { status: 400 }) };
  return { data: parsed.data };
}
