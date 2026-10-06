# Question authoring guide

The question bank lives in `src/bank/<subject>/<chapter-id>.ts`. Each file holds the
templates for **one syllabus chapter** and default-exports `defineBank(...)`. Chapter ids
come from [`src/config/syllabus.ts`](../src/config/syllabus.ts); the test-suite rejects
files whose name or chapter id is not in the syllabus.

```ts
import { defineBank } from '@/engine/authoring';
import { num, numericOptions, q$, qty, tex, U } from '@/engine/helpers';

export default defineBank('physics', 'work-energy', (b) => [
  b.dynamic('kinetic-energy', { difficulty: 1, tags: ['kinetic energy'] }, (r) => {
    const m = r.pick([2, 4, 6, 8]);
    const v = r.int(2, 20);
    const ke = 0.5 * m * v * v;
    const { answer, distractors } = numericOptions(r, {
      correct: ke,
      wrong: [m * v * v, 0.5 * m * v, 0.25 * m * v * v], // forgot ½, forgot the square, halved twice
      format: (x) => q$(x, U.J),
    });
    return {
      stem: tex`A body of mass $${qty(m, U.kg)}$ moves at $${qty(v, U.mps)}$. Its kinetic energy is:`,
      answer,
      distractors,
      explanation: tex`$K.E. = \frac{1}{2}mv^2 = \frac{1}{2}(${m})(${v})^2 = ${num(ke)}\,\mathrm{J}$.`,
    };
  }),
  ...b.mcqs([
    {
      id: 'kwh-is-energy',
      d: 1,
      o: 'past-paper',
      t: ['power'],
      q: 'The kilowatt-hour (kWh) is a unit of:',
      a: 'energy',
      x: ['power', 'force', 'momentum'],
      e: tex`$1\,\mathrm{kWh} = 3.6 \times 10^{6}\,\mathrm{J}$, a unit of energy.`,
    },
  ]),
]);
```

## Template kinds

| Builder                                                    | Use for                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `b.dynamic(id, meta, (rng) => question)`                   | Parametric questions. Every instance draws fresh values from the seeded `rng`.       |
| `b.fixed(id, meta, question)`                              | One fixed question (options are still shuffled).                                     |
| `b.mcqs([...])`                                            | Many fixed questions in compact form (`id, d, q, a, x, e, o?, t?, fixed?`).          |
| `b.set(id, meta, size, (rng) => ({ passage, questions }))` | A passage with `size` questions that always appear together (reading comprehension). |

`meta` is either a difficulty (`1 | 2 | 3`) or `{ difficulty, origin?, tags? }`.

- **difficulty** — 1: recall or a single step (about 30 s); 2: two or three steps, typical NET (about 50 s);
  3: multi-step, or a conceptual trap that top candidates get right (about 90 s). A real paper allows about
  54 s per question.
- **origin** — `past-paper` for questions modelled on themes reported from real NET sittings (rewritten
  in your own words, values usually randomised); `original` (default) otherwise.
- **tags** — sub-topics (use the names listed under the chapter in `syllabus.ts`).

## The question object

```ts
{ stem, answer, distractors: [three wrong options], explanation, fixedOrder?, figure? }
```

- Exactly **three distractors**, all distinct from each other and from the answer _as displayed_
  (`$0.5$` and `0.5` count as the same).
- **Explanation is required**: a short worked solution (formula → substitution → result) or the reason
  the answer is right and the most tempting distractor wrong.
- `fixedOrder` is required when an option refers to other options ("All of the above",
  "Both (a) and (b)", "None of these"); otherwise options are shuffled per paper.
- `figure`: optional SVG string (no scripts, no event handlers).

## Rich text and LaTeX

Text supports `$inline$`, `$$display$$`, `**bold**`, `__underline__`, `` `code` ``,
fenced code blocks, `| pipe | tables |` and `\n` line breaks. Chemistry can use mhchem:
`$\ce{H2SO4}$`, `$\ce{N2 + 3H2 <=> 2NH3}$`.

**Always write LaTeX inside the `tex` tag** (an alias of `String.raw`) so backslashes survive.
`'$\frac{1}{2}$'` in a normal string turns `\f` into a form-feed; the validator rejects that.

**Never put a backslash directly before an interpolation.** Inside `tex`, `\${fn}` escapes the
`$` and the expression is _not_ interpolated. Build the command in JavaScript and interpolate it:

```ts
const fnTex = fn === 'sin' ? '\\sin' : '\\cos'; // normal string: '\\' is one backslash
stem: tex`Differentiate $y = ${fnTex}(${inner})$.`;
```

Also avoid `${}^{14}C` style prefixes (they look like interpolation): write `$^{14}\mathrm{C}$`.

## Numbers, units and distractors

- Use `num(x)` (3 significant figures, trailing zeros removed, scientific notation outside
  [10⁻³, 10⁶)), `sci(x)`, `qty(x, U.unit)` / `q$(x, U.unit)` and `Fraction`/`frac()` for exact
  rational answers, `surdTex`, `polyTex`, `signedSum`, `exactTrig`, `radianTex`.
- **Choose parameters so answers are exact and "nice"**, like a real MCQ (integers or short
  terminating decimals). Do not let rounding produce `72.3` when the true value is `72.25`.
- **Every number in a stem must be exact.** If `num()` would print `12.8` for a mass of `12.75 g`,
  the candidate solves with 12.8 and no option matches the key. Constrain the parameters (or pass
  `{ sig: 4 }`) so the displayed value is the value you compute with. The gate fails a stem that
  shows a value `num()`/`sci()` rounded; a deliberate approximation must say so
  (`\sqrt{2} \approx 1.41`).
- **Distractors must come from plausible mistakes**: wrong sign, forgotten factor (½, 2, π), wrong
  formula, unit-conversion slip, the value of a different quantity. `numericOptions()` takes these
  first and only falls back to perturbations if they collide.
- When showing substitution, multiply explicitly: `12(2)^3`, `12 \times 2^3`. Writing
  `${a}${paren(k)}` prints `122^3` when `k` is positive.
- Avoid degenerate parameters (zero denominators, `a = b`, coincident options). The validator
  catches duplicates, but sensible ranges keep variety high.
- Never use `Math.random()` or `Date`: templates must be deterministic for a given `rng`.

## English items

Use curated data files (prefix the file name with `_`, e.g. `_lexicon.ts`; such files are imported by
chapter modules and are not chapters themselves). For vocabulary, every entry carries **hand-picked
distractors** that are clearly neither synonyms nor antonyms. Random headwords are not safe because a
"random" word can be arguably correct. Comprehension passages must be **original** text.

## Originality

Write every question yourself. "Past-paper style" means the _theme and difficulty_ match questions
reported from real NET sittings; do not copy wording from books, academies or websites. Comprehension
passages and sentences must be original.

## Checking your work

```bash
npx vitest run src/bank -t "physics/work-energy"   # quality gate for one chapter
npm run sample -- physics/work-energy 3            # print three instances of every template
```

The gate generates 30 instances of every dynamic template, then checks structure, distinct options,
determinism, variety, interpolation leaks (`NaN`, `undefined`, `${`), markup balance, rounded values
shown in stems and KaTeX rendering. It cannot check that the marked answer is actually correct; that is your job. Solve a few
sampled instances by hand.
