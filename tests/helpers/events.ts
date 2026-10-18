import type { ModuleEvent } from "@/lib/recorder/events";

/** Tiny builder for event logs in tests; times are in seconds. */
export function log() {
  const events: ModuleEvent[] = [{ t: 0, type: "module_start" }];
  const ms = (s: number) => Math.round(s * 1000);
  const api = {
    visit(qid: string, from: number, to: number, acts: ((qid: string) => void)[] = []) {
      events.push({ t: ms(from), type: "question_enter", qid });
      acts.forEach((a) => a(qid));
      events.push({ t: ms(to), type: "question_leave", qid });
      return api;
    },
    at(t: number, type: ModuleEvent["type"], qid?: string, payload?: ModuleEvent["payload"]) {
      events.push({ t: ms(t), type, qid, payload });
      return api;
    },
    select: (t: number, answer: string) => (qid: string) => events.push({ t: ms(t), type: "answer_select", qid, payload: { answer } }),
    clear: (t: number) => (qid: string) => events.push({ t: ms(t), type: "answer_clear", qid }),
    desmos: (open: number, close?: number) => (qid: string) => {
      events.push({ t: ms(open), type: "desmos_open", qid });
      if (close !== undefined) events.push({ t: ms(close), type: "desmos_close", qid });
    },
    end(t: number, reason: "finish" | "timeout" = "finish") {
      events.push({ t: ms(t), type: "module_end", payload: { reason } });
      return events.sort((a, b) => a.t - b.t);
    },
    events,
  };
  return api;
}
