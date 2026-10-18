import { createHash } from "node:crypto";

export function memoCache<T>(max: number) {
  const map = new Map<string, T>();
  return {
    get(k: string): T | undefined {
      const v = map.get(k);
      if (v !== undefined) {
        map.delete(k);
        map.set(k, v);
      }
      return v;
    },
    set(k: string, v: T) {
      map.delete(k);
      map.set(k, v);
      if (map.size > max) map.delete(map.keys().next().value!);
    },
  };
}

function stable(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(stable);
  if (x && typeof x === "object")
    return Object.fromEntries(Object.keys(x).sort().map((k) => [k, stable((x as Record<string, unknown>)[k])]));
  return x;
}

export function hashKey(x: unknown): string {
  return createHash("sha256").update(JSON.stringify(stable(x))).digest("hex");
}
