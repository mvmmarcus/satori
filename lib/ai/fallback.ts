import { KIND_COPY } from "@/lib/content/fallbacks";
import type { Question } from "@/lib/content/types";
import { MISTAKE_KINDS, type Verdict, type VerdictKind } from "@/lib/diagnosis/diagnose";
import type { ScoreReport } from "@/lib/scoring/score";
import type { CoachResult, Debrief } from "./schemas";

export function fallbackCoach(q: Question, v: Verdict): CoachResult {
  const tagged = v.misconception ? q.fallbackNotes?.[v.misconception] : undefined;
  return { note: tagged ?? KIND_COPY[v.kind].note, aiRead: null };
}

const GENERIC_HABITS = [
  "Underline what the question asks for before solving.",
  "Check your pace at question 11: you should have about 17 minutes left.",
  "Plug your answer back into the original equation when you have time.",
];

export function fallbackDebrief(questions: Question[], verdicts: Verdict[], report: ScoreReport): Debrief {
  const ranked = (Object.entries(report.lostByKind) as [VerdictKind, number][])
    .filter(([k]) => MISTAKE_KINDS.includes(k))
    .sort((a, b) => b[1] - a[1]);

  if (!ranked.length)
    return {
      headline: "A clean module: no mistakes to review.",
      patterns: [{ title: "Clean module", questionIds: [], explanation: "Every question was answered correctly. Try the drills to stay sharp." }],
      habits: [KIND_COPY.correct.habit, ...GENERIC_HABITS.slice(0, 2)],
    };

  const top = ranked.slice(0, 2).map(([kind, pts]) => {
    const ids = verdicts.filter((v) => v.kind === kind).map((v) => v.qid);
    return {
      title: KIND_COPY[kind].label,
      questionIds: ids,
      explanation: `${KIND_COPY[kind].note} It cost about ${pts} points on ${ids.length === 1 ? "1 question" : `${ids.length} questions`}.`.slice(0, 400),
    };
  });
  const habits = [...new Set([...ranked.slice(0, 3).map(([k]) => KIND_COPY[k].habit), ...GENERIC_HABITS])].slice(0, 3);
  return {
    headline: `${KIND_COPY[ranked[0][0]].label} cost you the most: about ${ranked[0][1]} of ${report.lostTotal} points.`,
    patterns: top,
    habits,
  };
}
