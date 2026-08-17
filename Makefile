PDM_WF    := .github/pdm/workflows
GH_WF     := .github/workflows

.PHONY: lint sync sync-deps test-gh

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

# Validate workflow YAML syntax + expressions (no Docker required),
# and fail if the GitHub execution copies have drifted from canonical.
lint:
	actionlint $(PDM_WF)/*.yml $(GH_WF)/*.yml
	@if diff -r $(PDM_WF) $(GH_WF) >/dev/null 2>&1; then \
		echo "OK: execution copies are in sync with $(PDM_WF)"; \
	else \
		echo "DRIFT: .github/workflows/ differs from $(PDM_WF). Run 'make sync' and commit both sides."; \
		exit 1; \
	fi

# Verify the PDM workflows natively on GitHub: push the current branch and open
# (or update) a PR to main so the pull_request triggers execute, then surface
# the run status. Requires the gh CLI (gh auth login).
test-gh:
	@BRANCH=$$(git symbolic-ref --short HEAD); \
	echo "Pushing $$BRANCH and opening a PR to main (PDM workflows will run natively)..."; \
	git push -u origin $$BRANCH; \
	if ! gh pr view $$BRANCH --json number --jq .number >/dev/null 2>&1; then \
		gh pr create --base main --head $$BRANCH \
			--title "PDM workflow run ($$BRANCH)" \
			--body "Opened by \`make test-gh\` to run the PDM quality gates natively on GitHub."; \
	fi; \
	echo ""; \
	echo "Watching the latest run for $$BRANCH (Ctrl-C to stop watching; checks keep running):"; \
	gh pr checks --watch $$BRANCH