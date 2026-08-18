# P17 — Consumer Repo Flight: Evidence Record

Phase 17 sets out to prove copy-kit adoption on a **second, real GitHub repo**.
This file records the evidence of that attempt, the external event that
interrupted it, and the decision to complete the phase via the plan's approved
reduced fallback (in-repo consumer-path rehearsal — **a documented substitution,
never labeled adoption**).

## 1. The consumer repo (`frdrpo/pdm-copykit-consumer`, 2026-08-18)

Created as a scratch consumer for the adoption flight; deleted/vanished from the
account mid-flight (see §3). All artifacts below were produced before the
deletion and the full history is preserved in a local clone:

| Commit | SHA |
|---|---|
| Adoption bootstrap (engine copy + consumer app) | `d89ef7f` |
| Consumer adoption brief (`docs/adoption-brief.md`) | `8f3684a` |
| Merge of promote-PR #1 into `main` | `1cf46d9` |

### 1.1 Topology wired (mirrors the reference exactly)

- Default branch: `develop`; `main` at parity, protected:
  - `required_status_checks`: **`PDM Quality Gate (Status Check)`**, `strict: true`
  - `enforce_admins`: on; `require_code_owner_reviews: false`; `lock_branch: false`; force-push/deletion denied
- Environments: `development` (plain), `staging` + `production`
  (`required_reviewers`), `github-pages` with `custom_branch_policies` → branch `develop`
- `DEPLOY_VERIFY_URL` repo variable → `https://frdrpo.github.io/pdm-copykit-consumer/`
- External app (`frontend/`): stand-in Next.js app + consumer-specific
  `ConsumerStamp` component (TDD'd; consumer suite **62 tests green** locally
  before pushing).

### 1.2 First native run — PR #1 (develop → main), all checks GREEN

Ten native checks completed `SUCCESS` on the first consumer PR (run IDs
`32104938832` / `32104938841` / `32104938847` / `32104935534`):

- `workflow-lint` — Workflow Lint (actionlint) ✅
- `code-quality` — Code Quality (lint/typecheck/test/build) ✅
- `gate` — PDM Quality Gate (Status Check) ✅
- Risk Report ✅ · Code Health (Shift-left quality) ✅ · Diff Risk Review (AI-assisted) ✅
- Security (Secrets & Vulnerabilities) ✅
- compliance-scan ✅
- Build static export ✅ · Deploy to GitHub Pages ✅ (publish-pages, from the PR)

Agent comments posted on the PR (Compliance Agent ✅, PDM Quality Gate summary ✅).
The qualify via `make test-gh` — first-flight PR loop proven **natively in a
foreign repo**.

## 2. Friction captured (folded into the kit, §1/§2/§8)

1. **GitHub Pages requires a *public* repo on the free plan.** Enabling Pages on a
   private repo → `422 "Your current plan does not support GitHub Pages for this
   repository."` The reference repo is public for this reason; a consumer must be
   public from the start if it wants the Pages deploy path.
2. **`gh repo edit --visibility public` now guards with
   `--accept-visibility-change-consequences`**; the earlier run returned a blank
   line and exit 0 without changing visibility (silent).
3. **Environment `required_reviewers` is NOT set via `PUT
   /environments/{env}/protection_rules`** (Enterprise-only custom rules → 404).
   Use `PUT /environments/{env}` with `{"reviewers":[{"type":"User","id":…}]}`.
4. **github-pages branch policy (develop):** `PUT /environments/github-pages`
   with `deployment_branch_policy: {protected_branches:false, custom_branch_policies:true}`
   then `POST /environments/github-pages/deployment-branch-policies` with `{"name":"develop"}`.
5. **Empty-PR guard:** `make test-gh` on a branch at `main` parity fails with
   "No commits between main and develop" — the first promotion PR needs a real
   commit ahead of `main` (integration branch does the work first).
6. **Dispatch workflows + `gh workflow list` can return HTTP 404 briefly** right
   after repo creation/merge (register-on-default-branch timing); wait and retry.
7. **Root `.gitignore` is not part of the kit's §1 copy list.** A consumer must
   add one (or reuse the reference's) so `node_modules/`, `dist/`, and the PDM
   run-artifact dirs `.github/pdm/{deployments,reports,releases}` never get
   committed. Verification is now automated (copykit-smoke §A4).

## 3. The deletion incident (unexplained, external)

After the PR #1 merge, the repo stopped resolving: `repos/frdrpo/pdm-copykit-consumer`
→ HTTP 404, `gh repo view` → "Could not resolve to a Repository", repo absent from
`gh repo list frdrpo`, no rename/traverse trail, and no events visible via the
authenticated-user events endpoint. Nothing in the engine automates repo deletion,
and no delete was issued from this working tree. Cause: **undetermined** — logged
as an external-infrastructure risk, not an engine finding.

Recovery performed: repo recreated with full history pushed (both branches listed
again), then **deliberately deleted** when the route was abandoned in favor of the
approved in-repo fallback. Re-applying the topology the second time took six API
calls — that cost is exactly why the kit now ships `make adopt-topology`
(idempotent `--check`/`--apply`, `scripts/wire-topology.mjs`).

## 4. Decision (P17-T1 completion path)

Per `docs/plans/phases-15-18-cadence-continuity-adoption.md` P17-T1 risk table:
> "If no second repo can be provisioned — or the external repo disappears —
> the reduced fallback is a documented **in-repo consumer-path rehearsal**
> executed exactly as a consumer would, stated explicitly as a **substitution**."

The fallback is implemented as:

- **`copykit-smoke.yml`** (dispatch): executes the kit's §1 copy commands
  literally into a scratch consumer workspace on a fresh runner, brings the
  stand-in app (§3), then runs `make lint` + `make test-frontend` *inside that
  workspace* and checks the kit §8 expectations matrix byte-for-byte
  (`scripts/consumer-smoke.mjs`), uploading the report as an artifact.
  **Verified natively 2026-08-18: run 32108960363 — 15/15 checks PASS, report
  artifact `copykit-smoke-report.md` downloaded.** (The workflow needed four
  hardening iterations against runner reality: consumer-dir creation,
  actionlint PATH, `GITHUB_REPOSITORY`/owner-id resolution, and `GH_TOKEN` +
  runner-token-aware admin-gated reads — every one a kit §8 line.)
- **`make adopt-topology`** (`scripts/wire-topology.mjs`): idempotent
  `--check`/`--apply` for kit §2, so a real consumer's topology cost is one
  command instead of six hand-typed API calls. Runner tokens can't read
  admin-gated state (branch protection, env rules) — the CI smoke SKIPs those
  with an explicit "operator check required" note; the operator-side check
  with an admin token asserts the full target state.

This satisfies P17-T3 (read-back: the kit's copy command sequence is executed
and verified byte-correct in the rehearsed consumer) and P17-T2 (folding every
finding back into the kit), while honoring the honesty rule: the rehearsal is
labeled a substitution everywhere it is referenced.