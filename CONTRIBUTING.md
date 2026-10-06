# Contributing

Thanks for helping NET candidates practise. Contributions of every size are welcome: a single
corrected answer key is as valuable as a new feature.

## Getting started

```bash
git clone <your fork>
cd net-cbt-simulator
npm install
npm run dev        # http://localhost:5173
npm run check      # typecheck + lint + tests
```

Node.js 20 or newer is required.

## Reporting a wrong question

Open an issue with the **paper code** (e.g. `ENG-K7Q2-9XM4`) and the **question number**, or the
template id shown in review mode (e.g. `physics/work-energy/kinetic-energy`). Paper codes are
reproducible, so we can regenerate exactly what you saw.

## Adding or improving questions

Read [docs/QUESTION_AUTHORING.md](docs/QUESTION_AUTHORING.md). In short:

1. Edit or create `src/bank/<subject>/<chapter-id>.ts` (chapter ids are in `src/config/syllabus.ts`).
2. Run `npx vitest run src/bank -t "<subject>/<chapter-id>"` until it passes.
3. Run `npm run sample -- <subject>/<chapter-id> 3` and solve a few instances by hand.
4. Open a pull request describing what you added and how you verified the answers.

All questions must be your own work. Do not copy from books, academies, or websites.

## Code changes

- Keep the engine (`src/engine`) pure and deterministic; it must not touch the DOM.
- The CBT screen (`src/ui/cbt`) mirrors the real terminal; changes to it should keep that fidelity.
- Add or update tests for behaviour changes (`*.test.ts` for logic, `*.test.tsx` for components).
- `npm run check` must pass; CI also runs the production build and Playwright smoke tests.

## Commit style

Use clear, imperative commit messages (`Add projectile-range template`, `Fix pH distractors`).
