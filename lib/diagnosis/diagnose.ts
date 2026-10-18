import type { Question } from "@/lib/content/types";
import { isCorrect } from "@/lib/engine/answers";
import type { ModuleEvent } from "@/lib/recorder/events";
import { activeMs, answerHistory, answeredBefore, desmosMs, endReason, finalAnswer, firstLeaveT } from "@/lib/recorder/metrics";
import { DEFAULT_CONFIG, type DiagnosisConfig } from "./config";

export type VerdictKind =
  | "brilliant" | "correct" | "smart-skip" | "unanswered" | "second-guess"
  | "trap" | "time-sink" | "rushed" | "wrong-tool" | "concept-gap";

export const MISTAKE_KINDS: VerdictKind[] = ["unanswered", "second-guess", "trap", "time-sink", "rushed", "wrong-tool", "concept-gap"];

export type Verdict = {
  qid: string;
  kind: VerdictKind;
  correct: boolean;
  timeMs: number;
  parMs: number;
  desmosMs: number;
  finalAnswer: string | null;
  history: (string | null)[];
  misconception?: string;
  evidence: string[];
  squeezedBy?: string;
};

export function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

const vsPar = (t: number, par: number) => `${fmtDuration(t)} vs ${fmtDuration(par)} target`;

export function diagnose(
  events: ModuleEvent[],
  questions: Question[],
  opts: { desmosAvailable: boolean; config?: Partial<DiagnosisConfig> },
): Verdict[] {
  const cfg = { ...DEFAULT_CONFIG, ...opts.config };

  const verdicts = questions.map((q, index): Verdict => {
    const t = activeMs(events, q.qid);
    const par = q.parSeconds * 1000;
    const dms = desmosMs(events, q.qid);
    const history = answerHistory(events, q.qid);
    const final = finalAnswer(events, q.qid);
    const base = { qid: q.qid, timeMs: t, parMs: par, desmosMs: dms, finalAnswer: final, history };
    const v = (kind: VerdictKind, evidence: string[], extra: Partial<Verdict> = {}): Verdict => ({
      ...base, kind, correct: kind === "correct" || kind === "brilliant", evidence, ...extra,
    });

    if (final === null) {
      const leftAt = firstLeaveT(events, q.qid);
      if (q.difficulty === "hard" && leftAt !== null && t <= cfg.smartSkipX * par) {
        const later = questions.slice(index + 1).filter(
          (o) => !answeredBefore(events, o.qid, leftAt) && isCorrect(o, finalAnswer(events, o.qid)),
        );
        if (later.length >= cfg.smartSkipMinLater)
          return v("smart-skip", [`Left after ${fmtDuration(t)} on a hard question`, `Then got ${later.length} later questions right`]);
      }
      return v("unanswered", [t ? `Spent ${fmtDuration(t)} without answering` : "Never reached this question"]);
    }

    if (isCorrect(q, final)) {
      if (q.difficulty === "hard" && t <= cfg.brilliantX * par) return v("brilliant", [`Hard question solved in ${vsPar(t, par)}`]);
      return v("correct", [vsPar(t, par)]);
    }

    const everCorrect = history.findIndex((a) => isCorrect(q, a));
    if (everCorrect !== -1) {
      const was = history[everCorrect]!;
      return v("second-guess", [`Changed ${was} → ${final}`, `${was} was correct`]);
    }

    // Behaviour rules outrank a trap; a tagged choice is kept as supporting evidence.
    const chosen = q.choices?.find((c) => c.label === final);
    const tag = chosen?.misconception;
    const trapNote = tag ? [`Also chose ${final}: ${tag.replace(/-/g, " ")}`] : [];
    const tagged = tag ? { misconception: tag } : {};

    if (t > cfg.timeSinkX * par) return v("time-sink", [vsPar(t, par), ...trapNote], tagged);
    if (t < cfg.rushedX * par) return v("rushed", [`Only ${vsPar(t, par)}`, ...trapNote], tagged);

    if (t > cfg.wrongToolX * par) {
      const share = t ? dms / t : 0;
      if (!q.desmosFast && share > cfg.desmosShare)
        return v("wrong-tool", [`Desmos ${Math.round(share * 100)}% of time on a by-hand question`, vsPar(t, par), ...trapNote], tagged);
      if (q.desmosFast && dms === 0 && opts.desmosAvailable)
        return v("wrong-tool", ["Desmos is the fast route here and was never opened", vsPar(t, par), ...trapNote], tagged);
    }

    if (tag) return v("trap", [`Chose ${final}: ${tag.replace(/-/g, " ")}`], tagged);

    return v("concept-gap", [`Answered ${final}; correct is ${q.format === "mcq" ? q.choices!.find((c) => c.correct)!.label : q.answer}`]);
  });

  if (endReason(events) === "timeout") {
    const sinks = verdicts.filter((x) => x.kind === "time-sink").sort((a, b) => b.timeMs - b.parMs - (a.timeMs - a.parMs));
    const worst = sinks[0];
    if (worst) {
      const excess = worst.timeMs - worst.parMs;
      for (const x of verdicts)
        if ((x.kind === "unanswered" || x.kind === "rushed") && excess >= x.parMs - x.timeMs) x.squeezedBy = worst.qid;
    }
  }
  return verdicts;
}
