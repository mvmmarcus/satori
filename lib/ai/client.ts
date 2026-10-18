import type { z } from "zod";
import { resolveProvider, type ProviderName } from "./provider";
import { anthropicProvider } from "./providers/anthropic";
import { openaiProvider } from "./providers/openai";
import type { Effort, Provider } from "./providers/types";
import type { ChatMessage } from "./schemas";

let instance: { name: ProviderName; provider: Provider } | null | undefined;

function current() {
  if (instance === undefined) {
    const name = resolveProvider();
    instance = name ? { name, provider: name === "openai" ? openaiProvider() : anthropicProvider() } : null;
  }
  return instance;
}

export function providerName(): ProviderName | null {
  return current()?.name ?? null;
}

/** Structured call. Returns null on no key, timeout, refusal, truncation, API error or schema mismatch. */
export async function structured<T>(
  schema: z.ZodType<T>,
  opts: { system: string; facts: string; ask: string; effort: Effort; maxTokens: number; timeoutMs?: number; wire?: z.ZodType },
): Promise<T | null> {
  const c = current();
  if (!c) return null;
  try {
    const raw = await c.provider.structured({ ...opts, timeoutMs: opts.timeoutMs ?? 8000, wire: opts.wire ?? schema });
    const parsed = schema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch (err) {
    const e = err as { status?: number; name?: string };
    console.warn(`[ai:${c.name}] structured call failed`, e?.status ?? "", e?.name ?? "");
    return null;
  }
}

/** Streamed chat reply as text chunks, or null when offline. */
export function streamReply(opts: { system: string; facts: string; messages: ChatMessage[]; maxTokens: number; timeoutMs?: number }): AsyncIterable<string> | null {
  const c = current();
  if (!c) return null;
  return c.provider.stream({ ...opts, timeoutMs: opts.timeoutMs ?? 30_000 });
}
