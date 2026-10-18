import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import type { ChatMessage } from "./schemas";

export const MODEL = "claude-opus-5-5";
const BETAS = ["server-side-fallback-2026-07-01"];

let client: Anthropic | null | undefined;

export function getClient(): Anthropic | null {
  if (client === undefined) client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ maxRetries: 1 }) : null;
  return client;
}

type Effort = "low" | "medium";

function request(system: string, facts: string, ask: string) {
  return {
    system: [{ type: "text" as const, text: system, cache_control: { type: "ephemeral" as const } }],
    messages: [
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: facts, cache_control: { type: "ephemeral" as const } },
          { type: "text" as const, text: ask },
        ],
      },
    ],
  };
}

/** Structured call. Returns null on no key, timeout, refusal, API error or schema mismatch. */
export async function structured<T>(
  schema: z.ZodType<T>,
  opts: { system: string; facts: string; ask: string; effort: Effort; maxTokens: number; timeoutMs?: number },
): Promise<T | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const res = await c.beta.messages.parse(
      {
        model: MODEL,
        max_tokens: opts.maxTokens,
        betas: BETAS,
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: opts.effort, format: betaZodOutputFormat(schema) },
        ...request(opts.system, opts.facts, opts.ask),
      },
      { timeout: opts.timeoutMs ?? 8000 },
    );
    if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") return null;
    const parsed = schema.safeParse(res.parsed_output);
    return parsed.success ? parsed.data : null;
  } catch (err) {
    if (err instanceof Anthropic.APIError) console.warn(`[ai] ${err.status} ${err.name}`);
    else console.warn("[ai] structured call failed", (err as Error)?.name);
    return null;
  }
}

/** Streamed chat reply as text chunks, or null when offline. */
export function streamReply(opts: { system: string; facts: string; messages: ChatMessage[]; maxTokens: number; timeoutMs?: number }): AsyncIterable<string> | null {
  const c = getClient();
  if (!c) return null;
  const [first, ...rest] = opts.messages;
  const stream = c.beta.messages.stream(
    {
      model: MODEL,
      max_tokens: opts.maxTokens,
      betas: BETAS,
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: opts.facts, cache_control: { type: "ephemeral" } },
            { type: "text", text: first.content },
          ],
        },
        ...rest.map((m) => ({ role: m.role, content: m.content })),
      ],
    },
    { timeout: opts.timeoutMs ?? 30_000 },
  );
  return (async function* () {
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
    }
  })();
}
