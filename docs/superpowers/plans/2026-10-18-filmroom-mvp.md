# FilmRoom MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship "Game Review for the SAT" — a web app where a student takes a 22-question SAT Math module, then gets a replay that diagnoses *why* each mistake happened, estimates points lost per cause, adds Claude-written coaching, and builds twin-question drills.

**Architecture:** Next.js App Router, client-heavy. All ground truth (question rendering, the action log, verdicts, scoring) lives in pure TypeScript modules under `lib/` that are fully unit-tested. Claude is reached only through three server route handlers. Those handlers rebuild context from the event log on the server, so the client never sends prompts. Session state is a Zustand store saved to localStorage.

**Tech Stack:** Next.js 16.4 (App Router, TS), React 19, Tailwind CSS 4, Zustand 5, zod 4, KaTeX 0.19, Desmos API v1.11, `@anthropic-ai/sdk` 0.135, Vitest 4, Playwright 1.64. Node 24.

**Spec:** `docs/superpowers/specs/2026-10-18-filmroom-design.md`. Read it before starting any task. Section numbers below (§) refer to it.

## Global Constraints

- Dev server: **never start it** (`npm run dev`, `next start`, Playwright `webServer`). The user runs it on **`http://localhost:3001`**. `npm run dev` must be `next dev -p 3001`. `next build`, `vitest` and `tsc` may run.
- All question content is original. No College Board questions, logos, or the "Bluebook" name in the UI. The module UI may *resemble* the digital-test layout.
- Claude model: `claude-opus-5-5`, adaptive thinking, `output_config.effort` = `"low"` (coach, ask) / `"medium"` (debrief), server-side fallbacks `fallbacks: "default"` with beta `server-side-fallback-2026-07-01`. Before writing AI code, load the `claude-api` skill and read `typescript/claude-api/README.md`, `streaming.md`, and `tool-use.md` § Structured Outputs. Never guess SDK shapes.
- Claude never produces answer keys or decides correctness (§7).
- `ANTHROPIC_API_KEY` is read only in server code. `NEXT_PUBLIC_DESMOS_KEY` defaults to the Desmos demo key `dcb31709b452b1cf9dc26972add0fda6`.
- localStorage keys: `filmroom:session:v1`, `filmroom:ai:v1`. Every read and write goes through try/catch.
- Path alias `@/*` → project root.
- UI tasks: load `impeccable:impeccable` (primary design skill) and `vercel-react-best-practices`. Chart work also loads `dataviz`. Run `web-design-guidelines` review in Task 13.
- Commit after every task, ending messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Refresh mid-module.** Answers, marks, the current question and the *same deadline* must survive a refresh. A refresh after the deadline ends the module as `timeout`. → Task 6 tests `rehydrate-before-deadline` / `rehydrate-after-deadline`.
2. **SPR inputs in the forms students type** (`3/4`, `.75`, `0.750`, ` 3 / 4 `, `-1/2`, `1.5`, `3/0`, `abc`, empty). Equivalent forms are correct, and invalid input is never correct and never throws. → Task 2 test `isCorrect SPR forms`.
3. **Irregular visits.** A question visited 4 times, a question never visited, a module ending while Desmos is open, or a module ending while a question is still entered. Times must sum correctly, and an unvisited question is Unanswered with 0 ms. → Task 4 tests.
4. **Hostile or broken API input.** Oversized or malformed `events`, an unknown `qid`, a chat message over 1,000 characters, and the model returning JSON that fails the schema. Bad input gets 400, and broken model output falls back without a 500. → Task 8 tests.
5. **Stale or missing state.** Opening `/replay` or `/drills` with no finished session, or with a localStorage blob from an older version or corrupt JSON. The app redirects or resets and never shows a crash screen. → Task 6 test `corrupt-storage-resets` + Task 13 e2e `replay-without-session-redirects`.

---

## File Structure

```
app/layout.tsx, app/globals.css            fonts, tokens, KaTeX css
app/page.tsx                               landing (Task 12)
app/module/page.tsx                        test UI (Task 7)
app/replay/page.tsx                        replay (Task 10)
app/drills/page.tsx                        drills (Task 11)
app/api/{coach,debrief,ask}/route.ts       AI routes (Task 8)
lib/content/types.ts                       Question/template types (Task 2)
lib/content/templates/{algebra,advanced,psda,geometry}.ts  (Task 3)
lib/content/module.ts                      MODULE: ordered entries (Task 3)
lib/content/fallbacks.ts                   pre-written notes (Task 8)
lib/engine/{rng,render,answers}.ts         (Task 2)
lib/recorder/{events,metrics}.ts           (Task 4)
lib/diagnosis/{config,diagnose}.ts         (Task 5)
lib/scoring/score.ts                       (Task 5)
lib/store/session.ts                       (Task 6)
lib/replay/{timeline,useReplay}.ts         (Task 9)
lib/ai/{client,prompts,schemas,context,cache,ratelimit,fallback}.ts  (Task 8)
lib/ai/clientCache.ts, lib/ai/hooks.ts     (Task 9)
components/math/MathText.tsx               KaTeX inline renderer (Task 7)
components/module/*                        (Task 7)
components/replay/*                        (Task 10)
tests/unit/**  tests/e2e/**  scripts/ai-smoke.ts
design/replay-directions/*.html            (Task 1b mockups)
```

---

### Task 1: Scaffold + tooling

**Files:** Create the Next app in place (`package.json`, `tsconfig.json`, `next.config.ts`, `app/*`, `vitest.config.ts`, `playwright.config.ts`, `.env.example`, `README.md` stub, `.gitignore`), plus `tests/unit/sanity.test.ts`.

**Interfaces:** Produces the scripts `dev` (`next dev -p 3001`), `build`, `test` (`vitest run`), `test:e2e` (`playwright test`), `typecheck` (`tsc --noEmit`).

- [ ] **Step 1:** In `/Users/marcus/Documents/filmroom` (which already holds `docs/`), run `npx create-next-app@16.4.2 . --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-npm --yes`. If it refuses because the directory isn't empty, scaffold into `./.scaffold`, move its contents up (without overwriting `docs/` or `.git/`), and delete `.scaffold`.
- [ ] **Step 2:** `npm i zustand@5 zod@4 katex@0.19 @anthropic-ai/sdk@0.135` and `npm i -D vitest@4 @vitest/coverage-v8 @playwright/test@1.64 @types/katex tsx`.
- [ ] **Step 3:** Set `vitest.config.ts` (environment `node`, `include: ["tests/unit/**/*.test.ts"]`, alias `@` → root). Set `playwright.config.ts` with `testDir: "tests/e2e"`, `use.baseURL: "http://localhost:3001"`, **no `webServer`**. Fill in the package scripts above. Set `.env.example` to `ANTHROPIC_API_KEY=` and `NEXT_PUBLIC_DESMOS_KEY=dcb31709b452b1cf9dc26972add0fda6`.
- [ ] **Step 4:** Write `tests/unit/sanity.test.ts` with `expect(1 + 1).toBe(2)`. Run `npm test` → PASS, `npm run typecheck` → no errors, `npm run build` → success.
- [ ] **Step 5:** Commit `chore: scaffold Next.js app with vitest and playwright`.

### Task 1b: Replay visual direction (huashu-design)

**Files:** Create `design/replay-directions/{a,b,c}.html` and `design/replay-directions/README.md` (records the user's pick).

- [ ] **Step 1:** Load `huashu-design`. Produce **three** distinct static HTML directions for the replay screen (§3.3). Each shows the headline score and points lost, the stacked cause bar, the scouting report, the 22-tile verdict strip, the pacing chart, and one question detail with its timeline and Ask panel. Use realistic fixture data (a 560 score, 7 mistakes across 4 causes). Keep the "film room" feel from §11. Each file is self-contained.
- [ ] **Step 2:** Show the user the three paths and **stop until they pick one**. Record the choice, plus any tweaks, in the README: palette, fonts, verdict colours and icons. Tasks 7, 10, 11 and 12 follow it.
- [ ] **Step 3:** Commit `design: replay visual directions`.

### Task 2: Content types + render engine + answers

**Files:** Create `lib/content/types.ts`, `lib/engine/rng.ts`, `lib/engine/render.ts`, `lib/engine/answers.ts`. Test: `tests/unit/engine.test.ts`.

**Interfaces (Produces):**
```ts
// lib/content/types.ts
export type Domain = "algebra" | "advanced-math" | "psda" | "geometry-trig";
export type Difficulty = "easy" | "medium" | "hard";
export type Params = Record<string, number>;
export type ParamSpec = { min: number; max: number; step?: number } | { choices: number[] };
export type Choice = { label: "A"|"B"|"C"|"D"; text: string; correct: boolean; misconception?: string };
export type Rendered = { stem: string; choices?: Choice[]; answer: string; solution: string[] };
export type QuestionTemplate = {
  id: string; skill: string; domain: Domain; difficulty: Difficulty;
  parSeconds: number; desmosFast: boolean; format: "mcq" | "spr";
  params: Record<string, ParamSpec>; canonicalParams: Params;
  constraint?: (p: Params) => boolean;
  render: (p: Params) => Rendered;
  check: (p: Params) => string;          // independent answer computation for tests
  fallbackNotes?: Record<string, string>; // keyed by misconception tag
};
export type Question = Omit<QuestionTemplate, "params"|"canonicalParams"|"constraint"|"render"|"check"> &
  Rendered & { qid: string; templateId: string; params: Params };
// lib/engine/rng.ts
export function mulberry32(seed: number): () => number;
export function hashString(s: string): number;           // FNV-1a 32-bit
// lib/engine/render.ts
export function renderQuestion(t: QuestionTemplate, params: Params, qid: string): Question;
export function sampleParams(t: QuestionTemplate, seed: number): Params; // resample ≤50 times on constraint, else canonicalParams; must differ from canonical
export function makeTwin(t: QuestionTemplate, seed: number, qid: string): Question;
// lib/engine/answers.ts
export function parseSpr(input: string): number | null;   // accepts int, decimal, a/b, leading "-", ".5"; trims spaces; /0 → null
export function isCorrect(q: Question, response: string | null): boolean; // mcq: response is label; spr: |parse(a)-parse(b)| < 1e-6
```
MCQ choices must be shuffled deterministically from the params (seeded by `hashString(templateId + JSON.stringify(params))`) so the correct label varies.

- [ ] **Step 1: Write failing tests** in `tests/unit/engine.test.ts`:
  - `mulberry32(42)` gives the same first 3 values on two calls, and every value is in [0,1).
  - `isCorrect SPR forms`: for an SPR question whose answer is `"3/4"`, the responses `"3/4"`, `".75"`, `"0.750"`, `" 3 / 4 "` → true; `"0.7"`, `"abc"`, `""`, `"3/0"`, `null` → false and don't throw. Also `parseSpr("-1/2") === -0.5`, `parseSpr("1.5") === 1.5`.
  - MCQ: `isCorrect(q, label)` is true only for the label whose `correct` is true.
  - `sampleParams` on a fixture template (with a constraint that rejects odd `a`) returns only even `a`, differs from canonical, and is deterministic for one seed.
  - `sampleParams` on a template whose constraint always fails returns `canonicalParams`.
- [ ] **Step 2:** `npm test -- engine` → FAIL (modules missing).
- [ ] **Step 3:** Implement the four files to the signatures above.
- [ ] **Step 4:** `npm test -- engine` → PASS.
- [ ] **Step 5:** Commit `feat(engine): template rendering, seeded rng, SPR answer checking`.

### Task 3: The 22 question templates + module definition

**Files:** Create `lib/content/templates/{algebra,advanced,psda,geometry}.ts`, `lib/content/templates/index.ts` (`TEMPLATES: Record<string, QuestionTemplate>`), `lib/content/module.ts`. Test: `tests/unit/templates.test.ts`.

**Interfaces:**
- Consumes the Task 2 types.
- Produces:
  ```ts
  export const MODULE: { qid: string; templateId: string }[]; // qid "q1".."q22"
  export function moduleQuestions(): Question[];              // renders each with canonicalParams
  export const MODULE_SECONDS = 35 * 60;
  ```

Module order (qid → template id, skill, difficulty, format, desmosFast). Every MCQ wrong choice carries a misconception tag unless noted. Tags are kebab-case (e.g. `sign-error`, `solved-for-wrong-variable`, `percent-of-new-not-original`).

| qid | id | skill | diff | fmt | desmosFast |
|---|---|---|---|---|---|
| q1 | lin-solve | linear-equations | easy | mcq | false |
| q2 | percent-change | percent | easy | mcq | false |
| q3 | slope-two-points | linear-functions | easy | mcq | false |
| q4 | exp-evaluate | exponents | easy | spr | false |
| q5 | lin-word-cost | linear-models | easy | mcq | false |
| q6 | rect-scale-area | area-scaling | easy | mcq | false |
| q7 | system-substitution | systems | medium | mcq | true |
| q8 | lin-inequality | inequalities | medium | mcq | false |
| q9 | quad-roots | quadratics | medium | spr | true |
| q10 | interpret-slope | linear-models | medium | mcq | false |
| q11 | mean-missing | statistics | medium | spr | false |
| q12 | quad-vertex | quadratics | medium | mcq | true |
| q13 | exp-growth | exponential-models | medium | mcq | false |
| q14 | right-tri-trig | trigonometry | medium | mcq | false |
| q15 | unit-rate | ratios | medium | spr | false |
| q16 | func-composition | functions | medium | mcq | false |
| q17 | system-no-solution | systems | hard | spr | false |
| q18 | quad-discriminant | quadratics | hard | mcq | true |
| q19 | poly-remainder | polynomials | hard | mcq | false |
| q20 | radical-eq | radicals | hard | mcq | true |
| q21 | lin-infinite-solutions | linear-equations | hard | spr | false |
| q22 | circle-radius | circles | hard | mcq | true |

Target times (`parSeconds`) are 60 for easy, 95 for medium and 130 for hard. That totals 6×60 + 10×95 + 6×130 = 2,090 s, just under 2,100 s, which leaves slack the way the real test does.

- [ ] **Step 1: Write failing tests** in `tests/unit/templates.test.ts`. For **every** template:
  - Canonical render plus 200 renders from `sampleParams(t, seed)` for seeds 1..200 pass `constraint` (if any).
  - MCQ: exactly 4 choices, exactly one `correct`, choice texts pairwise distinct, every wrong choice has a non-empty `misconception`, and the correct choice's text equals `check(p)`.
  - SPR: `parseSpr(rendered.answer)` is non-null and equals `parseSpr(check(p))`.
  - `solution.length >= 2`.

  Module tests: `MODULE` has 22 entries with qids `q1..q22` in order, every `templateId` exists in `TEMPLATES`, the domain counts are algebra 8 / advanced-math 8 / psda 3 / geometry-trig 3 (matches §5 roughly), the difficulty sequence is non-decreasing, and the par sum is ≤ `MODULE_SECONDS`.
- [ ] **Step 2:** `npm test -- templates` → FAIL.
- [ ] **Step 3:** Write the templates. Each wrong MCQ choice is *computed* by applying its misconception to the params (spec §5). `check` must compute the answer by a different route than `render` (for example, plug the candidate back in, or use the quadratic formula against factoring). Stems use `$...$` for inline math. Domains: q1,q3,q5,q7,q8,q10,q17,q21 = algebra; q4,q9,q12,q13,q16,q18,q19,q20 = advanced-math; q2,q11,q15 = psda; q6,q14,q22 = geometry-trig. Add `fallbackNotes` for each misconception tag (1–2 sentences, specific to the trap).
- [ ] **Step 4:** `npm test -- templates` → PASS.
- [ ] **Step 5:** Commit `feat(content): 22 original SAT-style math templates and module`.

### Task 4: Recorder events + metrics

**Files:** Create `lib/recorder/events.ts`, `lib/recorder/metrics.ts`. Test: `tests/unit/recorder.test.ts`.

**Interfaces (Produces):**
```ts
export type EventType = "module_start"|"question_enter"|"question_leave"|"answer_select"|"answer_clear"|
  "choice_eliminate"|"mark_toggle"|"desmos_open"|"desmos_close"|"module_end";
export type ModuleEvent = { t: number; type: EventType; qid?: string;
  payload?: { answer?: string; choice?: string; reason?: "finish"|"timeout" } };
export const ModuleEventSchema: z.ZodType<ModuleEvent>;   // used by API routes
export const EventsSchema;                                // z.array(ModuleEventSchema).max(5000)
// metrics.ts — all pure; t in ms
export function endTime(events: ModuleEvent[]): number;   // module_end.t, else last event t
export function activeIntervals(events: ModuleEvent[], qid: string): [number, number][]; // enter→leave; unclosed closes at endTime
export function activeMs(events: ModuleEvent[], qid: string): number;
export function desmosMs(events: ModuleEvent[], qid: string): number; // overlap of desmos open intervals (unclosed → endTime) with active intervals
export function answerHistory(events: ModuleEvent[], qid: string): (string|null)[]; // each select → answer, clear → null
export function finalAnswer(events: ModuleEvent[], qid: string): string | null;
export function firstLeaveT(events: ModuleEvent[], qid: string): number | null;
export function answeredBefore(events: ModuleEvent[], qid: string, t: number): boolean; // non-null answer set at time ≤ t
export function endReason(events: ModuleEvent[]): "finish"|"timeout"|null;
```

- [ ] **Step 1: Write failing tests:**
  - 4 visits to `q3` of 10s, 5s, 20s and 1s → `activeMs === 36000`.
  - An unvisited `q9` → `activeMs 0`, `finalAnswer null`, `answerHistory []`.
  - Desmos opened at 5s during a 0–30s visit and never closed, with `module_end` at 30s → `desmosMs === 25000`.
  - Desmos open across a leave and re-enter only counts the time inside visits.
  - The module ends while `q22` is still entered → that interval closes at `module_end.t`.
  - select B, select C, clear, select C → history `["B","C",null,"C"]`, final `"C"`.
  - `EventsSchema` rejects 5,001 events and rejects `{t:"x"}`.
- [ ] **Step 2:** `npm test -- recorder` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npm test -- recorder` → PASS.
- [ ] **Step 5:** Commit `feat(recorder): event log and per-question metrics`.

### Task 5: Diagnosis + scoring

**Files:** Create `lib/diagnosis/config.ts`, `lib/diagnosis/diagnose.ts`, `lib/scoring/score.ts`. Tests: `tests/unit/diagnosis.test.ts`, `tests/unit/scoring.test.ts`.

**Interfaces (Produces):**
```ts
export type VerdictKind = "brilliant"|"correct"|"smart-skip"|"unanswered"|"second-guess"|
  "trap"|"time-sink"|"rushed"|"wrong-tool"|"concept-gap";
export const MISTAKE_KINDS: VerdictKind[]; // all except brilliant, correct, smart-skip
export type Verdict = { qid: string; kind: VerdictKind; correct: boolean; timeMs: number; parMs: number;
  desmosMs: number; finalAnswer: string | null; history: (string|null)[];
  misconception?: string; evidence: string[]; squeezedBy?: string };
export const DEFAULT_CONFIG = { timeSinkX: 2, rushedX: 0.35, wrongToolX: 1.3, desmosShare: 0.4,
  brilliantX: 0.8, smartSkipX: 0.5, smartSkipMinLater: 3 };
export type DiagnosisConfig = typeof DEFAULT_CONFIG;
export function diagnose(events: ModuleEvent[], questions: Question[],
  opts: { desmosAvailable: boolean; config?: Partial<DiagnosisConfig> }): Verdict[];
// scoring
export const SCALED: number[] = [200,220,250,280,310,340,370,400,430,450,480,500,520,540,570,590,620,650,680,710,740,770,800];
export type ScoreReport = { raw: number; total: number; scaled: number; range: [number, number];
  lostTotal: number; lostByKind: Partial<Record<VerdictKind, number>>; perQuestion: Record<string, number> };
export function scoreReport(verdicts: Verdict[]): ScoreReport;
```
Rules follow spec §4 exactly, in priority order. Smart skip: hard question, `t ≤ 0.5×par`, no final answer, and at least `smartSkipMinLater` questions with a higher index were unanswered at `firstLeaveT` of this question and ended up correct. When `desmosAvailable` is false, the "Desmos never opened" branch of wrong-tool is skipped. `squeezedBy` follows §4 "Collateral time sink" (timeout only). Each rule pushes human-readable evidence, e.g. `"3m 40s vs 1m 35s target"`, `"Changed C → B"`, `"Chose B: sign-error"`, `"Desmos 72% of time on a by-hand question"`.

Scoring: `perQuestion[qid] = SCALED[min(raw+1,22)] - SCALED[raw]` for every verdict with `correct === false`. `range = [max(200, scaled-30), min(800, scaled+30)]`.

- [ ] **Step 1: Write failing tests** (`diagnosis.test.ts`). Build events with a small helper `visit(qid, fromS, toS, opts?)` in the test file, using fixture questions from `moduleQuestions()`. One test per rule:
  - unanswered
  - second-guess (correct → wrong)
  - trap (final answer is a tagged choice, with misconception copied)
  - time-sink (2.1× par, untagged wrong SPR)
  - rushed (0.3× par)
  - wrong-tool both branches, plus suppression when `desmosAvailable: false`
  - concept-gap
  - brilliant (hard, 0.7× par, correct)
  - correct
  - smart-skip
  - **priority:** a question that is both a trap and a time sink → `"second-guess"` if it was ever correct, else `"trap"`
  - `squeezedBy` is set on rushed and unanswered questions after a big time sink only when `endReason === "timeout"`
  - config override `{ timeSinkX: 3 }` turns a 2.5× wrong answer into a non-time-sink

  Write `scoring.test.ts`:
  - raw 12 → scaled 520 and range [490,550]
  - each wrong question at raw 12 costs 20
  - `lostByKind` sums equal `lostTotal`
  - 22 correct → `lostTotal 0`, scaled 800, range [770,800]
- [ ] **Step 2:** `npm test -- diagnosis scoring` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npm test -- diagnosis scoring` → PASS.
- [ ] **Step 5:** Commit `feat(diagnosis): mistake taxonomy rules and score report`.

### Task 6: Session store

**Files:** Create `lib/store/session.ts`. Test: `tests/unit/session.test.ts`.

**Interfaces (Produces):**
```ts
export type SessionStatus = "idle" | "active" | "finished";
export type SessionState = {
  version: 1; status: SessionStatus; startedAt: number | null; deadline: number | null; // epoch ms
  events: ModuleEvent[]; currentIndex: number; answers: Record<string, string>;
  marked: Record<string, boolean>; eliminated: Record<string, string[]>;
  desmosOpen: boolean; desmosAvailable: boolean;
  drills: Record<string, { seed: number; answer: string | null; correct: boolean | null }>;
};
export type SessionActions = {
  start(now?: number): void; goTo(index: number, now?: number): void;
  select(qid: string, answer: string, now?: number): void; clear(qid: string, now?: number): void;
  eliminate(qid: string, label: string, now?: number): void; toggleMark(qid: string, now?: number): void;
  setDesmos(open: boolean, now?: number): void; setDesmosAvailable(ok: boolean): void;
  finish(reason: "finish"|"timeout", now?: number): void; checkDeadline(now?: number): void;
  answerDrill(qid: string, answer: string, correct: boolean): void; newDrillSeed(qid: string): void;
  reset(): void;
};
export const useSession: UseBoundStore<StoreApi<SessionState & SessionActions>>;
export const STORAGE_KEY = "filmroom:session:v1";
```
Every mutating action appends the matching event, with `t = now - startedAt`. `goTo` emits `question_leave` for the old question and `question_enter` for the new one. `start` emits `module_start` and `question_enter q1`, and sets `deadline = now + MODULE_SECONDS*1000`. `finish` emits `question_leave` (and `desmos_close` if Desmos is open) and then `module_end`. After `finish`, every action except `answerDrill`, `newDrillSeed` and `reset` is a no-op. Persist with the zustand `persist` middleware and `createJSONStorage(() => localStorage)`, `version: 1`. `migrate` returns the initial state for any other version, and `onRehydrateStorage` calls `checkDeadline(Date.now())`. Default drill seed: `hashString(qid) + 1`.

- [ ] **Step 1: Write failing tests:** Use an in-memory `localStorage` shim in the test, call actions with an explicit `now`, and read `useSession.getState()`.
  - start → goTo(1) → select → finish produces the exact event types in order.
  - Actions after finish are ignored.
  - `rehydrate-before-deadline`: persist, re-create, rehydrate with now < deadline → status `active`, same deadline.
  - `rehydrate-after-deadline`: rehydrate with now > deadline → status `finished`, with the last event `module_end` reason `timeout`.
  - `corrupt-storage-resets`: put `"{not json"` and then `{"state":{},"version":0}` under `STORAGE_KEY`. Rehydrate → status `idle` with no throw.
  - `finish` while Desmos is open emits `desmos_close` before `module_end`.
- [ ] **Step 2:** `npm test -- session` → FAIL.
- [ ] **Step 3:** Implement. Inject `now` via the parameter with a `Date.now()` default. Expose `useSession.persist.rehydrate()` for the tests.
- [ ] **Step 4:** `npm test -- session` → PASS.
- [ ] **Step 5:** Commit `feat(store): persisted session store with deadline timer`.

### Task 7: Module (test-taking) UI

**Skills:** `impeccable:impeccable`, `vercel-react-best-practices`.

**Files:** Create `components/math/MathText.tsx`, `components/module/{ModuleShell,TopBar,Timer,QuestionPane,ChoiceList,SprInput,Navigator,DesmosPanel}.tsx`, `app/module/page.tsx`. Modify `app/layout.tsx` (KaTeX css, fonts).

**Interfaces:**
- Consumes `useSession` (Task 6) and `moduleQuestions`/`MODULE_SECONDS` (Task 3).
- Produces stable `data-testid`s used by e2e: `timer`, `question-stem`, `choice-A`..`choice-D`, `spr-input`, `mark-review`, `nav-q1`..`nav-q22`, `next`, `back`, `desmos-toggle`, `finish`, `confirm-finish`.

Behaviour (§3.2):
- On `idle`, a start card with instructions → `start()`.
- On `finished` → `router.replace("/replay")`.
- The timer shows `deadline - now`, updates once a second, can be hidden, calls `checkDeadline` each tick and turns red under 5 minutes.
- Choice click → `select`. A strike-through button per choice → `eliminate`.
- SPR input: on blur or Enter → `select(qid, value)`, max 6 characters (like the real test).
- The navigator popover shows answered, marked and current questions.
- Desmos: load `https://www.desmos.com/api/v1.11/calculator.js?apiKey=${NEXT_PUBLIC_DESMOS_KEY}` with `next/script` `strategy="lazyOnload"`, and create the calculator only when the panel first opens (`vercel-react-best-practices` `bundle-defer-third-party`). On a script `onError` → `setDesmosAvailable(false)` and disable the toggle with tooltip "Calculator unavailable". Toggling calls `setDesmos`.
- Finish asks for confirmation and shows the count of unanswered questions.
- `MathText` renders `$...$` segments with `katex.renderToString({ throwOnError: false })`.
- Keyboard: ←/→ moves between questions, keys 1–4 or A–D select a choice. All controls are reachable by focus.

- [ ] **Step 1:** Build the components. Ask the user to open `http://localhost:3001/module` and confirm with them: start, answer, refresh (state persists), Desmos opens, finish → redirect.
- [ ] **Step 2:** `npm run typecheck && npm run build` → success.
- [ ] **Step 3:** Commit `feat(module): digital-test style practice module UI`.

### Task 8: AI layer (server)

**Skills:** `claude-api` (read the TS docs listed in Global Constraints first), `superpowers:test-driven-development`.

**Files:** Create `lib/ai/{client,prompts,schemas,context,cache,ratelimit,fallback}.ts`, `lib/content/fallbacks.ts`, `app/api/coach/route.ts`, `app/api/debrief/route.ts`, `app/api/ask/route.ts`. Tests: `tests/unit/ai.test.ts`, `tests/unit/routes.test.ts`.

**Interfaces (Produces):**
```ts
// schemas.ts
export const CoachSchema = z.object({ note: z.string().max(600),
  aiRead: z.object({ misconception: z.string().max(120), confidence: z.enum(["low","med","high"]) }).nullable() });
export const DebriefSchema = z.object({ headline: z.string().max(140),
  patterns: z.array(z.object({ title: z.string().max(60), questionIds: z.array(z.string()), explanation: z.string().max(400) })).min(1).max(2),
  habits: z.array(z.string().max(160)).length(3) });
export type CoachResult = z.infer<typeof CoachSchema>; export type Debrief = z.infer<typeof DebriefSchema>;
export const CoachRequest = z.object({ events: EventsSchema, qid: z.string().regex(/^q([1-9]|1\d|2[0-2])$/), desmosAvailable: z.boolean() });
export const DebriefRequest = z.object({ events: EventsSchema, desmosAvailable: z.boolean() });
export const AskRequest = CoachRequest.extend({ messages: z.array(z.object({ role: z.enum(["user","assistant"]), content: z.string().min(1).max(1000) })).min(1).max(20) });
// context.ts — server rebuilds everything from events
export function rebuild(events: ModuleEvent[], desmosAvailable: boolean): { questions: Question[]; verdicts: Verdict[]; report: ScoreReport };
export function coachContext(q: Question, v: Verdict): string;   // facts block: stem, choices w/ tags, verified answer, solution, verdict, evidence
export function debriefContext(questions: Question[], verdicts: Verdict[], report: ScoreReport): string;
export function askContext(q: Question, v: Verdict, events: ModuleEvent[]): string; // adds timeline summary
// client.ts
export const MODEL = "claude-opus-5-5";
export function getClient(): Anthropic | null;  // null when ANTHROPIC_API_KEY unset
// fallback.ts
export function fallbackCoach(q: Question, v: Verdict): CoachResult;
export function fallbackDebrief(questions: Question[], verdicts: Verdict[], report: ScoreReport): Debrief;
// cache.ts
export function memoCache<T>(max: number): { get(k: string): T | undefined; set(k: string, v: T): void }; // LRU via Map
export function hashKey(x: unknown): string;   // sha256 hex of stable JSON
// ratelimit.ts
export function allow(ip: string, now?: number): boolean; // 60 per rolling 10 min
```
Route contracts:
- `/api/coach` and `/api/debrief` → `200 { source: "ai"|"fallback", data }`. A body that fails zod gets `400 { error }`, and a rate-limited request gets `429`.
- `/api/ask` → `200` `text/plain; charset=utf-8` stream of the reply. With no client, it returns `503 { error: "offline" }`.
- All three routes set `export const runtime = "nodejs"`.

Calls:
- Coach and debrief: `messages.parse` with a `zodOutputFormat(...)` output format, wrapped in `Promise.race` with an 8 s timeout (`AbortController`). Any throw, a null `parsed_output`, or `stop_reason === "refusal"` → fallback.
- Ask: `messages.stream`, piping text deltas into a `ReadableStream`, with a 30 s abort.
- System prompts in `prompts.ts` are frozen strings, with `cache_control: {type:"ephemeral"}` on the system block and the per-session facts block placed *before* the user's question, so repeat calls share a cached prefix.
- Include `thinking: {type:"adaptive"}`, `output_config.effort`, and `fallbacks: "default"` with beta `server-side-fallback-2026-07-01`, following the skill docs for the exact shape (beta endpoint if required).
- The coach prompt asks for `aiRead` only when `v.kind === "concept-gap"`. The server forces `aiRead = null` otherwise.

`max_tokens`: coach 1024, debrief 2048, ask 1024 (short outputs are deliberate, §7 abuse limits).

- [ ] **Step 1: Write failing tests** (`ai.test.ts`):
  - `rebuild` on a fixture session gives the same verdicts as calling `diagnose` directly.
  - `coachContext` includes the verified answer and every evidence string.
  - `fallbackCoach` returns a schema-valid result for every `VerdictKind` and for every misconception tag in `TEMPLATES`.
  - `fallbackDebrief` is schema-valid and names the top lost-points kind in its headline.
  - `memoCache` evicts the oldest entry at `max`.
  - `allow` returns false on the 61st call within 10 min and true again after the window.

  Write `routes.test.ts`, importing the route `POST` handlers directly and mocking `getClient` with `vi.mock("@/lib/ai/client")`:
  - Malformed body → 400.
  - 5,001 events → 400.
  - `qid: "q99"` → 400.
  - A 1,001-character ask message → 400.
  - With no client, coach returns `source: "fallback"`.
  - A mocked client whose parse returns `parsed_output: null` → `source: "fallback"`, status 200.
  - Coach with a mocked valid result on a non-concept-gap question → `aiRead === null`.
  - Ask with no client → 503.
- [ ] **Step 2:** `npm test -- ai routes` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npm test -- ai routes` → PASS. Then `npm run typecheck` → no errors.
- [ ] **Step 5:** Commit `feat(ai): coach, debrief and ask routes with fallbacks`.

### Task 9: Replay data hooks (client)

**Files:** Create `lib/replay/timeline.ts`, `lib/replay/useReplay.ts`, `lib/ai/clientCache.ts`, `lib/ai/hooks.ts`. Test: `tests/unit/timeline.test.ts`.

**Interfaces (Produces):**
```ts
export type TimelineItem = { at: number; kind: "enter"|"leave"|"select"|"clear"|"eliminate"|"mark"|"desmos-open"|"desmos-close";
  label: string; durationMs?: number };
export function buildTimeline(events: ModuleEvent[], qid: string): TimelineItem[]; // leave items carry visit durationMs
export function useReplay(): { ready: boolean; questions: Question[]; verdicts: Verdict[]; report: ScoreReport } ; // memoized from store; ready=false if status!=="finished"
export function useCoach(qid: string): { data: CoachResult | null; source: "ai"|"fallback"|null; loading: boolean };
export function useDebrief(): { data: Debrief | null; source: "ai"|"fallback"|null; loading: boolean };
export function useAsk(qid: string): { messages: {role:"user"|"assistant"; content: string}[]; send(text: string): void; streaming: boolean; offline: boolean; turnsLeft: number };
```
Hooks POST `{ events, qid, desmosAvailable }` from the store. Results are cached in localStorage under `filmroom:ai:v1`, keyed by `qid + verdict kind + finalAnswer` (the debrief is keyed by a hash of the verdict list). Ask allows 10 turns per question (`turnsLeft`). On 503 it sets `offline = true`.

- [ ] **Step 1: Write failing test:**
  - Visits 0–10s and 30–35s with select B at 4s and Desmos open at 6s → items in time order, with labels `"Chose B"`, `"Opened Desmos"` and leave durations 10000 and 5000.
- [ ] **Step 2:** `npm test -- timeline` → FAIL.
- [ ] **Step 3:** Implement all four files.
- [ ] **Step 4:** `npm test -- timeline` → PASS, then `npm run typecheck`.
- [ ] **Step 5:** Commit `feat(replay): timeline builder and AI client hooks`.

### Task 10: Replay UI

**Skills:** `impeccable:impeccable`, `dataviz`, `vercel-react-best-practices`. Follow the direction chosen in `design/replay-directions/README.md`.

**Files:** Create `components/replay/{ReplayHeader,CauseBar,ScoutingReport,VerdictStrip,PacingChart,QuestionDetail,ActionTimeline,EvidenceList,CoachNote,AiReadBadge,AskPanel,VerdictIcon}.tsx`, `lib/replay/verdictMeta.ts` (label, colour token and icon per `VerdictKind`), `app/replay/page.tsx`.

**Interfaces:**
- Consumes the Task 9 hooks.
- Produces `data-testid`s: `score`, `points-lost`, `ai-mode` (text `AI` or `Offline`), `scouting-report`, `tile-q1`..`tile-q22` (with `data-kind` set to the verdict kind), `question-detail`, `verdict-label`, `coach-note`, `ai-read`, `ask-input`, `ask-send`, `drills-cta`.

Behaviour (§3.3):
- If `!ready` → `router.replace("/?notice=no-session")`.
- The tile strip is keyboard-navigable.
- A pattern in the scouting report links to its tiles: clicking selects the first, hovering highlights all.
- The pacing chart is inline SVG bars of `timeMs` against `parMs`, coloured by verdict kind, with a cumulative-clock line. The x-axis is the question number, it has an accessible `<title>`, and it uses no chart library.
- The stacked CauseBar uses `lostByKind` and only includes mistake kinds.
- Question detail shows the stem with your choice, the correct choice and the trap (with its misconception), the timeline, the evidence, the "squeezed by Qn" note, the solution steps, the coach note (skeleton while loading), the AI-read badge for concept gaps, and the Ask panel (streaming text, turns left, offline state).
- The CTA "Fix these N mistakes" → `/drills`.

- [ ] **Step 1:** Build. Ask the user to finish a module on `localhost:3001` and review the replay, both with an API key and without one (offline mode).
- [ ] **Step 2:** `npm run typecheck && npm run build` → success.
- [ ] **Step 3:** Commit `feat(replay): film room replay screen`.

### Task 11: Drills UI

**Skills:** `impeccable:impeccable`.

**Files:** Create `components/drills/{DrillCard,RecoveredCounter}.tsx`, `lib/drills/drills.ts`, `app/drills/page.tsx`. Test: `tests/unit/drills.test.ts`.

**Interfaces (Produces):**
```ts
export function drillQuestion(templateId: string, qid: string, seed: number): Question; // makeTwin(TEMPLATES[templateId], seed, `${qid}-twin`)
export function pointsRecovered(verdicts: Verdict[], report: ScoreReport, drills: SessionState["drills"]): number; // sum perQuestion[qid] where drills[qid].correct === true and verdict is a mistake
```
Behaviour:
- Lists one twin per mistake verdict, in module order.
- Answering checks with `isCorrect`, shows right or wrong plus the twin's `solution`, and calls `answerDrill`.
- "Another twin" → `newDrillSeed(qid)`.
- The counter animates the total in `pointsRecovered`.
- If `!ready` → redirect as in the replay. `data-testid`s: `drill-q{n}`, `recovered`.

- [ ] **Step 1: Write failing tests:**
  - `drillQuestion` gives the same question for the same seed, a different stem for a different seed, and never the canonical params.
  - `pointsRecovered` counts only correct drills on mistake verdicts.
- [ ] **Step 2:** `npm test -- drills` → FAIL.
- [ ] **Step 3:** Implement the lib and UI.
- [ ] **Step 4:** `npm test -- drills` → PASS. Then `npm run build`.
- [ ] **Step 5:** Commit `feat(drills): twin-question drills with points recovered`.

### Task 12: Landing page

**Skills:** `impeccable:impeccable`.

**Files:** Modify `app/page.tsx`. Create `components/landing/*` as needed.

Content:
- Hero line: *"Don't just practice. Review the tape."*
- A sub-line saying that other apps tell you *what* you got wrong and FilmRoom tells you *why*, and how many points each habit costs.
- A static mini replay (fixture verdict strip and cause bar, built from the Task 10 components with fixture data).
- 3 steps: Take a module → Watch the replay → Fix your mistakes.
- A "Start Module" CTA, plus "Resume" when `status === "active"` and "View last replay" when `finished`.
- When `?notice=no-session`, a dismissible note: "Finish a module first to see your replay."
- A footnote: original practice questions, not affiliated with College Board, and score estimates are approximate.
- Must work at phone width.

- [ ] **Step 1:** Build. The user checks `localhost:3001` on desktop and at phone width.
- [ ] **Step 2:** `npm run build` → success.
- [ ] **Step 3:** Commit `feat(landing): landing page`.

### Task 13: End-to-end, AI smoke script, review, README

**Skills:** `web-design-guidelines`, `security-review`, `vercel-react-best-practices` (review pass), `claude-in-chrome` (optional visual pass on the user's server).

**Files:** Create `tests/e2e/flow.spec.ts`, `scripts/ai-smoke.ts`, `tests/fixtures/sessions.ts` (3 sessions: mostly-correct, timeout-heavy, trap-heavy; reused by `ai-smoke`). Modify `README.md`.

- [ ] **Step 1: Write e2e** `flow.spec.ts`. It requires the user's server on :3001, and `test.skip` with a clear message if it's unreachable.
  - **Main flow:** start → answer q1 correctly via the choice whose text matches the canonical answer (read from `moduleQuestions()` in the test) → on q2, select a wrong choice, then the right one, then a wrong one → open Desmos → finish and confirm. Then `tile-q2` has `data-kind="second-guess"`, `score` is visible, and `drills-cta` navigates to `/drills`, where `drill-q2` is visible.
  - `replay-without-session-redirects`: clear localStorage, go to `/replay` → URL becomes `/?notice=no-session`.
- [ ] **Step 2:** Ask the user to run `npm run dev`. Then `npx playwright install chromium && npm run test:e2e` → PASS.
- [ ] **Step 3:** Write `scripts/ai-smoke.ts`, run with `npx tsx scripts/ai-smoke.ts`. For each fixture session, it calls `rebuild` and the same server functions the routes use, and prints the debrief, two coach notes and one ask reply. **This spends API credits — ask the user before running.**
- [ ] **Step 4:** Run the `web-design-guidelines` and `security-review` skills on the branch and fix findings that matter. Run `npm test && npm run typecheck && npm run build` → all green.
- [ ] **Step 5:** README covers what it is (with the market gap in one paragraph), screenshots, how it works (event log → rules → Claude), running locally (`.env.local`, `npm run dev` on 3001), tests, deployment to Vercel (env vars, the production Desmos key), and limitations (heuristic scaling, one module).
- [ ] **Step 6:** Commit `test: e2e flow, AI smoke script, README`.

---

## Self-review notes

- **Spec coverage:**

  | Spec section | Task(s) |
  |---|---|
  | §3.1 | 12 |
  | §3.2 | 7 |
  | §3.3 | 10 |
  | §3.4 | 11 |
  | §4 | 5 |
  | §5 | 2, 3 |
  | §6 | 5 |
  | §7 | 8, 9, 10 |
  | §8 | 1, 4, 6 |
  | §9 Desmos | 7 |
  | §9 Claude | 8 |
  | §9 Redirects | 10, 11, 13 |
  | §9 Resample | 2 |
  | §10 | 2–5, 8, 9, 11, 13 |
  | §11 | 1b, 7, 10, 12 |
  | §12 (Desmos key) | README in 13 |

- **Deferred:** deployment to Vercel itself is an outward-facing action. It is documented in Task 13 and done only after the user approves.
