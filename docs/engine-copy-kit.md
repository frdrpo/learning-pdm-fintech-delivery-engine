# PDM Delivery Engine — Copy-Kit / Bootstrap Guide

Adopt this delivery engine in a fresh product without reading every ADR. This is the checklist a new team walks top to bottom; each step links to the canonical reference when you need depth.

## 0. Prereqs

- GitHub repo (default branch `develop`) with Actions enabled.
- Locally: `gh` CLI (`gh auth login`), `actionlint` (Homebrew), Node ≥ 20, pnpm.
- Any VCS-side hook so the branch protection below can look at checks.

## 1. Copy the engine

```sh
cp -R .github front-end-root-for-you/.github \
  && cp Makefile scripts front-end-root-for-you/ \
  && cp README.md AGENTS.md front-end-root-for-you/
```

- The canonical workflows live in `.github/pdm/workflows/`; `.github/workflows/` holds the GitHub-only execution copies. **Edit only the canonical tree**, then `make sync` and both trees are committed together (`make lint` fails on drift).
- `scripts/` is engine code: `risk-review.mjs` (diff risk), `delivery-telemetry.mjs` (DORA + train telemetry), `release-train-simulator.mts`, plus any `release-summary.mjs`.

## 2. Wire the branch topology

- Protect `main`: require `PDM Quality Gate (Status Check)` and pull-request reviews. `develop` is your integration branch — protected PRs into it too if you want.
- Create environments `development` / `staging` / `production` and, for staging+production, add `required_reviewers` (any two of your approvers).
- Decide the deployment target for each environment. For a static frontend, publish to GitHub Pages (`github-pages` environment) and set `DEPLOY_VERIFY_URL` so the post-deploy verify step curls a live URL instead of skipping.

## 3. Point the app stack

- The quality gate and release build exercise whatever is under `frontend/` (Next.js + pnpm here). Bring your app into `frontend/` and keep `pnpm-lock.yaml` committed so the OSV scan and `pnpm/action-setup` paths activate.
- Verify locally with `make test-frontend` (install + lint + typecheck + test + build).

## 4. Turn on dependency automation

- `dependabot.yml` exists for npm + GitHub Actions against `develop`. After a bump merges only into `.github/workflows/`, run `make sync-deps` to adopt it back into canonical, then `make sync` + `make lint`.

## 5. First native run (the loop that proves the engine)

```sh
make lint            # actionlint + drift check
git checkout -b feat/my-first-change
# ... work ...
make test-frontend   # frontend, if you changed it
git push -u origin feat/my-first-change
make test-gh         # opens/updates a PR to main and watches the 3 gates natively
```

- On PRs the workflows post a comment each; on non-PR (`workflow_dispatch`) runs they upload reports/deployment records as run artifacts instead. Neither comments nor artifacts ever hit your repo tree.

## 6. First real delivery flight

1. Open a PR `develop → main`, let the protected quality gate pass, merge — that is the promotion.
2. Dispatch `release-pipeline` with `dry_run: false` to record real `createDeployment` records (approve staging/prod reviewers in the run UI).
3. Push a `v*` tag → `release-on-tag` builds, drafts `release-summary.md` notes, creates the GitHub Release.
4. Dispatch `delivery-telemetry` and confirm a real, explainable DORA readout. `insufficient-data` is honest, not broken.

## 7. What you own vs what the engine cares about

| Concern | Where |
|---|---|
| Secrets scanning | `risk-health-check` (gitleaks) + `compliance-guardrail` (trufflehog) |
| Dependency vulnerabilities | `security-rescan` / `risk-health-check` (osv-scanner-action) |
| Quality gate | `.github/pdm/workflows/quality-gate.yml` |
| Deploy + verify + rollback | `.github/pdm/workflows/release-pipeline.yml` |
| DORA + train telemetry | `scripts/delivery-telemetry.mjs` (ADR 0008, ADR 0009) |
| Release notes drafts | `scripts/release-summary.mjs` wired into `release-on-tag` |
| Simulation | `scripts/release-train-simulator.mts` (always `kind: "simulation"`, never native) |

Never commit: run artifacts, secrets, `.env`, generated `dist/`/`out/` trees. Telemetry is computed from native records and fully explained when `insufficient-data` — never padded.

## 8. Known-limits checklist (read before copying)

- `osv-scanner-action@v1` does not exist — pin `google/osv-scanner-action/osv-scanner-action@v2.5.0` with `scan-args: --recursive .`.
- `osv-scanner` `-r` is a boolean flag now; do not write `-r=.`.
- Cross-job files don't persist on GitHub — upload artifacts from the job that writes them.
- `github-script@v7` already injects `context`/`github`; never redeclare them.
- Dependabot only scans `.github/workflows/` — always `make sync-deps` after a bump merges.