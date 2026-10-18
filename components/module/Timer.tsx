"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { useSession } from "@/lib/store/session";

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function Timer() {
  const deadline = useSession((s) => s.deadline);
  const checkDeadline = useSession((s) => s.checkDeadline);
  const [now, setNow] = useState(() => Date.now());
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      checkDeadline(t);
    }, 1000);
    return () => clearInterval(id);
  }, [checkDeadline]);

  if (!deadline) return null;
  const left = deadline - now;
  const low = left < 5 * 60_000;
  return (
    <div className="flex items-center gap-2">
      <span
        data-testid="timer"
        aria-live={low ? "polite" : "off"}
        className={`tabular min-w-[4.5ch] text-center text-[17px] font-semibold ${hidden ? "invisible" : ""} ${low ? "text-[var(--alert)]" : ""}`}
      >
        {fmt(left)}
      </span>
      <button
        type="button"
        onClick={() => setHidden((h) => !h)}
        className="grid h-9 w-9 place-items-center rounded-md text-mute hover:bg-wash hover:text-ink"
        aria-label={hidden ? "Show timer" : "Hide timer"}
        title={hidden ? "Show timer" : "Hide timer"}
      >
        <Icon name={hidden ? "eye" : "eyeOff"} />
      </button>
    </div>
  );
}
