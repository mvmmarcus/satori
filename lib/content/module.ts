import type { Question } from "@/lib/content/types";
import { renderQuestion } from "@/lib/engine/render";
import { TEMPLATES } from "./templates";

const ORDER = [
  "lin-solve", "percent-change", "slope-two-points", "exp-evaluate", "lin-word-cost", "rect-scale-area",
  "system-substitution", "lin-inequality", "quad-roots", "interpret-slope", "mean-missing", "quad-vertex",
  "exp-growth", "right-tri-trig", "unit-rate", "func-composition",
  "system-no-solution", "quad-discriminant", "poly-remainder", "radical-eq", "lin-infinite-solutions", "circle-radius",
];

export const MODULE: { qid: string; templateId: string }[] = ORDER.map((templateId, i) => ({ qid: `q${i + 1}`, templateId }));

export const MODULE_SECONDS = 35 * 60;

let cached: Question[] | null = null;

export function moduleQuestions(): Question[] {
  cached ??= MODULE.map(({ qid, templateId }) => {
    const t = TEMPLATES[templateId];
    return renderQuestion(t, t.canonicalParams, qid);
  });
  return cached;
}
