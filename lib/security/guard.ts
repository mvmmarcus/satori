import { clientIp } from "./ip";
import { limiter } from "./limits";
import { isAllowedOrigin } from "./origin";
import { sessionSecret, verifySession } from "./token";

const MIN = 60_000;

export const LIMITS = {
  perIp: { limit: 60, windowMs: 10 * MIN },
  perSession: { limit: 40, windowMs: 60 * MIN },
  sessionsPerIp: { limit: 20, windowMs: 60 * MIN },
  /** Hard ceiling on AI calls per day across everyone: a spend backstop. */
  globalPerDay: () => ({ limit: Number(process.env.AI_DAILY_LIMIT) || 3000, windowMs: 24 * 60 * MIN }),
};

const deny = (status: number, error: string) => Response.json({ error }, { status });

/** Gate for the paid AI routes: same-origin, signed session, then per-IP, per-session and global limits. */
export async function guardAi(req: Request): Promise<Response | null> {
  if (!isAllowedOrigin(req)) return deny(403, "forbidden_origin");
  const secret = sessionSecret();
  if (!secret) return deny(503, "misconfigured");
  const session = verifySession(req.headers.get("x-satori-session"), secret);
  if (!session) return deny(401, "invalid_session");

  const l = limiter();
  const g = LIMITS.globalPerDay();
  if (!(await l.hit(`ip:${clientIp(req)}`, LIMITS.perIp.limit, LIMITS.perIp.windowMs))) return deny(429, "rate_limited");
  if (!(await l.hit(`sid:${session.sid}`, LIMITS.perSession.limit, LIMITS.perSession.windowMs))) return deny(429, "rate_limited");
  if (!(await l.hit("global", g.limit, g.windowMs))) return deny(429, "daily_limit");
  return null;
}

/** Gate for issuing session tokens: same-origin and a per-IP cap. */
export async function guardSessionIssue(req: Request): Promise<Response | null> {
  if (!isAllowedOrigin(req)) return deny(403, "forbidden_origin");
  const ok = await limiter().hit(`issue:${clientIp(req)}`, LIMITS.sessionsPerIp.limit, LIMITS.sessionsPerIp.windowMs);
  return ok ? null : deny(429, "rate_limited");
}
