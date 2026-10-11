# Gibwork Developer Hackathon — submission draft

## Project

Gibwork Evidence Ledger — a non-web terminal workflow that maps bounty requirements to local deliverables, hashes evidence, detects changed task terms and leaves human-only eligibility checks explicit.

## Links

- Source and setup: https://github.com/ssgkgk1-sketch/gibwork-evidence-ledger
- Short rendered CLI demo (synthetic fixture, actual local command execution): https://github.com/ssgkgk1-sketch/gibwork-evidence-ledger/blob/main/media/demo.mp4
- Screenshot: https://github.com/ssgkgk1-sketch/gibwork-evidence-ledger/blob/main/media/screenshot.png
- Exported example report: https://github.com/ssgkgk1-sketch/gibwork-evidence-ledger/blob/main/examples/report.md

## Working flow

1. Install pinned `@gibwork/cli` and run `npm test` (15 tests).
2. Import official Gibwork CLI output or use the official CLI adapter with a separately configured wallet profile. A separate read-only SDK lookup succeeded on 2026-10-11 using an OKX message signature; its local snapshot is not proof that the CLI adapter ran live.
3. Create a human-authored manifest of required files and human gates.
4. Run `node cli.mjs check examples/manifest.json --out NEW_REPORT_DIR` to produce JSON and Markdown reports.
5. Compare two snapshots with `node cli.mjs diff BASELINE CURRENT`; changed task terms block the gate.

## Honest limitations — verify before final submission

- The published demo is a rendered walkthrough of actual offline CLI commands on a synthetic fixture. It is **not** a live Gibwork API demo.
- The official CLI adapter has passed a mocked subprocess test but has **not** completed a live authenticated task lookup. The official SDK did successfully return this bounty on 2026-10-11 using a user-controlled browser-wallet message signature. Do not use a valuable wallet or share a seed/private key with an agent.
- Attendance at **two real Discord hackathon sessions** has not been verified. The Discord role alone is insufficient.
- The official listing currently states `creditCostPerSubmission: 1`. Inspect the exact wallet prompt and any costs before submitting. Never assert reward or acceptance in advance.

## Final submission text (use only after the checks above)

Built Gibwork Evidence Ledger, a terminal-first submission-readiness workflow that supports official Gibwork CLI snapshots and a separate SDK-authenticated read-only lookup. It maps requirements to file hashes, detects changed bounty terms, and explicitly separates mechanical checks from human-only requirements. Source, setup, test results, short demo and screenshot are linked above. I attended the required two Discord sessions [replace with real dates only after attending]. The SDK task lookup was verified on 2026-10-11 for task 1052f22d-3f87-4b1d-b0d7-71a60679e7fa; the CLI adapter has not been live-verified.
