# Decision Log

Architecture Decision Records (ADRs) for the PDM delivery engine. Each entry records a decision, the context that motivated it, and its consequences. New decisions follow the same format as `NNNN-slug.md`.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-canonical-synced-workflow-copies.md) | Canonical and mirrored workflow copies | Accepted |
| [0002](0002-dry-run-default-release-pipeline.md) | Dry-run default in the release pipeline | Accepted |
| [0003](0003-empty-tree-base-sha.md) | Empty-tree base SHA for trufflehog | Accepted |
| [0004](0004-osv-scanner-action-subdirectory-path.md) | osv-scanner-action resolves under a subdirectory path | Accepted |
| [0005](0005-github-native-over-act.md) | Test workflows natively on GitHub over a local act harness | Accepted |
| [0006](0006-run-artifact-persistence.md) | Persist reports and records as run artifacts | Accepted |
| [0007](0007-comment-guard-pull-request-number.md) | Guard PR comments with the pull request number | Accepted |
| [0008](0008-github-native-delivery-telemetry.md) | GitHub-native delivery telemetry over an external observability tool | Accepted |
| [0009](0009-release-train-cadence.md) | Fixed-cadence release-train calendar with a native-record on-time signal | Accepted |
| [0010](0010-simulations-are-labeled-artifacts.md) | Simulations are labeled artifacts, never native delivery records | Accepted |
| [0011](0011-branch-topology-restore-develop.md) | Restore `develop` as the integration and default branch | Accepted |
| [0012](0012-docs-home-wiki-canonical.md) | The wiki is the canonical docs home; `docs/` is the committed mirror | Accepted |

Superseded or rejected decisions are removed from the index but the record itself may note the supersession (see [0006](0006-run-artifact-persistence.md)).
