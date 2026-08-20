# Rollout Plan — Migrating PDM Workflows to Reusable Templates & Composite Actions

Task card: *Generalize and scale the repository's automated workflows and GitHub Action runners to support reusable, enterprise-grade CI/CD patterns across fintech delivery projects.*

This plan phases the migration from inline, per-workflow steps to the reusable building blocks shipped in this repo:

- **Composite actions** under `.github/actions/` — `setup-pdm-toolchain` (toolchain detect + install) and `pdm-code-quality` (gated lint/typecheck/test/build). Single canonical location, referenced by path (`uses: ./.github/actions/<name>`), so **no mirroring is needed** — `make sync` is untouched by their adoption.
- **Workflow templates** under `examples/pdm-workflow-templates/templates/` — copy-me whole-workflow patterns for fresh repos.

Every phase is gated on the existing deterministic gates: `make lint` (actionlint + drift), `make test-examples` (E1–E7 incl. composite-action structural checks), `make test-scripts` (script unit tests), `make test-frontend`, and a native `make test-gh` PR to `develop` that runs the real quality gates.

## Phase 1 — Ship the reusable building blocks (this change)

- [x] Add `.github/actions/setup-pdm-toolchain` and `.github/actions/pdm-code-quality` composite actions.
- [x] Extend `scripts/examples-test.mjs` with E6 (composite-action structural validation — actionlint 1.7.x cannot lint `action.yml` metadata) and E7 (canonical workflows only reference actions that exist).
- [x] Add `make test-scripts` for `scripts/test/*.test.mjs`; wire both into the `quality-gate` `workflow-lint` job.
- [x] Instrument workflow-run telemetry + cost estimates (`scripts/workflow-run-telemetry.mjs`, wired into `delivery-telemetry.yml`).
- [x] Fix consistency drift found during research: `risk-health-check` detect block now also detects `build` (parity with `quality-gate`), README workflow count 10 → 11 (`ai-agent-mvp.yml`), templates README no longer claims a canonical `agent-runner` counterpart.

**Gate:** `make lint` + `make test-examples` + `make test-scripts` + `make test-frontend` + native PR.

## Phase 2 — Migrate the duplicated toolchain blocks to `setup-pdm-toolchain`

The detect+install block is currently duplicated in three canonical workflows:

| Workflow | Inline block | Replace with |
|---|---|---|
| `quality-gate.yml` `code-quality` job | detect + pnpm/Node/install + lint/typecheck/test/build | `setup-pdm-toolchain` + `pdm-code-quality` |
| `risk-health-check.yml` `code-health` job | detect + pnpm/Node/install + lint/typecheck/test | `setup-pdm-toolchain` (build detection now present) + `pdm-code-quality` with `run-build: 'false'` |
| `publish-pages.yml` `build` job | detect + pnpm/Node/install + build | `setup-pdm-toolchain` (extra outputs unused) + build step |

Steps per workflow:
1. Replace the `Detect frontend toolchain` step with `uses: ./.github/actions/setup-pdm-toolchain` (id: `detect`), keeping the same step id so downstream `steps.detect.outputs.*` references keep working.
2. Delete the now-redundant pnpm/Node/install steps (the action does them).
3. Replace the gated quality steps with `uses: ./.github/actions/pdm-code-quality`, passing the `has_*_script` outputs.
4. `make sync` + `make lint` + native PR; verify the gate behaves identically (the PR quality gate is the parity check).

**Gate:** native PR green with identical gate conclusions; `make lint` drift-free.

## Phase 3 — Extend the template inventory

Add whole-workflow templates for the patterns still missing from `examples/pdm-workflow-templates/templates/`:

- `security-scan.yml` — gitleaks + OSV scan capturing the hard-earned gotchas (`google/osv-scanner-action/osv-scanner-action@v2.5.0`, `scan-args: --recursive .`, `hashFiles` gating).
- `delivery-telemetry.yml` — the DORA + workflow-run telemetry exporter pattern.

Pin the expected inventory in `scripts/examples-test.mjs` (E4) so a stale/renamed template fails the gate.

**Gate:** `make test-examples` with the new inventory pins; actionlint clean.

## Phase 4 — Publish adoption + telemetry docs

- [x] Wiki page `[[Workflow-Templates-Rollout]]` (docs are wiki-only, ADR 0013) linking the composite-action inputs/outputs, the template adoption path, and the rollout phases.
- [x] Wiki page `[[Telemetry-and-Cost]]` documenting the workflow-run metrics and the cost-estimate assumptions (sampled run minutes × published `ubuntu-latest` rate; public repos free; `insufficient-data` when the API is unreachable).
- [x] Update `README.md` links and the `examples/` READMEs to point at both pages.

**Gate:** docs reviewed by the `docs` agent; links resolve.

## Phase 5 — Enterprise hardening (follow-ups)

- Optional dispatch-only self-test workflow that runs each composite action against fixture workspaces (only if mocked coverage proves insufficient).
- Optional `pdm-compliance-scan` composite action (thin trufflehog wrapper) once a second consumer appears — avoid over-engineering today.
- Revisit `RUNNER_COST_PER_MINUTE` and the sampling window as real billing data becomes available.

**Gate:** each item lands as its own PR through the standard gates.

## Acceptance criteria mapping

| Task-card deliverable | Where it lands |
|---|---|
| Reusable templates/composite actions under `.github/actions` or `.github/workflows/templates` | `.github/actions/` (Phase 1) + `examples/pdm-workflow-templates/templates/` (Phase 3) |
| Docs + examples for adopting in other repos | `examples/` READMEs + wiki pages (Phase 4) |
| Tests/linting for composite actions + workflows; sample CI job validating templates | E6/E7 + `make test-scripts` wired into the `quality-gate` `workflow-lint` job (Phase 1) |
| Telemetry: workflow-run metrics + cost estimates documented | `scripts/workflow-run-telemetry.mjs` + `delivery-telemetry.yml` + wiki (Phases 1, 4) |
| Rollout plan for migrating existing workflows to templates | This document (Phases 1–5) |