import { z } from "zod";

export type EventType =
  | "module_start" | "question_enter" | "question_leave" | "answer_select" | "answer_clear"
  | "choice_eliminate" | "mark_toggle" | "desmos_open" | "desmos_close" | "module_end";

export type ModuleEvent = {
  /** ms since module start */
  t: number;
  type: EventType;
  qid?: string;
  payload?: { answer?: string; choice?: string; reason?: "finish" | "timeout" };
};

export const MAX_EVENTS = 5000;

export const ModuleEventSchema = z.object({
  t: z.number().int().nonnegative().max(24 * 60 * 60 * 1000),
  type: z.enum([
    "module_start", "question_enter", "question_leave", "answer_select", "answer_clear",
    "choice_eliminate", "mark_toggle", "desmos_open", "desmos_close", "module_end",
  ]),
  qid: z.string().max(8).optional(),
  payload: z
    .object({
      answer: z.string().max(12).optional(),
      choice: z.string().max(2).optional(),
      reason: z.enum(["finish", "timeout"]).optional(),
    })
    .optional(),
}) satisfies z.ZodType<ModuleEvent>;

export const EventsSchema = z.array(ModuleEventSchema).max(MAX_EVENTS);
