# AGENTS.md

## What this is

A PDM (Product Delivery Management) reference repo — a Next.js frontend (`frontend/`) plus GitHub Actions workflows that exercise the PDM delivery gates. "PDM" here means Product Delivery Management, **not** the Python package manager.

## GitHub native workflow testing (the main task in this repo)

Workflows are verified by running them on GitHub — there is no local `act`/Docker harness. Requires the `gh` CLI (`gh auth login`) and push access.

Canonical workflows live in `.github/pdm/workflows/`; `.github/workflows/` holds GitHub-only execution copies that must be kept byte-identical (`make sync`). Edit only `.github/pdm/workflows/` and re-sync.

```sh
make lint          # actionlint on canonical + execution copies, then drift check
make test-frontend # native frontend suite: install + lint + typecheck + test + build
make test-gh       # push current branch + open/update a PR to develop, then gh pr checks --watch
```

Open a PR to `develop` and GitHub runs the three PR workflows natively (they also gate release PRs to `main`); the release pipeline is exercised via `workflow_dispatch` (default `dry_run: true`). On PR runs the workflows post comments; on non-PR (`workflow_dispatch`) runs they upload report/deployment records as run artifacts instead. `main` only receives version-release PRs (cut by the `release-on-tag` dispatch).

## Gotchas (hard-earned)

- **`osv-scanner-action@v1` does not exist.** Use `google/osv-scanner-action/osv-scanner-action@v2.5.0` (the real action lives in the `osv-scanner-action/` subdir). The OSV step only runs when dependency manifests exist (`hashFiles`); with none it's skipped — that's expected.
- **osv-scanner v2 CLI changed the `-r` flag**: `-r=.` is now a parse error (`-r` is the boolean `--recursive`). Use `scan-args: --recursive .`.
- **github-script v7** already injects `context` and `github`; never redeclare `const { context } = …`. Comment-posting steps are guarded with `context.payload.pull_request?.number` so non-PR runs don't hit the API.
- **Cross-job files don't persist on GitHub** (each job gets a fresh workspace). Each workflow that writes reports/records must upload them as run artifacts from the same job that wrote them; artifacts use `if: !github.event.pull_request` (or `real_deploy == 'false'`) guards.
- **Workflows run on every PR synchronize** and each posts a comment — expect a comment per push on active PRs.
- **`GITHUB_TOKEN`-triggered events never chain workflow runs.** Commits/tags pushed by `GITHUB_TOKEN` don't re-trigger `push` (or `push: tags`) workflows — only `workflow_dispatch`/`repository_dispatch` can be triggered that way. `release-on-tag` is therefore two explicit steps instead of chaining: its dispatch path cuts the release (milestone gate → `develop` bump → open the release PR `develop → main`), and publishing (tag `main` with `v<version>` → `createRelease`) only happens after a human merges that PR and pushes the tag.
- **`gh` CLI in a workflow requires `GH_TOKEN` explicitly.** The runner's `gh` refuses to use `GITHUB_TOKEN` automatically ("set the GH_TOKEN environment variable"). Any step calling `gh` must pass `env: GH_TOKEN: ${{ github.token }}` — the repo's other workflows use `github-script` (token injected), so this only bites new direct-`gh` steps.
- **`main` merge blocks can be silent `repo-settings` misconfiguration.** With no `CODEOWNERS`, `require_code_owner_reviews` makes the only "owner" the PR author (unapprovable), and `lock_branch` makes `main` fully read-only — either permanently blocks every PR merge even with green gates. Diagnose with `gh api .../branches/main/protection`; fix by `PUT`ting the full `.../protection` body (`lock_branch: false`, `require_code_owner_reviews: false`, `required_status_checks.contexts: ["PDM Quality Gate (Status Check)"]`).
- **`make sync` must be run before committing**: GitHub only executes workflows from `.github/workflows/`, and `make lint` fails on drift between the two trees.
- **The frontend stack is pnpm, run in `frontend/`.** The quality gate sets up pnpm with `pnpm/action-setup@v6` (version pinned to the lockfile's `packageManager` field) *before* `actions/setup-node` (which needs `pnpm` present for its `cache: pnpm`). Local Node ≥25 ships no corepack, so `make test-frontend` uses `pnpm` directly — `brew install pnpm` if missing.
- On Apple Silicon, nothing here needs a container; `actionlint` runs natively via Homebrew.

## The AI agent fleet (canonical, ADR 0015)

This repo ships as "powered by an AI agent fleet." The fleet is **canonical repo content** in `agents/` (five scrubbed, model-pin-free definitions: `pm`, `docs`, `software-engineer`, `junior-software-engineer`, `docs-reader`), installed into a local opencode runtime with `make fleet-sync`. Runtime config (providers/models, keys, local-only permissions) stays local: `.opencode/` and `opencode.json` are gitignored, and `agents/opencode.example.json` is the scrubbed template (`{env:...}` overridable models). See `agents/README.md` and [[Agent-Guide]] on the wiki.

### Fleet operating loop (every agent task)

1. **Wiki-first read** — fetch the freshest state from the wiki (ROADMAP, Agent-Guide, Architecture, Decision-Log, Release-Train-Calendar, plan pages) before acting; never rely on a local cache.
2. **Live-repo verification** — confirm upstream state against the live repo (gh API, `git log`, working tree); mark anything not re-verified `needs-verification`.
3. **Evidence artifacts** — record each step's output as a labeled artifact (`kind: "agent-advisory"` for Phase 27 advisories; never a native delivery record — ADR 0010 / ADR 0016).
4. **Telemetry-honesty** — `insufficient-data` when evidence is missing, never invented; no failure-classifier words (`rollback`/`incident`/`outage`/`hotfix`/`regression`) in issue/PR titles.

### Task-card format (agent-executed delivery work)

Every agent-executed task card carries exactly: **Goal** (what delivery outcome), **Evidence** (which labeled artifacts/SHAs prove it), **Acceptance criteria** (gates: `quality-gate`, `risk-health-check`, `compliance-guardrail`, `delivery-telemetry`, `copykit-smoke`). Record the card + evidence where the plan says; the rehearsal itself never creates native delivery records (ADR 0010, ADR 0016).

### Roles, permissions and limits

- `pm` (subagent) — ROADMAP-style plans + GitHub materialization; advisory only, never commits directly.
- `docs` (primary) — wiki sync; drafts only until the user confirms a push.
- `software-engineer` (primary) — TDD/OOP/SOLID/Clean Code implementation after delegating research to `junior-software-engineer`.
- `junior-software-engineer` (subagent) — read-only review/proposals: `edit`/`bash` denied.
- `docs-reader` (subagent) — read-only bulk-file research: `edit`/`bash` denied.

Agent outputs never gate a merge; the deterministic quality gates and the P24 delivery-advisor remain the decision layer (ADR 0016).
