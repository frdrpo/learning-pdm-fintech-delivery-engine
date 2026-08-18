# Delivery Engine — Architecture

The delivery engine is the GitHub Actions setup under `.github/`. It implements the PDM (Product Delivery Management) delivery gates: shift-left security and compliance scanning, an aggregated quality gate, and a promotion pipeline across environments — all exercised natively on GitHub. "PDM" here means Product Delivery Management, **not** the Python package manager.

The repo also carries a Next.js 16 frontend (`frontend/`, TypeScript + Tailwind v4 + Vitest, pnpm-managed) so the quality gate and the release build have real work to do. Application code exists only to give the gates real work.

## Layout: canonical vs mirrored

- `.github/pdm/workflows/` — canonical workflow definitions, the source of truth.
- `.github/workflows/` — byte-identical execution copies. GitHub only executes workflows from this directory.
- `frontend/` — the Next.js application the gates exercise (pnpm stack).
- `make sync` copies canonical workflows into `.github/workflows/`.
- `make lint` runs actionlint on both trees **and** fails if the execution copies have drifted.

Edit only `.github/pdm/workflows/`, run `make sync`, then `make lint`, and commit both sides together.

Run artifacts (reports, deployment records, release notes) are written under `.github/pdm/{reports,deployments,releases}/` by workflows but are never committed — they are uploaded as run artifacts instead.

## Workflow map

| Workflow | Triggers | Jobs | Permissions | Outputs / artifacts |
|---|---|---|---|---|
| `risk-health-check.yml` | PR to `main` (opened / synchronize / reopened / ready_for_review); `workflow_dispatch` | `security` (gitleaks + OSV), `code-health` (frontend lint/typecheck/test), `risk-review` (AI-assisted diff risk review), `risk-report` (aggregate) | `contents: read`, `pull-requests: write` | PR comment on PR runs; `risk-report` artifact (`risk-report.md`) on non-PR runs |
| `compliance-guardrail.yml` | PR to `main`; `workflow_dispatch` | `compliance-scan` (trufflehog base-to-head) | `contents: read`, `pull-requests: write` (job-level) | pass/fail PR comment on PR runs; no artifact on non-PR runs |
| `quality-gate.yml` | PR to `main`; `workflow_dispatch` | `workflow-lint` (actionlint), `code-quality` (frontend lint/typecheck/test/build), `gate` (single aggregated conclusion) | `contents: read`, `pull-requests: write` | required status check on `main`; PR comment or `gate-report` artifact (non-PR) |
| `release-pipeline.yml` | push to `main`; `workflow_dispatch` with `environment` (default `all`), `dry_run` (default `true`), `rollback_to` | `build` (frontend `next build`), `deploy-development`, `deploy-staging`, `deploy-production`, `rollback` | `contents: read`, `deployments: write` | `build-info` artifact; dry-run `deploy-record-<env>.md` / `rollback.md` artifacts; real `createDeployment` calls when not dry-run |
| `security-rescan.yml` | weekly schedule (Mon 02:00 UTC); `workflow_dispatch` | `gitleaks`, `osv`, `report` | `contents: read`, `issues: write` | `security-rescan-report` artifact; issue filed on blocking gitleaks findings on schedule runs |
| `release-on-tag.yml` | push tags `v*`; `workflow_dispatch` with `version` (semver) | `cut-and-tag` (milestone gate, `develop` bump), `release` (build, release notes, GitHub Release) | `contents: write`, `issues: write` | GitHub Release + `release-notes` artifact; `release-cut-summary` artifact on dispatch |
| `delivery-telemetry.yml` | weekly schedule (Mon 02:30 UTC); `workflow_dispatch` | `telemetry` (read GitHub API records → audit trail + DORA-style metrics) | `contents: read` | `delivery-telemetry` artifact (`delivery-audit-<ts>.json`, `delivery-telemetry-<ts>.json`/`.md`) |
| `release-train-simulator.yml` | `workflow_dispatch` | `simulate` (run the deterministic release-train model headlessly) | `contents: read` | `release-train-simulation` artifact (`.json`/`.md`); creates no native delivery records (ADR 0010) |

Adjacent configuration: `.github/dependabot.yml` keeps GitHub Actions and npm dependencies fresh (weekly, targeting `develop`).

## PR-gate pipeline

Three workflows gate every PR to `main`; `quality-gate` is the single required status check, so nothing merges unless all three pass:

```
                        PR to main
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
risk-health-check    compliance-guardrail   quality-gate (required)
gitleaks + OSV +     trufflehog base..head  actionlint + lint/typecheck/test/build
code-health + AI     posts pass/fail        single aggregated conclusion
diff risk review;    PR comment             = required status check
posts report comment
        │                    │                    │
        └────────────────────┼────────────────────┘
                             ▼
                       merge to main
                             │
                             ▼
                    release-pipeline
        build → development → staging → production
       (dry-run by default; approval required on staging/production)
```

On PR runs the workflows post comments; on non-PR (`workflow_dispatch`) runs they upload reports and dry-run deployment records as run artifacts instead.

## Promotion chain

```
push to main (or workflow_dispatch)
        │
        ▼
     build ──► build-info artifact
        │
        ▼
deploy-development   (no approval)
        │
        ▼
deploy-staging       (approval via required_reviewers)
        │
        ▼
deploy-production    (approval via required_reviewers)
```

- The GitHub environments `development` / `staging` / `production` exist; `staging` and `production` have a `required_reviewers` protection rule.
- `environment` input selects the chain: `development` (dev only), `staging` (staging, then production), `production` (production only), `all` (full chain, default).
- A push to `main` is always a real deployment (`real_deploy=true`, calls `createDeployment`). A `workflow_dispatch` run defaults to `dry_run: true`, which writes `deploy-<env>.md` records and uploads them as artifacts without touching the Deployment API.
- Each environment job runs a post-deploy verify step: if `DEPLOY_VERIFY_URL` is set it curls the URL (failing the job on a non-200 response); otherwise verification is skipped.
- `rollback_to` writes a dry-run rollback event (`rollback.md`, uploaded as `rollback-record` artifact). When the run is real (`dry_run: false` / push), the rollback job additionally creates a Deployment API record for the `rollback_to` ref — the native recovery event that telemetry's MTTR proxy reads (see `docs/train-failure-drill.md`).
- The controlled recovery drill (T10.2) uses this path on `development` only: deploy the `chore/phase10-failure-drill` SHA (contains `scripts/train-drill-marker.mjs`), file one `incident`-labeled issue, then recover with a real `rollback_to` dispatch; `delivery-telemetry` then computes real CFR and MTTR.

## Release on tag and security re-scan

- `release-on-tag.yml` gates every release on a **closed GitHub milestone** titled `v<version>`; the gate cannot be bypassed by a manual `v*` push either. The `workflow_dispatch` path (run from the default branch `develop`): validates the `version` input, enforces the milestone gate (a missing milestone is auto-created as open, then blocks until closed), bumps `frontend/package.json` on `develop`, then builds and creates the GitHub Release **in the same run** — events triggered by `GITHUB_TOKEN` never spawn a new run, so there is no tag-push event chaining. Manual `v*` tag pushes still publish via the same `release` job and must pass the milestone gate. Release notes list commits since the previous tag (or the most recent commits when none; the AI-assisted draft summary from `scripts/release-summary.mjs` is appended as review/edit guidance).
- `security-rescan.yml` runs weekly plus on demand: gitleaks + OSV across the whole repo, then a report job writes `security-rescan-<date>.md` and uploads it as an artifact. On schedule runs, a blocking gitleaks failure also opens an issue; `workflow_dispatch` runs do not.

## GitHub Pages publish (live verify target)

`publish-pages.yml` publishes the static-exported frontend to GitHub Pages on every push to `develop` (the `github-pages` environment's branch policy) plus `workflow_dispatch`. The `github-pages` environment restricts deployment to `develop`; the publish build sets `NEXT_PUBLIC_BASE_PATH=/learning-pdm-fintech-delivery-engine` for the subpath, and the Pages site becomes the live target for `release-pipeline`'s post-deploy verify step via the repo variable `DEPLOY_VERIFY_URL`. The frontend build uses `output: 'export'` so `next build` emits a static site into `frontend/out`.

## Delivery telemetry & audit trail

`delivery-telemetry.yml` makes delivery outcomes observable without any external service (ADR 0008). It reads GitHub's native records — the Deployment API, releases, merged PRs, and rollback/incident issues — via `scripts/delivery-telemetry.mjs` and exports three run artifacts:

- `delivery-audit-<ts>.json` — the raw event snapshot: deployments (environment, ref, created_at), releases, merged PRs (merge commit SHA, merged_at), and failure events.
- `delivery-telemetry-<ts>.json` — derived metrics: deployment frequency per environment, lead time for changes (median merge→first matching deployment), change failure rate (failure events ÷ deployments), a time-to-recovery proxy (median failure event→next deployment), and the release-train on-time signal (delivered trains ÷ planned trains per the ADR 0009 calendar, i.e. `release_train_on_time`).
- `delivery-telemetry-<ts>.md` — the human-readable report.

The workflow runs weekly (Mon 02:30 UTC) and on demand via `workflow_dispatch`, reads with the built-in `GITHUB_TOKEN` (`contents: read`), and uploads the three files as a `delivery-telemetry` artifact. Metrics with no matching native events are marked `insufficient-data` and explained — dry-run records are artifacts, not API events, so only real (`dry_run: false` / push-to-main) activity populates the telemetry.

## Release train simulator

`release-train-simulator.yml` runs the deterministic release-train model (Phase 11) headlessly via `scripts/release-train-simulator.mts` and uploads a `release-train-simulation` artifact (JSON report + markdown). It is `workflow_dispatch` only, takes an optional `sim_config` JSON override, and creates **no** deployments, releases, PRs, or issues. Simulated outputs carry `kind: "simulation"` and are labeled artifacts only — they never enter the GitHub-native records `delivery-telemetry` reads (ADR 0010).

## Testing model (GitHub native)

Workflows are verified by running them on GitHub — there is no local `act`/Docker harness. The loop is:

1. Edit only `.github/pdm/workflows/`, then `make sync` and `make lint`.
2. Open a PR to `main` — the three PR workflows run natively and post comments. `make test-gh` automates this: it pushes the current branch, opens (or updates) a PR to `main`, and watches `gh pr checks`.
3. For the release pipeline, use `workflow_dispatch` (default `dry_run: true`); on non-PR runs results are uploaded as run artifacts, downloadable from the run's "Artifacts" section.

Requires the `gh` CLI (`gh auth login`) and push access; `actionlint` runs natively via Homebrew on Apple Silicon.

See `docs/ROADMAP.md` for the phase breakdown, `docs/local-runbook.md` for the hands-on runbook, `docs/agents-guide.md` for contributor and agent guidance, and `docs/decisions/` for the design decisions that shaped this engine.
