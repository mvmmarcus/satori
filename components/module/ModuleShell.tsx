"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { MathText } from "@/components/math/MathText";
import { MODULE, moduleQuestions } from "@/lib/content/module";
import { useSessionReady } from "@/lib/store/hydration";
import { useSession } from "@/lib/store/session";
import { ChoiceList } from "./ChoiceList";
import { DesmosPanel } from "./DesmosPanel";
import { FinishDialog } from "./FinishDialog";
import { Navigator } from "./Navigator";
import { SprInput } from "./SprInput";
import { StartCard } from "./StartCard";
import { Timer } from "./Timer";

const QUESTIONS = moduleQuestions();
const LETTERS: Record<string, string> = { a: "A", b: "B", c: "C", d: "D", "1": "A", "2": "B", "3": "C", "4": "D" };

export function ModuleShell() {
  const router = useRouter();
  const ready = useSessionReady();
  const s = useSession();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (ready && s.status === "finished") router.replace("/replay");
  }, [ready, s.status, router]);

  const index = s.currentIndex;
  const q = QUESTIONS[index];

  useEffect(() => {
    if (s.status !== "active") return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (confirming || e.metaKey || e.ctrlKey || e.altKey || el.closest("input, textarea, [contenteditable], .dcg-container")) return;
      if (e.key === "ArrowRight" && index < MODULE.length - 1) s.goTo(index + 1);
      else if (e.key === "ArrowLeft" && index > 0) s.goTo(index - 1);
      else if (q.format === "mcq" && LETTERS[e.key.toLowerCase()]) s.select(q.qid, LETTERS[e.key.toLowerCase()]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s, index, q, confirming]);

  if (!ready) return <div className="min-h-dvh" aria-busy="true" />;
  if (s.status === "idle") return <StartCard onStart={() => s.start()} />;
  if (s.status === "finished") return <div className="grid min-h-dvh place-items-center text-mute">Opening your replay…</div>;

  const unanswered = MODULE.filter((m) => !s.answers[m.qid]).length;
  const last = index === MODULE.length - 1;
  const marked = !!s.marked[q.qid];

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <header className="grid h-16 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-hair bg-sheet px-4 sm:px-6">
        <div className="min-w-0">
          <p className="truncate font-semibold">Math · Module 1</p>
          <p className="hidden text-sm text-mute sm:block">Practice module</p>
        </div>
        <Timer />
        <div className="flex justify-end">
          <button
            type="button"
            data-testid="desmos-toggle"
            disabled={!s.desmosAvailable}
            onClick={() => s.setDesmos(!s.desmosOpen)}
            aria-pressed={s.desmosOpen}
            title={s.desmosAvailable ? "Graphing calculator" : "Calculator unavailable"}
            className={`flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
              s.desmosOpen ? "bg-ink text-sheet" : "text-ink hover:bg-wash"
            }`}
          >
            <Icon name="calc" />
            <span className="hidden sm:inline">Calculator</span>
          </button>
        </div>
      </header>

      <div className={`grid min-h-0 flex-1 ${s.desmosOpen ? "grid-rows-[45%_1fr] md:grid-cols-[minmax(340px,44%)_1fr] md:grid-rows-1" : "grid-cols-1"}`}>
        <DesmosPanel open={s.desmosOpen} />
        <main className="min-h-0 overflow-y-auto">
          <article className="mx-auto max-w-[720px] px-5 py-8 sm:px-8 sm:py-10" aria-labelledby="q-title">
            <div className="mb-6 flex items-center justify-between border-b border-hair pb-3">
              <h1 id="q-title" className="flex items-center gap-3 font-semibold">
                <span className="grid h-8 min-w-8 place-items-center rounded-md bg-ink px-2 text-sm text-sheet tabular">{index + 1}</span>
                <span className="text-mute">of {MODULE.length}</span>
              </h1>
              <button
                type="button"
                data-testid="mark-review"
                onClick={() => s.toggleMark(q.qid)}
                aria-pressed={marked}
                className={`flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-wash ${marked ? "text-[var(--alert)]" : "text-ink-2"}`}
              >
                <Icon name="flag" className={marked ? "fill-current" : ""} />
                {marked ? "Marked for review" : "Mark for review"}
              </button>
            </div>

            <MathText text={q.stem} className="mb-8 font-serif text-[20px] leading-[1.6] text-ink" />
            <span data-testid="question-stem" hidden>{q.qid}</span>

            {q.format === "mcq" ? (
              <ChoiceList
                q={q}
                selected={s.answers[q.qid]}
                eliminated={s.eliminated[q.qid] ?? []}
                onSelect={(l) => s.select(q.qid, l)}
                onEliminate={(l) => s.eliminate(q.qid, l)}
              />
            ) : (
              <SprInput key={q.qid} value={s.answers[q.qid]} onCommit={(v) => (v === null ? s.clear(q.qid) : s.select(q.qid, v))} />
            )}
          </article>
        </main>
      </div>

      <footer className="flex h-[72px] shrink-0 items-center justify-between gap-3 border-t border-hair bg-sheet px-4 sm:px-6">
        <button
          type="button"
          data-testid="finish"
          onClick={() => setConfirming(true)}
          className="hidden h-11 rounded-lg px-3 text-sm font-semibold text-ink-2 hover:bg-wash sm:block"
        >
          Finish
        </button>
        <Navigator current={index} answered={s.answers} marked={s.marked} onGo={(i) => s.goTo(i)} onReview={() => setConfirming(true)} />
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="back"
            disabled={index === 0}
            onClick={() => s.goTo(index - 1)}
            aria-label="Previous question"
            className="grid h-11 w-11 place-items-center rounded-lg border border-hair hover:bg-wash disabled:opacity-40"
          >
            <Icon name="chevronLeft" />
          </button>
          <button
            type="button"
            data-testid="next"
            onClick={() => (last ? setConfirming(true) : s.goTo(index + 1))}
            className="flex h-11 items-center gap-2 rounded-lg bg-ink px-4 font-semibold text-sheet hover:bg-ink-2"
          >
            {last ? "Review & finish" : "Next"}
            {!last && <Icon name="chevronRight" />}
          </button>
        </div>
      </footer>

      <FinishDialog
        open={confirming}
        unanswered={unanswered}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          s.finish("finish");
        }}
      />
    </div>
  );
}
