import { beforeEach, describe, expect, test, vi } from "vitest";
import { mixedSession } from "../helpers/sessions";
import { log } from "../helpers/events";

const structured = vi.fn();
const streamReply = vi.fn();
vi.mock("@/lib/ai/client", () => ({
  providerName: () => "anthropic",
  structured: (...a: unknown[]) => structured(...a),
  streamReply: (...a: unknown[]) => streamReply(...a),
}));

const { POST: coach } = await import("@/app/api/coach/route");
const { POST: debrief } = await import("@/app/api/debrief/route");
const { POST: ask } = await import("@/app/api/ask/route");

let ip = 0;
const req = (body: unknown) =>
  new Request("http://x/api", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${++ip}` },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const events = mixedSession();

beforeEach(() => {
  structured.mockReset();
  streamReply.mockReset();
});

describe("input validation", () => {
  test("malformed JSON → 400", async () => {
    expect((await coach(req("{nope"))).status).toBe(400);
  });
  test("5001 events → 400", async () => {
    const many = Array.from({ length: 5001 }, (_, t) => ({ t, type: "mark_toggle", qid: "q1" }));
    expect((await coach(req({ events: many, qid: "q1", desmosAvailable: true }))).status).toBe(400);
  });
  test("unknown qid → 400", async () => {
    expect((await coach(req({ events, qid: "q99", desmosAvailable: true }))).status).toBe(400);
  });
  test("ask message over 1000 chars → 400", async () => {
    const res = await ask(req({ events, qid: "q2", desmosAvailable: true, messages: [{ role: "user", content: "x".repeat(1001) }] }));
    expect(res.status).toBe(400);
  });
});

describe("coach", () => {
  test("no model output → fallback, 200", async () => {
    structured.mockResolvedValue(null);
    const res = await coach(req({ events, qid: "q2", desmosAvailable: true }));
    expect(res.status).toBe(200);
    expect((await res.json()).source).toBe("fallback");
  });

  test("aiRead is stripped on verdicts other than concept-gap", async () => {
    structured.mockResolvedValue({ note: "Watch the base.", aiRead: { misconception: "x", confidence: "high" } });
    const body = await (await coach(req({ events, qid: "q2", desmosAvailable: true }))).json();
    expect(body).toMatchObject({ source: "ai", data: { note: "Watch the base.", aiRead: null } });
  });

  test("aiRead kept on concept-gap", async () => {
    structured.mockResolvedValue({ note: "n", aiRead: { misconception: "factoring sign", confidence: "med" } });
    const body = await (await coach(req({ events, qid: "q9", desmosAvailable: false }))).json();
    expect(body.data.aiRead).toEqual({ misconception: "factoring sign", confidence: "med" });
  });
});

describe("debrief", () => {
  test("model output passes through; null → fallback", async () => {
    structured.mockResolvedValueOnce({ headline: "h", patterns: [{ title: "t", questionIds: ["q2"], explanation: "e" }], habits: ["a", "b", "c"] });
    expect((await (await debrief(req({ events, desmosAvailable: true }))).json()).source).toBe("ai");
    structured.mockResolvedValueOnce(null);
    expect((await (await debrief(req({ events: log().visit("q1", 0, 5).end(5), desmosAvailable: false }))).json()).source).toBe("fallback");
  });
});

describe("ask", () => {
  test("offline → 503", async () => {
    streamReply.mockReturnValue(null);
    const res = await ask(req({ events, qid: "q2", desmosAvailable: true, messages: [{ role: "user", content: "why?" }] }));
    expect(res.status).toBe(503);
  });

  test("streams text", async () => {
    streamReply.mockReturnValue((async function* () { yield "Hel"; yield "lo"; })());
    const res = await ask(req({ events, qid: "q2", desmosAvailable: true, messages: [{ role: "user", content: "why?" }] }));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Hello");
  });
});
