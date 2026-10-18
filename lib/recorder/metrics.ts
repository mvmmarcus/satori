import type { ModuleEvent } from "./events";

type Interval = [number, number];

export function endTime(events: ModuleEvent[]): number {
  const end = events.find((e) => e.type === "module_end");
  return end ? end.t : events.length ? events[events.length - 1].t : 0;
}

export function endReason(events: ModuleEvent[]): "finish" | "timeout" | null {
  return events.find((e) => e.type === "module_end")?.payload?.reason ?? null;
}

function intervals(events: ModuleEvent[], open: (e: ModuleEvent) => boolean, close: (e: ModuleEvent) => boolean): Interval[] {
  const out: Interval[] = [];
  let start: number | null = null;
  for (const e of events) {
    if (start === null && open(e)) start = e.t;
    else if (start !== null && close(e)) {
      out.push([start, e.t]);
      start = null;
    }
  }
  if (start !== null) out.push([start, endTime(events)]);
  return out;
}

export function activeIntervals(events: ModuleEvent[], qid: string): Interval[] {
  return intervals(
    events,
    (e) => e.type === "question_enter" && e.qid === qid,
    (e) => (e.type === "question_leave" && e.qid === qid) || e.type === "module_end",
  );
}

const length = (iv: Interval[]) => iv.reduce((s, [a, b]) => s + (b - a), 0);

export function activeMs(events: ModuleEvent[], qid: string): number {
  return length(activeIntervals(events, qid));
}

/** Time the calculator panel was open while this question was on screen. */
export function desmosMs(events: ModuleEvent[], qid: string): number {
  const desmos = intervals(events, (e) => e.type === "desmos_open", (e) => e.type === "desmos_close" || e.type === "module_end");
  let total = 0;
  for (const [a, b] of activeIntervals(events, qid))
    for (const [c, d] of desmos) total += Math.max(0, Math.min(b, d) - Math.max(a, c));
  return total;
}

export function answerHistory(events: ModuleEvent[], qid: string): (string | null)[] {
  const out: (string | null)[] = [];
  for (const e of events) {
    if (e.qid !== qid) continue;
    if (e.type === "answer_select") out.push(e.payload?.answer ?? null);
    else if (e.type === "answer_clear") out.push(null);
  }
  return out;
}

export function finalAnswer(events: ModuleEvent[], qid: string): string | null {
  const h = answerHistory(events, qid);
  return h.length ? h[h.length - 1] : null;
}

export function firstLeaveT(events: ModuleEvent[], qid: string): number | null {
  return events.find((e) => e.type === "question_leave" && e.qid === qid)?.t ?? null;
}

/** True if the question held a non-null answer at time t. */
export function answeredBefore(events: ModuleEvent[], qid: string, t: number): boolean {
  let current: string | null = null;
  for (const e of events) {
    if (e.t > t) break;
    if (e.qid !== qid) continue;
    if (e.type === "answer_select") current = e.payload?.answer ?? null;
    else if (e.type === "answer_clear") current = null;
  }
  return current !== null;
}
