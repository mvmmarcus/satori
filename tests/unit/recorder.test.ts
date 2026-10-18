import { describe, expect, test } from "vitest";
import { EventsSchema } from "@/lib/recorder/events";
import { activeMs, answerHistory, desmosMs, endReason, finalAnswer, answeredBefore, firstLeaveT } from "@/lib/recorder/metrics";
import { log } from "../helpers/events";

describe("recorder metrics", () => {
  test("sums active time across 4 visits", () => {
    const l = log();
    l.visit("q3", 0, 10).visit("q4", 10, 20).visit("q3", 20, 25).visit("q3", 30, 50).visit("q3", 60, 61);
    expect(activeMs(l.end(70), "q3")).toBe(36000);
  });

  test("unvisited question has zero time and no answer", () => {
    const ev = log().visit("q1", 0, 10).end(10);
    expect(activeMs(ev, "q9")).toBe(0);
    expect(finalAnswer(ev, "q9")).toBeNull();
    expect(answerHistory(ev, "q9")).toEqual([]);
    expect(firstLeaveT(ev, "q9")).toBeNull();
  });

  test("Desmos left open until module end counts until end", () => {
    const l = log();
    l.at(0, "question_enter", "q1").at(5, "desmos_open", "q1");
    const ev = l.end(30);
    expect(desmosMs(ev, "q1")).toBe(25000);
    expect(activeMs(ev, "q1")).toBe(30000);
  });

  test("Desmos open across navigation only counts time inside visits", () => {
    const l = log();
    l.at(0, "question_enter", "q1").at(2, "desmos_open", "q1").at(10, "question_leave", "q1")
      .at(10, "question_enter", "q2").at(20, "question_leave", "q2")
      .at(20, "question_enter", "q1").at(25, "desmos_close", "q1").at(30, "question_leave", "q1");
    const ev = l.end(30);
    expect(desmosMs(ev, "q1")).toBe(8000 + 5000);
    expect(desmosMs(ev, "q2")).toBe(10000);
  });

  test("question still entered at module end closes at end", () => {
    const l = log();
    l.visit("q21", 0, 100).at(100, "question_enter", "q22");
    expect(activeMs(l.end(160, "timeout"), "q22")).toBe(60000);
    expect(endReason(l.events)).toBe("timeout");
  });

  test("answer history tracks selects and clears", () => {
    const l = log();
    l.visit("q2", 0, 20, [l.select(2, "B"), l.select(4, "C"), l.clear(6), l.select(8, "C")]);
    const ev = l.end(20);
    expect(answerHistory(ev, "q2")).toEqual(["B", "C", null, "C"]);
    expect(finalAnswer(ev, "q2")).toBe("C");
    expect(answeredBefore(ev, "q2", 3000)).toBe(true);
    expect(answeredBefore(ev, "q2", 1000)).toBe(false);
  });
});

describe("EventsSchema", () => {
  test("rejects more than 5000 events", () => {
    const many = Array.from({ length: 5001 }, (_, t) => ({ t, type: "mark_toggle", qid: "q1" }));
    expect(EventsSchema.safeParse(many).success).toBe(false);
  });
  test("rejects malformed events", () => {
    expect(EventsSchema.safeParse([{ t: "x" }]).success).toBe(false);
    expect(EventsSchema.safeParse([{ t: 1, type: "nope" }]).success).toBe(false);
  });
  test("accepts a valid log", () => {
    expect(EventsSchema.safeParse(log().visit("q1", 0, 5).end(5)).success).toBe(true);
  });
});
