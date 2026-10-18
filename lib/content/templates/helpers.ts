import type { Choice, ChoiceLabel, Params, QuestionTemplate, Rendered } from "@/lib/content/types";

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

/** Simplified fraction as SPR-style text: "3", "-3/4". */
export function frac(n: number, d: number): string {
  if (d === 0) return "undefined";
  if (d < 0) [n, d] = [-n, -d];
  const g = gcd(n, d);
  return d / g === 1 ? String(n / g) : `${n / g}/${d / g}`;
}

/** Fraction as KaTeX: "3", "-\frac{3}{4}". */
export function texFrac(n: number, d: number): string {
  const s = frac(n, d);
  if (!s.includes("/")) return s;
  const [a, b] = s.split("/");
  return a.startsWith("-") ? `-\\dfrac{${a.slice(1)}}{${b}}` : `\\dfrac{${a}}{${b}}`;
}

/** Polynomial text from [coef, variable] terms, e.g. [[1,"x^2"],[-4,"x"],[3,""]] → "x^2 - 4x + 3". */
export function poly(terms: [number, string][]): string {
  let out = "";
  for (const [c, v] of terms) {
    if (c === 0) continue;
    const abs = Math.abs(c);
    const body = v ? (abs === 1 ? v : `${abs}${v}`) : String(abs);
    if (!out) out = c < 0 ? `-${body}` : body;
    else out += c < 0 ? ` - ${body}` : ` + ${body}`;
  }
  return out || "0";
}

const PLACEHOLDER: ChoiceLabel[] = ["A", "B", "C", "D"];

/** Correct choice first; renderQuestion shuffles and relabels. */
export function mcq(correct: string, wrong: [text: string, misconception: string][]): Choice[] {
  return [
    { label: "A", text: correct, correct: true },
    ...wrong.map(([text, misconception], i) => ({ label: PLACEHOLDER[i + 1], text, correct: false, misconception })),
  ];
}

const distinctChoices = (r: Rendered) =>
  !r.choices || new Set(r.choices.map((c) => c.text)).size === r.choices.length;

/** Adds the distinct-choices rule to every template's constraint. */
export function defineTemplate(t: QuestionTemplate): QuestionTemplate {
  const own = t.constraint;
  return { ...t, constraint: (p: Params) => (own ? own(p) : true) && distinctChoices(t.render(p)) };
}

export const PAR = { easy: 60, medium: 95, hard: 130 } as const;
