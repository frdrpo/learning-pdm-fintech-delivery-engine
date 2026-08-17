# ADR 0007: Guard PR comments with the pull request number

- **Status:** Accepted

## Context

Report and gate workflows post results as PR comments using `actions/github-script@v7`. Workflows also run on non-PR events (`workflow_dispatch`, push, schedule) where there is no pull request to comment on — an unguarded comment step would call the issues API with no issue and fail the run.

## Decision

Comment-posting steps are guarded by the pull request number:

- In YAML: `if: github.event.pull_request.number != null` (used by `risk-health-check` and `quality-gate`).
- In github-script: `if (context.payload.pull_request?.number) { ... }` (used by `compliance-guardrail`).

Additionally, github-script v7 already injects `context` and `github` — never redeclare `const { context } = ...`. Non-PR runs persist their output as run artifacts instead of commenting (ADR 0006).

## Consequences

- Non-PR runs never touch the comments API, so they cannot fail on a missing PR.
- One code path serves both PR and non-PR events: comment when a PR exists, artifact otherwise.
- Reviewers see results inline on PRs; manual/scheduled runs get artifacts.
