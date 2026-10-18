"use client";

import Link from "next/link";

export function StartCard({ onStart }: { onStart: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-10 font-serif text-[18px] font-semibold">FilmRoom</Link>
      <h1 className="font-serif text-[40px] leading-[1.1] font-semibold text-balance">Math module, 22 questions, 35 minutes.</h1>
      <p className="mt-5 max-w-[60ch] text-[17px] text-ink-2">
        Work the way you would on test day. FilmRoom records your timing, answer changes and calculator use, then replays the module so you can see why each miss happened.
      </p>
      <ul className="mt-6 space-y-2 text-ink-2">
        <li>The timer keeps running if you close or refresh the tab.</li>
        <li>A graphing calculator (Desmos) is built in; open it any time.</li>
        <li>Questions are original practice items in SAT style.</li>
      </ul>
      <div className="mt-10">
        <button type="button" onClick={onStart} className="h-12 rounded-lg bg-ink px-6 text-[16px] font-semibold text-sheet hover:bg-ink-2">
          Start the module
        </button>
      </div>
    </main>
  );
}
