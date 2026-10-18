"use client";

import { useMemo } from "react";
import { moduleQuestions } from "@/lib/content/module";
import { diagnose } from "@/lib/diagnosis/diagnose";
import { scoreReport } from "@/lib/scoring/score";
import { useSession } from "@/lib/store/session";

export function useReplay() {
  const status = useSession((s) => s.status);
  const events = useSession((s) => s.events);
  const desmosAvailable = useSession((s) => s.desmosAvailable);
  return useMemo(() => {
    const questions = moduleQuestions();
    const verdicts = diagnose(events, questions, { desmosAvailable });
    return { ready: status === "finished", questions, verdicts, report: scoreReport(verdicts), events };
  }, [status, events, desmosAvailable]);
}
