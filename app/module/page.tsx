import type { Metadata } from "next";
import { ModuleShell } from "@/components/module/ModuleShell";

export const metadata: Metadata = { title: "Math module · Satori" };

export default function ModulePage() {
  return <ModuleShell />;
}
