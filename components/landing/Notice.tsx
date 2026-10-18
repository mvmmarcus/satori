"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function Notice() {
  const params = useSearchParams();
  const [closed, setClosed] = useState(false);
  if (closed || params.get("notice") !== "no-session") return null;
  return (
    <div role="status" className="flex items-center justify-between gap-4 border-b border-hair bg-[#fff7e6] px-5 py-3 text-sm">
      <span>Finish a module first to see your replay.</span>
      <button type="button" onClick={() => setClosed(true)} className="font-semibold underline">Dismiss</button>
    </div>
  );
}
