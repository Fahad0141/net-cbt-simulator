# Architecture

NET CBT Simulator is a static single-page application (React 19 + TypeScript + Vite). Everything runs in the
browser. There is no backend.

```
src/
  engine/   pure, framework-free TypeScript: RNG, template API, rich text, validation, assembly
  bank/     question templates (one module per syllabus chapter, lazily loaded per subject)
  config/   exam patterns (exams.ts) and syllabus chapter weights (syllabus.ts)
  exam/     session state machine, scoring, persistence, paper service, session start
  storage/  IndexedDB key-value store with in-memory fallback
  ui/       React: CBT terminal (ui/cbt), pages (ui/pages), shared components and hooks
```

The layers depend downward only: `ui → exam → engine`. Nothing in `engine` or `exam` imports React or touches
the DOM (apart from `storage`), so the whole engine is unit-testable in Node and reusable from the CLI scripts.

## Engine

### Seeded randomness — `engine/rng.ts`

A string seed is hashed with **cyrb128** into a 128-bit state that drives **sfc32**. Both use only 32-bit
integer arithmetic, so sequences are identical on every JavaScript engine. `fork(label)` derives independent
streams keyed by label rather than by consumption order. A question's values therefore depend only on the
paper seed, the template id and the occurrence, not on which questions came before it.

### Templates — `engine/types.ts`, `engine/authoring.ts`

A chapter module calls `defineBank(subject, chapter, b => [...])` and can declare three kinds of template:

| Kind      | Produces                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------ |
| `dynamic` | `generate(rng)` returns a new question every time (parametric values, computed answers, mistake-based distractors) |
| `static`  | a fixed question; its options are still shuffled per paper                                                         |
| `set`     | a passage plus _n_ questions that are always delivered together                                                    |

Every template carries a difficulty (1–3), an origin (`past-paper` or `original`) and tags.

### Rich text — `engine/rich.ts`

Stems, options, explanations and passages share a small, safe markup language: `$…$` and `$$…$$` LaTeX (KaTeX
with mhchem), `**bold**`, `__underline__`, inline code, code fences and pipe tables. The parser produces an AST.
The renderer (`ui/components/RichText.tsx`) builds React elements from it, so author text can never inject
HTML; only KaTeX output is set as HTML.

### Validation — `engine/validate.ts`, `engine/validate-tex.ts`

`validateQuestion` checks structure:

- exactly three distractors;
- options distinct after normalisation;
- no control characters, which indicate lost LaTeX backslashes;
- no `NaN`, `undefined` or `${` leaks;
- balanced markup;
- `fixedOrder` set whenever an option refers to other options;
- safe SVG.

`validateTemplate` adds determinism and variety checks across many seeds. `texIssues` compiles every LaTeX
fragment with KaTeX. The bank test-suite (`src/bank/bank.test.ts`) runs all of these over every template.

### Assembly — `engine/assemble.ts`

`assemblePaper(bank, blueprint, options)`:

1. For each section, splits the question count across chapters by weight (largest-remainder apportionment),
   applying ±25% per-paper jitter.
2. Fills each chapter's quota by weighted sampling. The weights push towards the target difficulty mix and the
   target dynamic/fixed share, boost `past-paper` items, and penalise repeats. Fixed questions never repeat.
   Parametric templates may repeat with new values once the fresh ones are used up.
3. Generates instances on per-template RNG streams, retries on validation failure or duplicate output, and
   shuffles options on a separate stream.
4. Orders questions within each section (passage sets stay contiguous) and stamps the paper code and bank
   version.

The paper code (`ENG-K7Q2-9XM4`) holds the exam type and the seed. With the same bank version the paper is
reproduced exactly.

## Exam

### Session state machine — `exam/session.ts`

A pure reducer, `sessionReducer(session, action)`, models the CBT. Every action carries its own timestamp, so
the reducer never reads the clock and is fully testable. The modelled behaviour:

- `select` changes only the on-screen selection;
- `save` records the answer, and navigating away discards an unsaved selection;
- `review` requires a saved answer;
- navigation covers next/previous, first/last, next/previous section and goto;
- the clock is the elapsed running time against the duration, so pauses in practice mode stop it;
- time is checked on every action, so an expired paper finishes even if ticks were missed.

`useExamController` (UI) adds a one-second tick, persists the session to `localStorage` after every change,
warns on tab close and archives the attempt on finish.

### Scoring and storage

`exam/scoring.ts` scores papers (one mark each, no negative marking) and breaks results down by subject,
chapter and difficulty. `exam/store.ts` archives finished attempts in IndexedDB with a full paper snapshot, so
results stay exact after the bank changes. It also supports JSON export and import.

## UI

- `ui/cbt/` — the terminal. Its CSS mirrors the official sample (colours, fonts, 50×50 gradient buttons) in an
  original implementation. Simulator-only aids (navigator, pause, text size, instant feedback) live outside the
  terminal frame and are switched off in exam mode.
- `ui/pages/` — lazily loaded pages behind a hash router (`ui/router.ts`), so the build works on GitHub Pages
  without rewrites.
- Theming uses CSS variables with light and dark palettes (`ui/styles/global.css`). The terminal is
  deliberately light-only, like the real one.

## Testing

- `*.test.ts` — engine, exam logic and question-bank tests in Node.
- `*.test.tsx` — component tests in jsdom with Testing Library.
- `tests/e2e` — Playwright smoke tests against the production build (desktop and mobile).
