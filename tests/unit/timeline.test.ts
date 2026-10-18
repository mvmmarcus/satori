import { expect, test } from "vitest";
import { buildTimeline } from "@/lib/replay/timeline";
import { log } from "../helpers/events";

test("timeline lists actions in order with visit durations", () => {
  const l = log();
  l.at(0, "question_enter", "q1").at(4, "answer_select", "q1", { answer: "B" }).at(6, "desmos_open", "q1")
    .at(10, "question_leave", "q1").at(10, "question_enter", "q2").at(30, "question_leave", "q2")
    .at(30, "question_enter", "q1").at(35, "question_leave", "q1");
  const items = buildTimeline(l.end(35), "q1");
  expect(items.map((i) => i.label)).toEqual(["Opened question", "Chose B", "Opened Desmos", "Left question", "Came back", "Left question"]);
  expect(items.filter((i) => i.kind === "leave").map((i) => i.durationMs)).toEqual([10000, 5000]);
  expect(items.map((i) => i.at)).toEqual([0, 4000, 6000, 10000, 30000, 35000]);
});

test("timeline closes an open visit at module end", () => {
  const l = log();
  l.at(0, "question_enter", "q1").at(3, "answer_clear", "q1").at(5, "mark_toggle", "q1").at(6, "choice_eliminate", "q1", { choice: "C" });
  const items = buildTimeline(l.end(8, "timeout"), "q1");
  expect(items.map((i) => i.label)).toEqual(["Opened question", "Cleared answer", "Marked for review", "Crossed out C", "Time ran out"]);
  expect(items.at(-1)).toMatchObject({ kind: "leave", durationMs: 8000 });
});
