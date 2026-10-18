import type { Metadata } from "next";
import { ModuleShell } from "@/components/module/ModuleShell";

export const metadata: Metadata = { title: "Math module · FilmRoom" };

export default function ModulePage() {
  return <ModuleShell />;
}
