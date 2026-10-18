import { moduleQuestions } from "@/lib/content/module";
import { diagnose } from "@/lib/diagnosis/diagnose";
import type { ModuleEvent } from "@/lib/recorder/events";
import { scoreReport } from "@/lib/scoring/score";

type Plan = { secs: number; answer: "right" | "trap" | string; desmos?: boolean; changedFromRight?: boolean };

// A plausible sample student, labelled as a sample on the page. Run through the real engine.
const PLAN: Plan[] = [
  { secs: 48, answer: "right" }, { secs: 41, answer: "trap" }, { secs: 52, answer: "right" }, { secs: 35, answer: "right" },
  { secs: 50, answer: "right" }, { secs: 66, answer: "right" }, { secs: 80, answer: "right", desmos: true },
  { secs: 110, answer: "trap", changedFromRight: true }, { secs: 150, answer: "3" }, { secs: 70, answer: "right" },
  { secs: 214, answer: "26" }, { secs: 88, answer: "right", desmos: true }, { secs: 75, answer: "right" },
  { secs: 60, answer: "right" }, { secs: 200, answer: "9" }, { secs: 52, answer: "trap" },
  { secs: 82, answer: "right", desmos: true }, { secs: 95, answer: "right", desmos: true }, { secs: 120, answer: "right" },
  { secs: 55, answer: "trap" }, { secs: 140, answer: "8" }, { secs: 60, answer: "right", desmos: true },
];

export function sampleReplay() {
  const questions = moduleQuestions();
  const events: ModuleEvent[] = [{ t: 0, type: "module_start" }];
  let t = 0;
  questions.forEach((q, i) => {
    const p = PLAN[i];
    const right = q.format === "mcq" ? q.choices!.find((c) => c.correct)!.label : q.answer;
    const trap = q.choices?.find((c) => !c.correct)?.label ?? "0";
    const final = p.answer === "right" ? right : p.answer === "trap" ? trap : p.answer;
    const ms = p.secs * 1000;
    events.push({ t, type: "question_enter", qid: q.qid });
    if (p.desmos) events.push({ t: t + 5000, type: "desmos_open", qid: q.qid }, { t: t + ms - 8000, type: "desmos_close", qid: q.qid });
    if (p.changedFromRight) events.push({ t: t + Math.round(ms / 3), type: "answer_select", qid: q.qid, payload: { answer: right } });
    events.push({ t: t + ms - 4000, type: "answer_select", qid: q.qid, payload: { answer: final } });
    t += ms;
    events.push({ t, type: "question_leave", qid: q.qid });
  });
  events.push({ t, type: "module_end", payload: { reason: "finish" } });
  const verdicts = diagnose(events, questions, { desmosAvailable: true });
  return { questions, verdicts, report: scoreReport(verdicts), events };
}
