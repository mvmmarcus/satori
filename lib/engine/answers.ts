import type { Question } from "@/lib/content/types";

const NUM = /^-?(\d+\.?\d*|\.\d+)$/;

export function parseSpr(input: string): number | null {
  const s = input.replace(/\s+/g, "");
  if (!s) return null;
  const parts = s.split("/");
  if (parts.length > 2) return null;
  if (!parts.every((p) => NUM.test(p))) return null;
  if (parts.length === 1) return Number(parts[0]);
  const [n, d] = parts.map(Number);
  if (d === 0) return null;
  return n / d;
}

export function isCorrect(q: Question, response: string | null): boolean {
  if (response == null) return false;
  if (q.format === "mcq") return q.choices?.some((c) => c.correct && c.label === response) ?? false;
  const a = parseSpr(response);
  const b = parseSpr(q.answer);
  return a !== null && b !== null && Math.abs(a - b) < 1e-6;
}
