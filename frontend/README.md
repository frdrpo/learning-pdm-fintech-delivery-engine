# PDM Frontend (Application Surface)

The application surface of the **AI-Augmented Fintech Delivery Engine** — a PDM
(Product Delivery Management) reference repo. It is a Next.js 16 + React 19 +
TypeScript + Tailwind CSS v4 frontend that gives the PDM delivery gates
(`quality-gate`, `risk-health-check`, `release-pipeline`, `publish-pages`) real
work, and it also runs a deterministic release-train simulator.

It is **not** a generic Next.js starter: the project is pnpm-only, static-exported
to GitHub Pages, and its simulator outputs are labeled artifacts that never count
as real delivery records (ADR 0010).

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Vitest 4** + Testing Library (jsdom) for unit and component tests

## Getting started

The repo is pnpm-based (`packageManager: pnpm@11.21.0`). Node ≥25 ships no
corepack, so install pnpm directly if you don't have it (`brew install pnpm`).

```bash
cd frontend
pnpm install          # install dependencies
pnpm dev              # start the development server on http://localhost:3000
pnpm test:watch       # run tests in watch mode for TDD
```

To run the full native suite the delivery gates execute (install + lint +
typecheck + test + build), use the repo-level target from the repository root:

```bash
make test-frontend
```

Available scripts (see `package.json`): `dev`, `build`, `start`, `lint`,
`typecheck`, `test`, `test:watch`.

## Routes

The app uses the `src/app/` directory:

- `/` — the landing page: a dark fintech hero plus a grid of `FeatureCard`s
  describing the PDM delivery gates (`src/app/page.tsx`).
- `/simulator` — the release-train simulator: a deterministic what-if model of
  features boarding a fixed-cadence train (`src/app/simulator/page.tsx`,
  `src/components/simulation-panel.tsx`). Simulated outputs carry
  `kind: "simulation"` and never enter the GitHub-native delivery records
  `delivery-telemetry` reads (ADR 0010).

## Testing

Unit and component tests are colocated under `src/` (`src/**/*.test.{ts,tsx}`)
and run with Vitest in a jsdom environment. The test sequence is deterministic
(seeded) so order-dependent results are reproducible
(`vitest.config.mts`).

```bash
pnpm test        # run once
pnpm test:watch  # watch mode
```

## Build & deploy

`next.config.ts` uses `output: "export"` with `trailingSlash`, so `next build`
emits a **static site** into `frontend/out` (no Node server). The `basePath` is
driven by `NEXT_PUBLIC_BASE_PATH` so the site serves correctly from the GitHub
Pages subpath.

Publishing is handled by the `publish-pages` workflow, which runs on every push
to `develop` (and on demand): it builds the static export and deploys to the
`github-pages` environment. The live Pages site is also the post-deploy verify
target for `release-pipeline` (`DEPLOY_VERIFY_URL`).

```bash
pnpm build  # static export -> frontend/out
pnpm start  # serve the built export locally
```

## How the delivery gates exercise the frontend

- `quality-gate` — required status check on `main`; runs lint + typecheck +
  test + build against `frontend/`.
- `risk-health-check` — its code-health job runs the same suite.
- `release-pipeline` — the build job produces the deployable and the post-deploy
  verify step curls the live Pages URL.
- `publish-pages` — builds and publishes the static export to GitHub Pages.

## Documentation

- [Repository README](../README.md)
- [Architecture map](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/wiki/Architecture) — workflow map and env promotion chain
- [Local runbook](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/wiki/Local-Runbook) — hands-on workflow loop
- [Agent guide](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/wiki/Agent-Guide) — contributor and agent guidance
- [Decision log](https://github.com/frdrpo/learning-pdm-fintech-delivery-engine/wiki/Decision-Log) — ADRs (0001–0013)