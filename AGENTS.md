# AGENTS.md

## What this is

A PDM (Product Delivery Management) reference repo — no application code yet. No `package.json`, no toolchain. The only real content is the GitHub Actions workflows in `.github/workflows/` and their local-test fixtures in `.act/`. Note: "PDM" here means Product Delivery Management, **not** the Python package manager.

## Local workflow testing (the main task in this repo)

Requires `act`, `actionlint`, Docker running, and `GITHUB_TOKEN` exported (a PAT; `frdrpo` is a personal account, so no GITLEAKS_LICENSE is needed).

Canonical workflows live in `.github/pdm/workflows/`; `.github/workflows/` holds GitHu-only execution copies that must be kept byte-identical (`make sync`). Edit only `.github/pdm/workflows/` and re-sync.

```sh
make lint   # actionlint on canonical workflows + drift check against .github/workflows (fast, no Docker)

# risk-health-check: use the workflow_dispatch fixture so gitleaks scans locally
# instead of calling the GitHub PR API (which hard-fails without a real PR)
act workflow_dispatch --bind -W .github/pdm/workflows/risk-health-check.yml \
  -e .act/event.workflow_dispatch.json -s GITHUB_TOKEN=$GITHUB_TOKEN \
  --env GITLEAKS_ENABLE_UPLOAD_ARTIFACT=false

# compliance-guardrail: trufflehog needs real, distinct base+head shas
act pull_request -W .github/pdm/workflows/compliance-guardrail.yml \
  -e .act/event.json -s GITHUB_TOKEN=$GITHUB_TOKEN
```

The `Makefile` targets (`test`, `test-all`) omit the `-e` fixtures — the fixture'd commands above are the ones that actually pass.

## Gotchas (hard-earned)

- **Update `.act/event.json` when you commit:** `pull_request.head.sha` is hardcoded to the current HEAD and trufflehog hard-fails if `base.sha == head.sha`. Use the git empty-tree hash `4b825dc…` as base when there's no earlier commit.
- **`osv-scanner-action@v1` does not exist.** Use `google/osv-scanner-action/osv-scanner-action@v1.8.5` (the real action lives in the `osv-scanner-action/` subdir). The OSV step only runs when dependency manifests exist (`hashFiles`); with none it's skipped — that's expected.
- **github-script v7** already injects `context` and `github`; never redeclare `const { context } = …`. Comment-posting steps are guarded with `context.payload.pull_request?.number` so synthetic events don't hit the API.
- **`act` `-s` secrets** are written to a `.secret` file in the workdir (gitignored — never commit it) and are only injected when the workflow references them. For arbitrary env (e.g. `GITLEAKS_ENABLE_UPLOAD_ARTIFACT=false`) use `--env`, not `-s`.
- **In-container writes don't persist** unless you pass `--bind` (act uses `docker cp`). That's why the risk-report `github-script` writes to `$GITHUB_WORKSPACE/.github/pdm/reports/risk-report.md` (and the release pipeline writes `deploy-*.md` under `.github/pdm/deployments/`) and local runs need `--bind` to see them.
- **Run artifacts:** `results.sarif` (gitleaks) lands in the workdir root; PDM reports and deployment records consolidate under `.github/pdm/{reports,deployments}/`. All are gitignored.
- On Apple Silicon, if Docker actions misbehave, retry with `--container-architecture linux/amd64`.