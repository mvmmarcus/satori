import { expect, test } from "vitest";
import { TEMPLATES } from "@/lib/content/templates";
import { drillQuestion, pointsRecovered } from "@/lib/drills/drills";
import { rebuild } from "@/lib/ai/context";
import { mixedSession } from "../helpers/sessions";

test("drillQuestion is deterministic per seed and never the canonical question", () => {
  for (const t of Object.values(TEMPLATES)) {
    const a = drillQuestion(t.id, "q1", 11), b = drillQuestion(t.id, "q1", 11), c = drillQuestion(t.id, "q1", 12);
    expect(a).toEqual(b);
    expect(a.params).not.toEqual(t.canonicalParams);
    expect(a.qid).toBe("q1-twin");
    expect(c.params).toBeDefined();
  }
  expect(drillQuestion("lin-solve", "q1", 11).stem).not.toBe(drillQuestion("lin-solve", "q1", 99).stem);
});

test("pointsRecovered counts correct drills on mistake verdicts only", () => {
  const { verdicts, report } = rebuild(mixedSession(), true);
  const drills = {
    q1: { seed: 1, answer: "A", correct: true, recovered: true },    // q1 was correct: does not count
    q2: { seed: 2, answer: null, correct: null, recovered: true },   // trap, recovered earlier then reseeded → counts
    q3: { seed: 1, answer: "B", correct: false, recovered: false },  // wrong drill → no
    q4: { seed: 1, answer: null, correct: null, recovered: false },
  };
  expect(pointsRecovered(verdicts, report, drills)).toBe(report.perQuestion.q2);
});
