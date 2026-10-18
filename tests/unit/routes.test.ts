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

process.env.SESSION_SECRET = "route-test-secret-0123456789";
const { signSession } = await import("@/lib/security/token");
const TOKEN = signSession(process.env.SESSION_SECRET);
const { POST: session } = await import("@/app/api/session/route");
const { POST: coach } = await import("@/app/api/coach/route");
const { POST: debrief } = await import("@/app/api/debrief/route");
const { POST: ask } = await import("@/app/api/ask/route");

let ip = 0;
const req = (body: unknown, extra: Record<string, string> = {}) =>
  new Request("http://x/api", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-real-ip": `10.0.0.${++ip}`,
      host: "satori.test",
      origin: "https://satori.test",
      "x-satori-session": TOKEN,
      ...extra,
    },
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

describe("ask message rules", () => {
  const ask_ = (messages: unknown) => ask(req({ events, qid: "q2", desmosAvailable: true, messages }));
  const u = (content = "why?") => ({ role: "user", content });
  const a = (content = "because") => ({ role: "assistant", content });
  test("roles must alternate, starting and ending with the student", async () => {
    streamReply.mockReturnValue((async function* () { yield "ok"; })());
    for (const bad of [[u(), u()], [a(), u()], [u(), a()]]) expect((await ask_(bad)).status).toBe(400);
  });
  test("server enforces the 10-question cap", async () => {
    const msgs = Array.from({ length: 11 }, (_, i) => [u(`q${i}`), a()]).flat().slice(0, 21);
    expect((await ask_(msgs)).status).toBe(400);
  });
  test("coach replies longer than a student message are accepted back", async () => {
    streamReply.mockReturnValue((async function* () { yield "ok"; })());
    expect((await ask_([u(), a("x".repeat(2500)), u()])).status).toBe(200);
  });
});

describe("access control", () => {
  const body = () => ({ events: mixedSession(), qid: "q2", desmosAvailable: true });
  test("no session token → 401", async () => {
    expect((await coach(req(body(), { "x-satori-session": "" }))).status).toBe(401);
  });
  test("forged session token → 401", async () => {
    expect((await coach(req(body(), { "x-satori-session": TOKEN.slice(0, -2) + "xx" }))).status).toBe(401);
  });
  test("another site's origin → 403", async () => {
    expect((await coach(req(body(), { origin: "https://evil.example" }))).status).toBe(403);
  });
  test("a module that hasn't ended can't be coached (no answers mid-test) → 409", async () => {
    const ongoing = mixedSession().filter((e) => e.type !== "module_end");
    expect((await coach(req({ events: ongoing, qid: "q2", desmosAvailable: true }))).status).toBe(409);
    expect((await ask(req({ events: ongoing, qid: "q2", desmosAvailable: true, messages: [{ role: "user", content: "answer?" }] }))).status).toBe(409);
  });
  test("session route issues a verifiable token, same-origin only", async () => {
    const r = await session(req({}, { "x-satori-session": "" }));
    expect(r.status).toBe(200);
    const { token } = await r.json();
    const { verifySession } = await import("@/lib/security/token");
    expect(verifySession(token, process.env.SESSION_SECRET!)).not.toBeNull();
    expect((await session(req({}, { origin: "https://evil.example" }))).status).toBe(403);
  });
});

describe("request limits", () => {
  test("bodies over 1 MB are rejected before parsing", async () => {
    const r = new Request("http://x/api", { method: "POST", headers: { "content-type": "application/json", "content-length": String(2_000_000), "x-real-ip": "9.9.9.9", host: "satori.test", origin: "https://satori.test", "x-satori-session": TOKEN }, body: "{}" });
    expect((await coach(r)).status).toBe(413);
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
