.PHONY: lint test test-all test-security dry-run

# Validate workflow YAML syntax + expressions (no Docker required)
lint:
	actionlint .github/workflows/*.yml

# Run the risk-health-check workflow against a synthesized PR event
test:
	act pull_request -W .github/workflows/risk-health-check.yml -s GITHUB_TOKEN=$${GITHUB_TOKEN:?set GITHUB_TOKEN}

# Run both workflows locally
test-all:
	act pull_request -W .github/workflows/risk-health-check.yml -s GITHUB_TOKEN=$${GITHUB_TOKEN:?set GITHUB_TOKEN}
	act pull_request -W .github/workflows/compliance-guardrail.yml -s GITHUB_TOKEN=$${GITHUB_TOKEN:?set GITHUB_TOKEN}

# Dry-run a single job without executing it
dry-run:
	act -n -W .github/workflows/compliance-guardrail.yml -j compliance-scan