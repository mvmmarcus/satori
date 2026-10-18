import { describe, expect, test } from "vitest";
import { TEMPLATES } from "@/lib/content/templates";
import { moduleQuestions } from "@/lib/content/module";
import { diagnose, type VerdictKind } from "@/lib/diagnosis/diagnose";
import { renderQuestion } from "@/lib/engine/render";
import { coachContext, rebuild } from "@/lib/ai/context";
import { fallbackCoach, fallbackDebrief } from "@/lib/ai/fallback";
import { CoachSchema, DebriefSchema } from "@/lib/ai/schemas";
import { memoCache, hashKey } from "@/lib/ai/cache";
import { allow } from "@/lib/ai/ratelimit";
import { KIND_COPY } from "@/lib/content/fallbacks";
import { mixedSession } from "../helpers/sessions";

const KINDS: VerdictKind[] = ["brilliant", "correct", "smart-skip", "unanswered", "second-guess", "trap", "time-sink", "rushed", "wrong-tool", "concept-gap"];

describe("context", () => {
  test("rebuild matches calling diagnose directly", () => {
    const ev = mixedSession();
    const r = rebuild(ev, true);
    expect(r.verdicts).toEqual(diagnose(ev, moduleQuestions(), { desmosAvailable: true }));
    expect(r.report.raw).toBe(1);
  });

  test("coachContext states the verified answer and every evidence line", () => {
    const { questions, verdicts } = rebuild(mixedSession(), true);
    const v = verdicts.find((x) => x.qid === "q2")!;
    const q = questions.find((x) => x.qid === "q2")!;
    const ctx = coachContext(q, v);
    expect(ctx).toContain(q.choices!.find((c) => c.correct)!.text);
    for (const e of v.evidence) expect(ctx).toContain(e);
    expect(ctx).toContain(v.misconception!);
  });
});

describe("fallbacks", () => {
  const { questions, verdicts, report } = rebuild(mixedSession(), true);

  test("fallbackCoach is schema-valid for every verdict kind", () => {
    const q = questions[3];
    for (const kind of KINDS) {
      const res = fallbackCoach(q, { ...verdicts[3], kind });
      expect(CoachSchema.safeParse(res).success, kind).toBe(true);
      expect(res.aiRead).toBeNull();
    }
  });

  test("fallbackCoach uses the misconception note for every tag in the bank", () => {
    for (const t of Object.values(TEMPLATES)) {
      const q = renderQuestion(t, t.canonicalParams, "qx");
      for (const c of q.choices ?? []) {
        if (!c.misconception) continue;
        const res = fallbackCoach(q, { ...verdicts[1], kind: "trap", misconception: c.misconception });
        expect(res.note).toBe(t.fallbackNotes![c.misconception]);
      }
    }
  });

  test("every verdict kind has copy", () => {
    for (const k of KINDS) expect(KIND_COPY[k].label).toBeTruthy();
  });

  test("fallbackDebrief is schema-valid and names the costliest cause", () => {
    const d = fallbackDebrief(questions, verdicts, report);
    expect(DebriefSchema.safeParse(d).success).toBe(true);
    const top = Object.entries(report.lostByKind).sort((a, b) => b[1]! - a[1]!)[0][0] as VerdictKind;
    expect(d.headline.toLowerCase()).toContain(KIND_COPY[top].label.toLowerCase());
  });
});

describe("cache and rate limit", () => {
  test("memoCache evicts the oldest entry", () => {
    const c = memoCache<number>(2);
    c.set("a", 1); c.set("b", 2); c.set("c", 3);
    expect(c.get("a")).toBeUndefined();
    expect(c.get("c")).toBe(3);
  });

  test("hashKey is stable across key order", () => {
    expect(hashKey({ a: 1, b: [1, 2] })).toBe(hashKey({ b: [1, 2], a: 1 }));
  });

  test("allow: 60 per rolling 10 minutes", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 60; i++) expect(allow("1.2.3.4", t0 + i)).toBe(true);
    expect(allow("1.2.3.4", t0 + 100)).toBe(false);
    expect(allow("5.6.7.8", t0 + 100)).toBe(true);
    expect(allow("1.2.3.4", t0 + 10 * 60_000 + 60)).toBe(true);
  });
});

describe("client without a key", () => {
  test("structured and streamReply report offline", async () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const { structured, streamReply } = await import("@/lib/ai/client");
    expect(await structured(CoachSchema, { system: "s", facts: "f", ask: "a", effort: "low", maxTokens: 10 })).toBeNull();
    expect(streamReply({ system: "s", facts: "f", messages: [{ role: "user", content: "hi" }], maxTokens: 10 })).toBeNull();
    if (prev) process.env.ANTHROPIC_API_KEY = prev;
  });
});
