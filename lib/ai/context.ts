import { moduleQuestions } from "@/lib/content/module";
import type { Question } from "@/lib/content/types";
import { diagnose, fmtDuration, type Verdict } from "@/lib/diagnosis/diagnose";
import type { ModuleEvent } from "@/lib/recorder/events";
import { scoreReport, type ScoreReport } from "@/lib/scoring/score";
import { KIND_COPY } from "@/lib/content/fallbacks";

/** Server-side source of truth: everything Claude sees is derived from the event log. */
export function rebuild(events: ModuleEvent[], desmosAvailable: boolean) {
  const questions = moduleQuestions();
  const verdicts = diagnose(events, questions, { desmosAvailable });
  return { questions, verdicts, report: scoreReport(verdicts) };
}

function questionFacts(q: Question): string[] {
  const lines = [`Question ${q.qid.slice(1)} (${q.difficulty}, skill: ${q.skill}, target time ${q.parSeconds}s, ${q.desmosFast ? "Desmos is the fast route" : "fastest by hand"})`, `Stem: ${q.stem}`];
  if (q.choices)
    for (const c of q.choices)
      lines.push(`  ${c.label}) ${c.text}${c.correct ? "  [CORRECT]" : c.misconception ? `  [trap: ${c.misconception}]` : ""}`);
  lines.push(`Verified correct answer: ${q.format === "mcq" ? `${q.choices!.find((c) => c.correct)!.label}) ${q.answer}` : q.answer}`);
  lines.push("Verified solution:", ...q.solution.map((s, i) => `  ${i + 1}. ${s}`));
  return lines;
}

function verdictFacts(v: Verdict): string[] {
  return [
    `Student's final answer: ${v.finalAnswer ?? "(none)"}`,
    `Answer history: ${v.history.map((a) => a ?? "cleared").join(" → ") || "(none)"}`,
    `Time on question: ${fmtDuration(v.timeMs)}; Desmos open for ${fmtDuration(v.desmosMs)}`,
    `Rule-based verdict: ${v.kind} (${KIND_COPY[v.kind].label})${v.misconception ? `; misconception tag: ${v.misconception}` : ""}`,
    `Evidence:`,
    ...v.evidence.map((e) => `  - ${e}`),
    ...(v.squeezedBy ? [`  - Squeezed for time by question ${v.squeezedBy.slice(1)}`] : []),
  ];
}

export function coachContext(q: Question, v: Verdict): string {
  return ["<facts>", ...questionFacts(q), "", ...verdictFacts(v), "</facts>"].join("\n");
}

export function debriefContext(questions: Question[], verdicts: Verdict[], report: ScoreReport): string {
  const lines = [
    "<facts>",
    `Raw score ${report.raw}/${report.total}; estimated SAT Math ${report.scaled} (range ${report.range[0]}–${report.range[1]}).`,
    `Estimated points lost: ${report.lostTotal}. By cause: ${Object.entries(report.lostByKind).map(([k, n]) => `${k} ${n}`).join(", ") || "none"}.`,
    "Per question:",
  ];
  for (const v of verdicts) {
    const q = questions.find((x) => x.qid === v.qid)!;
    lines.push(
      `  ${v.qid}: ${v.kind}; ${q.skill}, ${q.difficulty}; ${fmtDuration(v.timeMs)} vs ${q.parSeconds}s target${v.misconception ? `; trap: ${v.misconception}` : ""}${v.evidence.length ? `; ${v.evidence.join("; ")}` : ""}`,
    );
  }
  lines.push("</facts>");
  return lines.join("\n");
}

export function askContext(q: Question, v: Verdict, events: ModuleEvent[]): string {
  const timeline = events
    .filter((e) => e.qid === q.qid && e.type !== "module_start")
    .map((e) => `  ${fmtDuration(e.t)} ${e.type.replace("_", " ")}${e.payload?.answer ? ` ${e.payload.answer}` : ""}${e.payload?.choice ? ` ${e.payload.choice}` : ""}`);
  return ["<facts>", ...questionFacts(q), "", ...verdictFacts(v), "Action timeline (module clock):", ...timeline, "</facts>"].join("\n");
}
