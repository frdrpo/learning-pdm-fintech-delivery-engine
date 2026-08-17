# AI-Augmented Fintech Delivery Engine

A comprehensive reference implementation for modern Product Delivery Management (PDM). This project demonstrates how to rescue complex product launches by combining agile release trains, trunk-based development, shift-left compliance, and automated GitHub Action runners powered by AI agents to eliminate operational friction and ensure predictable, on-time delivery.

## Overview

This repository serves as a reference implementation for modern Product Delivery Management. It demonstrates how to combine trunk-based development, automated shift-left compliance, and AI-driven risk mitigation to eliminate operational friction and ensure predictable, on-time product releases.

## Repository Structure

All PDM workflow and deployment material is consolidated under a single folder, `.github/pdm/`:

- `.github/pdm/workflows/` - Canonical workflow definitions (source of truth).
  - `risk-health-check.yml` - Automates PR size tracking, code complexity analysis, and PDM risk reporting.
  - `compliance-guardrail.yml` - Enforces shift-left security scans and secret detection before code merges.
  - `quality-gate.yml` - Required status check: actionlint on workflows + toolchain-driven lint/test/build, aggregated into a single branch-protection gate.
  - `release-pipeline.yml` - Promotes builds through development/staging/production environments and records dry-run deployments.
- `.github/pdm/deployments/` - Dry-run deployment records from the release pipeline (gitignored).
- `.github/pdm/reports/` - Risk and quality-gate report artifacts (gitignored).
- `.github/workflows/` - Mirrored execution copies of `.github/pdm/workflows/`. GitHub only executes workflows from this directory, so keep the copies in sync with `make sync`.

## Prerequisites

- Docker Desktop running (act spawns per-job containers through the host engine).
- [act](https://github.com/nektos/act) and [actionlint](https://github.com/rhysd/actionlint) installed (`brew install act actionlint`).
- A `GITHUB_TOKEN` PAT exported in the shell: `export GITHUB_TOKEN=...` (or a gitignored `.secret` file sourced by the Makefile targets).

## Local Testing

To test these GitHub Actions workflows locally without committing changes, use [act](https://github.com/nektos/act):

```bash
make sync && make lint   # mirror canonical workflows and validate them
act pull_request --secret-file .secrets
```

See `docs/ROADMAP.md` for the full delivery-engine roadmap and phase breakdown.
