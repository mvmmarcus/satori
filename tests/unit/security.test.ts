import { describe, expect, test } from "vitest";
import { signSession, verifySession, SESSION_TTL_MS } from "@/lib/security/token";
import { isAllowedOrigin } from "@/lib/security/origin";
import { memoryLimiter } from "@/lib/security/limits";

const SECRET = "test-secret-0123456789abcdef";
const T0 = 1_800_000_000_000;

describe("session tokens", () => {
  test("a signed token verifies and carries a session id", () => {
    const t = signSession(SECRET, T0);
    expect(verifySession(t, SECRET, T0 + 1000)?.sid).toMatch(/[0-9a-f-]{36}/);
    expect(signSession(SECRET, T0)).not.toBe(t); // fresh id each time
  });
  test("tampered, wrong-secret, expired and malformed tokens are rejected", () => {
    const t = signSession(SECRET, T0);
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ sid: "x", iat: T0 })).toString("base64url");
    expect(verifySession(`${forged}.${sig}`, SECRET, T0)).toBeNull();
    expect(verifySession(t, "another-secret-value-xyz", T0)).toBeNull();
    expect(verifySession(t, SECRET, T0 + SESSION_TTL_MS + 1)).toBeNull();
    expect(verifySession(`${body}.`, SECRET, T0)).toBeNull();
    for (const bad of ["", "abc", "a.b.c", null, undefined]) expect(verifySession(bad as string, SECRET, T0)).toBeNull();
  });
  test("tokens from the future are rejected", () => {
    expect(verifySession(signSession(SECRET, T0 + 60 * 60_000), SECRET, T0)).toBeNull();
  });
});

describe("origin check", () => {
  const req = (h: Record<string, string>) => new Request("http://x/api", { method: "POST", headers: h });
  test("same host passes; other sites and missing origin fail", () => {
    expect(isAllowedOrigin(req({ origin: "https://satori.app", host: "satori.app" }))).toBe(true);
    expect(isAllowedOrigin(req({ origin: "https://satori.app", "x-forwarded-host": "satori.app", host: "internal" }))).toBe(true);
    expect(isAllowedOrigin(req({ origin: "https://evil.example", host: "satori.app" }))).toBe(false);
    expect(isAllowedOrigin(req({ host: "satori.app" }))).toBe(false);
    expect(isAllowedOrigin(req({ origin: "null", host: "satori.app" }))).toBe(false);
  });
  test("extra origins can be allowed explicitly", () => {
    expect(isAllowedOrigin(req({ origin: "https://preview.satori.app", host: "satori.app" }), "https://preview.satori.app, https://x.dev")).toBe(true);
  });
});

describe("memory limiter", () => {
  test("allows up to the limit per key within the window", async () => {
    let now = 0;
    const l = memoryLimiter(() => now);
    for (let i = 0; i < 3; i++) expect(await l.hit("a", 3, 1000)).toBe(true);
    expect(await l.hit("a", 3, 1000)).toBe(false);
    expect(await l.hit("b", 3, 1000)).toBe(true);
    now = 1001;
    expect(await l.hit("a", 3, 1000)).toBe(true);
  });
});

describe("security headers", () => {
  test("every route gets a CSP and the standard hardening headers", async () => {
    const { default: config } = await import("../../next.config");
    const rules = await config.headers!();
    const all = rules.find((r) => r.source === "/:path*")!;
    const h = Object.fromEntries(all.headers.map((x) => [x.key.toLowerCase(), x.value]));
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).toContain("https://www.desmos.com");
    expect(h["content-security-policy"]).toContain("object-src 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["strict-transport-security"]).toContain("max-age=");
    expect(h["permissions-policy"]).toContain("camera=()");
  });
});

describe("CSP scoping", () => {
  test("production policy forbids eval except where Desmos needs it", async () => {
    const { buildCsp } = await import("../../next.config");
    expect(buildCsp({ dev: false, allowEval: false })).not.toContain("unsafe-eval");
    expect(buildCsp({ dev: false, allowEval: true })).toContain("'unsafe-eval'");
    expect(buildCsp({ dev: false, allowEval: false })).toContain("upgrade-insecure-requests");
  });
  test("the site-wide policy allows eval (Desmos needs it and client-side navigation keeps the first page's CSP)", async () => {
    const { default: config } = await import("../../next.config");
    const rules = await config.headers!();
    expect(rules).toHaveLength(1);
    expect(rules[0].headers.find((h) => h.key === "Content-Security-Policy")!.value).toContain("'unsafe-eval'");
  });
});
