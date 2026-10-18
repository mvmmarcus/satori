import type { QuestionTemplate } from "@/lib/content/types";
import { ALGEBRA } from "./algebra";
import { ADVANCED } from "./advanced";
import { PSDA } from "./psda";
import { GEOMETRY } from "./geometry";

export const TEMPLATES: Record<string, QuestionTemplate> = Object.fromEntries(
  [...ALGEBRA, ...ADVANCED, ...PSDA, ...GEOMETRY].map((t) => [t.id, t]),
);
