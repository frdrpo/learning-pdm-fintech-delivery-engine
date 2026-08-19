.PHONY: fleet-sync test

# Copy the canonical agent fleet (agents/) into this repo's opencode runtime
# (.opencode/agent/). One-way copy — the local install is gitignored local state,
# runtime config (providers/models, keys) stays local (ADR 0015).
fleet-sync:
	@mkdir -p .opencode/agent
	@cp agents/*.md .opencode/agent/
	@echo "Installed agents/ -> .opencode/agent/ (runtime config stays local)"

# Local scrub-rule + frontmatter test for the fleet definitions.
test:
	node --test 'test/*.test.mjs'