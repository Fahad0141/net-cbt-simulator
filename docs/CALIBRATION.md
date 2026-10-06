# How generated papers are calibrated to the real NET

NUST does not publish NET past papers. Its only official item set is the small CBNET _Sample Test_, which
is far easier than the real exam. To make generated papers feel like real ones, the generator is calibrated on:

- **Official facts:**
  - the weightings page, FAQ and UG brochure (200 MCQs, 180 minutes, four options, no negative marking);
  - the subject weights per paper;
  - "English is on the pattern of SAT";
  - "textbooks are consulted while developing the question bank".
- **Candidate reconstructions** of 2022–2025 sittings, collected in community compilations (memory-based lists,
  WhatsApp "experience" posts and coaching notes), plus prep-provider analyses.

Reconstructions are used for **topic, style and difficulty only**. Their answer keys are often wrong, and every
answer in this project is computed or written independently.

## Difficulty

| Section     | Reported mix (easy / medium / hard) | Notes                                                                            |
| ----------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| Mathematics | ≈ 55 / 37 / 8–10 %                  | about 90 reported 2023–25 stems tagged; mostly single-concept FSc textbook items |
| Physics     | ≈ 50 / 40 / 10 %                    | "80% theory + conceptual", 7–12 short numericals per 60                          |
| Chemistry   | mostly easy recall                  | ≥ 70% direct textbook statements; at most about 30 s per item                    |

The default mix used by the generator is **45 / 42 / 13 %**. It is slightly harder than reported so practice
does not under-prepare candidates. Each paper can be set to _Easier_, _NET-like_ or _Harder_. Difficulty labels in
the bank mean:

- **1:** one recall step or one formula.
- **2:** two steps, or a "what happens if X doubles" twist.
- **3:** a multi-concept item or a well-known trap.

## Chapter emphasis

Chapter counts reported by candidates set the chapter weights in `src/config/syllabus.ts`. Each generated paper
also varies chapter shares by ±25%, as real papers do.

- **Mathematics (100 MCQs):**
  - trigonometry (all chapters, including solution of triangles) about 18%;
  - conic sections about 9%;
  - sequences & series, and permutations/combinations/probability, about 7% each;
  - differentiation and integration about 7% each;
  - vectors, straight lines, and functions & limits about 6% each;
  - complex numbers about 5%;
  - smaller shares for matrices, sets, quadratics, binomial, partial fractions and LP.
- **Physics (60 MCQs):** all FSc chapters appear with 1–5 items each. Units and dimensions, Young's double slit,
  SHM, and modern/nuclear physics and magnetism recur most. Part I and Part II are roughly balanced.
- **Chemistry (60 MCQs, Applied Sciences):** about 52% organic, 30% physical and 17%
  inorganic/industrial/environmental.
- **English:**
  - vocabulary (synonyms and antonyms) is the largest block;
  - then short one-question passages and SAT-style sentence completion (single and double blank);
  - then analogies, grammar/sentence correction and spelling.

## Computational vs conceptual

The share of parametric (randomised-value) questions is set per subject (`SUBJECT_DYNAMIC_SHARE`):

| Subject                  | Parametric share | Why                                                                                     |
| ------------------------ | ---------------- | --------------------------------------------------------------------------------------- |
| Mathematics              | 60%              | most items are short calculations                                                       |
| Physics                  | 35%              | 10–20% pure numericals plus "if X is doubled" scaling items                             |
| Chemistry                | 25%              | mostly statement recall; a few mole, gas-law and pH numericals                          |
| Biology                  | 20%              | factual, with a few genetics numericals                                                 |
| English                  | 50%              | vocabulary, spelling and analogy generators; completion, grammar and passages are fixed |
| Quantitative Mathematics | 75%              | applied arithmetic and algebra                                                          |

The **hybrid** setting on the paper generator scales all of these proportionally.

## Item style

Reported items share these features, and the bank's templates follow them:

- **Numbers.** Data is mental-math friendly: standard angles (30°, 45°, 60°, 120°…), small integers, and
  fractions with small denominators. Answers are exact (surds, multiples of π, clean decimals) and no calculator
  is needed.
- **Physics distractors.** Options often form a factor family (×2, ½, ×4, ¼, √2). Some traps hinge on unit
  conversion (cm, mH, mC, °C→K, kWh→J). There are recurring conceptual traps: zero tangential acceleration in
  uniform circular motion, g at the top of a trajectory, and the series of the longest-wavelength line.
- **Mathematics distractors.** Wrong-quadrant angle pairs, partial solution sets, inverted ratios, off-by-one
  sums, a lost chain-rule factor, a sign flip, and the wrong included angle in ½ab sin C.
- **Chemistry.** Items test IUPAC and common names, named reagents and processes (Grignard, Tollens, haloform,
  Lindlar, Haber), periodic trends, oxidation numbers, hybridization and shapes, and industrial and
  environmental textbook statements.
- **Option sets.** "None of these", "Both (a) and (b)" and statement-combination items occur occasionally. The
  bank uses them sparingly, with fixed option order.
