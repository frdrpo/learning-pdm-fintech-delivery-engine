# ADR 0004: Persist reports and records as run artifacts

- **Status:** Accepted (replaces the earlier `--bind` volume-mount approach)

## Context

Cross-job files do not persist on GitHub Actions — each job gets a fresh workspace. Earlier iterations of the repo used a local `act`/Docker harness where a `--bind` volume mount let workflows write reports and deployment records straight into the working directory. With the move to GitHub-native testing (see ADR 0007), there is no shared filesystem, so results written inside a job workspace would be lost when the job ends.

## Decision

Workflows that produce reports or deployment records write them inside the job workspace (`.github/pdm/reports/`, `.github/pdm/deployments/`) and upload them with `actions/upload-artifact@v4` from the same job that wrote them. Uploads are guarded so only non-PR runs persist artifacts (`if: github.event.pull_request.number == null` for reports, `if: needs.build.outputs.real_deploy == 'false'` for dry-run deployment records). PR runs surface the same content as comments instead (see ADR 0005). The output directories are gitignored — artifacts are per-run, never committed.

## Consequences

- Reports and records are downloadable from the run's "Artifacts" section for non-PR runs.
- No shared volumes or persistent storage are needed; each job owns its upload.
- Content that matters for PR review is delivered as comments on the PR instead.
- Any workflow that writes a report/record must upload it from the same job — a hard-won cross-job constraint.
