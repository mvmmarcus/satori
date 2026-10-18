"use client";

const KEY = "satori:session-token:v1";
type Stored = { token: string; expiresAt: number };

let pending: Promise<string | null> | null = null;

function read(): Stored | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as Stored | null;
    return s && typeof s.token === "string" && s.expiresAt - Date.now() > 5 * 60_000 ? s : null;
  } catch {
    return null;
  }
}

async function issue(): Promise<string | null> {
  const r = await fetch("/api/session", { method: "POST" }).catch(() => null);
  if (!r?.ok) return null;
  const s = (await r.json()) as Stored;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
  return s.token;
}

async function token(force = false): Promise<string | null> {
  if (!force) {
    const s = read();
    if (s) return s.token;
  }
  pending ??= issue().finally(() => (pending = null));
  return pending;
}

/** fetch() for the AI routes: attaches the session token and retries once with a fresh one on 401. */
export async function aiFetch(url: string, init: RequestInit): Promise<Response> {
  const send = (t: string | null) => fetch(url, { ...init, headers: { ...init.headers, "x-satori-session": t ?? "" } });
  const res = await send(await token());
  return res.status === 401 ? send(await token(true)) : res;
}
