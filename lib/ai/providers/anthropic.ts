import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { ChatRequest, Provider, StructuredRequest } from "./types";

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
const BETAS = ["server-side-fallback-2026-07-01"];

const cached = (text: string) => ({ type: "text" as const, text, cache_control: { type: "ephemeral" as const } });

export function anthropicProvider(): Provider {
  const c = new Anthropic({ maxRetries: 1 });
  return {
    async structured(req: StructuredRequest) {
      const res = await c.beta.messages.parse(
        {
          model: ANTHROPIC_MODEL,
          max_tokens: req.maxTokens,
          betas: BETAS,
          fallbacks: "default",
          thinking: { type: "adaptive" },
          output_config: { effort: req.effort, format: betaZodOutputFormat(req.wire) },
          system: [cached(req.system)],
          messages: [{ role: "user", content: [cached(req.facts), { type: "text", text: req.ask }] }],
        },
        { timeout: req.timeoutMs },
      );
      if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") return null;
      return res.parsed_output;
    },
    async *stream(req: ChatRequest) {
      const [first, ...rest] = req.messages;
      const stream = c.beta.messages.stream(
        {
          model: ANTHROPIC_MODEL,
          max_tokens: req.maxTokens,
          betas: BETAS,
          fallbacks: "default",
          thinking: { type: "adaptive" },
          output_config: { effort: "low" },
          system: [cached(req.system)],
          messages: [
            { role: "user", content: [cached(req.facts), { type: "text", text: first.content }] },
            ...rest.map((m) => ({ role: m.role, content: m.content })),
          ],
        },
        { timeout: req.timeoutMs },
      );
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
      }
    },
  };
}
