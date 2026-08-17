PDM_WF    := .github/pdm/workflows
GH_WF     := .github/workflows

.PHONY: lint sync test test-gate test-deploy test-all dry-run

# Mirror canonical workflows into .github/workflows (GitHub only executes there)
sync:
	@mkdir -p $(GH_WF)
	@cp $(PDM_WF)/*.yml $(GH_WF)/
	@echo "Synced $(PDM_WF) -> $(GH_WF)"

# Validate workflow YAML syntax + expressions (no Docker required),
# and fail if the GitHub execution copies have drifted from canonical.
lint:
	actionlint $(PDM_WF)/*.yml
	@if diff -r $(PDM_WF) $(GH_WF) >/dev/null 2>&1; then \
		echo "OK: execution copies are in sync with $(PDM_WF)"; \
	else \
		echo "DRIFT: .github/workflows/ differs from $(PDM_WF). Run 'make sync' and commit both sides."; \
		exit 1; \
	fi

# Run the risk-health-check workflow against a synthesized PR event
test:
	@[ -f .secret ] && . ./.secret; \
	act pull_request -W $(PDM_WF)/risk-health-check.yml -s GITHUB_TOKEN=$${GITHUB_TOKEN:?set GITHUB_TOKEN}

# Run the quality gate workflow locally against a synthesized PR event
test-gate:
	@[ -f .secret ] && . ./.secret; \
	act pull_request --bind -W $(PDM_WF)/quality-gate.yml \
		-e .act/event.json -s GITHUB_TOKEN=$${GITHUB_TOKEN:?set GITHUB_TOKEN}

# Run the release deployment pipeline locally as a dry-run (workflow_dispatch fixture)
test-deploy:
	@[ -f .secret ] && . ./.secret; \
	act workflow_dispatch --bind --artifact-server-path .act/artifacts \
		-W $(PDM_WF)/release-pipeline.yml \
		-e .act/event.workflow_dispatch.json -s GITHUB_TOKEN=$${GITHUB_TOKEN:?set GITHUB_TOKEN}

# Run all workflows locally
test-all:
	@[ -f .secret ] && . ./.secret; \
	act pull_request -W $(PDM_WF)/risk-health-check.yml -s GITHUB_TOKEN=$${GITHUB_TOKEN:?set GITHUB_TOKEN} && \
	act pull_request -W $(PDM_WF)/compliance-guardrail.yml -s GITHUB_TOKEN=$${GITHUB_TOKEN:?set GITHUB_TOKEN} && \
	act pull_request --bind -W $(PDM_WF)/quality-gate.yml -e .act/event.json -s GITHUB_TOKEN=$${GITHUB_TOKEN:?set GITHUB_TOKEN} && \
	act workflow_dispatch --bind --artifact-server-path .act/artifacts \
		-W $(PDM_WF)/release-pipeline.yml \
		-e .act/event.workflow_dispatch.json -s GITHUB_TOKEN=$${GITHUB_TOKEN:?set GITHUB_TOKEN}

# Dry-run a single job without executing it
dry-run:
	 act -n -W $(PDM_WF)/compliance-guardrail.yml -j compliance-scan