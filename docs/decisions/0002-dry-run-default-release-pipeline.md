# ADR 0002: Dry-run default in the release pipeline

- **Status:** Accepted

## Context

`release-pipeline` can call the GitHub Deployment API (`createDeployment`) and create real deployment records. Pushes to `main` are the production path, but the pipeline is also run manually via `workflow_dispatch` for testing and rehearsals. Without a guard, every manual run would create noisy deployment records.

## Decision

The `workflow_dispatch` input `dry_run` defaults to `true`. The build job resolves the mode:

```yaml
if [[ "${{ github.event_name }}" == "push" || "${{ inputs.dry_run }}" == "false" ]]; then
  echo "real=true"
else
  echo "real=false"
fi
```

In dry-run mode each environment job writes a `deploy-<env>.md` record under `.github/pdm/deployments/` and uploads it as an artifact instead of calling the Deployment API. A push to `main`, or an explicit `dry_run: false`, triggers real deployments. `rollback_to` always records a dry-run rollback event.

## Consequences

- Manual runs are safe by default — real deployments require an explicit opt-out.
- The same workflow supports rehearsal (artifacts) and real promotion (Deployment API).
- Records confirm what would have happened, for audit and rollback planning.
