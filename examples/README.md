# Examples & Templates

Reference implementations and workflow templates for adopting the PDM framework and AI agent patterns in a fintech project. Each example is a self-contained, minimal subproject you can copy into your own repo; `make test-examples` validates them offline (structure, agent scrub-rules, actionlint on the workflow templates, and a mocked CI test scaffold).

"PDM" here means **Product Delivery Management**, not the Python package manager.

## The examples

| Example | What it demonstrates | Adopt when |
|---|---|---|
| [`fintech-agent-runner/`](fintech-agent-runner/) | A minimal opencode agent fleet (`pm` + `delivery-engineer` + `compliance-reviewer`) with scrub-safe definitions, a `fleet-sync` Makefile target, and a runtime-config template (`opencode.example.json`). Mirrors ADR 0015. | You want the delivery-gate agents running locally the way this repo's fleet does. |
| [`pdm-workflow-templates/`](pdm-workflow-templates/) | Ready-to-copy GitHub Actions workflow templates: a quality gate, a compliance guardrail, and a `workflow_dispatch` agent-runner job. Validated with actionlint by the integration test. | You want the PR gates in a fresh repo without rewriting the workflows from scratch. |
| [`agent-skills-demo/`](agent-skills-demo/) | A skill-consumption demo + a dependency-free `node:test` scaffold showing how to add "mocked integration tests that run example workflows in CI." | You want the agent skills pattern plus a no-install test scaffold for validating workflow contracts. |

The repo also ships **reusable composite actions** under `.github/actions/` (`setup-pdm-toolchain`, `pdm-code-quality`) — single-purpose building blocks for any workflow, validated structurally by the integration test (E6). See [`pdm-workflow-templates/README.md`](pdm-workflow-templates/README.md) for the adoption pattern and [`pdm-workflow-templates/ROLLOUT.md`](pdm-workflow-templates/ROLLOUT.md) for the phased migration plan.

## Adoption path (5 minutes)

1. Pick the subproject that matches your gap (agent fleet, workflow templates, or skills + test scaffold).
2. Copy the subproject into your repo (see each subproject's `README.md` for the exact `cp` commands and what to rename).
3. For workflow templates: drop them under `.github/pdm/workflows/`, then `make sync` if you adopt the canonical→execution convention, or straight into `.github/workflows/`.
4. Run the example's own tests and this repo's example integration test:
   ```sh
   make test-examples   # struct + scrub rules + actionlint on templates + mock test scaffold
   ```
5. Pack in the gate: wire `scripts/examples-test.mjs` into your CI (the reference does it in `quality-gate.yml`'s `workflow-lint` job).

## Links

- Wiki: [[Examples-and-Templates]] — usage guide and the rationale behind each example.
- Wiki: [[Workflow-Templates-Rollout]] — reusable actions + templates and the phased rollout (Issue #185).
- Wiki: [[Telemetry-and-Cost]] — delivery + workflow-run metrics and cost-estimate assumptions.
- Reference architecture: [[Architecture]], copy-checklist: [[Engine-Copy-Kit]].
- Agent-fleet canon: [`agents/`](../agents/) (ADR 0015).