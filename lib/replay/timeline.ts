import type { ModuleEvent } from "@/lib/recorder/events";

export type TimelineItem = {
  at: number;
  kind: "enter" | "leave" | "select" | "clear" | "eliminate" | "mark" | "desmos-open" | "desmos-close";
  label: string;
  /** On leave items: length of the visit that just ended. */
  durationMs?: number;
};

export function buildTimeline(events: ModuleEvent[], qid: string): TimelineItem[] {
  const items: TimelineItem[] = [];
  let enteredAt: number | null = null;
  let visits = 0;
  for (const e of events) {
    if (e.type === "module_end") {
      if (enteredAt !== null)
        items.push({ at: e.t, kind: "leave", label: e.payload?.reason === "timeout" ? "Time ran out" : "Finished module", durationMs: e.t - enteredAt });
      break;
    }
    if (e.qid !== qid) continue;
    switch (e.type) {
      case "question_enter":
        enteredAt = e.t;
        items.push({ at: e.t, kind: "enter", label: visits++ ? "Came back" : "Opened question" });
        break;
      case "question_leave":
        items.push({ at: e.t, kind: "leave", label: "Left question", durationMs: enteredAt === null ? undefined : e.t - enteredAt });
        enteredAt = null;
        break;
      case "answer_select":
        items.push({ at: e.t, kind: "select", label: `Chose ${e.payload?.answer ?? "?"}` });
        break;
      case "answer_clear":
        items.push({ at: e.t, kind: "clear", label: "Cleared answer" });
        break;
      case "choice_eliminate":
        items.push({ at: e.t, kind: "eliminate", label: `Crossed out ${e.payload?.choice ?? "?"}` });
        break;
      case "mark_toggle":
        items.push({ at: e.t, kind: "mark", label: "Marked for review" });
        break;
      case "desmos_open":
        items.push({ at: e.t, kind: "desmos-open", label: "Opened Desmos" });
        break;
      case "desmos_close":
        items.push({ at: e.t, kind: "desmos-close", label: "Closed Desmos" });
        break;
    }
  }
  return items;
}
