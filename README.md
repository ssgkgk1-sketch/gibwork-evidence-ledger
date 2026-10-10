# Gibwork Evidence Ledger

A terminal tool that maps Gibwork bounty requirements to local deliverable evidence, records file hashes, detects task-scope drift, and produces a review packet. It does not award itself compliance: file quality, originality, attendance, and organizer approval remain human checks.

## Why this use case

Contributors can finish code but miss a demo, setup instructions, or changed requirements. Evidence Ledger takes an official CLI task snapshot and a human-authored requirements manifest, then produces a reproducible inventory and explicit blockers before submission. It is neither a task-search interface nor a submission/payment bot.

## Setup

Node 24+, Windows/macOS/Linux. Install the pinned official integration:

```sh
npm ci --ignore-scripts
npm test
npm run demo
```

The demo writes a NEW demo-output directory with report.json and report.md. It uses a clearly labeled synthetic task, not a live authenticated lookup. Existing output directories are never overwritten: on subsequent runs choose another directory, e.g. `node cli.mjs check examples/manifest.json --out demo-output-2`.

## Official Gibwork CLI integration

The runtime dependency is @gibwork/cli 0.2.4 (bundles SDK 0.2.0). Live capture invokes its real `--json --environment production task get` command without a shell. It is core to fetching the full bounty terms; no scraped page or replacement API is used by the capture command.

```sh
node cli.mjs capture TASK_UUID baseline.json EXISTING_PROFILE
```

The official CLI requires wallet authentication even for free read requests. Configure an existing profile separately according to the official CLI documentation. This repository provides no wallet generation, key-import or payment instructions. Do not use a valuable wallet for development. We have NOT run an authenticated capture for this project yet. The adapter test substitutes only the subprocess response and does not prove a live server call.

If you already exported official CLI output, import it explicitly:

```sh
node cli.mjs import task-export.json baseline.json
```

Imported files are labeled imported-cli-output, not live/authenticated. The checksum is integrity evidence, not a server signature. Snapshots keep title, raw content, open state, deadline, reward metadata and selected participation settings; unknown/new upstream fields are not tracked. Review the full official task before submitting.

## Requirements and evidence

Copy examples/manifest.json and point snapshot to baseline.json. projectRoot is relative to the manifest directory. Add each required deliverable under requirements with kind files and explicit relative paths. Use kind human for session attendance, quality, originality and organizer decisions. Requirements are mapped by a person; this tool cannot infer a complete checklist automatically.

```sh
node cli.mjs check my-manifest.json --out reports-001
node cli.mjs capture TASK_UUID current.json EXISTING_PROFILE
node cli.mjs diff baseline.json current.json
```

Set currentSnapshot in the manifest to current.json to block on changed terms. Without it, the tool uses only the baseline and does not claim freshness. It checks selected files, not the entire repository, and never executes submitted code. Files over 10 MiB, paths outside the project, common credential filenames and some obvious secret patterns are rejected. This is not a comprehensive secret scanner; inspect reports before publishing them. Symlink escapes are rejected after realpath resolution; do not run against a directory another process is modifying concurrently.

## Output and exit codes

- FILES_PRESENT: selected bytes exist and were hashed, not a quality judgment.
- HUMAN_CHECK_REQUIRED: attendance or other facts still require a person.
- BLOCKED: missing/rejected files, closed/expired bounty or changed scope.
- HUMAN_REVIEW_REQUIRED: mechanical checks passed, not ready-to-pay certification.
- Exit 0: report generated without mechanical blockers; 2: blocked report; 1: invalid input/tool error.

## Hackathon status

Prototype and automated tests completed. Session participation is pending; the user reports receiving the Hackathon role. Live authenticated integration, demo recording and final organizer-channel requirements are still pending. No bounty submission or payout has occurred. No private keys accessed, no signing or payments performed during this build.

## Originality review

Existing Gibwork DevOps Kit and Bounty Autopilot projects cover discovery/scaffolding/submission. This proposal focuses on requirement-to-file evidence, scope drift and review packets. The public search was limited; organizer acceptance of originality is not guaranteed.

AI-assisted development: OpenAI / Codex desktop. Exact runtime model version not independently verified. Official dependencies retain their own license (the published CLI identifies UNLICENSED); their code is not vendored or relicensed here.
