# AGENTS.md

## What this is

A PDM (Product Delivery Management) reference repo — a Next.js frontend (`frontend/`) plus GitHub Actions workflows that exercise the PDM delivery gates. "PDM" here means Product Delivery Management, **not** the Python package manager.

## GitHub native workflow testing (the main task in this repo)

Workflows are verified by running them on GitHub — there is no local `act`/Docker harness. Requires the `gh` CLI (`gh auth login`) and push access.

Canonical workflows live in `.github/pdm/workflows/`; `.github/workflows/` holds GitHub-only execution copies that must be kept byte-identical (`make sync`). Edit only `.github/pdm/workflows/` and re-sync.

```sh
make lint          # actionlint on canonical + execution copies, then drift check
make test-frontend # native frontend suite: install + lint + typecheck + test + build
make test-gh       # push current branch + open/update a PR to main, then gh pr checks --watch
```

Open a PR to `main` and GitHub runs the three PR workflows natively; the release pipeline is exercised via `workflow_dispatch` (default `dry_run: true`). On PR runs the workflows post comments; on non-PR (`workflow_dispatch`) runs they upload report/deployment records as run artifacts instead.

## Gotchas (hard-earned)

- **`osv-scanner-action@v1` does not exist.** Use `google/osv-scanner-action/osv-scanner-action@v2.5.0` (the real action lives in the `osv-scanner-action/` subdir). The OSV step only runs when dependency manifests exist (`hashFiles`); with none it's skipped — that's expected.
- **osv-scanner v2 CLI changed the `-r` flag**: `-r=.` is now a parse error (`-r` is the boolean `--recursive`). Use `scan-args: --recursive .`.
- **github-script v7** already injects `context` and `github`; never redeclare `const { context } = …`. Comment-posting steps are guarded with `context.payload.pull_request?.number` so non-PR runs don't hit the API.
- **Cross-job files don't persist on GitHub** (each job gets a fresh workspace). Each workflow that writes reports/records must upload them as run artifacts from the same job that wrote them; artifacts use `if: !github.event.pull_request` (or `real_deploy == 'false'`) guards.
- **Workflows run on every PR synchronize** and each posts a comment — expect a comment per push on active PRs.
- **`GITHUB_TOKEN`-triggered events never chain workflow runs.** Commits/tags pushed by `GITHUB_TOKEN` don't re-trigger `push` (or `push: tags`) workflows — only `workflow_dispatch`/`repository_dispatch` can be triggered that way. `release-on-tag` is therefore self-contained: its dispatch path does the whole release (milestone gate → `develop` bump → `createRelease`) instead of pushing a tag and relying on a second run.
- **`main` merge blocks can be silent `repo-settings` misconfiguration.** With no `CODEOWNERS`, `require_code_owner_reviews` makes the only "owner" the PR author (unapprovable), and `lock_branch` makes `main` fully read-only — either permanently blocks every PR merge even with green gates. Diagnose with `gh api .../branches/main/protection`; fix by `PUT`ting the full `.../protection` body (`lock_branch: false`, `require_code_owner_reviews: false`, `required_status_checks.contexts: ["PDM Quality Gate (Status Check)"]`).
- **`make sync` must be run before committing**: GitHub only executes workflows from `.github/workflows/`, and `make lint` fails on drift between the two trees.
- **The frontend stack is pnpm, run in `frontend/`.** The quality gate sets up pnpm with `pnpm/action-setup@v4` (version pinned to the lockfile) *before* `actions/setup-node` (which needs `pnpm` present for its `cache: pnpm`). Local Node ≥25 ships no corepack, so `make test-frontend` uses `pnpm` directly — `brew install pnpm` if missing.
- On Apple Silicon, nothing here needs a container; `actionlint` runs natively via Homebrew.
