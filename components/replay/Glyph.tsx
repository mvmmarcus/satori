import type { Verdict } from "@/lib/diagnosis/diagnose";
import { VERDICT_META } from "@/lib/replay/verdictMeta";

/**
 * A question drawn from what the student did (data-portrait mark):
 * disc = verdict (filled when correct), outer ring = used Desmos,
 * bar = time against the dashed target, ticks = answer changes.
 */
export function Glyph({ v, size = 44 }: { v: Verdict; size?: number }) {
  const color = VERDICT_META[v.kind].color;
  const changes = Math.max(0, v.history.length - 1);
  const w = size, cx = 11, cy = 11;
  const max = Math.max(v.parMs * 2.4, 1);
  const bar = Math.max(2, Math.min(1, v.timeMs / max) * (w - 2));
  const par = (v.parMs / max) * (w - 2);
  return (
    <svg width={w} height={30} viewBox={`0 0 ${w} 30`} aria-hidden="true" className="shrink-0 overflow-visible">
      {v.desmosMs > 0 && <circle cx={cx} cy={cy} r={10} fill="none" stroke={color} strokeWidth={1.25} />}
      <circle cx={cx} cy={cy} r={6.5} fill={v.correct ? color : "var(--sheet)"} stroke={color} strokeWidth={2.25} />
      {Array.from({ length: Math.min(changes, 4) }, (_, i) => (
        <line key={i} x1={26 + i * 4.5} x2={26 + i * 4.5} y1={6} y2={16} stroke="var(--ink)" strokeWidth={1.5} strokeLinecap="round" />
      ))}
      <rect x={1} y={24} width={bar} height={3.5} rx={1.75} fill={color} />
      <line x1={1 + par} x2={1 + par} y1={21} y2={30} stroke="var(--ink)" strokeWidth={1} strokeDasharray="2 1.5" />
    </svg>
  );
}
