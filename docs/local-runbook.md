# Native Runbook — testing the delivery engine on GitHub

Workflows are verified by running them on GitHub: open a PR and the PR gates execute natively; run the release pipeline via `workflow_dispatch`. There is no local `act`/Docker harness — nothing here needs a container (on Apple Silicon `actionlint` runs natively via Homebrew).

Prerequisites: `gh` CLI (`gh auth login`), actionlint (`brew install actionlint`), pnpm (`brew install pnpm` for `make test-frontend`), and push access to the repo.

## Workflow editing loop

Edit **only** `.github/pdm/workflows/`. GitHub only executes workflows from `.github/workflows/`, so mirror and validate every change:

```sh
make sync   # copy canonical workflows to .github/workflows/ (byte-identical)
make lint   # actionlint on canonical + execution copies, then drift check
```

Commit both trees together. `make lint` exits non-zero on drift.

### After a Dependabot merge

Dependabot only scans `.github/workflows/` (the standard GitHub Actions location), so its version bumps land in the execution copies and **not** in `.github/pdm/workflows/`. After each dependabot merge, adopt the bumps into the canonical tree and re-mirror:

```sh
make sync-deps   # copy bumped execution copies back into canonical
make sync        # re-mirror canonical -> execution (no-op after sync-deps)
make lint        # confirm no drift
```

Commit the re-synced canonical tree alongside the dependabot merge.

## Frontend suite

The quality gate and code-health jobs run the frontend suite against `frontend/` on every PR. Verify the same thing locally, container-free:

```sh
make test-frontend   # pnpm install --frozen-lockfile + lint + typecheck + test + build
cd frontend && pnpm test:watch   # fast local TDD loop
```

`make test-frontend` needs pnpm on PATH (`brew install pnpm`; on Node <25 corepack also works). CI sets up pnpm with `pnpm/action-setup@v4` (pinned to the lockfile's version) before `actions/setup-node`, whose `cache: pnpm` requires pnpm to already be installed.

## `make test-gh` — the PR verification loop

`make test-gh` does three things:

1. Pushes the current branch to `origin`.
2. Opens a PR to `main` (title `PDM workflow run (<branch>)`), or updates the existing PR for that branch.
3. Watches the checks with `gh pr checks --watch` (Ctrl-C stops the watch; the checks keep running).

Opening that PR triggers the three PR workflows natively:

- `risk-health-check` — gitleaks, OSV (skipped when no dependency manifests), frontend lint/typecheck/test, AI-assisted diff risk review, then a report comment.
- `compliance-guardrail` — trufflehog base-to-head, posts a pass/fail comment.
- `quality-gate` — actionlint + frontend lint/typecheck/test/build aggregated into a single gate. This is the **required status check** on `main`, so it also gates mergeability.

Expect one comment per push on active PRs (workflows run on every `synchronize`).

## `workflow_dispatch` — the release pipeline

Exercise the release pipeline without pushing to `main`:

```sh
gh workflow run release-pipeline.yml --ref <branch> --field environment=all --field dry_run=true
```

Inputs:

- `environment` — `all` (default), `development`, `staging`, or `production`. `staging` promotes staging then production; `production` deploys production only.
- `dry_run` — default `true`. `false` (or a push to `main`) calls the GitHub Deployment API (`createDeployment`).
- `rollback_to` — optional commit SHA. Records a dry-run rollback event (no API call).

Environment behavior:

- `development` deploys without approval.
- `staging` and `production` require review approval (`required_reviewers` protection rule) — approve in the run UI.
- Each environment job verifies the deploy by curling `DEPLOY_VERIFY_URL` if the variable is set; otherwise verification is skipped.

Scheduled and tag workflows:

- `security-rescan` runs weekly (Mon 02:00 UTC) and on demand via `workflow_dispatch`; on schedule runs a blocking gitleaks failure opens an issue.
- `release-on-tag` fires on `v*` tags and creates a GitHub Release with generated release notes.
- `delivery-telemetry` runs weekly (Mon 02:30 UTC) and on demand via `workflow_dispatch`. It reads GitHub's native delivery records (deployments, releases, merged PRs, rollback/incident issues) and uploads the audit trail + DORA-style telemetry as a `delivery-telemetry` artifact (see ADR 0008).
- `release-train-simulator` runs on demand via `workflow_dispatch`. It runs the deterministic release-train model headlessly and uploads a `release-train-simulation` artifact (JSON + markdown). It creates no deployments, releases, PRs, or issues — simulated outputs are labeled artifacts only (ADR 0010), so telemetry is unaffected.

```sh
gh workflow run delivery-telemetry.yml --ref develop
# or run it against a feature branch to snapshot its delivery record
```

You can preview the exporter locally against the live repo:

```sh
GITHUB_TOKEN="$(gh auth token)" GITHUB_REPOSITORY=frdrpo/learning-pdm-fintech-delivery-engine \
  LOOKBACK_DAYS=90 node scripts/delivery-telemetry.mjs /tmp/telemetry
```

## Where results land

| Event | Results |
|---|---|
| PR run | PR comments (risk report, compliance pass/fail, gate summary) |
| Non-PR run (`workflow_dispatch`, push, schedule) | Run artifacts: `risk-report`, `gate-report`, `security-rescan-report`, `delivery-telemetry`, `release-train-simulation`, `deploy-record-<env>`, `rollback-record`, `release-notes`, `build-info` — download from the run's "Artifacts" section |
| Dry-run release | `deploy-<env>.md` records written under `.github/pdm/deployments/` in the job workspace, uploaded as artifacts (never committed) |

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `make lint` fails with `DRIFT: .github/workflows/ differs from .github/pdm/workflows/` | You edited the canonical tree without re-syncing. Run `make sync` and commit both sides. If Dependabot bumped versions in `.github/workflows/`, run `make sync-deps && make sync` to adopt them into canonical. |
| `actionlint: command not found` | actionlint is not installed. `brew install actionlint` (native on Apple Silicon). |
| OSV step shows as skipped in `risk-health-check` / `security-rescan` | Expected — the scan only runs when dependency manifests exist (`hashFiles`); with none it is skipped. |
| No PR comment posted on a `workflow_dispatch` run | Expected — comments are guarded by the pull request number; non-PR runs upload artifacts instead. |
| Quality gate not showing as a required check | Branch protection on `main` must require the `PDM Quality Gate (Status Check)` check. |
| Staging/production deploy waiting indefinitely | Environment protection requires a reviewer — approve the run in the Actions UI. |
| `gh: not authenticated` | Run `gh auth login`. |
| `make test-gh` errors on push | Push access is required; check your remote and branch protection. |
| `make test-frontend` fails with `pnpm: command not found` | pnpm is not installed. `brew install pnpm` (or use corepack on Node <25). |
| Dry-run release produced no Deployment API records | Expected — `dry_run: true` (default) skips `createDeployment` and writes `deploy-<env>.md` artifacts instead. |
| `delivery-telemetry` metrics report `insufficient-data` | Expected on fresh repos or pure dry-run activity — telemetry reads GitHub-native API records only (ADR 0008); real deployments / rollback or incident issues populate it. |
| Simulator run "did nothing" to delivery metrics | Expected — the simulator creates labeled artifacts only (ADR 0010); it never writes to the native delivery records telemetry reads. |
| One comment per push on an active PR | Expected — the PR workflows re-run on every `synchronize`. |
