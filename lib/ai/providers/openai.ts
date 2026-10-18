import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ChatRequest, Provider, StructuredRequest } from "./types";

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.5";

export function openaiProvider(): Provider {
  const c = new OpenAI({ maxRetries: 1 });
  return {
    async structured(req: StructuredRequest) {
      const res = await c.responses.parse(
        {
          model: OPENAI_MODEL,
          instructions: req.system,
          input: [{ role: "user", content: [{ type: "input_text", text: req.facts }, { type: "input_text", text: req.ask }] }],
          reasoning: { effort: req.effort },
          max_output_tokens: req.maxTokens,
          text: { format: zodTextFormat(req.wire, "result") },
        },
        { timeout: req.timeoutMs },
      );
      if (res.status === "incomplete") return null;
      return res.output_parsed;
    },
    async *stream(req: ChatRequest) {
      const [first, ...rest] = req.messages;
      const stream = c.responses.stream(
        {
          model: OPENAI_MODEL,
          instructions: req.system,
          input: [
            { role: "user", content: [{ type: "input_text", text: req.facts }, { type: "input_text", text: first.content }] },
            ...rest.map((m) => ({ role: m.role, content: m.content })),
          ],
          reasoning: { effort: "low" },
          max_output_tokens: req.maxTokens,
        },
        { timeout: req.timeoutMs },
      );
      for await (const event of stream) {
        if (event.type === "response.output_text.delta") yield event.delta;
      }
    },
  };
}
