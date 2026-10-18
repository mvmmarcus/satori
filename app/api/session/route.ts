import { guardSessionIssue } from "@/lib/security/guard";
import { SESSION_TTL_MS, sessionSecret, signSession } from "@/lib/security/token";

/** Issues the short-lived signed token the AI routes require. */
export async function POST(req: Request) {
  const denied = await guardSessionIssue(req);
  if (denied) return denied;
  const secret = sessionSecret();
  if (!secret) return Response.json({ error: "misconfigured" }, { status: 503 });
  const now = Date.now();
  return Response.json({ token: signSession(secret, now), expiresAt: now + SESSION_TTL_MS }, { headers: { "cache-control": "no-store" } });
}
