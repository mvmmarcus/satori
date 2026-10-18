# FilmRoom: game review for the SAT

Take an SAT Math practice module. Then watch the replay: **why** each mistake happened, how many points each habit cost you, and twin questions to fix them.

## Why this exists

The SAT prep market in 2026 is crowded with the same product: a question bank, an AI tutor chat, an adaptive plan and a score prediction (Acely, OnePrep, LearnQ and others). The official tools (Bluebook, Khan Academy) are free. What none of them do is tell a student *why* they missed a question: whether they misread it, took a trap, burned three minutes, changed a right answer, or graphed something faster solved by hand. Students do this by hand in spreadsheet error logs.

FilmRoom borrows chess.com's Game Review: it records *how* you work through a module and turns that into a replay, a points-lost breakdown and targeted drills.

## How it works

```
Module UI ──► event log (enter/leave, select, clear, cross-out, mark, Desmos open/close)
                │
                ▼
     diagnosis rules (pure TS) ──► verdict per question + evidence
                │                       │
                ▼                       ▼
     score report (points lost by cause)   Claude: scouting report, coach notes,
                                           "Ask about this question" chat
```

- **Ground truth is deterministic.** Questions are templates whose answer key and every wrong choice are computed from parameters, so twin questions are correct by construction. Each wrong choice is tagged with the misconception it represents.
- **Verdicts:** second-guess, time sink, rushed, wrong tool, trap, concept gap, unanswered, plus brilliant, correct and smart skip. Thresholds live in `lib/diagnosis/config.ts`.
- **Claude never grades.** The server rebuilds verdicts from the event log and hands Claude the verified answer and solution as facts. It writes the scouting report and coach notes (structured output, zod-validated) and streams chat answers. Model: `claude-opus-5-5`, adaptive thinking, low/medium effort, prompt caching, server-side refusal fallbacks.
- **Works offline:** with no API key, or on any error, the replay uses pre-written notes per verdict and misconception.

## Run it locally

```bash
npm install
cp .env.example .env.local      # add ANTHROPIC_API_KEY to enable the AI coach
npm run dev                     # http://localhost:3001
```

## Tests

```bash
npm test             # unit tests: engine, 22 templates × 200 random twins, recorder, diagnosis, scoring, store, AI routes
npm run typecheck
npm run test:e2e     # needs the dev server running on :3001
ANTHROPIC_API_KEY=… npx tsx scripts/ai-smoke.ts   # real AI output on 3 fixture sessions (spends credits)
```

## Deploy (Vercel)

Set `ANTHROPIC_API_KEY` and `NEXT_PUBLIC_DESMOS_KEY`. The bundled Desmos key is Desmos's public demo key, which is for development only. Request a free production key from Desmos before going public.

## Limitations

- One 22-question Math module. No Reading & Writing, no ACT, no two-stage adaptive module yet.
- The scaled score is a heuristic estimate, not an official conversion.
- The API rate limit is in-memory per server instance.
- Questions are original, in SAT style; not affiliated with or endorsed by College Board.

## Project layout

```
app/                 pages (/, /module, /replay, /drills) and API routes (coach, debrief, ask)
lib/content          question types, 22 templates, module order, fallback copy
lib/engine           rendering, seeded RNG, answer checking
lib/recorder         event schema and per-question metrics
lib/diagnosis        verdict rules
lib/scoring          raw → scaled estimate, points lost
lib/ai               Claude client, prompts, schemas, context builders, cache, rate limit, fallbacks, hooks
lib/store            persisted session (Zustand)
components/          UI
docs/superpowers     design spec and implementation plan
design/              replay design directions and the approved pick
```
