# PDM Workflow Templates — ready-to-copy GitHub Actions

Reusable GitHub Actions workflow templates for adopting the PDM delivery gates in a fintech project without writing every workflow from scratch. Each template is kept actionlint-clean by this repo's integration test (`make test-examples`), and follows the repo's hard-earned gotchas: `osv-scanner-action` subdir path, `--recursive .` flag, github-script context without redeclaration, artifact uploads guarded for non-PR runs.

## Templates

| Template | Trigger(s) | What it enforces |
|---|---|---|
| `templates/quality-gate.yml` | pull_request (develop/main) + dispatch | actionlint on workflows + code-quality steps behind toolchain detection (the required `main` branch-protection check) |
| `templates/compliance-guardrail.yml` | pull_request + dispatch | trufflehog base..head secret/compliance scan, pass/fail PR comment (guarded on `pull_request.number`) |
| `templates/agent-runner.yml` | dispatch only | run an opencode agent fleet step (a `make fleet-sync` + agent-invocation example), artifact upload, no PR trigger by construction |

Reference versions of all three live and verified in this repo under `.github/pdm/workflows/`.

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

## Verification

```sh
actionlint templates/*.yml   # always clean in this repo; the CI integration test re-checks it
make test-examples           # runs actionlint + the mock contract checks on these templates
```

The integration test also parses `on:` triggers to confirm the commented expectations: `agent-runner` has no PR trigger (so its artifact upload needs no guard), while `quality-gate`/`compliance-guardrail` guard their writes on `github.event.pull_request`.