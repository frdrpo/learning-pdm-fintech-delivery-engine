# Agent Skills Demo + Mock CI Test Scaffold

Two ideas in one minimal subproject:

1. **A skill-consumption demo** — how an agent ("runner") loads a skill definition before acting, the same pattern opencode uses (`skill` tool ← description match). Includes a scrubbed `opencode.example.json`.
2. **A dependency-free "mocked integration test" scaffold** — a `node:test` harness that simulates running a workflow contract offline (no GitHub). This is the pattern the repo's CI integration test uses: workflow expectations are tested with mocked payloads instead of a real runner.

## What's here

```
skills/
  compliance-review.md   — skill definition read by the agent before a review
  delivery-brief.md      — skill definition for producing a delivery brief
runner.mjs               — tiny "agent runner" that resolves a skill by description
test/skills.test.mjs     — node:test scaffold (no deps, mocked inputs)
opencode.example.json    — scrubbed runtime config template (copy to opencode.json)
README.md                — this file
```

## Run the scaffold (no install)

```sh
node --test 'test/*.test.mjs'     # < 1s, zero dependencies
node runner.mjs "compliance review"   # resolves the compliance-review skill
```

## The "mocked in CI" idea

The test feeds `runner.mjs` human-readable skill names and asserts it resolves the right definition, exactly like the repo's `scripts/examples-test.mjs` *mocks* the workflow triggers it validates (it parses `on:` and artifact guards rather than launching GitHub Actions). Teams adopt this scaffold to validate their agent/action contracts offline before the native PR run.

## Adopt in your repo

```sh
cp -R skills runner.mjs test your-repo/
cp opencode.example.json your-repo/opencode.json
node --test your-repo/test/
```

Keep `opencode.json` out of git (per-machine model pins — the fleet canon lives in `agents/`).