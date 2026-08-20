PDM_WF    := .github/pdm/workflows
GH_WF     := .github/workflows

.PHONY: lint sync sync-deps fleet-sync test-frontend test-gh test-consumer-path test-examples test-scripts test-agent-runner topology-check topology-apply

# Mirror canonical workflows into .github/workflows (GitHub only executes there)
sync:
	@mkdir -p $(GH_WF)
	@cp $(PDM_WF)/*.yml $(GH_WF)/
	@echo "Synced $(PDM_WF) -> $(GH_WF)"

# Adopt dependency-version bumps into the canonical tree. Dependabot only scans
# .github/workflows/ (standard GitHub Actions location), so after a dependabot
# merge run this to copy the bumped execution copies back into canonical, then
# 'make sync' to re-mirror. Run 'make lint' to confirm no drift.
sync-deps:
	@mkdir -p $(PDM_WF)
	@cp $(GH_WF)/*.yml $(PDM_WF)/
	@echo "Adopted $(GH_WF) version bumps into $(PDM_WF); run 'make sync' to re-mirror."

# Install the canonical AI agent fleet (agents/) into the local opencode
# runtime (.opencode/agent/). One-way copy — the local install is gitignored
# local state (ADR 0015), so no drift check applies here.
fleet-sync:
	@mkdir -p .opencode/agent
	@cp agents/*.md .opencode/agent/
	@echo "Installed agents/ -> .opencode/agent/ (runtime config stays local, ADR 0015)"

# Run the frontend suite natively (no container needed): install + lint +
# typecheck + tests + build. Requires pnpm on PATH (brew install pnpm, or
# corepack on Node <25). Mirrors what the PDM quality gate runs on every PR;
# keep `pnpm test:watch` in frontend/ for fast local TDD feedback.
test-frontend:
	pnpm --dir frontend install --frozen-lockfile
	pnpm --dir frontend run lint
	pnpm --dir frontend run typecheck
	pnpm --dir frontend test
	pnpm --dir frontend run build

# Validate workflow YAML syntax + expressions (no Docker required),
# and fail if the GitHub execution copies have drifted from canonical.
# Note: actionlint 1.7.x does NOT lint composite action metadata
# (.github/actions/*/action.yml) — those are validated structurally by
# 'make test-examples' (E6), which runs in the quality-gate workflow-lint job.
lint:
	actionlint $(PDM_WF)/*.yml $(GH_WF)/*.yml
	@if diff -r $(PDM_WF) $(GH_WF) >/dev/null 2>&1; then \
		echo "OK: execution copies are in sync with $(PDM_WF)"; \
	else \
		echo "DRIFT: .github/workflows/ differs from $(PDM_WF). Run 'make sync' and commit both sides."; \
		exit 1; \
	fi

# Verify the PDM workflows natively on GitHub: push the current branch and open
# (or update) a PR to develop so the pull_request triggers execute, then surface
# the run status. Requires the gh CLI (gh auth login). main only receives PRs
# for version releases (cut by release-on-tag dispatch).
test-gh:
	@BRANCH=$$(git symbolic-ref --short HEAD); \
	echo "Pushing $$BRANCH and opening a PR to develop (PDM workflows will run natively)..."; \
	git push -u origin $$BRANCH; \
	if ! gh pr view $$BRANCH --json number --jq .number >/dev/null 2>&1; then \
		gh pr create --base develop --head $$BRANCH \
			--title "PDM workflow run ($$BRANCH)" \
			--body "Opened by \`make test-gh\` to run the PDM quality gates natively on GitHub."; \
	fi; \
	echo ""; \
	echo "Watching the latest run for $$BRANCH (Ctrl-C to stop watching; checks keep running):"; \
	gh pr checks --watch $$BRANCH

# P17 copy-kit rehearsal (the plan's documented substitution for a second repo):
# execute the kit §1 copy commands literally into a scratch consumer workspace,
# then run the engine's offline checks INSIDE that workspace + the kit §8 matrix.
# Requires actionlint + pnpm on PATH (homebrew pnpm on macOS; see AGENTS.md).
test-consumer-path:
	@node scripts/consumer-smoke.mjs --root . $(REHEARSAL_ARGS)

# Issue #184 — validate the examples/ deliverables offline (READMEs + structure,
# agent scrub-rules, workflow template actionlint + artifact-guard invariants,
# composite-action structural checks, mocked "agent runner" contract test).
# Runs in the quality-gate workflow-lint job.
test-examples:
	@node scripts/examples-test.mjs

# Unit tests for the delivery-engine scripts (scripts/test/*.test.mjs) —
# currently the workflow-run telemetry & cost estimator. Runs in the
# quality-gate workflow-lint job alongside test-examples.
test-scripts:
	@node --test scripts/test/*.test.mjs

# Issue #173 — unit + end-to-end tests for the dry-run AI agent runner
# (ops/agent-runner): diff parsing, test-scaffold + changelog generation, mock
# model, telemetry, and a full CLI run on a sample PR payload. Runs in the
# ai-agent-mvp workflow before any comment/artifact step.
test-agent-runner:
	@node --test ops/agent-runner/test/*.test.mjs

# Kit §2: idempotent topology check/apply against the live repo (gh CLI).
# `make topology-check` verifies the documented target state; `make topology-apply`
# converges it (protection, environments, Pages, DEPLOY_VERIFY_URL).
topology-check:
	@node scripts/wire-topology.mjs --check $(TOPOLOGY_REPO)

topology-apply:
	@node scripts/wire-topology.mjs --apply $(TOPOLOGY_REPO)