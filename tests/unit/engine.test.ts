import { describe, expect, test } from "vitest";
import type { QuestionTemplate } from "@/lib/content/types";
import { mulberry32 } from "@/lib/engine/rng";
import { renderQuestion, sampleParams } from "@/lib/engine/render";
import { isCorrect, parseSpr } from "@/lib/engine/answers";

const sprTemplate: QuestionTemplate = {
  id: "fixture-spr", skill: "ratios", domain: "psda", difficulty: "easy",
  parSeconds: 60, desmosFast: false, format: "spr",
  params: { a: { min: 1, max: 9 } }, canonicalParams: { a: 3 },
  render: () => ({ stem: "x", answer: "3/4", solution: ["a", "b"] }),
  check: () => "0.75",
};

const evenTemplate: QuestionTemplate = {
  id: "fixture-even", skill: "linear-equations", domain: "algebra", difficulty: "easy",
  parSeconds: 60, desmosFast: false, format: "mcq",
  params: { a: { min: 2, max: 40 } }, canonicalParams: { a: 2 },
  constraint: (p) => p.a % 2 === 0,
  render: (p) => ({
    stem: `Solve $x = ${p.a}$`,
    choices: [
      { label: "A", text: String(p.a), correct: true },
      { label: "B", text: String(p.a + 1), correct: false, misconception: "off-by-one" },
      { label: "C", text: String(-p.a), correct: false, misconception: "sign-error" },
      { label: "D", text: String(p.a * 2), correct: false, misconception: "doubled" },
    ],
    answer: String(p.a),
    solution: ["a", "b"],
  }),
  check: (p) => String(p.a),
};

describe("rng", () => {
  test("mulberry32 is deterministic and in [0,1)", () => {
    const a = mulberry32(42), b = mulberry32(42);
    const xs = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(xs);
    for (const x of xs) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1); }
  });
});

describe("answers", () => {
  const q = renderQuestion(sprTemplate, sprTemplate.canonicalParams, "q1");
  test("isCorrect SPR forms", () => {
    for (const r of ["3/4", ".75", "0.750", " 3 / 4 "]) expect(isCorrect(q, r)).toBe(true);
    for (const r of ["0.7", "abc", "", "3/0", null]) expect(isCorrect(q, r)).toBe(false);
    expect(parseSpr("-1/2")).toBe(-0.5);
    expect(parseSpr("1.5")).toBe(1.5);
  });

  test("isCorrect MCQ only for the correct label", () => {
    const m = renderQuestion(evenTemplate, { a: 4 }, "q2");
    const right = m.choices!.find((c) => c.correct)!.label;
    for (const c of m.choices!) expect(isCorrect(m, c.label)).toBe(c.label === right);
  });

  test("MCQ choices are relabelled A-D after shuffle", () => {
    const m = renderQuestion(evenTemplate, { a: 4 }, "q2");
    expect(m.choices!.map((c) => c.label)).toEqual(["A", "B", "C", "D"]);
  });
});

describe("sampleParams", () => {
  test("respects constraint, differs from canonical, deterministic", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const p = sampleParams(evenTemplate, seed);
      expect(p.a % 2).toBe(0);
      expect(p).not.toEqual(evenTemplate.canonicalParams);
      expect(sampleParams(evenTemplate, seed)).toEqual(p);
    }
  });

  test("falls back to canonical when constraint never passes", () => {
    const never = { ...evenTemplate, constraint: () => false };
    expect(sampleParams(never, 7)).toEqual(evenTemplate.canonicalParams);
  });
});
