"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useState } from "react";
import type { Verdict } from "@/lib/diagnosis/diagnose";
import { hashString } from "@/lib/engine/rng";
import { useSession } from "@/lib/store/session";
import { cacheGet, cacheSet } from "./clientCache";
import type { ChatMessage, CoachResult, Debrief } from "./schemas";

type Source = "ai" | "fallback";
type Cached<T> = { data: T; source: Source };

function useStructured<T>(url: string, cacheKey: string | null, body: () => object) {
  const hit = useMemo(() => (cacheKey ? cacheGet<Cached<T>>(cacheKey) : undefined), [cacheKey]);
  const [fetched, setFetched] = useState<(Cached<T> & { key: string }) | { key: string; data: null; source: "fallback" } | null>(null);
  const getBody = useEffectEvent(body);

  useEffect(() => {
    if (!cacheKey || hit) return;
    const ctrl = new AbortController();
    fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(getBody()), signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<Cached<T>>) : Promise.reject(r.status)))
      .then((res) => {
        // Only AI results are cached; a fallback is retried next time the replay opens.
        if (res.source === "ai") cacheSet(cacheKey, res);
        setFetched({ key: cacheKey, ...res });
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setFetched({ key: cacheKey, data: null, source: "fallback" });
      });
    return () => ctrl.abort();
  }, [url, cacheKey, hit]);

  const result = hit ?? (fetched && fetched.key === cacheKey ? fetched : null);
  return { data: result?.data ?? null, source: result?.source ?? null, loading: !!cacheKey && !result };
}

export function useCoach(v: Verdict | null) {
  const events = useSession((s) => s.events);
  const desmosAvailable = useSession((s) => s.desmosAvailable);
  const key = v && !v.correct ? `coach:${v.qid}:${v.kind}:${v.finalAnswer}:${hashString(v.evidence.join("|"))}` : null;
  return useStructured<CoachResult>("/api/coach", key, () => ({ events, qid: v?.qid, desmosAvailable }));
}

export function useDebrief(verdicts: Verdict[], enabled: boolean) {
  const events = useSession((s) => s.events);
  const desmosAvailable = useSession((s) => s.desmosAvailable);
  const key = enabled ? `debrief:${hashString(verdicts.map((v) => `${v.qid}${v.kind}${v.finalAnswer}${v.timeMs}`).join("|"))}` : null;
  return useStructured<Debrief>("/api/debrief", key, () => ({ events, desmosAvailable }));
}

export const ASK_TURNS = 10;

export function useAsk(qid: string) {
  const events = useSession((s) => s.events);
  const desmosAvailable = useSession((s) => s.desmosAvailable);
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>({});
  const [streaming, setStreaming] = useState(false);
  const [offline, setOffline] = useState(false);
  const messages = threads[qid] ?? [];

  const send = useCallback(
    async (text: string) => {
      const content = text.trim().slice(0, 1000);
      const history = threads[qid] ?? [];
      if (!content || streaming || history.filter((m) => m.role === "user").length >= ASK_TURNS) return;
      const next: ChatMessage[] = [...history, { role: "user", content }];
      setThreads((t) => ({ ...t, [qid]: [...next, { role: "assistant", content: "" }] }));
      setStreaming(true);
      const update = (reply: string) =>
        setThreads((t) => ({ ...t, [qid]: [...next, { role: "assistant", content: reply }] }));
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "content-type": "application/json" },
          // Only completed turns are sent; the empty placeholder stays client-side.
          body: JSON.stringify({ events, qid, desmosAvailable, messages: next }),
        });
        if (res.status === 503) {
          setOffline(true);
          setThreads((t) => ({ ...t, [qid]: history }));
          return;
        }
        if (!res.ok || !res.body) throw new Error(String(res.status));
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let reply = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          reply += decoder.decode(value, { stream: true });
          update(reply);
        }
        if (!reply) update("I couldn't come up with an answer. Try asking another way.");
      } catch {
        update("Something went wrong reaching the coach. Try again in a moment.");
      } finally {
        setStreaming(false);
      }
    },
    [threads, qid, streaming, events, desmosAvailable],
  );

  return { messages, send, streaming, offline, turnsLeft: ASK_TURNS - messages.filter((m) => m.role === "user").length };
}
