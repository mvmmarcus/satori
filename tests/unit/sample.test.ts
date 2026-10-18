import { expect, test } from "vitest";
import { sampleReplay } from "@/lib/landing/sample";

test("landing sample shows a varied, realistic mix of verdicts", () => {
  const { verdicts, report } = sampleReplay();
  const kinds = new Set(verdicts.map((v) => v.kind));
  for (const k of ["trap", "second-guess", "wrong-tool", "time-sink", "brilliant", "correct"]) expect(kinds.has(k as never), k).toBe(true);
  expect(report.raw).toBeGreaterThanOrEqual(12);
  expect(report.raw).toBeLessThanOrEqual(16);
});
