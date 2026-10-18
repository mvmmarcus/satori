"use client";

import { Icon } from "@/components/icons/Icon";
import { MathText } from "@/components/math/MathText";
import { useCoach } from "@/lib/ai/hooks";
import type { Question } from "@/lib/content/types";
import { fmtDuration, type Verdict } from "@/lib/diagnosis/diagnose";
import type { ModuleEvent } from "@/lib/recorder/events";
import { buildTimeline } from "@/lib/replay/timeline";
import { VERDICT_META } from "@/lib/replay/verdictMeta";
import { AskPanel } from "./AskPanel";

const clock = (ms: number) => {
  const t = Math.round(ms / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const human = (tag: string) => tag.replace(/-/g, " ");

export function VerdictPill({ v }: { v: Verdict }) {
  const meta = VERDICT_META[v.kind];
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-hair bg-sheet py-1 pr-3 pl-1 text-sm font-semibold" data-testid="verdict-label">
      <span className="grid h-6 w-6 place-items-center rounded-full text-ink" style={{ background: meta.color }}>
        <Icon name={meta.icon} size={13} strokeWidth={2.25} />
      </span>
      {meta.label}
    </span>
  );
}

export function QuestionDetail({ q, v, events, number }: { q: Question; v: Verdict; events: ModuleEvent[]; number: number }) {
  const coach = useCoach(v);
  const timeline = buildTimeline(events, q.qid);
  const correctText = q.format === "mcq" ? q.choices!.find((c) => c.correct)!.label : q.answer;

  return (
    <article data-testid="question-detail" aria-labelledby="detail-title" className="rounded-xl border border-hair bg-sheet">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hair px-6 py-4">
        <div className="flex items-center gap-3">
          <h2 id="detail-title" className="font-serif text-[22px] font-semibold">Question {number}</h2>
          <VerdictPill v={v} />
        </div>
        <p className="text-sm text-mute">
          {q.skill.replace(/-/g, " ")} · {q.difficulty} · {q.desmosFast ? "Desmos is the fast route" : "fastest by hand"}
        </p>
      </header>

      <div className="grid gap-0 lg:grid-cols-[1.1fr_1fr]">
        <div className="px-6 py-5">
          <MathText text={q.stem} className="font-serif text-[19px] leading-[1.55]" />

          {q.choices ? (
            <ul className="mt-5 space-y-2">
              {q.choices.map((c) => {
                const mine = v.finalAnswer === c.label;
                return (
                  <li
                    key={c.label}
                    className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${c.correct ? "border-[var(--v-brilliant)] bg-[#eefaf4]" : mine ? "border-ink bg-wash" : "border-hair"}`}
                  >
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[#9aa6b2] text-[12px] font-semibold">{c.label}</span>
                    <span className="min-w-0 flex-1">
                      <MathText as="span" text={c.text} />
                      {(mine || c.correct || (mine && c.misconception)) && (
                        <span className="mt-0.5 block text-[13px] text-ink-2">
                          {c.correct && "Correct answer"}
                          {mine && !c.correct && "Your answer"}
                          {mine && c.misconception && ` · trap: ${human(c.misconception)}`}
                          {mine && c.correct && " · yours"}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <dl className="mt-5 grid grid-cols-2 border-t border-hair text-sm sm:grid-cols-4">
            {[
              ["Your answer", v.finalAnswer ?? "No answer"],
              ["Correct", correctText],
              ["Time", `${fmtDuration(v.timeMs)}`],
              ["Target", fmtDuration(v.parMs)],
            ].map(([k, val]) => (
              <div key={k} className="border-b border-hair py-2.5">
                <dt className="text-[13px] text-mute">{k}</dt>
                <dd className="font-semibold tabular">{val}</dd>
              </div>
            ))}
          </dl>

          {!v.correct && (
            <ul className="mt-4 space-y-1 text-sm text-ink-2">
              {v.evidence.map((e) => (
                <li key={e} className="flex gap-2"><span aria-hidden="true" className="text-mute">–</span>{e}</li>
              ))}
              {v.squeezedBy && <li className="flex gap-2"><span aria-hidden="true" className="text-mute">–</span>Squeezed for time by question {v.squeezedBy.slice(1)}</li>}
            </ul>
          )}

          <div className="mt-6 rounded-lg bg-wash px-4 py-3.5" aria-live="polite">
            <p className="text-[13px] font-medium text-mute">{coach.source === "ai" ? "Coach note · AI" : "Coach note"}</p>
            {v.correct ? (
              <p className="mt-1 font-serif text-[17px] leading-relaxed">
                {v.kind === "brilliant" ? "Fast and right on a hard question. Whatever you did here, do it again." : "Right answer in good time. Nothing to fix."}
              </p>
            ) : coach.loading ? (
              <div className="mt-2 space-y-2" aria-hidden="true">
                <div className="h-4 w-full animate-pulse rounded bg-sheet" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-sheet" />
              </div>
            ) : (
              <p data-testid="coach-note" className="mt-1 font-serif text-[17px] leading-relaxed">
                {coach.data?.note ?? "The coach couldn't be reached. The solution steps below walk through it."}
              </p>
            )}
            {coach.data?.aiRead && (
              <p data-testid="ai-read" className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-md border border-hair bg-sheet px-2.5 py-1.5 text-sm">
                <span className="font-semibold">AI read</span>
                <span className="text-ink-2">likely misconception: {coach.data.aiRead.misconception}</span>
                <span className="text-mute">({coach.data.aiRead.confidence === "med" ? "medium" : coach.data.aiRead.confidence} confidence)</span>
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-hair px-6 py-5 lg:border-t-0 lg:border-l">
          <h3 className="font-semibold">What you did</h3>
          {timeline.length ? (
            <ol className="mt-2">
              {timeline.map((t, i) => (
                <li key={i} className="grid grid-cols-[52px_1fr] border-b border-hair py-2 text-sm">
                  <time className="tabular text-mute">{clock(t.at)}</time>
                  <span>
                    {t.label}
                    {t.durationMs !== undefined && <span className="text-mute"> · {fmtDuration(t.durationMs)} on screen</span>}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-mute">You didn&rsquo;t reach this question.</p>
          )}

          <details className="mt-5 group">
            <summary className="cursor-pointer font-semibold marker:text-mute">Solution</summary>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-ink-2">
              {q.solution.map((step, i) => (
                <li key={i}><MathText as="span" text={step} /></li>
              ))}
            </ol>
          </details>

          <AskPanel qid={q.qid} />
        </div>
      </div>
    </article>
  );
}
