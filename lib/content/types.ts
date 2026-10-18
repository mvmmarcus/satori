export type Domain = "algebra" | "advanced-math" | "psda" | "geometry-trig";
export type Difficulty = "easy" | "medium" | "hard";
export type Params = Record<string, number>;
export type ParamSpec = { min: number; max: number; step?: number } | { choices: number[] };
export type ChoiceLabel = "A" | "B" | "C" | "D";
export type Choice = { label: ChoiceLabel; text: string; correct: boolean; misconception?: string };
export type Rendered = { stem: string; choices?: Choice[]; answer: string; solution: string[] };

export type QuestionTemplate = {
  id: string;
  skill: string;
  domain: Domain;
  difficulty: Difficulty;
  parSeconds: number;
  desmosFast: boolean;
  format: "mcq" | "spr";
  params: Record<string, ParamSpec>;
  canonicalParams: Params;
  constraint?: (p: Params) => boolean;
  render: (p: Params) => Rendered;
  /** Independent answer computation, used only by tests to cross-check `render`. */
  check: (p: Params) => string;
  /** Pre-written coach notes keyed by misconception tag (AI fallback). */
  fallbackNotes?: Record<string, string>;
};

export type Question = Omit<
  QuestionTemplate,
  "params" | "canonicalParams" | "constraint" | "render" | "check"
> &
  Rendered & { qid: string; templateId: string; params: Params };
