# PDM Workflow Templates — ready-to-copy GitHub Actions

Reusable GitHub Actions workflow templates for adopting the PDM delivery gates in a fintech project without writing every workflow from scratch. Each template is kept actionlint-clean by this repo's integration test (`make test-examples`), and follows the repo's hard-earned gotchas: `osv-scanner-action` subdir path, `--recursive .` flag, github-script context without redeclaration, artifact uploads guarded for non-PR runs.

## Templates

| Template | Trigger(s) | What it enforces |
|---|---|---|
| `templates/quality-gate.yml` | pull_request (develop/main) + dispatch | actionlint on workflows + code-quality steps behind toolchain detection (the required `main` branch-protection check) |
| `templates/compliance-guardrail.yml` | pull_request + dispatch | trufflehog base..head secret/compliance scan, pass/fail PR comment (guarded on `pull_request.number`) |
| `templates/agent-runner.yml` | dispatch only | run an opencode agent fleet step (a `make fleet-sync` + agent-invocation example), artifact upload, no PR trigger by construction |

Reference versions of `quality-gate` and `compliance-guardrail` live and verified in this repo under `.github/pdm/workflows/`. `agent-runner` is dispatch-only by construction (no PR trigger), so it has no direct canonical counterpart — the closest live reference is `ai-agent-mvp.yml` (PR + dispatch, runs the `ops/agent-runner` tests).

## Adopt in a fresh repo

```sh
# copy the workflows into your canonical tree (or straight to .github/workflows/)
mkdir -p .github/pdm/workflows
cp examples/pdm-workflow-templates/templates/*.yml .github/pdm/workflows/

# if you adopt the canonical -> execution convention:
make sync        # .github/pdm/workflows/*.yml -> .github/workflows/
make lint        # actionlint + drift check
```

- Replace `owner/repo`-specific labels in template comments with your own (the trigger branch lists and gate names match this repo; adapt `branches:` to your default branch).
- `quality-gate.yml` uses the same toolchain-detection pattern as this repo's gate: it only runs install/lint/typecheck/test/build when a `package.json` + lockfile exist, so it works whether or not your app ships a frontend.
- `agent-runner.yml` calls `make fleet-sync` — copy the canonical fleet first (see `examples/fintech-agent-runner/`).

## Composite actions (reusable building blocks)

Beyond whole-workflow templates, this repo ships reusable **composite actions** under `.github/actions/` — single-purpose building blocks you can drop into any workflow (this repo's or yours) without copying step YAML:

| Action | What it does | Inputs | Outputs |
|---|---|---|---|
| `setup-pdm-toolchain` | Detect a pnpm/Node toolchain in a project dir and install it (pnpm + Node with pnpm cache + frozen-lockfile install) | `project-dir` (default `frontend`), `node-version` (22), `pnpm-version` (11.21.0) | `found`, `has_lockfile`, `has_lint_script`, `has_typecheck_script`, `has_test_script`, `has_build_script` |
| `pdm-code-quality` | Run lint/typecheck/test/build, each gated on whether the project declares the script | `project-dir`, `has_*_script` (from `setup-pdm-toolchain`), `run-lint/typecheck/test/build` toggles | — |

Adopt in a fresh repo:

```sh
mkdir -p .github/actions
cp -R ../../.github/actions/setup-pdm-toolchain .github/actions/
cp -R ../../.github/actions/pdm-code-quality .github/actions/
```

Consume them from a job (the pattern this repo's rollout plan uses):

```yaml
jobs:
  code-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: ./.github/actions/setup-pdm-toolchain
        id: detect
      - uses: ./.github/actions/pdm-code-quality
        with:
          has_lint_script: ${{ steps.detect.outputs.has_lint_script }}
          has_typecheck_script: ${{ steps.detect.outputs.has_typecheck_script }}
          has_test_script: ${{ steps.detect.outputs.has_test_script }}
          has_build_script: ${{ steps.detect.outputs.has_build_script }}
```

Composite actions are validated structurally by `make test-examples` (E6) — actionlint 1.7.x does not lint `action.yml` metadata — and `make lint` keeps the workflow trees drift-free. See [`ROLLOUT.md`](ROLLOUT.md) for the phased migration plan.

## Verification

```sh
actionlint templates/*.yml   # always clean in this repo; the CI integration test re-checks it
make test-examples           # runs actionlint + the mock contract checks on these templates
```

The integration test also parses `on:` triggers to confirm the commented expectations: `agent-runner` has no PR trigger (so its artifact upload needs no guard), while `quality-gate`/`compliance-guardrail` guard their writes on `github.event.pull_request`.