import type { z } from "zod";
import type { ChatMessage } from "../schemas";

export type Effort = "low" | "medium";

export type StructuredRequest = { system: string; facts: string; ask: string; effort: Effort; maxTokens: number; timeoutMs: number; wire: z.ZodType };
export type ChatRequest = { system: string; facts: string; messages: ChatMessage[]; maxTokens: number; timeoutMs: number };

export interface Provider {
  /** Raw parsed JSON from the model, or null on refusal / truncation. Throws on transport errors. */
  structured(req: StructuredRequest): Promise<unknown>;
  stream(req: ChatRequest): AsyncIterable<string>;
}
