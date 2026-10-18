"use client";

import { Icon } from "@/components/icons/Icon";
import { MathText } from "@/components/math/MathText";
import type { Question } from "@/lib/content/types";

type Props = {
  q: Question;
  selected: string | undefined;
  eliminated: string[];
  onSelect: (label: string) => void;
  onEliminate: (label: string) => void;
};

export function ChoiceList({ q, selected, eliminated, onSelect, onEliminate }: Props) {
  return (
    <div role="radiogroup" aria-label="Answer choices" className="flex flex-col gap-2.5">
      {q.choices!.map((c) => {
        const isSel = selected === c.label;
        const out = eliminated.includes(c.label);
        return (
          <div key={c.label} className="flex items-stretch gap-2">
            <button
              type="button"
              role="radio"
              aria-checked={isSel}
              data-testid={`choice-${c.label}`}
              onClick={() => onSelect(c.label)}
              className={`group flex min-h-[52px] flex-1 items-center gap-4 rounded-lg border px-4 py-3 text-left transition-colors ${
                isSel ? "border-ink bg-wash shadow-[inset_0_0_0_1px_var(--ink)]" : "border-hair bg-sheet hover:border-[#9aa6b2]"
              } ${out ? "opacity-55" : ""}`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[13px] font-semibold ${
                  isSel ? "border-ink bg-ink text-sheet" : "border-[#9aa6b2] text-ink"
                }`}
              >
                {c.label}
              </span>
              <MathText as="span" text={c.text} className={`text-[16px] ${out ? "line-through decoration-ink/60" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => onEliminate(c.label)}
              aria-pressed={out}
              aria-label={out ? `Undo cross-out of ${c.label}` : `Cross out ${c.label}`}
              title={out ? "Undo cross-out" : "Cross out"}
              className={`grid w-11 place-items-center rounded-lg text-mute hover:bg-wash hover:text-ink ${out ? "text-ink" : ""}`}
            >
              <Icon name="strike" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
