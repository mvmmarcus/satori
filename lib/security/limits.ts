import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface Limiter {
  /** Records one hit; false when the key is over `limit` within the last `windowMs`. */
  hit(key: string, limit: number, windowMs: number): Promise<boolean>;
}

/** Per-process limiter for local development. Not shared across serverless instances. */
export function memoryLimiter(now: () => number = Date.now): Limiter {
  const hits = new Map<string, number[]>();
  return {
    async hit(key, limit, windowMs) {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
      const ok = recent.length < limit;
      if (ok) recent.push(t);
      hits.set(key, recent);
      if (hits.size > 50_000) hits.delete(hits.keys().next().value!);
      return ok;
    },
  };
}

/** Shared limiter backed by Upstash Redis (Vercel Marketplace sets the env vars). Fails open on Redis errors. */
export function redisLimiter(redis: Redis): Limiter {
  const byRule = new Map<string, Ratelimit>();
  return {
    async hit(key, limit, windowMs) {
      const rule = `${limit}:${windowMs}`;
      let rl = byRule.get(rule);
      if (!rl) {
        rl = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`), prefix: `satori:rl:${rule}` });
        byRule.set(rule, rl);
      }
      try {
        return (await rl.limit(key)).success;
      } catch (err) {
        console.warn("[ratelimit] redis unavailable, allowing request", (err as Error)?.name);
        return true;
      }
    },
  };
}

let instance: Limiter | undefined;

export function limiter(): Limiter {
  if (!instance) {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    instance = url ? redisLimiter(Redis.fromEnv()) : memoryLimiter();
  }
  return instance;
}
