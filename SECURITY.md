# Security policy

NET CBT Simulator is a static, client-side web app: it has no server, accounts or remote data storage.
Attempts and settings live only in the user's browser (IndexedDB and localStorage).

## Reporting a vulnerability

If you find a security issue, please do not open a public issue. Instead, use GitHub's
[private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
for this repository. Examples include script injection through question content or imported history files.

Please include steps to reproduce. We aim to respond within a week.

## Design notes

- Question text is parsed into an AST and rendered as React elements; only KaTeX output and validated SVG
  figures (no scripts, event handlers or `foreignObject`) are injected as HTML.
- Imported history files are validated before use.
