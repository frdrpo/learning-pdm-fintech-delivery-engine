# Fintech Agent Runner — reference implementation

A minimal opencode agent fleet for a regulated fintech product. Demonstrates the ADR 0015 pattern this repo ships: canonical, model-pin-free agent definitions in `agents/`, a one-way `fleet-sync` install into the local runtime, and runtime config (providers/models/keys) kept strictly local.

## What's here

```
agents/
  pm.md                — product-delivery planner (subagent, advisory only)
  delivery-engineer.md — TDD implementation agent (primary)
  compliance-reviewer.md — read-only fintech/compliance reviewer (subagent)
  opencode.example.json — scrubbed runtime-config template ({env:...} overridable)
Makefile                — fleet-sync (+) target
test/agents.test.mjs    — scrub-rule + frontmatter test (node --test)
README.md               — this file
```

## Adopt it in your repo

```sh
# 1. copy the fleet + Makefile into your repo
cp -R agents Makefile your-repo/
cd your-repo

# 2. install the fleet into your opencode runtime (one-way, gitignored)
make fleet-sync         # agents/*.md -> .opencode/agent/

# 3. create your local runtime config from the scrubbed template
cp agents/opencode.example.json opencode.json
# set models via env (never edit opencode.json with real keys in-tree)
export OPENCODE_MODEL=your/provider:model
export OPENCODE_SMALL_MODEL=your/provider:small
```

Keep `.opencode/` and `opencode.json` out of git (they hold per-machine model pins and keys). The definitions in `agents/` must stay scrub-clean: no model pins, no absolute paths, no secrets — the test enforces it.

## Roles

| Agent | Mode | Role |
|---|---|---|
| `pm` | subagent | ROADMAP-style delivery plans + GitHub task materialization; advisory only, never commits |
| `delivery-engineer` | primary | TDD/OOP/SOLID implementation after delegating research |
| `compliance-reviewer` | subagent | read-only review of diffs for fintech/compliance risk before merge |

## Local verification

```sh
make fleet-sync
node --test 'test/*.test.mjs'
```

The test checks: every `agents/*.md` has a YAML `description:` + `mode:` frontmatter, `mode` is one of the four valid opencode modes, and no definition contains a model pin, an absolute path, a secret, or a failure-classifier word in its description. The top-level `make test-examples` runs this test plus the other examples' checks.