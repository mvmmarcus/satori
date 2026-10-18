import { moduleQuestions } from "../../lib/content/module";
import type { ModuleEvent } from "../../lib/recorder/events";

const Q = moduleQuestions();
type Step = { qid: string; secs: number; answers: string[]; desmos?: boolean };

function build(steps: Step[], end: "finish" | "timeout"): ModuleEvent[] {
  const ev: ModuleEvent[] = [{ t: 0, type: "module_start" }];
  let t = 0;
  for (const s of steps) {
    ev.push({ t, type: "question_enter", qid: s.qid });
    if (s.desmos) ev.push({ t: t + 3000, type: "desmos_open", qid: s.qid }, { t: t + s.secs * 1000 - 3000, type: "desmos_close", qid: s.qid });
    s.answers.forEach((a, i) => ev.push({ t: t + ((i + 1) * s.secs * 1000) / (s.answers.length + 1), type: "answer_select", qid: s.qid, payload: { answer: a } }));
    t += s.secs * 1000;
    ev.push({ t, type: "question_leave", qid: s.qid });
  }
  ev.push({ t, type: "module_end", payload: { reason: end } });
  return ev;
}

const R = (i: number) => (Q[i].format === "mcq" ? Q[i].choices!.find((c) => c.correct)!.label : Q[i].answer);
const W = (i: number) => (Q[i].format === "mcq" ? Q[i].choices!.find((c) => !c.correct)!.label : "1");

export const FIXTURES: Record<string, ModuleEvent[]> = {
  mostlyCorrect: build(Q.map((q, i) => ({ qid: q.qid, secs: q.parSeconds * 0.8, answers: [i === 13 ? W(i) : R(i)] })), "finish"),
  timeoutHeavy: build(
    Q.slice(0, 14).map((q, i) => ({ qid: q.qid, secs: i === 10 ? 330 : i === 8 ? 260 : q.parSeconds, answers: [i % 4 === 3 ? W(i) : R(i)] })),
    "timeout",
  ),
  trapHeavy: build(Q.map((q, i) => ({ qid: q.qid, secs: q.parSeconds * 0.7, answers: [i % 3 === 1 ? W(i) : R(i)], desmos: q.desmosFast })), "finish"),
};
