"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/store/session";

declare global {
  interface Window {
    Desmos?: { GraphingCalculator: (el: HTMLElement, opts?: Record<string, unknown>) => { destroy(): void; resize(): void } };
  }
}

const KEY = process.env.NEXT_PUBLIC_DESMOS_KEY ?? "dcb31709b452b1cf9dc26972add0fda6";

/** Loads Desmos only after the student first opens the calculator, then keeps it alive (state persists across questions). */
export function DesmosPanel({ open }: { open: boolean }) {
  const setDesmosAvailable = useSession((s) => s.setDesmosAvailable);
  const [requested, setRequested] = useState(open);
  const [loaded, setLoaded] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const calc = useRef<ReturnType<NonNullable<Window["Desmos"]>["GraphingCalculator"]> | null>(null);

  if (open && !requested) setRequested(true);

  useEffect(() => {
    if (!loaded || !open || calc.current || !host.current || !window.Desmos) return;
    calc.current = window.Desmos.GraphingCalculator(host.current, { keypad: true, expressionsCollapsed: false, settingsMenu: false, border: false });
  }, [loaded, open]);

  useEffect(() => {
    if (open) calc.current?.resize();
  }, [open]);

  useEffect(() => () => calc.current?.destroy(), []);

  return (
    <aside
      aria-label="Graphing calculator"
      className={`${open ? "flex" : "hidden"} min-h-0 flex-col border-r border-hair bg-sheet`}
    >
      {requested && (
        <Script
          src={`https://www.desmos.com/api/v1.11/calculator.js?apiKey=${KEY}`}
          strategy="afterInteractive"
          onReady={() => setLoaded(true)}
          onError={() => setDesmosAvailable(false)}
        />
      )}
      {!loaded && <div className="grid flex-1 place-items-center text-sm text-mute">Loading calculator…</div>}
      <div ref={host} className={`${loaded ? "flex-1" : "hidden"} min-h-0`} />
    </aside>
  );
}
