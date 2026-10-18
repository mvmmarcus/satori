"use client";

import { useState } from "react";
import { MathText } from "@/components/math/MathText";
import { parseSpr } from "@/lib/engine/answers";

export function SprInput({ value, onCommit }: { value: string | undefined; onCommit: (v: string | null) => void }) {
  const [draft, setDraft] = useState(value ?? "");
  const valid = draft.trim() === "" || parseSpr(draft) !== null;
  const commit = () => onCommit(draft.trim() ? draft.trim() : null);
  const preview = draft.includes("/") ? `$\\frac{${draft.split("/")[0]}}{${draft.split("/")[1] ?? ""}}$` : draft;

  return (
    <div className="max-w-xs">
      <label htmlFor="spr" className="mb-2 block text-sm text-mute">Your answer</label>
      <input
        id="spr"
        data-testid="spr-input"
        inputMode="decimal"
        autoComplete="off"
        maxLength={6}
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9./-]/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        aria-invalid={!valid}
        aria-describedby="spr-help"
        className="h-12 w-full rounded-lg border border-[#9aa6b2] bg-sheet px-4 text-[18px] tabular focus:border-ink"
      />
      <p id="spr-help" className={`mt-2 text-sm ${valid ? "text-mute" : "text-[var(--alert)]"}`}>
        {valid ? "Up to 6 characters. Fractions like 3/4 or decimals like .75 are fine." : "That isn't a number we can read. Try 3/4, .75 or -2."}
      </p>
      {draft && valid && (
        <p className="mt-3 text-sm text-mute">
          Answer preview: <MathText as="span" text={preview} className="ml-1 text-[17px] text-ink" />
        </p>
      )}
    </div>
  );
}
