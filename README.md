# AI-Augmented Fintech Delivery Engine

A comprehensive reference implementation for modern Product Delivery Management (PDM). This project demonstrates how to rescue complex product launches by combining agile release trains, trunk-based development, shift-left compliance, and automated GitHub Action runners powered by AI agents to eliminate operational friction and ensure predictable, on-time delivery.

## Overview

This repository serves as a reference implementation for modern Product Delivery Management. It demonstrates how to combine trunk-based development, automated shift-left compliance, and AI-driven risk mitigation to eliminate operational friction and ensure predictable, on-time product releases.

## Current State

The delivery engine is **live and operating at cadence** — Phases 0–21 complete, no open gaps:

- **11 canonical workflows** under `.github/pdm/workflows/` (8 core PR/release gates + `publish-pages` + `release-train-simulator` + `copykit-smoke`), mirrored byte-identically to `.github/workflows/` and verified by `make lint`.
- **Releases**: `v0.1.0`, `v0.2.0`, `v0.3.0` shipped via the milestone-gated `release-on-tag` pipeline. Train 2 (departs 08-31, cutoff 08-28) is pending — `v0.3.0` published early, inside train 1's window, so the on-time signal honestly stays 1/1 until a release publishes inside train 2's window `[08-31, 09-14)` (ADR 0009).
- **Latest truthing readout** (P16-T4, 90d window, run 32115287697): deployment frequency dev 1.79/wk · staging/prod 1.56/wk · pages 2.88/wk; lead time median **6m** (11 PRs); change-failure rate **1.0%** (1/100 — the P10-T2 drill event only); MTTR proxy median **7h 15m** (1 event). The P21 close-out telemetry run (32205889156) confirmed the same numbers unchanged. Full readouts and history: see the [wiki ROADMAP](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/wiki/ROADMAP).
- **Release train**: 14-day cadence (ADR 0009); train 3 departs **09-14** (cutoff 09-11), train 4 departs 09-28 — see the [Release Train Calendar](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/wiki/Release-Train-Calendar).
- **Branch topology**: `develop` (default, integration) + `main` (protected; requires the `PDM Quality Gate (Status Check)`). Feature/track branches fork from `develop` and land via PRs to `develop`; workflow verification runs through `make test-gh` PRs to `develop`. `main` only receives version-release PRs (opened by the `release-on-tag` dispatch), which run the real deployment pipeline when merged.
- **Product surface**: the frontend now renders the live delivery telemetry at [`/delivery`](https://frdrpo.github.io/learning-pdm-fintech-delivery-engine/delivery/) — DORA metric cards, the release-train status panel (ADR 0009 window logic), and the audit trail — from a committed, versioned snapshot of the `delivery-telemetry` export (honest `insufficient-data` empty states, never invented numbers).
- **Examples & templates** (Issue #184): the [`examples/`](examples/) tree ships three reference implementations for adopting the PDM framework and AI agent patterns — a scrubbed agent fleet (`fintech-agent-runner/`), actionlint-valid workflow templates (`pdm-workflow-templates/`), and a mocked `node:test` CI scaffold (`agent-skills-demo/`). Validated offline by `make test-examples` (also run in the quality gate's `workflow-lint` job); see the [wiki Examples-and-Templates](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/wiki/Examples-and-Templates) page.

## Repository Structure

All PDM workflow and deployment material is consolidated under a single folder, `.github/pdm/`:

> **Note:** "PDM" here means Product Delivery Management, not the Python package manager.

- `.github/pdm/workflows/` - Canonical workflow definitions (source of truth).
  - `ai-agent-mvp.yml` - Issue #173 dry-run AI agent MVP: analyzes TS changes in a PR and posts *suggested* test scaffolds + a changelog snippet as a comment (mocked agent model; never commits).
  - `risk-health-check.yml` - Automates PR size tracking, code complexity analysis, and PDM risk reporting.
  - `compliance-guardrail.yml` - Enforces shift-left security scans and secret detection before code merges.
  - `quality-gate.yml` - Required status check: actionlint on workflows + toolchain-driven lint/test/build, aggregated into a single branch-protection gate.
  - `release-pipeline.yml` - Promotes builds through development/staging/production environments and records dry-run deployments.
  - `delivery-telemetry.yml` - Exports the GitHub-native delivery audit trail and DORA-style telemetry as run artifacts (weekly + on demand), plus workflow-run metrics and an estimated runner cost (`scripts/workflow-run-telemetry.mjs`).
  - `security-rescan.yml` - Weekly + on-demand gitleaks/OSV re-scan; uploads a report artifact and files an issue on blocking schedule findings.
  - `release-on-tag.yml` - Milestone-gated releases: `workflow_dispatch` with a `version` cuts the release — requires a closed `v<version>` milestone, bumps `frontend/package.json` on `develop`, and opens the release PR `develop → main`. Merging it runs the real `release-pipeline`; a `v*` tag push on `main` publishes the GitHub Release (still milestone-gated).
  - `publish-pages.yml` - Publishes the static-exported frontend to GitHub Pages on every push to `develop` (the live `DEPLOY_VERIFY_URL` target).
  - `release-train-simulator.yml` - Runs the deterministic release-train model headlessly (`workflow_dispatch` only); labeled artifacts, never native records (ADR 0010).
  - `copykit-smoke.yml` - P17 copy-kit rehearsal: replays the engine copy-kit (§1→§8) in a throwaway consumer workspace on a fresh runner (`workflow_dispatch` only; local equivalent `make test-consumer-path`).
- `.github/pdm/deployments/` - Dry-run deployment records uploaded as run artifacts by the release pipeline (not committed).
- `.github/pdm/reports/` - Risk and quality-gate reports uploaded as run artifacts (not committed).
- `.github/workflows/` - Mirrored execution copies of `.github/pdm/workflows/`. GitHub only executes workflows from this directory, so keep the copies in sync with `make sync`.
- `.github/actions/` - Reusable composite actions (`setup-pdm-toolchain`, `pdm-code-quality`) — single-purpose building blocks for quality gates and code-health jobs, referenced by path (`uses: ./.github/actions/<name>`) so no mirroring is needed. Validated structurally by `make test-examples` (E6; actionlint 1.7.x does not lint `action.yml` metadata).
- `agents/` - The canonical AI agent fleet (ADR 0015): five scrubbed, model-pin-free agent definitions (`pm`, `docs`, `software-engineer`, `junior-software-engineer`, `docs-reader`) installed into a local opencode runtime with `make fleet-sync`. Runtime config (providers/models, keys) stays local — `.opencode/` and `opencode.json` are gitignored; `agents/opencode.example.json` is the scrubbed template (`{env:...}` overridable).
- `examples/` - Reference implementations and workflow templates for adopting the PDM framework and AI agent patterns (Issue #184): `fintech-agent-runner/` (scrubbed agent fleet + `fleet-sync`), `pdm-workflow-templates/` (actionlint-valid quality-gate/compliance/agent-runner templates), and `agent-skills-demo/` (skill-resolution demo + mocked `node:test` CI scaffold). Validated offline by `make test-examples`, wired into the quality gate.
- `frontend/` - Next.js 16 website (App Router, TypeScript, Tailwind v4) — a dark fintech landing page with Vitest unit + component tests, plus a `/delivery` route rendering the live delivery-health snapshot (DORA metrics, release-train status, audit trail). This is the application the delivery gates exercise.

## System Flow

A high-level view of how the engine flows from local edits through the PR gates, the release pipeline, and telemetry. For the detailed workflow map (triggers, jobs, permissions, artifacts), see the [Architecture](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/wiki/Architecture) wiki page.

```mermaid
flowchart LR
    subgraph Local["Local workspace"]
        A["Edit .github/pdm/workflows/*.yml (canonical)"] --> B["make sync"]
        B --> C["make lint (actionlint + drift check)"]
        C --> D["Push branch"]
    end

    D --> P["Open PR to develop"]

    subgraph Gates["PR gates (every PR to develop + main)"]
        RH["risk-health-check — gitleaks + OSV + code health + AI risk review"]
        CG["compliance-guardrail — trufflehog base..head"]
        QG["quality-gate (REQUIRED) — actionlint + lint/typecheck/test/build"]
    end

    P --> RH
    P --> CG
    P --> QG

    RH --> RH1["PR comment / risk-report artifact"]
    CG --> CG1["PR comment (pass/fail)"]
    QG --> QG1["PR comment / gate-report artifact"]

    RH --> DEV["Merge to develop"]
    CG --> DEV
    QG --> DEV

    subgraph Release["Version release (on demand)"]
        CUT["release-on-tag dispatch (version, milestone-gated)"] --> RPR["PR develop → main"]
        RPR --> QG
        RPR --> M["Merge to main"]
        M --> RT["Tag v<version> on main → GitHub Release"]
    end

    DEV -.->|on demand| CUT
    M --> RP["release-pipeline — build → development → staging → production"]
    RP -->|dry_run: true| RP1["Deploy-record artifacts (dry-run)"]
    RP -->|dry_run: false / push| RP2["GitHub Deployment API (real deployments)"]

    DEV -.->|push to develop| PP["publish-pages → GitHub Pages (live verify target)"]

    subgraph Scheduled["Scheduled + on demand"]
        SR["security-rescan — weekly Mon 02:00 UTC"]
        DT["delivery-telemetry — weekly Mon 02:30 UTC"]
        TS["release-train-simulator — workflow_dispatch only"]
        CK["copykit-smoke — workflow_dispatch only (consumer-path rehearsal)"]
    end

    SR --> SR1["security-rescan-report artifact"]
    DT --> DT1["delivery-audit + delivery-telemetry artifacts"]
    TS --> TS1["release-train-simulation artifact (no native records)"]
    CK --> CK1["consumer-path rehearsal result artifact"]
```

Notes on the flow:

- `quality-gate` is the single required branch-protection check on `main` — a release PR merges only when all three PR workflows pass. The same three PR workflows run on every PR to `develop`.
- On PR runs, workflows post comments to the PR; on non-PR (`workflow_dispatch`) runs they upload reports and dry-run deployment records as run artifacts instead.
- The canonical source of truth is `.github/pdm/workflows/`; `.github/workflows/` holds byte-identical execution copies kept in sync via `make sync`.
- A `push` to `main` always runs the release pipeline for real (`dry_run: false`); `workflow_dispatch` defaults to `dry_run: true`. Staging and production require manual approval.
- Version releases are PRs to `main`, cut by `release-on-tag` `workflow_dispatch` (version input): gated on a closed milestone `v<version>`, it bumps `frontend/package.json` on `develop` and opens the release PR `develop → main`. Merging the PR pushes `main` (running `release-pipeline` for real); tagging `main` with `v<version>` publishes the GitHub Release (tag pushes still pass the same milestone gate).

## Prerequisites

- [actionlint](https://github.com/rhysd/actionlint) installed (`brew install actionlint`) for `make lint`.
- The [GitHub CLI](https://cli.github.com/) (`gh auth login`) for the native PR verification loop.
- [pnpm](https://pnpm.io/) (`brew install pnpm`) for `make test-frontend` (or corepack on Node <25).
- Push access to the repository (workflows run on GitHub, not locally).

## Makefile Targets

The `Makefile` is the local operator surface for the engine. All targets run natively (no Docker required):

| Target | What it does |
|---|---|
| `make sync` | Mirror `.github/pdm/workflows/*.yml` (canonical) → `.github/workflows/` (GitHub executes only there) |
| `make lint` | actionlint on canonical + execution copies, then a drift check that fails if the two trees differ |
| `make sync-deps` | Adopt dependabot version bumps from `.github/workflows/` back into canonical (then `make sync`) |
| `make fleet-sync` | Install the canonical agent fleet (`agents/`) into the local runtime (`.opencode/agent/`, ADR 0015) |
| `make test-frontend` | CI-parity frontend suite: install + lint + typecheck + test + build (pnpm) |
| `make test-gh` | Push current branch + open/update a PR to `develop`, then `gh pr checks --watch` the native gate runs |
| `make test-consumer-path` | P17 copy-kit rehearsal: execute kit §1→§8 in a throwaway consumer workspace (`scripts/consumer-smoke.mjs`) |
| `make test-examples` | Issue #184 examples validation: READMEs + structure, agent scrub-rules, workflow-template actionlint + artifact guards, mocked contract test (`scripts/examples-test.mjs`) |
| `make topology-check` | Verify the documented repo topology against the live repo (`scripts/wire-topology.mjs --check`) |
| `make topology-apply` | Converge the topology (branch protection, environments, Pages, `DEPLOY_VERIFY_URL`) |

## Testing (GitHub native)

Workflows are verified by running them on GitHub — no local Docker/`act` harness:

1. Edit only `.github/pdm/workflows/`, then mirror and validate:
   ```bash
   make sync   # copy canonical workflows to .github/workflows/
   make lint   # actionlint + drift check against the copies
   ```
2. Open a PR to `develop` (or `make test-gh` to push + open/update the PR for the current branch). GitHub runs the PDM workflows natively:
   - `quality-gate` (actionlint + lint/typecheck/test/build) — the required check on `main` (release PRs); runs as a gate check on `develop` PRs
   - `risk-health-check` (gitleaks + OSV + code health) — posts a PR comment
   - `compliance-guardrail` (trufflehog) — posts a PR comment
3. For non-PR runs (`workflow_dispatch`), reports and dry-run deployment records are uploaded as run artifacts instead of PR comments — download them from the run's "Artifacts" section.

`push` to `main` (a merge of a release PR cut by `release-on-tag` dispatch, or any other merge) triggers `release-pipeline` (real `createDeployment`); `workflow_dispatch` defaults to `dry_run: true` so manual runs skip the Deployment API.

## Examples & Templates (Issue #184)

The `examples/` tree ships reference implementations and workflow templates for adopting the PDM framework and AI agent patterns:

- `examples/fintech-agent-runner/` — a minimal opencode agent fleet (`pm`, `delivery-engineer`, `compliance-reviewer`) with scrub-safe definitions, `fleet-sync`, and a local `node --test` hygiene test (ADR 0015 pattern).
- `examples/pdm-workflow-templates/` — ready-to-copy actionlint-valid workflows: `quality-gate.yml`, `compliance-guardrail.yml`, `security-scan.yml`, `delivery-telemetry.yml`, `agent-runner.yml` (dispatch-only).
- `examples/agent-skills-demo/` — skill-resolution demo + a dependency-free mocked `node:test` CI scaffold.

Validate them offline, or let the quality gate do it on every PR:

```bash
make test-examples   # README/structure + fleet scrub rules + template actionlint/guards + mock contract test
```

To adopt: copy a subproject into your repo, follow its `README.md` (cp commands + renames), then run `make test-examples` and (for templates) `make sync`/`make lint`. See the [wiki Examples and Templates page](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/wiki/Examples-and-Templates) and the [Workflow-Templates-Rollout](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/wiki/Workflow-Templates-Rollout) page (Issue #185) for the reusable composite actions and the phased migration plan.

## Frontend Testing

The frontend in `frontend/` is developed test-first (Vitest) and verified with a native, container-free target that mirrors the PDM quality gate:

```bash
cd frontend && pnpm test:watch   # fast local TDD loop (Vitest watch)
make test-frontend               # CI-parity: install + lint + typecheck + test + build
```

The `quality-gate` and `risk-health-check` workflows run the same suite (`pnpm install --frozen-lockfile` + lint/typecheck/test/build) against `frontend/` on every pull request.

See the [wiki ROADMAP](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/wiki/ROADMAP) for the full delivery-engine roadmap and phase breakdown.

## Documentation

The **project wiki** is the canonical, always-current docs home (since the 2026-08-18 docs migration; ADR 0012; wiki-only since ADR 0013):

- [Wiki Home](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/wiki/Home) — start here; also [Overview](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/wiki/Overview) and [Glossary](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/wiki/Glossary).
- [ROADMAP](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/wiki/ROADMAP) — full delivery-engine roadmap and phase breakdown (current: Phases 0–21 complete).
- [Architecture](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/wiki/Architecture) — workflow map, PR-gate pipeline diagram, promotion chain, canonical/mirror layout.
- [Local-Runbook](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/wiki/Local-Runbook) — Native Runbook: testing the delivery engine on GitHub (`make sync`/`lint`/`test-gh`, `workflow_dispatch`, troubleshooting).
- [Agent-Guide](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/wiki/Agent-Guide) — contributor and agent guide (extended `AGENTS.md` with the hard-earned gotchas).
- [Workflow-Templates-Rollout](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/wiki/Workflow-Templates-Rollout) — reusable workflows & composite actions (Issue #185 rollout).
- [Telemetry-and-Cost](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/wiki/Telemetry-and-Cost) — delivery + workflow-run metrics and cost-estimate assumptions.
- [Decision-Log](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/wiki/Decision-Log) — ADR decision log for the delivery engine (ADR 0001–0013).
