import type { Metadata } from "next";
import { DrillsView } from "@/components/drills/DrillsView";

export const metadata: Metadata = { title: "Drills · Satori" };

export default function DrillsPage() {
  return <DrillsView />;
}
