"use client";

import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { useSessionReady } from "@/lib/store/hydration";
import { useSession } from "@/lib/store/session";

export function HeroActions() {
  const ready = useSessionReady();
  const status = useSession((s) => s.status);
  const primary = !ready || status === "idle" ? { href: "/module", label: "Start a math module" } : status === "active" ? { href: "/module", label: "Resume your module" } : { href: "/replay", label: "View your last replay" };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Link href={primary.href} className="flex h-12 items-center gap-2 rounded-lg bg-ink px-6 text-[16px] font-semibold text-sheet hover:bg-ink-2">
        {primary.label}
        <Icon name="arrowRight" />
      </Link>
      <span className="text-sm text-mute">Free · no sign-up · 22 questions, 35 minutes</span>
    </div>
  );
}
