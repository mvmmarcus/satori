import { z } from "zod";
import { EventsSchema } from "@/lib/recorder/events";

export const CoachSchema = z.object({
  note: z.string().max(600),
  aiRead: z.object({ misconception: z.string().max(120), confidence: z.enum(["low", "med", "high"]) }).nullable(),
});

export const DebriefSchema = z.object({
  headline: z.string().max(140),
  patterns: z
    .array(z.object({ title: z.string().max(60), questionIds: z.array(z.string()), explanation: z.string().max(400) }))
    .min(1)
    .max(2),
  habits: z.array(z.string().max(160)).length(3),
});

export type CoachResult = z.infer<typeof CoachSchema>;
export type Debrief = z.infer<typeof DebriefSchema>;

const Qid = z.string().regex(/^q([1-9]|1\d|2[0-2])$/);

export const CoachRequest = z.object({ events: EventsSchema, qid: Qid, desmosAvailable: z.boolean() });
export const DebriefRequest = z.object({ events: EventsSchema, desmosAvailable: z.boolean() });
export const ASK_MAX_TURNS = 10;

export const AskRequest = CoachRequest.extend({
  messages: z
    .array(
      z.discriminatedUnion("role", [
        z.object({ role: z.literal("user"), content: z.string().min(1).max(1000) }),
        z.object({ role: z.literal("assistant"), content: z.string().min(1).max(4000) }),
      ]),
    )
    .min(1)
    .max(ASK_MAX_TURNS * 2 - 1)
    // A real thread alternates and ends with the student's new question. This blocks forged
    // assistant-only runs (many-shot prompting) and enforces the per-question turn cap server-side.
    .refine((ms) => ms.every((m, i) => m.role === (i % 2 === 0 ? "user" : "assistant")) && ms.at(-1)?.role === "user", "invalid_turns"),
});
export type ChatMessage = z.infer<typeof AskRequest>["messages"][number];

// Shapes sent to the model as the output format. Length limits are enforced afterwards by the
// strict schemas above (some providers' strict JSON-schema modes reject maxLength/minItems).
export const CoachWire = z.object({
  note: z.string(),
  aiRead: z.object({ misconception: z.string(), confidence: z.enum(["low", "med", "high"]) }).nullable(),
});
export const DebriefWire = z.object({
  headline: z.string(),
  patterns: z.array(z.object({ title: z.string(), questionIds: z.array(z.string()), explanation: z.string() })),
  habits: z.array(z.string()),
});
