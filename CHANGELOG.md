# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). Question-bank versions are tracked separately by
`BANK_VERSION` in `src/exam/papers.ts`; paper codes reproduce exactly within one bank version.

## [1.1.0] - 2026-10-06

### Changed

- A redesigned interface for every page except the exam terminal, which is unchanged:
  - less text: shorter headings and hints, with long explanations moved into collapsible sections;
  - a calmer, flatter layout with fewer cards, sentence-case labels and one bundled typeface (Archivo) for
    headings and scores;
  - an answer-sheet style answer map and question navigator, and highlighted focus chapters;
  - the dashboard drops the feature cards and fact table, and keeps progress, paper codes and the patterns.

## [1.0.0] - 2026-10-05

### Added

- A faithful recreation of the NUST computer-based NET terminal:
  - login, instructions and exam screens;
  - Save, Review, Next/Prev, section navigation, First/Last and Help;
  - an attempted counter and the All/Attempted/Unattempted/Reviewable jump lists;
  - a minutes-remaining clock and a pacing blink;
  - the finish confirmation and timeout auto-submit;
  - crash-safe persistence after every action.
- A hybrid dynamic question engine: a seeded deterministic RNG, parametric and fixed templates, passage sets,
  validation, and blueprint-accurate paper assembly with reproducible paper codes.
- Question banks for Mathematics, Physics, Chemistry, Biology, English, Quantitative Mathematics,
  Design Aptitude, plus legacy Computer Science and Intelligence: 2,856 templates across 110 syllabus chapters.
- A bank quality gate that generates instances of every template and checks structure, distinct options,
  determinism, variety, interpolation leaks, rounded values shown in stems and KaTeX rendering.
- All current NET papers (Engineering, Applied Sciences, Business & Social Sciences, Architecture, Natural
  Sciences), legacy pre-2025 patterns and a custom test builder.
- Exam and practice modes, score reports with an aggregate estimator, question review, analytics, a printable
  full-length paper with an answer sheet and key, a question-bank browser, and history export/import.
- A command-line paper generator, a template sampler and a bank report.
- Offline support (PWA), light and dark themes, responsive layout and accessibility features.
- An Android app (Capacitor) that bundles the simulator for offline use, with Android printing, share-sheet
  history export, a back-button policy that matches the real terminal, release signing and a GitHub Actions
  workflow that builds the APKs.
- A Windows desktop app (Electron, in its own `desktop/` package) with a per-user NSIS installer
  (`NET-CBT-Simulator-Setup-<version>.exe`), offline use, the Windows print dialog, history kept in the
  Windows profile, a smoke test and a GitHub Actions workflow that attaches the installer to releases.
