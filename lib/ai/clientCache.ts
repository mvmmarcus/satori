const KEY = "satori:ai:v1";
const MAX = 120;

type Entry = { v: unknown; at: number };

function readAll(): Record<string, Entry> {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function cacheGet<T>(key: string): T | undefined {
  return readAll()[key]?.v as T | undefined;
}

export function cacheSet(key: string, v: unknown): void {
  try {
    const all = readAll();
    all[key] = { v, at: Date.now() };
    const keys = Object.keys(all).sort((a, b) => all[a].at - all[b].at);
    for (const k of keys.slice(0, Math.max(0, keys.length - MAX))) delete all[k];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}
