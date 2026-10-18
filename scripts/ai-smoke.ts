/**
 * Runs the real AI layer (debrief, coach, ask) against three fixture sessions and prints the output.
 * Spends API credits. Reads .env.local. Usage: npx tsx --env-file=.env.local scripts/ai-smoke.ts
 */
import { providerName, structured, streamReply } from "../lib/ai/client";
import { askContext, coachContext, debriefContext, rebuild } from "../lib/ai/context";
import { ASK_SYSTEM, COACH_SYSTEM, DEBRIEF_SYSTEM } from "../lib/ai/prompts";
import { CoachSchema, CoachWire, DebriefSchema, DebriefWire } from "../lib/ai/schemas";
import { FIXTURES } from "../tests/fixtures/sessions";

async function main() {
  if (!providerName()) throw new Error("Set OPENAI_API_KEY or ANTHROPIC_API_KEY (and optionally AI_PROVIDER) first.");
  console.log(`provider: ${providerName()}`);
  for (const [name, events] of Object.entries(FIXTURES)) {
    const { questions, verdicts, report } = rebuild(events, true);
    console.log(`\n━━ ${name}: raw ${report.raw}/22, est ${report.scaled}, lost ${report.lostTotal} ━━`);

    const t0 = Date.now();
    const d = await structured(DebriefSchema, { system: DEBRIEF_SYSTEM, facts: debriefContext(questions, verdicts, report), ask: "Write the scouting report for this module.", effort: "medium", maxTokens: 8000, timeoutMs: 60_000, wire: DebriefWire });
    console.log(`\n[debrief ${Date.now() - t0}ms]`, JSON.stringify(d, null, 2));

    for (const v of verdicts.filter((x) => !x.correct).slice(0, 2)) {
      const q = questions.find((x) => x.qid === v.qid)!;
      const t1 = Date.now();
      const c = await structured(CoachSchema, { system: COACH_SYSTEM, facts: coachContext(q, v), ask: "Write the coach note for this question.", effort: "low", maxTokens: 4000, timeoutMs: 30_000, wire: CoachWire });
      console.log(`\n[coach ${v.qid} ${v.kind} ${Date.now() - t1}ms]`, JSON.stringify(c, null, 2));
    }

    const v = verdicts.find((x) => !x.correct);
    if (v) {
      const q = questions.find((x) => x.qid === v.qid)!;
      const chunks = streamReply({ system: ASK_SYSTEM, facts: askContext(q, v, events), messages: [{ role: "user", content: "Why is my answer wrong, and what's the fastest way?" }], maxTokens: 4000 });
      process.stdout.write(`\n[ask ${v.qid}] `);
      for await (const c of chunks!) process.stdout.write(c);
      process.stdout.write("\n");
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
