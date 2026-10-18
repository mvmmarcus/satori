"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { MathText } from "@/components/math/MathText";
import type { Question } from "@/lib/content/types";
import { isCorrect } from "@/lib/engine/answers";
import type { Verdict } from "@/lib/diagnosis/diagnose";
import { VerdictPill } from "@/components/replay/QuestionDetail";

type Props = {
  number: number;
  v: Verdict;
  twin: Question;
  result: { answer: string | null; correct: boolean | null } | undefined;
  onAnswer: (answer: string, correct: boolean) => void;
  onAnother: () => void;
};

export function DrillCard({ number, v, twin, result, onAnswer, onAnother }: Props) {
  const [draft, setDraft] = useState("");
  const answered = result?.correct !== null && result?.correct !== undefined;
  const submit = (a: string) => !answered && a.trim() && onAnswer(a.trim(), isCorrect(twin, a.trim()));

  return (
    <article data-testid={`drill-${v.qid}`} className="rounded-xl border border-hair bg-sheet">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hair px-6 py-3.5">
        <p className="text-sm text-mute">
          Twin of question {number} · {twin.skill.replace(/-/g, " ")}
        </p>
        <VerdictPill v={v} />
      </header>
      <div className="px-6 py-5">
        <MathText text={twin.stem} className="font-serif text-[19px] leading-[1.55]" />
        {twin.choices ? (
          <div role="radiogroup" aria-label="Answer choices" className="mt-5 grid gap-2 sm:grid-cols-2">
            {twin.choices.map((c) => {
              const mine = result?.answer === c.label;
              const state = answered ? (c.correct ? "border-[var(--v-brilliant)] bg-[#eefaf4]" : mine ? "border-ink bg-wash" : "border-hair opacity-70") : "border-hair hover:border-[#9aa6b2]";
              return (
                <button
                  key={c.label}
                  type="button"
                  role="radio"
                  aria-checked={mine}
                  disabled={answered}
                  onClick={() => submit(c.label)}
                  className={`flex min-h-[48px] items-center gap-3 rounded-lg border px-3 py-2 text-left ${state}`}
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[#9aa6b2] text-[12px] font-semibold">{c.label}</span>
                  <MathText as="span" text={c.text} />
                </button>
              );
            })}
          </div>
        ) : (
          <form
            className="mt-5 flex max-w-sm gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit(draft);
            }}
          >
            <input
              aria-label="Your answer"
              value={answered ? (result?.answer ?? "") : draft}
              disabled={answered}
              maxLength={6}
              inputMode="decimal"
              onChange={(e) => setDraft(e.target.value.replace(/[^0-9./-]/g, ""))}
              className="h-11 min-w-0 flex-1 rounded-lg border border-[#9aa6b2] px-3 tabular"
            />
            <button type="submit" disabled={answered || !draft.trim()} className="h-11 rounded-lg bg-ink px-4 font-semibold text-sheet disabled:opacity-40">
              Check
            </button>
          </form>
        )}

        {answered && (
          <div className="mt-5 rounded-lg bg-wash px-4 py-3.5" aria-live="polite">
            <p className="flex items-center gap-2 font-semibold">
              <Icon name={result?.correct ? "check" : "cross"} />
              {result?.correct ? "Got it. That's the fix sticking." : `Not this time. The answer is ${twin.format === "mcq" ? twin.choices!.find((c) => c.correct)!.label : twin.answer}.`}
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-2">
              {twin.solution.map((s, i) => (
                <li key={i}><MathText as="span" text={s} /></li>
              ))}
            </ol>
            <button type="button" onClick={() => { setDraft(""); onAnother(); }} className="mt-3 text-sm font-semibold underline">
              Try another twin
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
