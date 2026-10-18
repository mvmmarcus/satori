import { MathText } from "@/components/math/MathText";

export function CoachNoteText({ text }: { text: string }) {
  return <MathText as="span" text={text} className="mt-1 block font-serif text-[17px] leading-relaxed" />;
}
