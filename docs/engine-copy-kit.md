# PDM Delivery Engine — Copy-Kit / Bootstrap Guide

Adopt this delivery engine in a fresh product without reading every ADR. This is the checklist a new team walks top to bottom; each step links to the canonical reference when you need depth.

## 0. Prereqs

- GitHub repo (default branch `develop`) with Actions enabled.
- Locally: `gh` CLI (`gh auth login`), `actionlint` (Homebrew), Node ≥ 20, pnpm.
- Any VCS-side hook so the branch protection below can look at checks.

## 1. Copy the engine

```sh
mkdir front-end-root-for-you
cp -R .github front-end-root-for-you/.github \
  && cp -R Makefile scripts front-end-root-for-you/ \
  && cp -R README.md AGENTS.md front-end-root-for-you/
```

- `scripts` and `.github` are directories, so `cp -R` is required — a bare `cp Makefile scripts …` errors out ("is a directory").

- Write a root `.gitignore` before the first commit so engine run artifacts never land in git (verified by the copy-kit smoke, check A4):
  ```sh
  printf 'dist/\nnode_modules/\n.node_modules/\n.github/pdm/deployments/\n.github/pdm/reports/\n.github/pdm/releases/\n' \
    > front-end-root-for-you/.gitignore
  ```

- The canonical workflows live in `.github/pdm/workflows/`; `.github/workflows/` holds the GitHub-only execution copies. **Edit only the canonical tree**, then `make sync` and both trees are committed together (`make lint` fails on drift).
- `scripts/` is engine code: `risk-review.mjs` (diff risk), `delivery-telemetry.mjs` (DORA + train telemetry), `release-train-simulator.mts`, plus any `release-summary.mjs`.

## 2. Wire the branch topology

- **Two-branch model (ADR 0011):** `develop` is your **default** and integration branch (unprotected; release bumps and dependabot land here), `main` is the protected production branch. The engine's mechanisms depend on `develop` existing: `release-on-tag` syncs from / bumps `develop`, `publish-pages` triggers on pushes to `develop`, and dependabot targets `develop`.
- Protect `main`: require `PDM Quality Gate (Status Check)` and pull-request reviews. `develop` is your integration branch — protected PRs into it too if you want.
- **Automate the wiring** (this repo ships it): `make topology-check` verifies the target state against the live API; `make topology-apply` converges it idempotently (`scripts/wire-topology.mjs` — protection, environments, Pages, `DEPLOY_VERIFY_URL`). Branch creation/parity stays git-side. Hand-typing these API calls cost real time in the P17 flight — use the Make targets.
- **GitHub Pages requires a *public* repo on the free plan** (`422 "Your current plan does not support GitHub Pages"` on private). Decide the Pages deploy path up front and create the consumer public; the reference is public for this reason.
- **`required_reviewers` on staging/production come from `PUT /repos/{owner}/{repo}/environments/{env}` with `"reviewers":[…]`** — the `.../protection_rules` PUT endpoint is Enterprise-only custom rules and 404s on free. (`make topology-apply` creates `development` / `staging` / `production` and wires the reviewers for you.)
- Decide the deployment target for each environment. For a static frontend, publish to GitHub Pages (`github-pages` environment) and set `DEPLOY_VERIFY_URL` so the post-deploy verify step curls a live URL instead of skipping.
- **If `develop` is deleted later** (branch drift — it happened in this repo, 2026-08-18), restore it at `main` parity and re-set it as the default branch before the next release cut:
  ```sh
  git push origin main:develop
  gh api -X PATCH repos/{owner}/{repo} -f default_branch=develop
  ```

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
3. Cut the release from `develop`: dispatch `release-on-tag` with `version` (e.g. `0.2.0`). It requires a closed milestone `v0.2.0` (a missing milestone is auto-created as open, blocking until closed), bumps `frontend/package.json` on `develop`, and creates the GitHub Release in one run. Manual `v*` pushes still publish but must pass the same milestone gate.
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
- Fresh-repo expectations (validated against a real consumer flight + the in-repo rehearsal, 2026-08-18):
  - `make test-frontend` fails until you bring an app into `frontend/` (kit §3) — that is expected, not a breakage of the engine.
  - `make test-gh` is GitHub-side by design: it pushes a branch and opens a PR, so it only works where you have push access + `gh` auth against a live remote. Locally, `make lint` + `make test-frontend` are the offline checks.
  - Telemetry in a fresh repo reports `insufficient-data` until real delivery events exist — honest, not broken.
- GitHub-side behaviors measured in the P17 consumer flight (all folded into this kit):
  - **GitHub Pages needs a public repo on the free plan** — create the consumer public from the start (see §2).
  - **`gh repo edit --visibility public` requires `--accept-visibility-change-consequences`**; without it gh exits 1 with usage, and a pre-guardrail gh version exits 0 silently without changing anything.
  - **A first promotion PR needs content:** `gh pr create` refuses "No commits between main and develop" while branches are at parity — do the work on `develop` first, then promote.
  - **`required_reviewers` is set on the environment PUT, not `protection_rules`** (Enterprise-only, 404s) — see §2.
  - **Dispatch workflows and `gh workflow list` can 404 for a few minutes** right after repo creation/merge (workflows register against the default branch); wait and retry instead of diagnosing a mis-wire.
  - **Scratch external repos are fragile** — one vanished mid-flight in P17 with no trail. `make test-consumer-path` rehearses the whole §1→§8 path in a throwaway workspace on a fresh runner as the documented substitution (evidence: `docs/evidence/p17-consumer-repo-flight.md`). It is a rehearsal, never labeled adoption.