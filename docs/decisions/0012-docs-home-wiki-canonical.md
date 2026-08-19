# ADR 0012: The wiki is the canonical docs home; `docs/` is the committed mirror

- **Status:** Accepted

## Context

Since the 2026-08-18 migration, project documentation has lived in two places: a published **wiki** and a tracked **`docs/`** tree in the repo. The surfaces had drifted without a decided home, which produced direct user-facing errors:

- The wiki Agent-Guide claimed "there is no `docs/` directory in this repo" (false — the repo tracks a 25-file `docs/` tree).
- The wiki ROADMAP said "Phases 0–18 complete" while `docs/ROADMAP.md` said "Phases 0–14"/"Phases 0–8".

GitHub wikis are cheap to edit and render instantly at a canonical URL, but they are a second git repo with no code-review gates. The repo `docs/` tree deploys through the PR gates but is not directly browseable as a canonical docs page. Neither surface alone satisfies both "canonical, always-current" and "reviewed, versioned."

## Decision

Adopt the same pattern that ADR 0001 established for workflows: one canonical home plus a mechanically-synced copy.

- **The wiki is the canonical, always-current published docs home.** Status lines, ROADMAP updates, records, and evidence land there first and are authoritative.
- **`docs/` remains the committed mirror**, kept in sync with the wiki, for offline use and PR review. Content must be identical except link syntax (the wiki uses `[[WikiLink]]`; the repo uses relative paths).
- README documentation shortcuts point at the wiki, with `docs/` listed as the tracked mirror.

## Consequences

- The false "no `docs/` directory" claim is gone; the repository layout is accurate in both surfaces.
- Contributors edit the wiki for canonical docs; repo-side `docs/` changes travel through a PR and are mirrored to the wiki (and vice versa) so the surfaces never silently diverge.
- A cross-surface consistency check (README ↔ `docs/` ↔ wiki) is the gate equivalent for wiki-only changes (Phases 19–21 of the ROADMAP exercise it).
- One additional sync obligation per docs change — the same cost ADR 0001 already accepted for workflows.