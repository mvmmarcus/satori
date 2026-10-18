import { memoCache, hashKey } from "@/lib/ai/cache";
import { structured } from "@/lib/ai/client";
import { coachContext, rebuild } from "@/lib/ai/context";
import { fallbackCoach } from "@/lib/ai/fallback";
import { COACH_SYSTEM } from "@/lib/ai/prompts";
import { readBody } from "@/lib/ai/route-utils";
import { CoachRequest, CoachSchema, CoachWire, type CoachResult } from "@/lib/ai/schemas";


const cache = memoCache<CoachResult>(500);

export async function POST(req: Request) {
  const body = await readBody(req, CoachRequest);
  if ("error" in body) return body.error;
  const { events, qid, desmosAvailable } = body.data;

  const { questions, verdicts } = rebuild(events, desmosAvailable);
  const q = questions.find((x) => x.qid === qid)!;
  const v = verdicts.find((x) => x.qid === qid)!;

  const key = hashKey({ qid, kind: v.kind, final: v.finalAnswer, evidence: v.evidence });
  const hit = cache.get(key);
  if (hit) return Response.json({ source: "ai", data: hit });

  const ai = await structured(CoachSchema, {
    system: COACH_SYSTEM,
    facts: coachContext(q, v),
    ask: "Write the coach note for this question.",
    effort: "low",
    maxTokens: 4000,
    wire: CoachWire,
  });
  if (!ai) return Response.json({ source: "fallback", data: fallbackCoach(q, v) });

  const data: CoachResult = { note: ai.note, aiRead: v.kind === "concept-gap" ? ai.aiRead : null };
  cache.set(key, data);
  return Response.json({ source: "ai", data });
}
