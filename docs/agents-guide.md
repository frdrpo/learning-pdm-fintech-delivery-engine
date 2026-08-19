# Contributor & Agent Guide

This is the tracked, extended form of `AGENTS.md` — read that file first (it is loaded automatically for agents), and keep it in sync with this guide.

## What this is

A PDM (Product Delivery Management) reference repo — a Next.js frontend plus GitHub Actions workflows that exercise the PDM delivery gates. "PDM" here means Product Delivery Management, **not** the Python package manager.

The engine is the GitHub Actions setup under `.github/`. Application code (a Next.js 16 + TypeScript + Tailwind v4 frontend with Vitest tests in `frontend/`) exists only so the quality gate and release build have real work.

## Where the docs live

Project documentation (architecture, runbook, agent guide, ROADMAP, ADR log, plans) is canonical on the **[project wiki](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/wiki/Home)** (since the 2026-08-18 docs migration; ADR 0012). The repo also tracks a **committed mirror under `docs/`** that is kept in sync for offline and PR review — the wiki and `docs/` must never diverge in content (only link syntax differs: wiki `[[links]]` vs relative paths). Edit wiki pages in the wiki repo (or the `docs/` mirror via a PR) and keep the wiki, `docs/`, the README shortcuts, and these docs pointers consistent.

## Repository layout

- `.github/pdm/workflows/` — canonical workflow definitions (source of truth).
- `.github/workflows/` — GitHub-only execution copies, kept byte-identical via `make sync`.
- `.github/pdm/{reports,deployments,releases}/` — run-artifact staging dirs written by workflows; never committed.
- `scripts/` — Node helpers used by workflows (`risk-review.mjs`, `delivery-telemetry.mjs`).
- `frontend/` — the Next.js application the delivery gates exercise (pnpm-managed).
- the wiki — canonical docs home: architecture, native runbook, agent guide, ROADMAP, and the ADR decision log (ADR 0012).
- `docs/` — the committed mirror of the wiki, kept in sync for offline and PR review (ADR 0012).
- `Makefile` — `sync`, `lint`, `test-frontend`, `test-gh`, `test-consumer-path`, `topology-check`, `topology-apply` targets.

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
- **`GITHUB_TOKEN`-triggered events never chain workflow runs.** Commits/tags pushed by `GITHUB_TOKEN` don't re-trigger `push` (or `push: tags`) workflows — only `workflow_dispatch`/`repository_dispatch` can be triggered that way. `release-on-tag` is therefore self-contained: its dispatch path does the whole release (milestone gate → `develop` bump → `createRelease`) instead of pushing a tag and relying on a second run.
- **`gh` CLI in a workflow requires `GH_TOKEN` explicitly.** The runner's `gh` refuses to use `GITHUB_TOKEN` automatically ("set the GH_TOKEN environment variable"). Any step calling `gh` must pass `env: GH_TOKEN: ${{ github.token }}` — the repo's other workflows use `github-script` (token injected), so this only bites new direct-`gh` steps.
- **`main` merge blocks can be silent `repo-settings` misconfiguration.** With no `CODEOWNERS`, `require_code_owner_reviews` makes the only "owner" the PR author (unapprovable), and `lock_branch` makes `main` fully read-only — either permanently blocks every PR merge even with green gates. Diagnose with `gh api .../branches/main/protection`; fix by `PUT`ting the full `.../protection` body (`lock_branch: false`, `require_code_owner_reviews: false`, `required_status_checks.contexts: ["PDM Quality Gate (Status Check)"]`).
- **`make sync` must be run before committing**: GitHub only executes workflows from `.github/workflows/`, and `make lint` fails on drift between the two trees.
- **The frontend stack is pnpm, run in `frontend/`.** The quality gate sets up pnpm with `pnpm/action-setup@v6` (version pinned to the lockfile's `packageManager` field) *before* `actions/setup-node` (which needs `pnpm` present for its `cache: pnpm`). Local Node ≥25 ships no corepack, so `make test-frontend` uses `pnpm` directly — `brew install pnpm` if missing.
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
