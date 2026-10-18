import type { VerdictKind } from "@/lib/diagnosis/diagnose";

/** Label, pre-written coach note and habit per verdict kind (used offline and in the UI). */
export const KIND_COPY: Record<VerdictKind, { label: string; note: string; habit: string }> = {
  brilliant: {
    label: "Brilliant",
    note: "Fast and right on a hard question. Whatever you did here, do it again.",
    habit: "Keep spotting the shortcut before you start computing.",
  },
  correct: {
    label: "Correct",
    note: "Solid. Right answer in a reasonable time.",
    habit: "Keep your pace steady on questions like this.",
  },
  "smart-skip": {
    label: "Smart skip",
    note: "You left a hard question early and used the time to win later points. That's good test strategy.",
    habit: "Keep skipping early when a hard question stalls; come back if time remains.",
  },
  unanswered: {
    label: "Unanswered",
    note: "No answer means a guaranteed zero. There's no penalty for guessing on the SAT.",
    habit: "Never leave a blank: pick your best guess before time runs out.",
  },
  "second-guess": {
    label: "Second-guess",
    note: "You had it right, then changed it. Change an answer only when you find a specific error, not a feeling.",
    habit: "Only change an answer when you can name the mistake in your first attempt.",
  },
  trap: {
    label: "Trap",
    note: "You picked an answer built to catch a common slip. The test writers expect that move.",
    habit: "Before you pick, ask which wrong answer a rushed student would choose.",
  },
  "time-sink": {
    label: "Time sink",
    note: "This one ate far more than its share of the clock and still went wrong. Cut losses sooner.",
    habit: "At double the target time, guess, mark it, and move on.",
  },
  rushed: {
    label: "Rushed",
    note: "Too fast to be careful. A few more seconds re-reading the question would likely have saved it.",
    habit: "Re-read what the question asks for before you lock in an answer.",
  },
  "wrong-tool": {
    label: "Wrong tool",
    note: "The method choice cost you time here: either Desmos where hand-solving is faster, or hand-solving where a graph is instant.",
    habit: "Decide in five seconds: graph it in Desmos, or solve by hand.",
  },
  "concept-gap": {
    label: "Concept gap",
    note: "Nothing in your timing explains this miss, so it's likely the underlying idea. Review the solution steps below.",
    habit: "Re-learn this skill with two or three practice questions before your next module.",
  },
};
