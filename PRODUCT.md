# Satori — product context

Source: approved design spec (docs/superpowers/specs/2026-10-18-filmroom-design.md) and the replay direction the user picked (design/replay-directions/README.md). Written from those, not a fresh interview.

## What it is
"Game Review for the SAT." A student takes a 22-question SAT Math practice module; Satori records how they worked (time, answer changes, Desmos use) and replays it: why each mistake happened, points lost per cause, an AI scouting report and per-question coach, then twin-question drills.

## Who it's for
- High-school students (16–18), often anxious, preparing for the digital SAT, many outside the US. Laptop is the primary device during a module (mirrors the real test); phone for reviewing.
- Secondary audience: a hiring panel at a test-prep company evaluating the product thinking.

## Surfaces and modes
- `/module` — **Operate**: a calm, focused test-taking tool. Familiar digital-test conventions; nothing distracting.
- `/replay` — **Operate/Read**: the hero surface. Analytical, honest, encouraging.
- `/drills` — **Operate**.
- `/` landing — **Persuade**.

## Voice
A good coach watching tape with you: specific, warm, never shaming, never hype. Plain words. No fake stats or testimonials.

## Constraints
- Original practice questions only; no College Board / Bluebook branding or claims of affiliation. Score estimates labelled approximate.
- Accessibility: body ≥14px (16px on mobile), contrast ≥4.5:1, keyboard operable, verdicts never by colour alone.
- Visual world: light editorial — see design/replay-directions/README.md.
