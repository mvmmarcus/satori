import { moduleQuestions } from "@/lib/content/module";
import { log } from "./events";

const Q = moduleQuestions();
const right = (qid: string) => Q.find((q) => q.qid === qid)!.choices!.find((c) => c.correct)!.label;
const wrongTagged = (qid: string) => Q.find((q) => q.qid === qid)!.choices!.find((c) => !c.correct)!.label;

/** A finished module with a mix of verdicts: correct, trap, second-guess, time-sink, concept-gap, unanswered. */
export function mixedSession() {
  const l = log();
  l.visit("q1", 0, 50, [l.select(40, right("q1"))])
    .visit("q2", 50, 100, [l.select(70, wrongTagged("q2"))])
    .visit("q3", 100, 150, [l.select(110, right("q3")), l.select(140, wrongTagged("q3"))])
    .visit("q4", 150, 290, [l.select(280, "25")])
    .visit("q9", 290, 380, [l.select(370, "4")]);
  return l.end(400, "finish");
}
