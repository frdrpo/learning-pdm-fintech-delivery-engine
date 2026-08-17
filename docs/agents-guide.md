# Contributor & Agent Guide

This is the tracked, extended form of `AGENTS.md` — read that file first (it is loaded automatically for agents), and keep it in sync with this guide.

## What this is

A PDM (Product Delivery Management) reference repo — a Next.js frontend plus GitHub Actions workflows that exercise the PDM delivery gates. "PDM" here means Product Delivery Management, **not** the Python package manager.

The engine is the GitHub Actions setup under `.github/`. Application code (a Next.js 16 + TypeScript + Tailwind v4 frontend with Vitest tests in `frontend/`) exists only so the quality gate and release build have real work.

## Repository layout

- `.github/pdm/workflows/` — canonical workflow definitions (source of truth).
- `.github/workflows/` — GitHub-only execution copies, kept byte-identical via `make sync`.
- `.github/pdm/{reports,deployments,releases}/` — run-artifact staging dirs written by workflows; never committed.
- `scripts/` — Node helpers used by workflows (`risk-review.mjs`, `delivery-telemetry.mjs`).
- `frontend/` — the Next.js application the delivery gates exercise (pnpm-managed).
- `docs/` — architecture, native runbook, agent guide, ROADMAP, and the ADR decision log.
- `Makefile` — `sync`, `lint`, `test-frontend`, `test-gh` targets.

## GitHub native workflow testing (the main task in this repo)

Workflows are verified by running them on GitHub — there is no local `act`/Docker harness. Requires the `gh` CLI (`gh auth login`) and push access.

```sh
make lint          # actionlint on canonical + execution copies, then drift check
make sync          # mirror .github/pdm/workflows/*.yml → .github/workflows/
make test-frontend # native frontend suite: install + lint + typecheck + test + build
make test-gh       # push current branch + open/update a PR to main, then gh pr checks --watch
```

Edit only `.github/pdm/workflows/` and re-sync. Open a PR to `main` and GitHub runs the three PR workflows natively; the release pipeline is exercised via `workflow_dispatch` (default `dry_run: true`). On PR runs the workflows post comments; on non-PR (`workflow_dispatch`) runs they upload report/deployment records as run artifacts instead.

## Hard-earned gotchas

- **`osv-scanner-action@v1` does not exist.** Use `google/osv-scanner-action/osv-scanner-action@v2.5.0` (the real action lives in the `osv-scanner-action/` subdir). The OSV step only runs when dependency manifests exist (`hashFiles`); with none it's skipped — that's expected.
- **osv-scanner v2 CLI changed the `-r` flag**: `-r=.` is now a parse error (`-r` is the boolean `--recursive`). Use `scan-args: --recursive .`.
- **github-script v7** already injects `context` and `github`; never redeclare `const { context } = …`. Comment-posting steps are guarded with `context.payload.pull_request?.number` so non-PR runs don't hit the API.
- **Cross-job files don't persist on GitHub** (each job gets a fresh workspace). Each workflow that writes reports/records must upload them as run artifacts from the same job that wrote them; artifacts use `if: !github.event.pull_request` (or `real_deploy == 'false'`) guards.
- **Workflows run on every PR synchronize** and each posts a comment — expect a comment per push on active PRs.
- **`make sync` must be run before committing**: GitHub only executes workflows from `.github/workflows/`, and `make lint` fails on drift between the two trees.
- **The frontend stack is pnpm, run in `frontend/`.** The quality gate sets up pnpm with `pnpm/action-setup@v4` (version pinned to the lockfile) *before* `actions/setup-node` (which needs `pnpm` present for its `cache: pnpm`). Local Node ≥25 ships no corepack, so `make test-frontend` uses `pnpm` directly — `brew install pnpm` if missing.
- **On Apple Silicon, nothing here needs a container**; `actionlint` runs natively via Homebrew.
- **Trufflehog needs a base commit**: on non-PR runs use the empty-tree SHA `4b825dc642cb6eb9a060e54bf8d69288fbee4904` so the scan still covers the tree deterministically.
- **Deployments default to dry-run**: `workflow_dispatch` on `release-pipeline` defaults `dry_run: true`; only a push to `main` or an explicit `dry_run: false` calls the Deployment API. `rollback_to` always records a dry-run rollback event.
- **Delivery telemetry reads GitHub-native records only** (ADR 0008): `scripts/delivery-telemetry.mjs` queries the Deployments/Releases/Pulls/Issues APIs with the built-in `GITHUB_TOKEN` and exports audit + metrics as run artifacts. Dry-run records are artifacts, not API events, so they never populate the metrics — expect `insufficient-data` until real deployments and rollback/incident issues exist.

## Definition of done for workflow changes

- Canonical workflow edited, then `make sync` and `make lint` green.
- Non-PR (`workflow_dispatch`, push, schedule) paths guarded: comments only on PRs, artifacts uploaded for non-PR runs.
- Verified natively on GitHub: `make test-gh` (PR loop) and/or a `workflow_dispatch` run.
- Docs (`docs/architecture.md`, this guide, the ADR log) updated to match.

See `docs/local-runbook.md` for the hands-on runbook and `docs/decisions/` for the design decisions.
