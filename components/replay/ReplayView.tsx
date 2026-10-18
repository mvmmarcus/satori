"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { fallbackDebrief } from "@/lib/ai/fallback";
import { useDebrief } from "@/lib/ai/hooks";
import { endTime } from "@/lib/recorder/metrics";
import { useReplay } from "@/lib/replay/useReplay";
import { useSessionReady } from "@/lib/store/hydration";
import { CauseBar } from "./CauseBar";
import { PacingChart } from "./PacingChart";
import { QuestionDetail } from "./QuestionDetail";
import { QuestionList } from "./QuestionList";
import { ScoutingReport } from "./ScoutingReport";

const clock = (ms: number) => {
  const t = Math.round(ms / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

export function ReplayView() {
  const router = useRouter();
  const hydrated = useSessionReady();
  const { ready, questions, verdicts, report, events } = useReplay();
  const debrief = useDebrief(verdicts, ready);
  const firstMistake = verdicts.find((v) => !v.correct)?.qid ?? "q1";
  const [picked, setPicked] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string[]>([]);
  const selected = picked ?? firstMistake;

  useEffect(() => {
    if (hydrated && !ready) router.replace("/?notice=no-session");
  }, [hydrated, ready, router]);

  if (!hydrated || !ready) return <div className="min-h-dvh" aria-busy="true" />;

  const i = verdicts.findIndex((v) => v.qid === selected);
  // Never leave the report spinning: if the coach can't be reached, use the pre-written debrief.
  const report_ = debrief.data ?? (debrief.loading ? null : fallbackDebrief(questions, verdicts, report));
  const mode = debrief.source === "ai" ? "AI" : debrief.loading ? "Coach" : "Offline";
  const mistakes = verdicts.filter((v) => !v.correct && v.kind !== "smart-skip").length;
  const pick = (qid: string) => {
    setPicked(qid);
    document.getElementById("detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-dvh bg-paper">
      <header className="flex h-14 items-center justify-between border-b border-hair bg-sheet px-5">
        <Link href="/" className="font-serif text-[18px] font-semibold">Satori</Link>
        <div className="flex items-center gap-5 text-sm text-mute">
          <span className="hidden sm:inline">Math · Module 1 · finished in {clock(endTime(events))}</span>
          <span data-testid="ai-mode" className="flex items-center gap-1.5 text-ink">
            <span className={`h-2 w-2 rounded-full ${mode === "AI" ? "bg-[var(--v-brilliant)]" : "bg-[var(--v-unanswered)]"}`} />
            {mode}
            <span className="sr-only"> coach</span>
          </span>
        </div>
      </header>

      <div className="flex flex-col lg:grid lg:grid-cols-[340px_1fr]">
        <aside className="order-2 border-t border-hair bg-sheet lg:order-none lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:border-t-0 lg:border-r">
          <div className="hidden border-b border-hair px-5 pt-6 pb-5 lg:block">
            <p className="text-sm text-mute">Estimated SAT Math</p>
            <p className="mt-1 flex items-baseline gap-3">
              <span data-testid="score" className="font-serif text-[64px] leading-none font-semibold tabular">{report.scaled}</span>
              <span className="text-sm text-mute tabular">likely {report.range[0]}–{report.range[1]}</span>
            </p>
            <p className="mt-2 text-sm text-ink-2 tabular">{report.raw} of {report.total} correct</p>
          </div>
          <QuestionList questions={questions} verdicts={verdicts} selected={selected} highlight={highlight} onSelect={pick} />
          <p className="border-t border-hair px-5 py-4 text-[13px] text-mute">
            Each mark: disc filled when correct, ring when you used Desmos, ticks for answer changes, bar for time against the dashed target.
          </p>
        </aside>

        <main className="mx-auto w-full max-w-[1100px] px-5 py-8 sm:px-8">
          <p className="mb-4 flex items-baseline gap-3 lg:hidden">
            <span className="font-serif text-[44px] leading-none font-semibold tabular">{report.scaled}</span>
            <span className="text-sm text-mute tabular">est. SAT Math · {report.raw} of {report.total} correct</span>
          </p>
          <h1 className="max-w-[24ch] font-serif text-[34px] leading-[1.15] font-semibold text-balance sm:text-[40px]">
            {report.lostTotal > 0 ? (
              <>You left about <span data-testid="points-lost">{report.lostTotal} points</span> on the table. Here&rsquo;s where they went.</>
            ) : (
              <>A clean module. <span data-testid="points-lost">No points</span> lost to mistakes.</>
            )}
          </h1>
          <div className="mt-6 max-w-[760px]">
            <CauseBar report={report} />
          </div>

          <div className="mt-10 grid gap-8 rounded-xl border border-hair bg-sheet p-6 lg:grid-cols-2">
            <ScoutingReport data={report_} loading={debrief.loading} onFocus={setHighlight} onPick={pick} />
            <section aria-labelledby="pacing">
              <h2 id="pacing" className="font-serif text-[22px] font-semibold">Pacing</h2>
              <p className="mb-3 text-sm text-mute">Time on each question against its target. Select a bar to open it.</p>
              <PacingChart verdicts={verdicts} selected={selected} onSelect={pick} />
            </section>
          </div>

          <div id="detail" className="mt-10 scroll-mt-6">
            <QuestionDetail q={questions[i]} v={verdicts[i]} events={events} number={i + 1} />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-hair pt-6">
            <p className="text-sm text-mute">Original practice questions. Score estimates are approximate.</p>
            {mistakes > 0 && (
              <Link
                href="/drills"
                data-testid="drills-cta"
                className="flex h-12 items-center gap-2 rounded-lg bg-ink px-5 font-semibold text-sheet hover:bg-ink-2"
              >
                Fix these {mistakes} {mistakes === 1 ? "mistake" : "mistakes"}
                <Icon name="arrowRight" />
              </Link>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
