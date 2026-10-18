import type { z } from "zod";
import { endReason } from "@/lib/recorder/metrics";
import type { ModuleEvent } from "@/lib/recorder/events";
import { guardAi } from "@/lib/security/guard";

const MAX_BODY = 1_000_000; // the largest real event log is ~500 KB

/**
 * Everything an AI route needs before doing paid work: access checks, size limit, JSON + schema
 * validation, and a finished module (the coach sees verified answers, so never mid-test).
 */
export async function readAiRequest<T extends { events: ModuleEvent[] }>(req: Request, schema: z.ZodType<T>): Promise<{ data: T } | { error: Response }> {
  const tooBig = () => ({ error: Response.json({ error: "too_large" }, { status: 413 }) });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return tooBig();
  const denied = await guardAi(req);
  if (denied) return { error: denied };
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
  if (endReason(parsed.data.events) === null) return { error: Response.json({ error: "module_not_finished" }, { status: 409 }) };
  return { data: parsed.data };
}
