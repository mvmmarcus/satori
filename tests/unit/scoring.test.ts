import { describe, expect, test } from "vitest";
import type { Verdict, VerdictKind } from "@/lib/diagnosis/diagnose";
import { scoreReport } from "@/lib/scoring/score";

const v = (i: number, kind: VerdictKind): Verdict => ({
  qid: `q${i + 1}`, kind, correct: kind === "correct" || kind === "brilliant",
  timeMs: 0, parMs: 60000, desmosMs: 0, finalAnswer: null, history: [], evidence: [],
});

describe("scoreReport", () => {
  test("raw 12 → 520 with ±30 range and 20 points per miss", () => {
    const kinds: VerdictKind[] = [...Array(12).fill("correct"), ...Array(6).fill("trap"), ...Array(4).fill("time-sink")];
    const r = scoreReport(kinds.map((k, i) => v(i, k)));
    expect(r.raw).toBe(12);
    expect(r.total).toBe(22);
    expect(r.scaled).toBe(520);
    expect(r.range).toEqual([490, 550]);
    expect(r.perQuestion.q13).toBe(20);
    expect(r.lostByKind.trap).toBe(120);
    expect(r.lostByKind["time-sink"]).toBe(80);
    expect(Object.values(r.lostByKind).reduce((a, b) => a + (b ?? 0), 0)).toBe(r.lostTotal);
  });

  test("perfect module", () => {
    const r = scoreReport(Array.from({ length: 22 }, (_, i) => v(i, "correct")));
    expect(r).toMatchObject({ scaled: 800, range: [770, 800], lostTotal: 0 });
  });

  test("zero correct", () => {
    const r = scoreReport(Array.from({ length: 22 }, (_, i) => v(i, "unanswered")));
    expect(r.scaled).toBe(200);
    expect(r.range).toEqual([200, 230]);
    expect(r.lostTotal).toBe(22 * 20);
  });
});
