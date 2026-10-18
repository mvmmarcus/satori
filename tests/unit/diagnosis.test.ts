import { describe, expect, test } from "vitest";
import { moduleQuestions } from "@/lib/content/module";
import { diagnose, type Verdict } from "@/lib/diagnosis/diagnose";
import { log } from "../helpers/events";

const Q = moduleQuestions();
const byId = (qid: string) => Q.find((q) => q.qid === qid)!;
const right = (qid: string) => byId(qid).choices!.find((c) => c.correct)!.label;
const trap = (qid: string) => byId(qid).choices!.find((c) => !c.correct)!;
const run = (ev: ReturnType<ReturnType<typeof log>["end"]>, desmosAvailable = true, config = {}) =>
  Object.fromEntries(diagnose(ev, Q, { desmosAvailable, config }).map((v) => [v.qid, v])) as Record<string, Verdict>;

describe("diagnose", () => {
  test("returns one verdict per question; unvisited is unanswered", () => {
    const v = diagnose(log().visit("q1", 0, 5).end(5), Q, { desmosAvailable: true });
    expect(v).toHaveLength(22);
    const q9 = v.find((x) => x.qid === "q9")!;
    expect(q9.kind).toBe("unanswered");
    expect(q9.timeMs).toBe(0);
  });

  test("correct at par", () => {
    const l = log();
    l.visit("q1", 0, 60, [l.select(30, right("q1"))]);
    expect(run(l.end(60)).q1).toMatchObject({ kind: "correct", correct: true });
  });

  test("brilliant: hard, fast, correct", () => {
    const l = log();
    l.visit("q17", 0, 91, [l.select(80, "9")]);
    expect(run(l.end(91)).q17.kind).toBe("brilliant");
  });

  test("second-guess: changed a right answer to a wrong one", () => {
    const l = log();
    l.visit("q2", 0, 50, [l.select(20, right("q2")), l.select(40, trap("q2").label)]);
    const v = run(l.end(50)).q2;
    expect(v.kind).toBe("second-guess");
    expect(v.evidence.join(" ")).toMatch(/Changed/);
  });

  test("trap: final answer is a tagged distractor (misconception copied)", () => {
    const l = log();
    l.visit("q2", 0, 50, [l.select(20, trap("q2").label)]);
    const v = run(l.end(50)).q2;
    expect(v.kind).toBe("trap");
    expect(v.misconception).toBe(trap("q2").misconception);
  });

  test("behaviour beats trap, keeping the misconception as evidence; second-guess beats both", () => {
    const a = log();
    a.visit("q2", 0, 200, [a.select(20, trap("q2").label)]);
    const sink = run(a.end(200)).q2;
    expect(sink.kind).toBe("time-sink");
    expect(sink.misconception).toBe(trap("q2").misconception);
    expect(sink.evidence.join(" ")).toMatch(/Also chose/);
    const r = log();
    r.visit("q2", 0, 10, [r.select(8, trap("q2").label)]);
    expect(run(r.end(10)).q2.kind).toBe("rushed");
    const b = log();
    b.visit("q2", 0, 200, [b.select(20, right("q2")), b.select(190, trap("q2").label)]);
    expect(run(b.end(200)).q2.kind).toBe("second-guess");
  });

  test("time-sink: > 2x par on an untagged wrong answer", () => {
    const l = log();
    l.visit("q4", 0, 126, [l.select(120, "25")]);
    const v = run(l.end(126)).q4;
    expect(v.kind).toBe("time-sink");
    expect(v.evidence.join(" ")).toContain("2m 06s vs 1m 00s target");
  });

  test("rushed: < 0.35x par", () => {
    const l = log();
    l.visit("q4", 0, 15, [l.select(10, "25")]);
    expect(run(l.end(15)).q4.kind).toBe("rushed");
  });

  test("wrong-tool: Desmos on a by-hand question that ran long", () => {
    const l = log();
    l.visit("q4", 0, 90, [l.desmos(10, 80), l.select(85, "25")]);
    expect(run(l.end(90)).q4.kind).toBe("wrong-tool");
  });

  test("wrong-tool: skipped Desmos where it is the fast route; suppressed when unavailable", () => {
    const l = log();
    l.visit("q9", 0, 142.5, [l.select(140, "4")]);
    const ev = l.end(142.5);
    expect(run(ev).q9.kind).toBe("wrong-tool");
    expect(run(ev, false).q9.kind).toBe("concept-gap");
  });

  test("concept-gap: wrong at par with no behavioural signal", () => {
    const l = log();
    l.visit("q4", 0, 60, [l.select(50, "25")]);
    expect(run(l.end(60)).q4.kind).toBe("concept-gap");
  });

  test("smart-skip: quick exit on a hard question that bought time for later wins", () => {
    const l = log();
    l.visit("q18", 0, 30)
      .visit("q19", 30, 130, [l.select(120, right("q19"))])
      .visit("q20", 130, 230, [l.select(220, right("q20"))])
      .visit("q21", 230, 330, [l.select(320, "9")])
      .visit("q22", 330, 430, [l.select(420, right("q22"))]);
    const v = run(l.end(430));
    expect(v.q18.kind).toBe("smart-skip");
    expect(v.q18.correct).toBe(false);
  });

  test("squeezedBy only on timeout", () => {
    const build = (reason: "finish" | "timeout") => {
      const l = log();
      l.visit("q4", 0, 300, [l.select(290, "25")]).visit("q5", 300, 310, [l.select(305, trap("q5").label)]);
      return l.end(310, reason);
    };
    const t = run(build("timeout"));
    expect(t.q4.kind).toBe("time-sink");
    expect(t.q6.squeezedBy).toBe("q4");
    expect(run(build("finish")).q6.squeezedBy).toBeUndefined();
  });

  test("config override changes thresholds", () => {
    const l = log();
    l.visit("q4", 0, 150, [l.select(140, "25")]);
    const ev = l.end(150);
    expect(run(ev).q4.kind).toBe("time-sink");
    expect(run(ev, true, { timeSinkX: 3 }).q4.kind).toBe("concept-gap");
  });

  test("every mistake carries evidence", () => {
    const l = log();
    l.visit("q4", 0, 60, [l.select(50, "25")]);
    for (const v of diagnose(l.end(60), Q, { desmosAvailable: true }))
      if (!v.correct) expect(v.evidence.length, v.qid).toBeGreaterThan(0);
  });
});
