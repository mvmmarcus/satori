"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MODULE } from "@/lib/content/module";
import { MISTAKE_KINDS } from "@/lib/diagnosis/diagnose";
import { drillQuestion, pointsRecovered } from "@/lib/drills/drills";
import { hashString } from "@/lib/engine/rng";
import { useReplay } from "@/lib/replay/useReplay";
import { useSessionReady } from "@/lib/store/hydration";
import { useSession } from "@/lib/store/session";
import { DrillCard } from "./DrillCard";

export function DrillsView() {
  const router = useRouter();
  const hydrated = useSessionReady();
  const { ready, verdicts, report } = useReplay();
  const drills = useSession((s) => s.drills);
  const answerDrill = useSession((s) => s.answerDrill);
  const newDrillSeed = useSession((s) => s.newDrillSeed);
  const reset = useSession((s) => s.reset);

  useEffect(() => {
    if (hydrated && !ready) router.replace("/?notice=no-session");
  }, [hydrated, ready, router]);

  if (!hydrated || !ready) return <div className="min-h-dvh" aria-busy="true" />;

  const mistakes = verdicts.filter((v) => MISTAKE_KINDS.includes(v.kind));
  const possible = mistakes.reduce((s, v) => s + (report.perQuestion[v.qid] ?? 0), 0);
  const recovered = pointsRecovered(verdicts, report, drills);
  const pct = possible ? (recovered / possible) * 100 : 0;

  return (
    <div className="min-h-dvh bg-paper">
      <header className="flex h-14 items-center justify-between border-b border-hair bg-sheet px-5">
        <Link href="/" className="font-serif text-[18px] font-semibold">Satori</Link>
        <Link href="/replay" className="text-sm font-semibold text-ink-2 hover:text-ink">Back to replay</Link>
      </header>
      <main className="mx-auto max-w-[820px] px-5 py-10">
        <h1 className="font-serif text-[36px] leading-tight font-semibold text-balance">Fix your mistakes</h1>
        <p className="mt-3 max-w-[60ch] text-[17px] text-ink-2">
          Each question below is a twin of one you missed: same skill, same trap, new numbers. Get it right and those points count as recovered.
        </p>

        <div className="sticky top-0 z-10 -mx-5 mt-6 border-b border-hair bg-paper/95 px-5 py-4 backdrop-blur-sm">
          <div className="flex items-baseline justify-between">
            <p className="font-semibold">Points recovered</p>
            <p data-testid="recovered" className="font-serif text-[28px] font-semibold tabular">
              {recovered}
              <span className="text-[16px] font-normal text-mute"> of {possible}</span>
            </p>
          </div>
          <div className="mt-2 h-2 rounded-full bg-wash" role="progressbar" aria-valuemin={0} aria-valuemax={possible} aria-valuenow={recovered} aria-label="Points recovered">
            <div className="h-2 rounded-full bg-[var(--v-brilliant)] transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {mistakes.length === 0 ? (
          <p className="mt-8 text-ink-2">No mistakes to drill. Take another module when you&rsquo;re ready.</p>
        ) : (
          <div className="mt-8 space-y-6">
            {mistakes.map((v) => {
              const n = MODULE.findIndex((m) => m.qid === v.qid);
              const seed = drills[v.qid]?.seed ?? hashString(v.qid) + 1;
              return (
                <DrillCard
                  key={`${v.qid}-${seed}`}
                  number={n + 1}
                  v={v}
                  twin={drillQuestion(MODULE[n].templateId, v.qid, seed)}
                  result={drills[v.qid]}
                  onAnswer={(a, ok) => answerDrill(v.qid, a, ok)}
                  onAnother={() => newDrillSeed(v.qid)}
                />
              );
            })}
          </div>
        )}

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-hair pt-6">
          <Link href="/replay" className="font-semibold underline">Back to replay</Link>
          <button
            type="button"
            onClick={() => {
              reset();
              router.push("/module");
            }}
            className="h-11 rounded-lg bg-ink px-5 font-semibold text-sheet hover:bg-ink-2"
          >
            Retake the module
          </button>
        </div>
      </main>
    </div>
  );
}
