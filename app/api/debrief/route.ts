import { memoCache, hashKey } from "@/lib/ai/cache";
import { structured } from "@/lib/ai/client";
import { debriefContext, rebuild } from "@/lib/ai/context";
import { fallbackDebrief } from "@/lib/ai/fallback";
import { DEBRIEF_SYSTEM } from "@/lib/ai/prompts";
import { readBody } from "@/lib/ai/route-utils";
import { DebriefRequest, DebriefSchema, type Debrief } from "@/lib/ai/schemas";

export const runtime = "nodejs";

const cache = memoCache<Debrief>(200);

export async function POST(req: Request) {
  const body = await readBody(req, DebriefRequest);
  if ("error" in body) return body.error;
  const { events, desmosAvailable } = body.data;

  const { questions, verdicts, report } = rebuild(events, desmosAvailable);
  const key = hashKey(verdicts.map((v) => [v.qid, v.kind, v.finalAnswer, v.timeMs]));
  const hit = cache.get(key);
  if (hit) return Response.json({ source: "ai", data: hit });

  const ai = await structured(DebriefSchema, {
    system: DEBRIEF_SYSTEM,
    facts: debriefContext(questions, verdicts, report),
    ask: "Write the scouting report for this module.",
    effort: "medium",
    maxTokens: 2048,
    timeoutMs: 15_000,
  });
  if (!ai) return Response.json({ source: "fallback", data: fallbackDebrief(questions, verdicts, report) });

  const known = new Set(verdicts.map((v) => v.qid));
  const data: Debrief = { ...ai, patterns: ai.patterns.map((p) => ({ ...p, questionIds: p.questionIds.filter((id) => known.has(id)) })) };
  cache.set(key, data);
  return Response.json({ source: "ai", data });
}
