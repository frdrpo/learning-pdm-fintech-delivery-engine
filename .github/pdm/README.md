# PDM Folder

Single home for Product Delivery Management (PDM) workflow and deployment material. GitHub only executes workflows from `.github/workflows/`, so that directory holds mirrored copies kept byte-identical by `make sync`.

## Layout

- `workflows/` - Canonical source of truth for all PDM workflow definitions.
- `deployments/` - Dry-run deployment records written by `release-pipeline.yml` and uploaded as run artifacts.
- `reports/` - Report artifacts written by `risk-health-check.yml` and `quality-gate.yml` and uploaded as run artifacts.

## Keeping `.github/workflows/` in sync

The canonical workflows live here. `.github/workflows/` must mirror them exactly for GitHub to pick up the definitions.

```sh
make sync     # copy .github/pdm/workflows/*.yml -> .github/workflows/
make lint     # actionlint on canonical workflows + drift check against the copies
```

Edit only `.github/pdm/workflows/`, then run `make sync` and commit both sides. `make lint` fails if the copies drift.

## Verifying on GitHub (native)

Workflows are tested by running them on GitHub, not locally:

- Open a PR to `main` → the PR workflows run and post status comments.
- `workflow_dispatch` on `release-pipeline.yml` (default `dry_run: true`) → the build/deploy jobs run and upload dry-run deployment records as run artifacts.
- Non-PR runs of `risk-health-check` / `quality-gate` upload their reports as run artifacts.