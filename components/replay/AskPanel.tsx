"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { MathText } from "@/components/math/MathText";
import { useAsk } from "@/lib/ai/hooks";

const SUGGESTIONS = ["Why is my answer wrong?", "Show me the fastest way", "How would I do this in Desmos?"];

export function AskPanel({ qid }: { qid: string }) {
  const { messages, send, streaming, offline, turnsLeft } = useAsk(qid);
  const [text, setText] = useState("");
  const submit = (t: string) => {
    if (!t.trim()) return;
    send(t);
    setText("");
  };

  return (
    <section aria-labelledby={`ask-${qid}`} className="mt-6 border-t border-hair pt-5">
      <h3 id={`ask-${qid}`} className="font-semibold">Ask about this question</h3>
      {offline ? (
        <p className="mt-2 text-sm text-mute">The coach is offline right now. The solution steps above still walk through it.</p>
      ) : (
        <>
          <div className="mt-3 space-y-3" aria-live="polite">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <p key={i} className="ml-auto w-fit max-w-[90%] rounded-lg bg-wash px-3 py-2">{m.content}</p>
              ) : (
                <div key={i} className="max-w-[95%] text-ink-2">
                  {m.content ? <ChatText text={m.content} /> : <span className="text-mute">Thinking…</span>}
                </div>
              ),
            )}
          </div>
          {messages.length === 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => submit(s)} className="rounded-full border border-hair px-3 py-1.5 text-sm hover:bg-wash">
                  {s}
                </button>
              ))}
            </div>
          )}
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit(text);
            }}
          >
            <input
              data-testid="ask-input"
              value={text}
              maxLength={1000}
              onChange={(e) => setText(e.target.value)}
              disabled={streaming || turnsLeft <= 0}
              aria-label="Ask about this question"
              placeholder={turnsLeft > 0 ? "Ask why, or how to do it faster" : "You've used all the questions for this one"}
              className="h-11 min-w-0 flex-1 rounded-lg border border-hair bg-paper px-3"
            />
            <button
              type="submit"
              data-testid="ask-send"
              disabled={streaming || !text.trim() || turnsLeft <= 0}
              aria-label="Send question"
              className="grid h-11 w-11 place-items-center rounded-lg bg-ink text-sheet disabled:opacity-40"
            >
              <Icon name="send" />
            </button>
          </form>
          <p className="mt-1.5 text-[13px] text-mute">{turnsLeft} {turnsLeft === 1 ? "question" : "questions"} left on this one</p>
        </>
      )}
    </section>
  );
}

/** Model text is rendered as text only: `code` spans for Desmos input, $math$ via KaTeX, blank lines as paragraphs. */
function ChatText({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i}>
          {para.split(/`([^`]+)`/g).map((part, j) =>
            j % 2 ? (
              <code key={j} className="rounded bg-wash px-1.5 py-0.5 text-[13px] text-ink">{part}</code>
            ) : (
              <MathText key={j} as="span" text={part} />
            ),
          )}
        </p>
      ))}
    </div>
  );
}
