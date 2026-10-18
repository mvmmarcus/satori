"use client";

import { useRef } from "react";
import type { Question } from "@/lib/content/types";
import type { Verdict } from "@/lib/diagnosis/diagnose";
import { VERDICT_META } from "@/lib/replay/verdictMeta";
import { Glyph } from "./Glyph";

const short = (ms: number) => {
  const t = Math.round(ms / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

type Props = { questions: Question[]; verdicts: Verdict[]; selected: string; highlight: string[]; onSelect: (qid: string) => void };

export function QuestionList({ questions, verdicts, selected, highlight, onSelect }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const next = e.key === "ArrowDown" ? i + 1 : e.key === "ArrowUp" ? i - 1 : null;
    if (next === null || next < 0 || next >= verdicts.length) return;
    e.preventDefault();
    refs.current[next]?.focus();
    onSelect(verdicts[next].qid);
  };

  return (
    <ol aria-label="Questions" className="py-2">
      {verdicts.map((v, i) => {
        const q = questions[i];
        const meta = VERDICT_META[v.kind];
        const isSel = v.qid === selected;
        const over = v.timeMs > v.parMs * 1.3;
        return (
          <li key={v.qid}>
            <button
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              data-testid={`tile-${v.qid}`}
              data-kind={v.kind}
              aria-current={isSel ? "true" : undefined}
              tabIndex={isSel ? 0 : -1}
              onClick={() => onSelect(v.qid)}
              onKeyDown={(e) => onKey(e, i)}
              className={`grid w-full grid-cols-[2ch_44px_1fr_auto] items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                isSel ? "bg-wash shadow-[inset_0_0_0_1px_var(--hair)]" : highlight.includes(v.qid) ? "bg-[#f7f2e3]" : "hover:bg-wash/70"
              }`}
            >
              <span className="text-sm text-mute tabular">{i + 1}</span>
              <Glyph v={v} />
              <span className="min-w-0">
                <span className="block truncate font-medium">{meta.label}</span>
                <span className="block truncate text-[13px] text-mute">{q.skill.replace(/-/g, " ")}</span>
              </span>
              <span className={`text-sm tabular ${over ? "font-semibold text-ink" : "text-mute"}`}>{v.timeMs ? short(v.timeMs) : "–"}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
