# AI Agent Runner — Issue #173 MVP (dry-run)

A deterministic, dependency-free agent runner that analyzes the TypeScript files
changed in a pull request and produces **suggested** test scaffolds + a short
changelog snippet. The MVP is **dry-run only**: it posts a draft-style comment
on the PR and never commits, pushes, or merges.

## Layout

```
ops/agent-runner/
  runner.mjs              — CLI entry point (reads stdin or --files JSON)
  lib/
    diff-parser.mjs       — GitHub files payload -> TS-diff analysis
    test-scaffold.mjs     — vitest-style test scaffold + changelog generation
    mock-model.mjs        — the "mocked agent endpoint" (deterministic, MVP scope)
    telemetry.mjs         — call/latency/error counters (no sensitive data)
  test/
    diff-parser.test.mjs  — unit tests for diff parsing (>=1 per module)
    test-scaffold.test.mjs— unit tests for scaffold/changelog generation
    mock-model.test.mjs   — unit tests for the mock endpoint + secret guard
    telemetry.test.mjs    — unit tests for telemetry
    e2e.test.mjs          — end-to-end run of runner.mjs on a sample PR payload
```

## Run it locally

```sh
# Unit + e2e tests (repo quality gate runs these too)
node --test ops/agent-runner/test/*.test.mjs

# Analyze a PR payload from a file
node ops/agent-runner/runner.mjs --files pr-files.json --out report.json

# Or pipe from stdin
curl -s "https://api.github.com/repos/<owner>/<repo>/pulls/<n>/files" | node ops/agent-runner/runner.mjs
```

Input is the GitHub `rest.pulls.listFiles` payload shape:

```json
{
  "number": 123,
  "title": "feat: add quote search",
  "files": [
    { "filename": "src/quote.ts", "status": "modified", "additions": 2, "deletions": 1, "patch": "@@ ... @@" }
  ]
}
```

## Workflow wiring

The canonical workflow lives at `.github/pdm/workflows/ai-agent-mvp.yml`
(mirrored to `.github/workflows/` via `make sync`). It:

1. Fetches the PR files payload (`github-script`, token auto-injected).
2. Runs `node ops/agent-runner/runner.mjs` with the payload.
3. Posts the suggestions as a comment **only when**
   `github.event.pull_request.number != null` (ADR 0007 guard).
4. On non-PR (`workflow_dispatch`) runs, uploads the report + telemetry as run
   artifacts (ADR 0006) instead of commenting.

## Required GitHub Secrets & token scopes

- **No model API key is required for the MVP pilot** — the runner uses the
  mocked model (`mock-v1`) by default. No secret is read anywhere in the MVP.
- The workflow's `GITHUB_TOKEN` uses least-privilege permissions:
  `contents: read`, `pull-requests: write` (only the latter is needed to post
  the dry-run comment). It has **no** `main`-write scope.
- A future real agent endpoint that needs an API key **must** reference it only
  via a GitHub Secret/Environment secret (e.g. `AI_AGENT_API_KEY`) set at the
  repo/org level — never committed. See the security checklist below.

## Dry-run toggle & kill switch

- The workflow has a `workflow_dispatch` `dry_run` input (default `true`).
- The MOCKED/REAL switch is the runner's model selection: MVP ships with
  `mock-model.mjs` only, so every run is inherently dry-run.
- To fully disable the workflow: remove/rename
  `.github/pdm/workflows/ai-agent-mvp.yml` in the canonical tree, run
  `make sync`, and commit both sides. Rollback is a revert of the enabling PR.

## Security & compliance (must hold before any pilot)

- [ ] No secrets committed; runner refuses secret-looking diff payloads
      (`assertNoSecrets`) before any model call.
- [ ] Least-privileged token: `contents: read`, `pull-requests: write` only.
- [ ] No write to `main`; comments are non-mutating PR feedback (no file edits).
- [ ] PII/PCI masking documented before ever wiring a real model endpoint; the
      mock model never transmits data anywhere.
- [ ] `dry_run` default true; hard kill switch documented above.
- [ ] Telemetry carries no diff content, no secrets, no user data (see
      `lib/telemetry.mjs`).
- [ ] Human-in-the-loop: the agent only *suggests*; a maintainer must apply the
      scaffold/changelog themselves. The action performs zero
      code/config-changing writes.

See the ADR (wiki: `ADR-0017-AI-Agent-MVP-Dry-Run`) for scope, boundaries,
data policy, approval flow, and rollback.