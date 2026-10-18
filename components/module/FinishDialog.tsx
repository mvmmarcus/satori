"use client";

import { useEffect, useRef } from "react";

export function FinishDialog({ open, unanswered, onCancel, onConfirm }: { open: boolean; unanswered: number; onCancel: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      aria-labelledby="finish-title"
      className="m-auto w-[min(92vw,440px)] rounded-xl border border-hair bg-sheet p-6 text-ink shadow-[0_24px_48px_-12px_rgba(27,36,48,.35)] backdrop:bg-ink/40"
    >
      <h2 id="finish-title" className="font-serif text-[24px] font-semibold">Finish the module?</h2>
      <p className="mt-2 text-ink-2">
        {unanswered === 0
          ? "Every question has an answer. Once you finish, you can't change them; you'll go straight to your replay."
          : `${unanswered} ${unanswered === 1 ? "question has" : "questions have"} no answer. There's no penalty for guessing, so it's worth filling them in before you finish.`}
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="h-11 rounded-lg border border-hair px-4 font-semibold hover:bg-wash">
          Keep working
        </button>
        <button type="button" data-testid="confirm-finish" onClick={onConfirm} className="h-11 rounded-lg bg-ink px-5 font-semibold text-sheet hover:bg-ink-2">
          Finish and see replay
        </button>
      </div>
    </dialog>
  );
}
