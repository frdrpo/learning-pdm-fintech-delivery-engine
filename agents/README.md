# The AI Agent Fleet (canonical content)

The repository ships as "powered by an AI agent fleet." These five agent definitions are the **canonical, versioned copy** of that fleet (ADR 0015): a tracked install source that the copy-kit and any contributor can adopt, with scrubbed-generic configuration. Local runtime installs (`.opencode/`) are **not** repo content — that is where the operational config (provider/model selection, permissions) lives per-machine.

## The fleet

| Agent | File | Role | Mode | Limits |
|---|---|---|---|---|
| `pm` | [`pm.md`](pm.md) | Senior Product Manager: ROADMAP-style plans, GitHub milestone/issue materialization, wiki plan pushes | subagent | advisory: proposes plans/issues, never commits directly |
| `docs` | [`docs.md`](docs.md) | Senior technical writer: keeps the wiki in sync with `README.md` + repo | primary | drafts only until the user confirms a wiki push |
| `software-engineer` | [`software-engineer.md`](software-engineer.md) | Senior engineer: TDD/OOP/SOLID/Clean Code implementation | primary | edits only via tracked files; no run-artifact commits |
| `junior-software-engineer` | [`junior-software-engineer.md`](junior-software-engineer.md) | Read-only junior reviewer/proposer | subagent | `edit: deny`, `bash: deny` — never edits |
| `docs-reader` | [`docs-reader.md`](docs-reader.md) | Read-only bulk-file research subagent | subagent | `edit: deny`, `bash: deny` — never edits |

## Scrub rules (no local leakage)

Every definition in this directory MUST:

- carry **no model pins** (model/provider selection is a runtime concern; see `opencode.example.json`),
- contain **no absolute local paths** (temp-dir hints, home paths, machine names),
- contain **no secrets or tokens**,
- reference the wiki/repo by relative or bare-named paths only.

Do not copy values from a local `.opencode/agent/*.md` verbatim — scrub first. The `make fleet-sync` target re-installs from here into a local `.opencode/agent/` tree.

## Install path into the runtime

The opencode runtime loads project agents from `.opencode/agent/`. To install the canonical fleet locally:

```sh
make fleet-sync   # copies agents/*.md -> .opencode/agent/
```

`make lint` does **not** diff the two trees (the runtime tree is intentionally gitignored local state; ADR 0015) — `fleet-sync` is a one-way install, and drift between the canon and the local install is expected and allowed.

## Runtime config (stays local)

Per ADR 0015, runtime config (provider/model selection, keys) is **local, not repo content**. See [`opencode.example.json`](opencode.example.json) for a scrubbed, env-overridable template:

```sh
export OPENCODE_MODEL=ollama/qwen3.5:latest        # or your provider of choice
export OPENCODE_SMALL_MODEL=ollama/qwen2.5-coder:7b
```

No secrets, no absolute paths, no model pins below this directory.