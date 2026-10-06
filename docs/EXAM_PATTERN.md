# NET exam pattern: current and legacy

This page summarises the NUST Entry Test (NET) patterns that NET CBT Simulator reproduces, and the sources
behind them. The paper definitions used by the app are in [`src/config/exams.ts`](../src/config/exams.ts); the
in-app **About** page (`#/about`) builds its tables from that file.

> NET CBT Simulator is **unofficial** and is not affiliated with NUST. Patterns change between admission
> cycles. Always check the official pages listed under [Sources](#sources) before you sit the test.

## Rules common to every current NET

| Rule                 | Value                         | Source                             |
| -------------------- | ----------------------------- | ---------------------------------- |
| Questions            | 200 multiple-choice questions | Weightings page, UG Brochure 2026  |
| Total marks          | 200 (1 mark per question)     | UG Brochure 2026                   |
| Duration             | 180 minutes                   | UG Brochure 2026                   |
| Options per question | 4                             | Official CBNET sample test         |
| Negative marking     | None                          | UG Brochure 2026, UG admission FAQ |
| English section      | SAT pattern                   | Weightings page / FAQ              |

Other facts shown in the app:

- **Test modes and centres.** The computer-based NET (CBNET) is held in **Islamabad** and **Quetta**. The
  paper-based NET (PBNET) is held in **Karachi** and **Gilgit**.
- **Series.** NET is held in **four series** each admission cycle.
- **Merit aggregate.** NET **75%**, HSSC (FSc / A-level equivalence) **15%**, SSC (Matric / O-level
  equivalence) **10%**. `nustAggregate()` in `src/exam/scoring.ts` implements this.

## Current patterns (from NET-2025)

Subject weightings are taken from NUST's _Subjects included in NET with weightings_ page. MCQ counts follow
from the 200-question total.

| Paper (app code)                       | Who sits it                                             | Sections (MCQs = weightage %)                                     |
| -------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| **Engineering** (`ENG`)                | Pre-Engineering, ICS, Pre-Medical with Additional Maths | Mathematics 100 (50%), Physics 60 (30%), English 40 (20%)         |
| **Applied Sciences** (`APS`)           | Pre-Medical                                             | Biology 100 (50%), Chemistry 60 (30%), English 40 (20%)           |
| **Business & Social Sciences** (`BUS`) | Any HSSC group                                          | Quantitative Mathematics 100 (50%), English 100 (50%)             |
| **Architecture** (`ARC`)               | Pre-Engineering or equivalent                           | Design Aptitude 100 (50%), Mathematics 60 (30%), English 40 (20%) |
| **Natural Sciences** (`NAT`)           | HSSC with Mathematics                                   | Mathematics 100 (50%), English 100 (50%)                          |

What changed from the legacy patterns: the **Intelligence** section was dropped, Chemistry left the
Engineering paper, and English grew to 20% or 50% of the paper.

### Design Aptitude (Architecture)

NUST's School of Art, Design and Architecture (SADA) publishes _Design Aptitude NET guidelines_. The simulator
groups the areas it lists into five chapters (`src/config/syllabus.ts`):

1. **Design fundamentals and theory:** elements and principles of design, Gestalt, proportion systems, colour
   theory, composition.
2. **Visual arts and techniques:** drawing, perspective, shapes and geometry, human proportions, form-making,
   materials.
3. **Design history and context:** iconic artists and designers, design movements, local crafts, Islamic art and
   architecture, man and environment.
4. **Problem solving and visual communication:** non-verbal and spatial reasoning, rotations, mirror images, paper
   folding, cube nets, symbols and signage.
5. **Contemporary and emerging practices:** the design process, studio culture, local practitioners, new
   materials and technologies, sustainability.

## Legacy patterns (up to NET-2024)

These patterns were in force until the NET-2024 cycle. Weightings come from Wayback Machine snapshots of the
weightings page. The simulator keeps them as optional _legacy_ papers for extra practice in Chemistry,
Computer Science and Intelligence.

### Snapshot of 26 September 2023

| Paper                                                    | Mathematics      | Physics | Chemistry / CS / Biology   | English | Intelligence |
| -------------------------------------------------------- | ---------------- | ------- | -------------------------- | ------- | ------------ |
| Engineering / Computer Science (Pre-Engineering) (`LEN`) | 40%              | 30%     | Chemistry 15%              | 10%     | 5%           |
| Engineering / Computer Science (ICS) (`LCS`)             | 40%              | 30%     | Computer Science 15%       | 10%     | 5%           |
| Biosciences (Pre-Medical) (`LBI`)                        | —                | 15%     | Biology 40%, Chemistry 30% | 10%     | 5%           |
| Business & Social Sciences (`LBU`)                       | Quantitative 40% | —       | —                          | 40%     | 20%          |
| Architecture / Industrial Design (`LAR`)                 | 30%              | 30%     | —                          | 25%     | 15%          |

The app turns each percentage into a share of 200 MCQs: Engineering has Mathematics 80, Physics 60,
Chemistry 30, English 20 and Intelligence 10.

### Snapshot of 6 November 2024 (NET-Computing)

In late 2024 the page also listed a separate **NET-Computing** paper: Mathematics **40%**, Physics **25%**,
Computer Science **20%**, English **10%**, Intelligence **5%**. It sat between the legacy ICS paper and the
2025 patterns. The app does not have a separate preset for it. Use a **custom test**
(`#/new?type=custom`) with 80 / 50 / 40 / 20 / 10 MCQs to practise it.

### Snapshot of 19 January 2025

By January 2025 the page showed the current patterns described above.

## How the simulator uses these facts

- **Section order and counts** are taken from the tables above. `EXAM_TYPES` in `src/config/exams.ts` is the
  single source of truth.
- **Chapter weightages are estimates.** NUST publishes no chapter-level weightages. The weights in
  `src/config/syllabus.ts` are estimated from candidates' reports of recent sittings, and each paper varies
  them by ±25%. [CALIBRATION.md](CALIBRATION.md) explains the method.
- **The CBT screen** follows the official CBNET sample test. That includes "Question No : x of N", "Marks: 1",
  the photograph panel, Save / Review / Next / Prev / Next Section / Prev Section / First / Last / Help, the
  Show / Question lists, the minutes-remaining clock with the start time, and "Click here to FINISH Your Test"
  with its confirmation: _"Once you Finish the paper, You will not be able to Logon again."_ In Exam mode an
  answer is recorded only when Save is pressed. The pacing blink after the average time per question (about 54 seconds)
  comes from candidates' descriptions rather than the sample test, and can be switched off.
- **Things the real terminal does not have** are marked as simulator aids in the app: the question navigator,
  pause, keyboard shortcuts, instant feedback and the text-size control.

## Sources

| Source                                                                                                                                                              | What it supports                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [Subjects included in NET with weightings](https://nust.edu.pk/admissions/undergraduates/subjects-included-in-net-with-weightings/) (live page)                     | Current papers and weightings, English on SAT pattern        |
| Wayback snapshot, [26 Sep 2023](https://web.archive.org/web/20230926000000/https://nust.edu.pk/admissions/undergraduates/subjects-included-in-net-with-weightings/) | Legacy weightings, including Intelligence                    |
| Wayback snapshot, [6 Nov 2024](https://web.archive.org/web/20241106000000/https://nust.edu.pk/admissions/undergraduates/subjects-included-in-net-with-weightings/)  | NET-Computing weightings                                     |
| Wayback snapshot, [19 Jan 2025](https://web.archive.org/web/20250119000000/https://nust.edu.pk/admissions/undergraduates/subjects-included-in-net-with-weightings/) | Switch to the current patterns                               |
| [NUST FAQ: UG admission](https://nust.edu.pk/faq-category/ug-admission/)                                                                                            | Test centres (CBNET / PBNET), series, no negative marking    |
| [UG Brochure 2026 (PDF)](https://ugadmissions.nust.edu.pk/PublishingImages/UG_Brochure_2026.pdf)                                                                    | 200 marks, 180 minutes, no negative marking, merit aggregate |
| [Official CBNET sample test](https://ugadmissions.nust.edu.pk/demo/index.htm)                                                                                       | Terminal layout, buttons and dialogs                         |
| [SADA: Design Aptitude NET guidelines](https://sada.nust.edu.pk/in-the-spotlight/design-aptitude-net-guidelines/)                                                   | Design Aptitude areas                                        |

The Wayback links point at the snapshot dates; the archive redirects to the capture closest to each date.

Did NUST change something? Please open an issue or pull request that updates `src/config/exams.ts` and
this file together, and link the source.
