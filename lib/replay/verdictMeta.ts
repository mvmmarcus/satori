import type { IconName } from "@/components/icons/Icon";
import { KIND_COPY } from "@/lib/content/fallbacks";
import type { VerdictKind } from "@/lib/diagnosis/diagnose";

export const VERDICT_META: Record<VerdictKind, { label: string; color: string; icon: IconName }> = {
  correct: { label: KIND_COPY.correct.label, color: "var(--v-correct)", icon: "check" },
  brilliant: { label: KIND_COPY.brilliant.label, color: "var(--v-brilliant)", icon: "spark" },
  "smart-skip": { label: KIND_COPY["smart-skip"].label, color: "var(--v-smart-skip)", icon: "skip" },
  unanswered: { label: KIND_COPY.unanswered.label, color: "var(--v-unanswered)", icon: "blank" },
  "second-guess": { label: KIND_COPY["second-guess"].label, color: "var(--v-second-guess)", icon: "undo" },
  trap: { label: KIND_COPY.trap.label, color: "var(--v-trap)", icon: "cross" },
  "time-sink": { label: KIND_COPY["time-sink"].label, color: "var(--v-time-sink)", icon: "clock" },
  rushed: { label: KIND_COPY.rushed.label, color: "var(--v-rushed)", icon: "fast" },
  "wrong-tool": { label: KIND_COPY["wrong-tool"].label, color: "var(--v-wrong-tool)", icon: "calc" },
  "concept-gap": { label: KIND_COPY["concept-gap"].label, color: "var(--v-concept-gap)", icon: "question" },
};

/** Display order for causes (most behavioural first). */
export const CAUSE_ORDER: VerdictKind[] = ["trap", "time-sink", "rushed", "second-guess", "wrong-tool", "concept-gap", "unanswered"];
