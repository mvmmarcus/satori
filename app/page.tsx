import Link from "next/link";
import { Suspense } from "react";
import { HeroActions } from "@/components/landing/HeroActions";
import { Notice } from "@/components/landing/Notice";
import { SampleReplay } from "@/components/landing/SampleReplay";

const STEPS = [
  { title: "Take a module", body: "22 SAT-style math questions in 35 minutes, with a built-in Desmos calculator. FilmRoom quietly records how you work: time on each question, answer changes, calculator use." },
  { title: "Watch the replay", body: "Every question gets a verdict with the evidence behind it: a trap you fell for, a time sink, a second-guess, the wrong tool. An AI coach reads the whole tape and writes your scouting report." },
  { title: "Fix your mistakes", body: "Each miss becomes a twin question: same skill, same trap, new numbers. Get it right and the points it cost you count as recovered." },
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-paper">
      <Suspense>
        <Notice />
      </Suspense>
      <header className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-5">
        <span className="font-serif text-[20px] font-semibold">FilmRoom</span>
        <Link href="/module" className="text-sm font-semibold underline decoration-hair underline-offset-4 hover:decoration-ink">Start a module</Link>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 pt-10 pb-20 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div>
            <h1 className="font-serif text-[44px] leading-[1.05] font-semibold text-balance sm:text-[64px]">
              Don&rsquo;t just practice. Review the tape.
            </h1>
            <p className="mt-6 max-w-[52ch] text-[18px] leading-relaxed text-ink-2">
              Most SAT apps tell you <em>what</em> you got wrong. FilmRoom shows you <em>why</em>: the trap you took, the minute you lost, the answer you talked yourself out of. Then it tells you how many points each habit is costing you.
            </p>
            <div className="mt-9">
              <HeroActions />
            </div>
          </div>
          <SampleReplay />
        </section>

        <section aria-labelledby="how" className="border-t border-hair bg-sheet">
          <div className="mx-auto max-w-[1180px] px-5 py-16">
            <h2 id="how" className="font-serif text-[30px] font-semibold">How it works</h2>
            <ol className="mt-8 grid gap-10 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="border-t border-ink pt-4">
                  <p className="text-sm text-mute tabular">Step {i + 1}</p>
                  <h3 className="mt-1 text-[19px] font-semibold">{s.title}</h3>
                  <p className="mt-2 text-ink-2">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="diff" className="mx-auto max-w-[1180px] px-5 py-16">
          <h2 id="diff" className="max-w-[24ch] font-serif text-[30px] leading-tight font-semibold text-balance">Same practice test. A very different debrief.</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-hair p-6">
              <p className="text-sm text-mute">A typical score report</p>
              <p className="mt-3 font-serif text-[22px]">14 of 22 correct. Review: quadratics, percentages, systems.</p>
            </div>
            <div className="rounded-xl border border-ink bg-sheet p-6">
              <p className="text-sm text-mute">FilmRoom</p>
              <p className="mt-3 font-serif text-[22px] leading-snug">
                Three of your misses were traps you answered in under a minute. Two questions ate three minutes each. On question 8 you had the right answer and changed it.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-hair">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-[13px] text-mute">
          <span>Original practice questions in SAT style. Not affiliated with or endorsed by College Board. Score estimates are approximate.</span>
        </div>
      </footer>
    </div>
  );
}
