"use client";

import { useState } from "react";
import { fmtDuration, type Verdict } from "@/lib/diagnosis/diagnose";
import { VERDICT_META } from "@/lib/replay/verdictMeta";

const W = 460, H = 200, PAD_L = 30, PAD_B = 22, TOP = 10;

/** Time per question vs. its target. Mistakes carry their verdict colour; correct answers stay neutral. */
export function PacingChart({ verdicts, selected, onSelect }: { verdicts: Verdict[]; selected: string; onSelect: (qid: string) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const maxMs = Math.max(...verdicts.map((v) => Math.max(v.timeMs, v.parMs))) * 1.08;
  const plotH = H - PAD_B - TOP;
  const step = (W - PAD_L) / verdicts.length;
  const y = (ms: number) => TOP + plotH - (ms / maxMs) * plotH;
  const ticks = [60, 120, 180, 240, 300].filter((s) => s * 1000 < maxMs);
  const hv = hover === null ? null : verdicts[hover];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-labelledby="pacing-title">
        <title id="pacing-title">Seconds spent on each question compared with its target time</title>
        {ticks.map((s) => (
          <g key={s}>
            <line x1={PAD_L} x2={W} y1={y(s * 1000)} y2={y(s * 1000)} stroke="var(--hair)" strokeWidth={1} />
            <text x={PAD_L - 6} y={y(s * 1000) + 3.5} textAnchor="end" fontSize={10} fill="var(--mute)">{s / 60}m</text>
          </g>
        ))}
        {verdicts.map((v, i) => {
          const x = PAD_L + i * step;
          const h = Math.max(0, (v.timeMs / maxMs) * plotH);
          const sel = v.qid === selected;
          const color = v.correct ? "var(--v-correct)" : VERDICT_META[v.kind].color;
          return (
            <g key={v.qid} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => onSelect(v.qid)} className="cursor-pointer">
              <rect x={x} y={TOP} width={step} height={plotH} fill={sel || hover === i ? "var(--wash)" : "transparent"} />
              {h > 0 && <path d={roundTop(x + 1.5, y(v.timeMs), step - 3, h)} fill={color} />}
              <line x1={x + 1} x2={x + step - 1} y1={y(v.parMs)} y2={y(v.parMs)} stroke="var(--ink)" strokeWidth={1.5} />
              {(i % 3 === 0 || sel) && (
                <text x={x + step / 2} y={H - 7} textAnchor="middle" fontSize={10} fill={sel ? "var(--ink)" : "var(--mute)"} fontWeight={sel ? 600 : 400}>
                  {i + 1}
                </text>
              )}
            </g>
          );
        })}
        <line x1={PAD_L} x2={W} y1={TOP + plotH} y2={TOP + plotH} stroke="var(--ink)" strokeWidth={1} />
      </svg>
      {hv && hover !== null && (
        <div
          role="tooltip"
          className="pointer-events-none absolute top-0 z-10 rounded-md border border-hair bg-sheet px-3 py-2 text-[13px] shadow-[0_8px_20px_-6px_rgba(27,36,48,.25)]"
          style={{ left: `${Math.min(78, ((PAD_L + hover * step) / W) * 100)}%` }}
        >
          <p className="font-semibold">Question {hover + 1} · {VERDICT_META[hv.kind].label}</p>
          <p className="tabular text-ink-2">{fmtDuration(hv.timeMs)} vs {fmtDuration(hv.parMs)} target</p>
        </div>
      )}
      <p className="mt-2 flex flex-wrap gap-x-4 text-[13px] text-mute">
        <span className="flex items-center gap-1.5"><span className="h-[2px] w-4 bg-ink" />target time</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-[var(--v-correct)]" />correct</span>
        <span>coloured bars: mistakes, by cause</span>
      </p>
    </div>
  );
}

/** Bar with a 4px rounded top, square at the baseline. */
function roundTop(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}
