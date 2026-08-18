# T10.2 — Controlled Failure & Recovery Drill (runbook)

P10-T2 files **one** carefully-labeled issue so `delivery-telemetry.mjs` computes a real Change Failure Rate and Time-to-Recovery proxy from native GitHub records. This is a **controlled drill on a lower environment only** — never staging/production.

## Vehicles

| Thing | Where | Purpose |
|---|---|---|
| Regression marker | `scripts/train-drill-marker.mjs` | The deliberately-introduced regression. Lives in `scripts/` (Track B's zone) so the drill never touches `frontend/` or the live verify target. With `DRILL_BREAK=1` it reports a degraded health signal and exits 1. |
| Broken deploy target | branch `chore/phase10-failure-drill` | A pushable SHA that carries the marker — the ref you deploy first. It is **never** PR'd/merged to `develop`. |
| Good deploy target | `develop` (or `main`) HEAD | The recovery/rollback target. `develop` is the default branch (ADR 0011) — if it has been deleted, restore it at `main` parity first (`git push origin main:develop`). |
| Recovery record | `release-pipeline.yml` rollback job | In real mode the rollback job now creates a Deployment API record for `rollback_to` — the native "recovery deployment" that MTTR reads. |

## Label discipline (non-negotiable)

- Exactly **one** issue is filed: it carries the **`incident`** label (equivalently `rollback`). That is the failure event.
- No other issue or PR in the chapter may carry `rollback` / `incident` / `outage` / `hotfix` / `regression` **labels**. (Title text is irrelevant — `delivery-telemetry.mjs` counts by label only, never by title, so feature PRs that merely mention "rollback" cannot pollute CFR.)
- The drill is a real failure event: it is *real and explained*, never padded or hidden. Close the incident issue after recovery; closing keeps the label, and the record stays in the window.

## Execute the drill

Prereqs: `gh auth login`; the drill branch pushed (see below); confirm `development` has no reviewer protection (staging/production do).

1. **Confirm the vehicles are on origin.**
   ```sh
   git ls-remote origin chore/phase10-failure-drill
   ```

2. **Deploy the broken version** (real Deployment API record for the drill SHA):
   ```sh
   gh workflow run release-pipeline.yml --ref chore/phase10-failure-drill \
     -f dry_run=false -f environment=development
   gh run watch $(gh run list --workflow=release-pipeline.yml --limit 1 --json databaseId --jq '.[0].databaseId')
   ```
   The `deploy-development` job records a real `createDeployment` for the drill SHA. Save that SHA — it is the failure's `from`.

3. **File the one labeled incident issue** (the failure event):
   ```sh
   gh issue create --label incident \
     --title "OPS drill: controlled failure on development (train failure recovery)" \
     --body "Controlled T10.2 recovery drill. Deployed drill SHA \`<drill-sha>\` (contains scripts/train-drill-marker.mjs with DRILL_BREAK=1) to development; recovery via release-pipeline rollback_to to the good SHA. Recorded for CFR/MTTR — real and explained."
   ```
   Note the issue number and `created_at` — MTTR measures from this event to the next deployment.

4. **Recover via `rollback_to`** (real record of the good SHA):
   ```sh
   GOOD_SHA=$(git -C . rev-parse origin/develop)
   gh workflow run release-pipeline.yml --ref develop \
     -f dry_run=false -f environment=development -f "rollback_to=${GOOD_SHA}"
   gh run watch $(gh run list --workflow=release-pipeline.yml --limit 1 --json databaseId --jq '.[0].databaseId')
   ```
   This records the recovery: the rollback job creates a Deployment API record for `rollback_to`, and the development deploy records the good SHA.

5. **Truth the telemetry** — CFR and MTTR must now be computed:
   ```sh
   gh workflow run delivery-telemetry.yml --ref develop
   gh run download $(gh run list --workflow=delivery-telemetry.yml --limit 1 --json databaseId --jq '.[0].databaseId') -n delivery-telemetry
   ```
   Check `delivery-telemetry-<ts>.md` for `### Change failure rate` and `### Time to recovery (proxy)` with real values, and record the readout in the ROADMAP.

6. **Close the incident** (keeps the label; the failure event remains in the window):
   ```sh
   gh issue close <issue-number>
   ```

## After the drill

- Record the DORA readout (CFR %, MTTR median) in `docs/ROADMAP.md` / the chapter plan.
- Delete the drill branch when it is no longer needed: `git push origin --delete chore/phase10-failure-drill` (the marker script is kept in git history for future drills).

## Expected outcome

- `delivery-telemetry` audit: the drill deployment, the recovery deployment, and the labeled incident are all present.
- CFR: computed (failures ÷ deployments in window) — real, explained.
- MTTR: computed (median failure event → next deployment) — minutes-class for a drill, explained as such.
- The live verify target (`DEPLOY_VERIFY_URL`) is unaffected — the drill never alters `frontend/`.