# AGENTS.md

## What this is

A PDM (Product Delivery Management) reference repo — a minimal Node service plus GitHub Actions workflows that exercise the PDM delivery gates. "PDM" here means Product Delivery Management, **not** the Python package manager.

## GitHub native workflow testing (the main task in this repo)

Workflows are verified by running them on GitHub — there is no local `act`/Docker harness. Requires the `gh` CLI (`gh auth login`) and push access.

Canonical workflows live in `.github/pdm/workflows/`; `.github/workflows/` holds GitHub-only execution copies that must be kept byte-identical (`make sync`). Edit only `.github/pdm/workflows/` and re-sync.

```sh
make lint      # actionlint on canonical + execution copies, then drift check
make test-gh   # push current branch + open/update a PR to main, then gh pr checks --watch
```

Open a PR to `main` and GitHub runs the three PR workflows natively; the release pipeline is exercised via `workflow_dispatch` (default `dry_run: true`). On PR runs the workflows post comments; on non-PR (`workflow_dispatch`) runs they upload report/deployment records as run artifacts instead.

## Gotchas (hard-earned)

- **`osv-scanner-action@v1` does not exist.** Use `google/osv-scanner-action/osv-scanner-action@v1.8.5` (the real action lives in the `osv-scanner-action/` subdir). The OSV step only runs when dependency manifests exist (`hashFiles`); with none it's skipped — that's expected.
- **github-script v7** already injects `context` and `github`; never redeclare `const { context } = …`. Comment-posting steps are guarded with `context.payload.pull_request?.number` so non-PR runs don't hit the API.
- **Cross-job files don't persist on GitHub** (each job gets a fresh workspace). Each workflow that writes reports/records must upload them as run artifacts from the same job that wrote them; artifacts use `if: !github.event.pull_request` (or `real_deploy == 'false'`) guards.
- **Workflows run on every PR synchronize** and each posts a comment — expect a comment per push on active PRs.
- **`make sync` must be run before committing**: GitHub only executes workflows from `.github/workflows/`, and `make lint` fails on drift between the two trees.
- On Apple Silicon, nothing here needs a container; `actionlint` runs natively via Homebrew.
