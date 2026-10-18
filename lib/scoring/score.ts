import type { Verdict, VerdictKind } from "@/lib/diagnosis/diagnose";

/** Heuristic raw (0–22) → scaled SAT Math estimate. Not an official conversion. */
export const SCALED = [200, 220, 250, 280, 310, 340, 370, 400, 430, 450, 480, 500, 520, 540, 570, 590, 620, 650, 680, 710, 740, 770, 800];

export type ScoreReport = {
  raw: number;
  total: number;
  scaled: number;
  range: [number, number];
  lostTotal: number;
  lostByKind: Partial<Record<VerdictKind, number>>;
  perQuestion: Record<string, number>;
};

export function scoreReport(verdicts: Verdict[]): ScoreReport {
  const total = verdicts.length;
  const raw = verdicts.filter((v) => v.correct).length;
  const scaled = SCALED[Math.min(raw, SCALED.length - 1)];
  const step = SCALED[Math.min(raw + 1, SCALED.length - 1)] - scaled;
  const perQuestion: Record<string, number> = {};
  const lostByKind: Partial<Record<VerdictKind, number>> = {};
  for (const v of verdicts) {
    if (v.correct) continue;
    perQuestion[v.qid] = step;
    lostByKind[v.kind] = (lostByKind[v.kind] ?? 0) + step;
  }
  return {
    raw, total, scaled,
    range: [Math.max(200, scaled - 30), Math.min(800, scaled + 30)],
    lostTotal: Object.values(perQuestion).reduce((a, b) => a + b, 0),
    lostByKind, perQuestion,
  };
}
