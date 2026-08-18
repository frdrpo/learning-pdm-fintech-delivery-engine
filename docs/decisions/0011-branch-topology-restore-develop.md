# ADR 0011: Restore `develop` as the integration and default branch

- **Status:** Accepted

## Context

The engine's documented topology is a two-branch model: `develop` (unprotected
integration + default branch) and `main` (protected production branch). Every
workflow, the runbook, the copy-kit, ADR 0002/0005 (dispatch workflows register
on the default branch), and every chapter plan since Phase 8 assume `develop`
exists.

The live repo drifted from that model (verified 2026-08-18 against the GitHub
API): `branches/develop` returns HTTP 404, `git ls-remote` shows only
`refs/heads/main`, and the default branch is `main`. This happened after the
final Phases 12–14 promotion (PRs #107–#117 were pushed from a branch literally
named `develop` straight to `main`); the branch and the default-branch setting
were not reconciled.

The drift is not cosmetic — it breaks the engine's own release chain:

- `release-on-tag.yml`'s dispatch path does `git fetch origin develop` /
  `git checkout -B cut-release-and-tag origin/develop` / `git push origin
  HEAD:develop` — the **next release cut fails at "Sync develop"**.
- `publish-pages.yml` triggers on `push: branches: [develop]` and the
  `github-pages` environment deploys under a `branch_policy` allow-listing
  `develop` (verified: policy id 57529231, name `develop`) — **Pages stops
  auto-publishing** on pushes to `main` and a branch-policy mismatch would
  block the deploy job.
- `.github/dependabot.yml` sets `target-branch: develop` for both ecosystems —
  **dependabot would target a nonexistent branch** (its PRs have historically
  landed as #92/#93).

## Options

### Option A — Restore `develop` (integration + default) at `main` parity

Re-create the branch at the current `main` HEAD, flip the default branch back
to `develop`, keep `main` protected as the release/production branch.

- Fits every existing artifact: `release-on-tag`, `publish-pages`, dependabot,
  the copy-kit §0/§2/§6, the runbook's `--ref develop` guidance, the failure
  drill's `origin/develop` recovery target, and ADR 0002/0005's "dispatch
  registers on the default branch".
- The `github-pages` environment policy already allow-lists `develop` (verified
  via API), so no environment-setting repair is needed.
- Cost: one extra branch to keep at parity; the promotion flow
  (`develop` → `main` PR) is the documented release path already proven
  (PRs #84, #108, #113–#117).

### Option B — Codify single-trunk `main`

Delete the remaining `develop` references and make `main` the one branch.

- Requires re-plumbed `release-on-tag` bump target (a bot push to protected
  `main` is blocked by `enforce_admins` + required status checks — a direct
  push from Actions cannot update protected branches, so the release cut would
  need a new mechanism or a protection bypass), a `publish-pages` trigger +
  `github-pages` env-policy change, dependabot retargeting, and a rewrite of
  the copy-kit, runbook, drill, and every "branch off `develop`" instruction in
  the chapter plans.
- Contradicts the two-branch model the engine has documented since Phase 8 and
  the AGENTS.md surface; it is a larger, riskier change with no mechanism that
  previously depended on `develop` being gone.

## Decision

**Restore `develop`** as the integration and default branch, re-created at
`main` parity (Option A).

The drift is a config accident, not a design signal: the last promotions
arrived as `develop` → `main` PRs, `develop` was simply never re-created or
re-defaulted after its content merged. No artifact in the repo was written to
support single-trunk `main`, and Option B's release-cut plumbing would fight
branch protection. Option A makes live state and documentation agree with the
least change and zero workflow rewrites — the workflows only *start* working
again once the branch exists.

## Consequences

- `develop` exists again at `main` parity and is the default branch; `main`
  stays protected (`PDM Quality Gate (Status Check)` required, `enforce_admins`
  on; verified live: `require_code_owner_reviews: false`, `lock_branch: false`).
- `release-on-tag` dispatch, `publish-pages` push trigger, and dependabot
  `target-branch: develop` all work again as designed — no workflow edits
  required in this ADR's scope.
- The `github-pages` environment keeps its `develop` branch policy (verified);
  Pages re-publishes on pushes to `develop`, and dispatch runs from the default
  branch match the policy.
- Docs, plans, and runbook references to "branch off `develop`" are accurate
  again; a new section in the copy-kit and runbook records the "restore
  `develop` if it disappears" procedure so this class of drift is fixable by a
  consumer.
- Parity obligation is now explicit: `develop` must be re-created whenever it
  is deleted; the PR-gate workflows remain triggered on PRs to `main` only, so
  the native gate loop (`make test-gh`) is unchanged.