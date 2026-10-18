import { streamReply } from "@/lib/ai/client";
import { askContext, rebuild } from "@/lib/ai/context";
import { ASK_SYSTEM } from "@/lib/ai/prompts";
import { readAiRequest } from "@/lib/ai/route-utils";
import { AskRequest } from "@/lib/ai/schemas";


export async function POST(req: Request) {
  const body = await readAiRequest(req, AskRequest);
  if ("error" in body) return body.error;
  const { events, qid, desmosAvailable, messages } = body.data;

  const { questions, verdicts } = rebuild(events, desmosAvailable);
  const q = questions.find((x) => x.qid === qid)!;
  const v = verdicts.find((x) => x.qid === qid)!;

  const chunks = streamReply({ system: ASK_SYSTEM, facts: askContext(q, v, events), messages, maxTokens: 1500 });
  if (!chunks) return Response.json({ error: "offline" }, { status: 503 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const text of chunks) controller.enqueue(encoder.encode(text));
      } catch {
        controller.enqueue(encoder.encode("\n\n(The coach lost connection. Try again.)"));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
