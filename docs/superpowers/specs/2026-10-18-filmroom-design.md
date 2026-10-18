# FilmRoom — Design Spec

**Date:** 2026-10-18
**Status:** Approved in conversation, pending written-spec review
**Owner:** Marcus

## 1. Purpose

A portfolio-grade MVP that gets the attention of SAT/ACT test-prep companies during a hiring process. The company is not yet known, so the product must stand out on its own against the 2026 market.

**Market gap it targets.** Funded competitors (Acely, OnePrep, LearnQ, Makon AI, Miyagi Labs) all sell the same thing: a question bank, an AI tutor chat, an adaptive plan and a score prediction. None of them diagnose *why* a student missed a question, and none train test-taking *decisions* such as pacing, Desmos vs. by-hand, or second-guessing. Students fill this gap by hand with spreadsheet error logs.

**Concept.** "Game Review for the SAT", modelled on chess.com's Game Review. A student takes a practice module while the app records *how* they work. FilmRoom then replays the module, labels each mistake by cause, estimates points lost per cause, and builds twin-question drills from the student's own mistakes.

**Success criteria**
- A visitor can go from the landing page through a 22-question module to a complete replay in one sitting, with no signup.
- Each verdict shows the evidence behind it (time, answer changes, Desmos use, trap choice), so a reviewer can check it.
- Twin questions always have a correct answer key (guaranteed by construction, not by the LLM).
- With an API key, every replay has a Claude-written session debrief, a coach note per mistake, and a per-question "Ask" chat.
- The app still works with no Claude API key, falling back to pre-written content.
- It is deployed at a public URL and looks and feels production quality.

## 2. Scope

**In:** Digital SAT **Math** only. One 22-question module with a 35-minute timer. Replay, points-lost breakdown, fix-it drills, landing page. Progress saved in the browser.

**Out (YAGNI for MVP):** accounts and auth, a two-module adaptive test, Reading & Writing, ACT, mobile app, spaced-review scheduling across days, payments, teacher dashboards.

## 3. User flow

1. **Landing (`/`).** Headline, a short explanation of the idea, a sample replay screenshot or animation, and a "Start Module" button. A "Resume" link appears if a session is in progress.
2. **Module (`/module`).** A Bluebook-like testing UI:
   - Question pane with the question and answer choices (multiple choice and student-produced response).
   - Top bar with a countdown timer (can be hidden, like Bluebook) and "Mark for Review".
   - Answer eliminator: strike through a choice.
   - Desmos graphing calculator panel, which can be toggled.
   - Question navigator that shows answered and marked questions.
   - "Finish" ends the module, and so does the timer running out. A locked module cannot be resumed.
3. **Replay (`/replay`).**
   - **Headline:** estimated scaled score and *"You lost ~N points"*, with a stacked bar of points lost by cause.
   - **Scouting report:** the Claude session debrief (patterns linked to question tiles, plus 3 habits).
   - **Strip:** 22 tiles in order, each coloured and iconed by verdict (Brilliant, Correct, Smart skip, Trap, Time sink, Rushed, Second-guess, Wrong tool, Concept gap, Unanswered).
   - **Pacing chart:** time spent per question against its target time, plus the cumulative clock.
   - **Question detail** (select a tile):
     - The question with your answer, the correct answer, and the trap choice highlighted.
     - Your action timeline (seen → Desmos opened → chose B → changed to C → left), with durations.
     - The verdict with its evidence ("3m 40s vs 1m 10s target; changed C→B").
     - Solution steps and a Claude coach note. For Concept gaps, an "AI read" badge with the likely misconception.
     - An "Ask about this question" chat panel.
4. **Drills (`/drills`).** One twin question per mistake, generated from the same template. After you answer, you see right or wrong plus the explanation. A "Points recovered" counter adds up the points-lost value of each mistake whose twin you answered correctly.

## 4. Mistake taxonomy

Verdicts are assigned by pure, deterministic rules in priority order; the first match wins. Let `t` be the active time on the question (summed across visits) and `par` the question's target time.

| Verdict | Rule (question answered incorrectly unless noted) |
|---|---|
| **Unanswered** | No final answer |
| **Second-guess** | The answer was correct at some point, then changed to an incorrect one |
| **Time sink** | `t > 2 × par` |
| **Rushed** | `t < 0.35 × par` |
| **Wrong tool** | Desmos was used for more than 40% of `t` on a `desmosFast: false` question and `t > 1.3 × par`; or `desmosFast: true`, Desmos never opened, and `t > 1.3 × par` |
| **Trap** | The final answer is a choice tagged with a misconception (and no behaviour rule above matched) |
| **Concept gap** | Fallback for any other incorrect answer |
| **Brilliant** *(correct)* | Difficulty is hard and `t ≤ 0.8 × par` |
| **Correct** *(correct)* | Any other correct answer |
| **Smart skip** *(no final answer)* | Overrides **Unanswered**: the question is hard, `t ≤ 0.5 × par`, and at least 3 questions that were unanswered when the student first left it ended up answered correctly |

Behaviour rules (Time sink, Rushed, Wrong tool) outrank Trap, because they are the more useful coaching message. Whenever the final answer is a tagged choice, the verdict still carries `misconception` and an evidence line such as "Also chose B: sign error". *(Changed 2026-10-18 at the user's request: with Trap first, 15 of 22 questions could only ever be Trap or Second-guess.)*

The thresholds live in one config object so they can be tuned. Each verdict carries an `evidence: string[]` used by the UI.

**Collateral time sink.** Only when the module ends by timeout: each Unanswered or Rushed question gets `squeezedBy` set to the Time sink with the largest excess time (`t − par`), provided that excess is at least that question's shortfall (`par − t`). The replay shows this as "squeezed by Q{n}". It is informational only and doesn't change the verdict.

## 5. Content model

Questions are original and SAT-style. College Board questions are copyrighted and are not used. Each question is a **template**:

```ts
type QuestionTemplate = {
  id: string;                    // "lin-eq-01"
  skill: Skill;                  // e.g. "linear-equations", "systems", "quadratics", "percent", "statistics", "geometry-area", "exponential", "ratios"
  domain: "algebra" | "advanced-math" | "psda" | "geometry-trig";
  difficulty: "easy" | "medium" | "hard";
  parSeconds: number;
  desmosFast: boolean;           // Is Desmos the faster route?
  format: "mcq" | "spr";
  params: Record<string, ParamSpec>;      // integer ranges / choices, with constraints
  render: (p: Params) => {
    stem: string;                // supports inline KaTeX: $...$
    choices?: Choice[];          // mcq; each wrong choice has a misconception tag or null
    answer: string;              // canonical correct answer
    solution: string[];          // step-by-step
  };
  constraint?: (p: Params) => boolean;    // reject degenerate params (e.g. non-integer answers when required)
};
type Choice = { label: "A"|"B"|"C"|"D"; text: string; correct: boolean; misconception?: string };
```

- The answer key and every distractor are computed from the parameters inside `render`, so twins are correct by construction. For example, the trap "sign error" distractor is literally the result computed with the sign flipped.
- Module questions use each template's fixed `canonicalParams`. Twins use seeded random parameters that differ from the canonical ones.
- SPR answers accept equivalent forms (fraction, decimal, simplified).
- The module mix roughly follows the SAT: about 35% Algebra, 35% Advanced Math, 15% Problem Solving and Data Analysis, 15% Geometry/Trig. Difficulty rises from easy to hard across the 22 questions.
- Math is rendered with KaTeX.

## 6. Scoring

- **Raw score:** correct answers out of 22.
- **Estimated scaled score:** a lookup table from raw score to approximate SAT Math (200–800), shown as a range of about ±30 and labelled "estimate". The table is a heuristic for one module, not an official College Board conversion.
- **Points lost per question:** the scaled score at the actual raw score + 1, minus the scaled score at the actual raw score. This is the marginal value of one more correct answer.
- **Points lost per cause:** the sum of points lost per question, grouped by verdict.

## 7. AI layer (Claude)

The AI layer is a core part of the product: every replay is read and explained by Claude. The deterministic engine provides ground truth (answer keys, timings, rule verdicts). Claude provides interpretation, explanation and conversation. Four features:

1. **Session debrief** (`POST /api/debrief`). Input: the full `ScoreReport`, all verdicts with their evidence, and per-skill results. Output: a "scouting report" shown at the top of the replay. It names the 1–2 dominant patterns across the module, each tied to specific question numbers, and gives 3 concrete habits for the next attempt. The structured JSON output is `{ headline, patterns: [{ title, questionIds[], explanation }], habits: string[3] }`, validated with zod. A skeleton holds its place while the rest of the replay renders, and the report fills in when it arrives.
2. **Coach note per mistake** (`POST /api/coach`). Input: the question (stem, choices, solution), the student's answer, the verdict, the evidence and the misconception tag. Output: at most 3 sentences covering why this happened and a concrete fix. These are fetched in parallel for every non-correct question when the replay opens.
3. **Ask about this question** (`POST /api/ask`, streamed). A chat panel on each question in the replay. Its context is limited to that question, its solution, the student's action timeline and verdict. The system prompt keeps it on topic: SAT strategy and this question only. It may give a Desmos route as typed expressions. Each session has at most 10 turns per question.
4. **AI second opinion on Concept gaps** (part of `/api/coach`). For Concept-gap verdicts, Claude also returns `{ misconception: string, confidence: "low"|"med"|"high" }`. The UI shows this as an "AI read" badge next to the rule verdict. It never replaces the rule verdict, and it is never shown for verdicts already explained by behaviour or a tagged trap.

**Shared rules**
- Model: `claude-opus-5-5` with adaptive thinking. Effort is `low` for coach and ask, `medium` for the debrief. Server-side refusal fallbacks (`fallbacks: "default"`) are on. Structured JSON uses `messages.parse` with a zod output format. The official Anthropic TypeScript SDK runs only in server route handlers, and the key never reaches the client.
- **Prompt caching:** the system prompt and the shared module/question context are cached, so repeated coach and ask calls in one session are cheap and fast.
- **Timeouts:** about 8 seconds for coach and debrief responses, 30 seconds for streamed ask responses. Responses are cached per input hash in memory on the server and in localStorage on the client.
- **Guardrails:** Claude **never** produces answer keys or decides correctness. Prompts give it the verified answer and solution as facts. Every input passed to Claude is generated by the server from content plus the event log, never free text from the client, except the student's chat message in Ask. The client posts `{ events, qid }`, and the server re-renders the module questions and re-runs diagnosis itself.
- **Fallback (resilience only):** with no `ANTHROPIC_API_KEY` or on any error, debrief and coach use pre-written content: a template-based debrief built from the top causes, and notes for each verdict and misconception. Ask shows "Coach is offline". The UI never blocks on Claude. A small "AI" or "offline" indicator in the replay header makes the current mode clear.
- **Abuse limits:** the API routes have a simple per-IP rate limit (in memory, for example 60 requests per 10 minutes), and the maximum output size is capped.

## 8. Architecture

**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS, Zustand for client state, KaTeX for math, the Desmos API (calculator embed) for the calculator, Vitest for unit tests, Playwright for one end-to-end test. Deployed on Vercel.

```
app/
  page.tsx                 landing
  module/page.tsx          test UI
  replay/page.tsx          film room
  drills/page.tsx          fix-it drills
  api/coach/route.ts       coach note + AI read (concept gaps)
  api/debrief/route.ts     session scouting report
  api/ask/route.ts         streamed per-question chat
lib/
  ai/                      Anthropic client, prompts, zod schemas, context builders, cache, rate limit, fallbacks
  content/templates/*.ts   question templates
  content/module.ts        ordered module definition (template ids + canonical params)
  content/fallbacks.ts     pre-written coach notes
  engine/render.ts         template + params -> Question; seeded RNG for twins
  engine/answers.ts        SPR equivalence checking
  recorder/                event types + reducer (append-only log)
  diagnosis/               events + questions -> Verdict[] (pure)
  scoring/                 raw -> scaled table, points lost
  store/                   Zustand session store, persisted to localStorage
components/                Bluebook-like UI pieces, replay strip, timeline, charts
```

**Event log (recorder).** An append-only list of `{ t: ms since module start, type, qid?, payload? }`. Types: `module_start`, `question_enter`, `question_leave`, `answer_select`, `answer_clear`, `choice_eliminate`, `mark_toggle`, `desmos_open`, `desmos_close`, `module_end` (with reason `finish` or `timeout`). Active time per question is the sum of enter→leave intervals. Desmos time is the overlap of desmos_open→close intervals with each question's active intervals.

**Unit boundaries**
- `diagnosis(events, questions, config) → Verdict[]` is pure, with no React or browser APIs.
- `scoring(verdicts) → ScoreReport` is pure.
- `render(template, params) → Question` is pure and deterministic.
- The UI only reads the store and calls these functions.

**Persistence.** The Zustand store holds the session (events, answers, status), persisted to localStorage under a versioned key. Every read is wrapped in try/catch, and a corrupted or old-version session is reset to empty.

**Timer.** A deadline-based countdown (`deadline − now`) that survives a tab refresh. If the deadline has passed when the app reloads, the module is ended as a timeout.

## 9. Error handling

- Claude failure or timeout → fallback note, with no error shown to the user.
- Desmos fails to load → the calculator button is disabled with a tooltip, and the module continues. Diagnosis treats Desmos as unavailable, so Wrong-tool for "Desmos never opened" is suppressed.
- Opening `/replay` or `/drills` with no finished session → redirect to `/` with a short note.
- A template's `constraint` rejects parameters → resample up to 50 times, then fall back to the canonical parameters.

## 10. Testing

- **Vitest:**
  - Each verdict rule, with hand-built event logs, including priority-order conflicts.
  - Active-time and Desmos-overlap calculation across multiple visits.
  - Scoring table and points-lost maths.
  - Every template: canonical and 200 seeded random renders satisfy the constraint, have exactly one correct choice and distinct choice texts, and give an answer that matches an independent check function.
  - SPR equivalence.
  - AI layer: context builders produce the expected payloads from fixture sessions, zod schemas reject malformed model output (which triggers the fallback), and the fallback debrief and notes render for every verdict. The Anthropic client is mocked, so unit tests make no live API calls.
- **Manual AI check:** a script, `scripts/ai-smoke.ts`, runs debrief, coach and ask against 3 fixture sessions with a real key and prints the outputs for human review.
- **Playwright:** one end-to-end test that takes the module (answers a few questions, changes one answer, opens Desmos, finishes early) and checks that the replay shows the expected verdicts and the drills page loads.
- Per the user's preference, the dev server is not started by Claude. The user checks the app on `localhost:3001`.

## 11. Visual direction

Dark, cinematic "film room" look for the replay (timeline scrubber, frame strip). The module screen is clean and light, matching the familiar Bluebook look. Typography and design details are settled during implementation with the frontend design skill. The app must be fully usable at laptop width; phone width needs to work for the landing and replay pages only.

## 12. Open items (decide during implementation, not blockers)

- Desmos API key for production (free application). The demo key is used in development.
- Final product name (FilmRoom is the working name).
