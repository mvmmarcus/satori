import type { Metadata } from "next";
import { ReplayView } from "@/components/replay/ReplayView";

export const metadata: Metadata = { title: "Your replay · FilmRoom" };

export default function ReplayPage() {
  return <ReplayView />;
}
