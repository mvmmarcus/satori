import type { ScoreReport } from "@/lib/scoring/score";
import { CAUSE_ORDER, VERDICT_META } from "@/lib/replay/verdictMeta";
import { Icon } from "@/components/icons/Icon";

/** Stacked bar of points lost by cause. Labels sit beside the bar in ink (two hues are under 3:1 on white). */
export function CauseBar({ report }: { report: ScoreReport }) {
  const parts = CAUSE_ORDER.map((k) => [k, report.lostByKind[k] ?? 0] as const).filter(([, n]) => n > 0);
  if (!parts.length) return <p className="text-mute">No points lost to mistakes. Nothing to fix here.</p>;
  return (
    <figure>
      <div className="flex h-4 gap-[2px]" role="img" aria-label={`Points lost by cause: ${parts.map(([k, n]) => `${VERDICT_META[k].label} ${n}`).join(", ")}`}>
        {parts.map(([k, n], i) => (
          <div
            key={k}
            title={`${VERDICT_META[k].label}: about ${n} points`}
            style={{ flexGrow: n, background: VERDICT_META[k].color }}
            className={`${i === 0 ? "rounded-l-[4px]" : ""} ${i === parts.length - 1 ? "rounded-r-[4px]" : ""}`}
          />
        ))}
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-2">
        {parts.map(([k, n]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="grid h-4 w-4 place-items-center rounded-[4px] text-ink" style={{ background: VERDICT_META[k].color }}>
              <Icon name={VERDICT_META[k].icon} size={11} strokeWidth={2.25} />
            </span>
            {VERDICT_META[k].label} <span className="tabular text-mute">−{n}</span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
