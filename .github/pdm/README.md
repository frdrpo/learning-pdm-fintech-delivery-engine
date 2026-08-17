# PDM Folder

Single home for Product Delivery Management (PDM) workflow and deployment material. GitHub only executes workflows from `.github/workflows/`, so that directory holds mirrored copies kept byte-identical by `make sync`.

## Layout

- `workflows/` - Canonical source of truth for all PDM workflow definitions.
- `deployments/` - Dry-run deployment records written by `release-pipeline.yml` (gitignored).
- `reports/` - Dry-run report artifacts written by `risk-health-check.yml` and `quality-gate.yml` (gitignored).

## Keeping `.github/workflows/` in sync

The canonical workflows live here. `.github/workflows/` must mirror them exactly for GitHub to pick up the definitions.

```sh
make sync     # copy .github/pdm/workflows/*.yml -> .github/workflows/
make lint     # actionlint on canonical workflows + drift check against the copies
```

Edit only `.github/pdm/workflows/`, then run `make sync` and commit both sides. `make lint` fails if the copies drift.