import type { ChoiceLabel, Params, ParamSpec, Question, QuestionTemplate } from "@/lib/content/types";
import { hashString, mulberry32 } from "./rng";

const LABELS: ChoiceLabel[] = ["A", "B", "C", "D"];
const MAX_TRIES = 50;

export function renderQuestion(t: QuestionTemplate, params: Params, qid: string): Question {
  const r = t.render(params);
  let choices = r.choices;
  if (choices) {
    // Deterministic shuffle so the correct label varies across params.
    const rand = mulberry32(hashString(t.id + JSON.stringify(params)));
    const shuffled = [...choices];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    choices = shuffled.map((c, i) => ({ ...c, label: LABELS[i] }));
  }
  return {
    qid,
    templateId: t.id,
    params,
    id: t.id,
    skill: t.skill,
    domain: t.domain,
    difficulty: t.difficulty,
    parSeconds: t.parSeconds,
    desmosFast: t.desmosFast,
    format: t.format,
    fallbackNotes: t.fallbackNotes,
    stem: r.stem,
    choices,
    answer: r.answer,
    solution: r.solution,
  };
}

function draw(spec: ParamSpec, rand: () => number): number {
  if ("choices" in spec) return spec.choices[Math.floor(rand() * spec.choices.length)];
  const step = spec.step ?? 1;
  const n = Math.floor((spec.max - spec.min) / step) + 1;
  return spec.min + Math.floor(rand() * n) * step;
}

const sameParams = (a: Params, b: Params) =>
  Object.keys(a).every((k) => a[k] === b[k]);

export function sampleParams(t: QuestionTemplate, seed: number): Params {
  const rand = mulberry32(seed);
  for (let i = 0; i < MAX_TRIES; i++) {
    const p: Params = {};
    for (const [k, spec] of Object.entries(t.params)) p[k] = draw(spec, rand);
    if (sameParams(p, t.canonicalParams)) continue;
    if (t.constraint && !t.constraint(p)) continue;
    return p;
  }
  return t.canonicalParams;
}

export function makeTwin(t: QuestionTemplate, seed: number, qid: string): Question {
  return renderQuestion(t, sampleParams(t, seed), qid);
}
