import { describe, expect, test } from "vitest";
import { TEMPLATES } from "@/lib/content/templates";
import { MODULE, MODULE_SECONDS, moduleQuestions } from "@/lib/content/module";
import { renderQuestion, sampleParams } from "@/lib/engine/render";
import { parseSpr } from "@/lib/engine/answers";

const RANK = { easy: 0, medium: 1, hard: 2 } as const;

describe.each(Object.values(TEMPLATES))("template $id", (t) => {
  const paramSets = [t.canonicalParams, ...Array.from({ length: 200 }, (_, i) => sampleParams(t, i + 1))];

  test("every param set satisfies the constraint", () => {
    for (const p of paramSets) expect(t.constraint ? t.constraint(p) : true, JSON.stringify(p)).toBe(true);
  });

  test("renders a valid, self-consistent question", () => {
    for (const p of paramSets) {
      const q = renderQuestion(t, p, "qx");
      const ctx = `${t.id} ${JSON.stringify(p)}`;
      expect(q.solution.length, ctx).toBeGreaterThanOrEqual(2);
      if (t.format === "mcq") {
        const cs = q.choices!;
        expect(cs, ctx).toHaveLength(4);
        expect(cs.filter((c) => c.correct), ctx).toHaveLength(1);
        expect(new Set(cs.map((c) => c.text)).size, ctx).toBe(4);
        for (const c of cs.filter((c) => !c.correct)) expect(c.misconception, ctx).toBeTruthy();
        expect(cs.find((c) => c.correct)!.text, ctx).toBe(t.check(p));
      } else {
        const a = parseSpr(q.answer);
        expect(a, ctx).not.toBeNull();
        expect(a, ctx).toBeCloseTo(parseSpr(t.check(p))!, 9);
      }
    }
  });

  test("has a fallback note for every misconception tag", () => {
    for (const p of paramSets.slice(0, 20)) {
      for (const c of renderQuestion(t, p, "qx").choices ?? []) {
        if (c.misconception) expect(t.fallbackNotes?.[c.misconception], `${t.id}:${c.misconception}`).toBeTruthy();
      }
    }
  });
});

describe("module", () => {
  test("22 entries q1..q22 referencing known templates", () => {
    expect(MODULE.map((m) => m.qid)).toEqual(Array.from({ length: 22 }, (_, i) => `q${i + 1}`));
    for (const m of MODULE) expect(TEMPLATES[m.templateId], m.templateId).toBeDefined();
  });

  test("domain mix, rising difficulty, par fits the clock", () => {
    const qs = moduleQuestions();
    const count = (d: string) => qs.filter((q) => q.domain === d).length;
    expect([count("algebra"), count("advanced-math"), count("psda"), count("geometry-trig")]).toEqual([8, 8, 3, 3]);
    for (let i = 1; i < qs.length; i++) expect(RANK[qs[i].difficulty]).toBeGreaterThanOrEqual(RANK[qs[i - 1].difficulty]);
    expect(qs.reduce((s, q) => s + q.parSeconds, 0)).toBeLessThanOrEqual(MODULE_SECONDS);
  });
});
