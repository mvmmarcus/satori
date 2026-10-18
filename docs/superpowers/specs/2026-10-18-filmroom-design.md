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
- The app works with no Claude API key, falling back to pre-written explanations.
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
   - **Strip:** 22 tiles in order, each coloured and iconed by verdict (Brilliant, Correct, Smart skip, Trap, Time sink, Rushed, Second-guess, Wrong tool, Concept gap, Unanswered).
   - **Pacing chart:** time spent per question against its target time, plus the cumulative clock.
   - **Question detail** (select a tile):
     - The question with your answer, the correct answer, and the trap choice highlighted.
     - Your action timeline (seen → Desmos opened → chose B → changed to C → left), with durations.
     - The verdict with its evidence ("3m 40s vs 1m 10s target; changed C→B").
     - Solution steps and a Claude coach note.
4. **Drills (`/drills`).** One twin question per mistake, generated from the same template. After you answer, you see right or wrong plus the explanation. A "Points recovered" counter adds up the points-lost value of each mistake whose twin you answered correctly.

## 4. Mistake taxonomy

Verdicts are assigned by pure, deterministic rules in priority order; the first match wins. Let `t` be the active time on the question (summed across visits) and `par` the question's target time.

| Verdict | Rule (question answered incorrectly unless noted) |
|---|---|
| **Unanswered** | No final answer |
| **Second-guess** | The answer was correct at some point, then changed to an incorrect one |
| **Trap** | The final answer is a choice tagged with a misconception |
| **Time sink** | `t > 2 × par` |
| **Rushed** | `t < 0.35 × par` |
| **Wrong tool** | Desmos was used for more than 40% of `t` on a `desmosFast: false` question and `t > 1.3 × par`; or `desmosFast: true`, Desmos never opened, and `t > 1.3 × par` |
| **Concept gap** | Fallback for any other incorrect answer |
| **Brilliant** *(correct)* | Difficulty is hard and `t ≤ 0.8 × par` |
| **Correct** *(correct)* | Any other correct answer |
| **Smart skip** *(no final answer)* | Overrides **Unanswered**: the question is hard, `t ≤ 0.5 × par`, and at least 3 questions that were unanswered when the student first left it ended up answered correctly |

The thresholds live in one config object so they can be tuned. Each verdict carries an `evidence: string[]` used by the UI.

**Collateral time sink.** If a Time sink's excess time (`t − par`) is at least the total time left when the module ended for questions that were Unanswered or Rushed, the replay notes on those questions that they were "squeezed by Q{n}". This is informational only and doesn't change the verdict.

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

## 7. AI (Claude)

- A server route, `POST /api/coach`, takes the question (stem, choices, solution), the student's answer, the verdict and its evidence. It returns a short coach note of at most 3 sentences: why this mistake happened and a concrete habit to fix it.
- Model: the current Sonnet-class model, chosen during implementation after consulting the `claude-api` skill. Responses are short, have a timeout of about 8 seconds, and are cached per (question, verdict, answer) in memory on the server and in localStorage on the client.
- Coach notes are fetched in parallel when the replay opens, and the UI renders right away with placeholders.
- **Fallback:** with no `ANTHROPIC_API_KEY` or on any error, the app uses pre-written notes for each verdict and misconception from the content files. The UI never blocks on Claude.
- Claude **never** produces answer keys or grades answers.

## 8. Architecture

**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS, Zustand for client state, KaTeX for math, the Desmos API (calculator embed) for the calculator, Vitest for unit tests, Playwright for one end-to-end test. Deployed on Vercel.

```
app/
  page.tsx                 landing
  module/page.tsx          test UI
  replay/page.tsx          film room
  drills/page.tsx          fix-it drills
  api/coach/route.ts       Claude coach note
lib/
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
- **Playwright:** one end-to-end test that takes the module (answers a few questions, changes one answer, opens Desmos, finishes early) and checks that the replay shows the expected verdicts and the drills page loads.
- Per the user's preference, the dev server is not started by Claude. The user checks the app on `localhost:3001`.

## 11. Visual direction

Dark, cinematic "film room" look for the replay (timeline scrubber, frame strip). The module screen is clean and light, matching the familiar Bluebook look. Typography and design details are settled during implementation with the frontend design skill. The app must be fully usable at laptop width; phone width needs to work for the landing and replay pages only.

## 12. Open items (decide during implementation, not blockers)

- Desmos API key for production (free application). The demo key is used in development.
- Final product name (FilmRoom is the working name).
