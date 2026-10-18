import { TEMPLATES } from "@/lib/content/templates";
import type { Question } from "@/lib/content/types";
import { MISTAKE_KINDS, type Verdict } from "@/lib/diagnosis/diagnose";
import { makeTwin } from "@/lib/engine/render";
import type { ScoreReport } from "@/lib/scoring/score";
import type { SessionState } from "@/lib/store/session";

export function drillQuestion(templateId: string, qid: string, seed: number): Question {
  return makeTwin(TEMPLATES[templateId], seed, `${qid}-twin`);
}

export function pointsRecovered(verdicts: Verdict[], report: ScoreReport, drills: SessionState["drills"]): number {
  return verdicts
    .filter((v) => MISTAKE_KINDS.includes(v.kind) && drills[v.qid]?.recovered === true)
    .reduce((sum, v) => sum + (report.perQuestion[v.qid] ?? 0), 0);
}
