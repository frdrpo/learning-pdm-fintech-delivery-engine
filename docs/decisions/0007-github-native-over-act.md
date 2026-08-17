# ADR 0007: Test workflows natively on GitHub over a local act harness

- **Status:** Accepted

## Context

Phase 0/1 originally proved the delivery engine locally with an `act`/Docker harness: `.act/` fixture files, a token, and container bind-mounts. That harness drifted from real GitHub behavior (expression evaluation, concurrency groups, environment protection, job artifacts), needed Docker to be started on every run, and on Apple Silicon nothing required a container.

## Decision

Remove the `act` harness and Dockerfile. Workflows are verified by running them on GitHub:

- Push a branch and open a PR to `main` — the three PR gates execute natively and post comments (`make test-gh` automates the push + PR + `gh pr checks --watch` loop).
- Exercise the release pipeline via `workflow_dispatch` (default `dry_run: true`), with reports and dry-run deployment records uploaded as run artifacts.
- Keep `actionlint` for fast static validation of workflow syntax and expressions, run natively via Homebrew.

## Consequences

- Runs are authoritative — they behave exactly as production GitHub would.
- Feedback loop is one push plus a PR; no Docker or fixture files to maintain.
- Non-PR results (reports, deployment records) are captured as run artifacts (ADR 0004), and PR review feedback lands as comments (ADR 0005).
- Requires `gh` CLI access and push access to the repository.