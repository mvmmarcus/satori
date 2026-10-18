import { CauseBar } from "@/components/replay/CauseBar";
import { Glyph } from "@/components/replay/Glyph";
import { VERDICT_META } from "@/lib/replay/verdictMeta";
import { fmtDuration } from "@/lib/diagnosis/diagnose";
import { sampleReplay } from "@/lib/landing/sample";

const SHOW = ["q2", "q8", "q9", "q11", "q17"];

export function SampleReplay() {
  const { questions, verdicts, report } = sampleReplay();
  return (
    <figure className="rounded-xl border border-hair bg-sheet shadow-[0_24px_48px_-24px_rgba(27,36,48,.28)]">
      <div className="flex items-baseline justify-between border-b border-hair px-6 py-4">
        <p className="text-sm text-mute">Sample replay</p>
        <p className="flex items-baseline gap-2">
          <span className="font-serif text-[40px] leading-none font-semibold tabular">{report.scaled}</span>
          <span className="text-sm text-mute">est. SAT Math</span>
        </p>
      </div>
      <div className="px-6 pt-5">
        <p className="font-serif text-[20px] leading-snug">About {report.lostTotal} points left on the table.</p>
        <div className="mt-4"><CauseBar report={report} /></div>
      </div>
      <ol className="mt-5 border-t border-hair py-1">
        {SHOW.map((qid) => {
          const i = verdicts.findIndex((v) => v.qid === qid);
          const v = verdicts[i];
          return (
            <li key={qid} className="grid grid-cols-[2ch_44px_1fr_auto] items-center gap-3 px-6 py-2.5">
              <span className="text-sm text-mute tabular">{i + 1}</span>
              <Glyph v={v} />
              <span className="min-w-0">
                <span className="block font-medium">{VERDICT_META[v.kind].label}</span>
                <span className="block truncate text-[13px] text-mute">{v.evidence[0]}</span>
              </span>
              <span className="text-sm text-mute tabular">{fmtDuration(v.timeMs)}</span>
            </li>
          );
        })}
      </ol>
      <figcaption className="border-t border-hair px-6 py-3 text-[13px] text-mute">
        A made-up student, scored by the same engine your module uses. {questions.length} questions, 5 shown.
      </figcaption>
    </figure>
  );
}
