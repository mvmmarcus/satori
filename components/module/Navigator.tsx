"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { MODULE } from "@/lib/content/module";

type Props = { current: number; answered: Record<string, string>; marked: Record<string, boolean>; onGo: (i: number) => void; onReview: () => void };

export function Navigator({ current, answered, marked, onGo, onReview }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unanswered = MODULE.filter((m) => !answered[m.qid]).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="nav-panel"
        className="flex h-11 items-center gap-2 rounded-lg bg-ink px-4 text-[15px] font-semibold text-sheet hover:bg-ink-2"
      >
        Question {current + 1} of {MODULE.length}
        <Icon name="chevronDown" className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          id="nav-panel"
          className="absolute bottom-[calc(100%+12px)] left-1/2 z-20 w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border border-hair bg-sheet p-5 shadow-[0_12px_32px_-8px_rgba(27,36,48,.25)]"
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="font-semibold">Module questions</p>
            <p className="text-sm text-mute">{unanswered} unanswered</p>
          </div>
          <ol className="grid grid-cols-6 gap-2">
            {MODULE.map((m, i) => {
              const done = !!answered[m.qid];
              return (
                <li key={m.qid}>
                  <button
                    type="button"
                    data-testid={`nav-${m.qid}`}
                    onClick={() => {
                      onGo(i);
                      setOpen(false);
                    }}
                    aria-current={i === current ? "step" : undefined}
                    aria-label={`Question ${i + 1}${done ? ", answered" : ", unanswered"}${marked[m.qid] ? ", marked for review" : ""}`}
                    className={`relative grid h-11 w-full place-items-center rounded-md border text-sm font-semibold tabular ${
                      done ? "border-ink bg-ink text-sheet" : "border-dashed border-[#9aa6b2] text-ink hover:bg-wash"
                    } ${i === current ? "ring-2 ring-focus ring-offset-2" : ""}`}
                  >
                    {i + 1}
                    {marked[m.qid] && <Icon name="flag" size={12} className="absolute -top-1.5 -right-1.5 rounded-full bg-sheet p-[1px] text-[var(--v-trap)]" />}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 flex items-center justify-between border-t border-hair pt-4 text-sm text-mute">
            <span className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-ink" />Answered</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-dashed border-[#9aa6b2]" />Unanswered</span>
            </span>
            <button type="button" onClick={() => { onReview(); setOpen(false); }} className="font-semibold text-ink underline">
              Finish…
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
