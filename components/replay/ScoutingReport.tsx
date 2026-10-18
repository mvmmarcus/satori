"use client";

import type { Debrief } from "@/lib/ai/schemas";

type Props = { data: Debrief | null; loading: boolean; onFocus: (ids: string[]) => void; onPick: (qid: string) => void };

const label = (ids: string[]) => ids.map((id) => `Q${id.slice(1)}`).join(", ");

export function ScoutingReport({ data, loading, onFocus, onPick }: Props) {
  return (
    <section aria-labelledby="scout-title" aria-busy={loading} data-testid="scouting-report">
      <h2 id="scout-title" className="font-serif text-[22px] font-semibold">Scouting report</h2>
      {loading || !data ? (
        <div className="mt-4 space-y-3" aria-hidden="true">
          <div className="h-5 w-11/12 animate-pulse rounded bg-wash" />
          <div className="h-5 w-3/4 animate-pulse rounded bg-wash" />
          <div className="mt-6 h-4 w-1/3 animate-pulse rounded bg-wash" />
          <div className="h-4 w-full animate-pulse rounded bg-wash" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-wash" />
          <p className="pt-2 text-sm text-mute">Your coach is reviewing the tape…</p>
        </div>
      ) : (
        <>
          <p className="mt-3 font-serif text-[20px] leading-snug text-balance">{data.headline}</p>
          <div className="mt-5 space-y-4">
            {data.patterns.map((p) => (
              <div key={p.title} onMouseEnter={() => onFocus(p.questionIds)} onMouseLeave={() => onFocus([])}>
                <h3 className="font-semibold">
                  {p.title}
                  {p.questionIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onPick(p.questionIds[0])}
                      onFocus={() => onFocus(p.questionIds)}
                      onBlur={() => onFocus([])}
                      className="ml-2 text-sm font-normal text-mute underline decoration-hair hover:text-ink"
                    >
                      {label(p.questionIds)}
                    </button>
                  )}
                </h3>
                <p className="mt-0.5 text-ink-2">{p.explanation}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-hair pt-4">
            <h3 className="text-sm font-semibold">Three things to do next time</h3>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-ink-2 marker:text-mute">
              {data.habits.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ol>
          </div>
        </>
      )}
    </section>
  );
}
