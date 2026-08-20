// Unit tests for scripts/workflow-run-telemetry.mjs (workflow-run metrics +
// cost estimator). Pure-function tests with fixture run data — no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRunMetrics,
  formatReport,
  DEFAULT_COST_PER_MINUTE,
} from '../workflow-run-telemetry.mjs';

const WINDOW = '2026-05-21T00:00:00.000Z';

const run = (overrides) => ({
  id: 1,
  name: 'PDM Quality Gate (Status Check)',
  workflow_id: 123,
  run_number: 1,
  head_branch: 'develop',
  conclusion: 'success',
  run_started_at: '2026-06-01T10:00:00.000Z',
  updated_at: '2026-06-01T10:05:00.000Z',
  ...overrides,
});

test('computeRunMetrics groups runs per workflow and derives durations', () => {
  const runs = [
    run({ id: 1, workflow_id: 123, name: 'Gate', run_started_at: '2026-06-01T10:00:00Z', updated_at: '2026-06-01T10:05:00Z', conclusion: 'success' }),
    run({ id: 2, workflow_id: 123, name: 'Gate', run_started_at: '2026-06-02T10:00:00Z', updated_at: '2026-06-02T10:07:00Z', conclusion: 'failure' }),
    run({ id: 3, workflow_id: 456, name: 'Pages', run_started_at: '2026-06-03T10:00:00Z', updated_at: '2026-06-03T10:03:00Z', conclusion: 'success' }),
  ];
  const m = computeRunMetrics(runs, { windowStartIso: WINDOW, costPerMinute: DEFAULT_COST_PER_MINUTE });

  assert.equal(m.status, 'computed');
  assert.equal(m.totals.runs, 3);
  assert.equal(m.totals.minutes, 15); // 5 + 7 + 3
  assert.equal(m.workflows['123'].name, 'Gate');
  assert.equal(m.workflows['123'].runs, 2);
  assert.equal(m.workflows['123'].success, 1);
  assert.equal(m.workflows['123'].failure, 1);
  assert.equal(m.workflows['123'].median_minutes, 6); // median of [5, 7]
  assert.equal(m.workflows['456'].runs, 1);
  assert.equal(m.workflows['456'].median_minutes, 3);
});

test('computeRunMetrics ignores runs outside the lookback window', () => {
  const runs = [
    run({ id: 1, workflow_id: 123, run_started_at: '2026-01-01T10:00:00Z', updated_at: '2026-01-01T10:05:00Z' }),
    run({ id: 2, workflow_id: 123, run_started_at: '2026-06-10T10:00:00Z', updated_at: '2026-06-10T10:05:00Z' }),
  ];
  const m = computeRunMetrics(runs, { windowStartIso: WINDOW, costPerMinute: DEFAULT_COST_PER_MINUTE });
  assert.equal(m.totals.runs, 1);
  assert.equal(m.workflows['123'].runs, 1);
});

test('computeRunMetrics reports insufficient-data when the API is unreachable', () => {
  const m = computeRunMetrics(null, { windowStartIso: WINDOW, costPerMinute: DEFAULT_COST_PER_MINUTE });
  assert.equal(m.status, 'insufficient-data');
  assert.match(m.note, /unreachable/i);
});

test('computeRunMetrics handles an empty run list with zero cost', () => {
  const m = computeRunMetrics([], { windowStartIso: WINDOW, costPerMinute: DEFAULT_COST_PER_MINUTE });
  assert.equal(m.status, 'computed');
  assert.equal(m.totals.runs, 0);
  assert.equal(m.totals.minutes, 0);
  assert.equal(m.cost_estimate.usd, 0);
});

test('computeRunMetrics estimates cost from total minutes at the configured rate', () => {
  const runs = [
    run({ id: 1, workflow_id: 123, run_started_at: '2026-06-01T10:00:00Z', updated_at: '2026-06-01T10:10:00Z' }),
  ];
  const m = computeRunMetrics(runs, { windowStartIso: WINDOW, costPerMinute: 0.5 });
  assert.equal(m.totals.minutes, 10);
  assert.equal(m.cost_estimate.usd, 5);
  assert.equal(m.cost_estimate.rate_per_minute, 0.5);
});

test('formatReport renders the cost section with documented assumptions', () => {
  const m = computeRunMetrics(
    [run({ id: 1, workflow_id: 123, name: 'Gate', run_started_at: '2026-06-01T10:00:00Z', updated_at: '2026-06-01T10:05:00Z' })],
    { windowStartIso: WINDOW, costPerMinute: DEFAULT_COST_PER_MINUTE },
  );
  const report = formatReport(m, { ts: '2026060110', lookbackDays: 90 });
  assert.match(report, /Workflow-run metrics & cost estimate/);
  assert.match(report, /Gate/);
  assert.match(report, /estimated/i);
  assert.match(report, /assumption/i);
});

test('formatReport renders insufficient-data honestly', () => {
  const m = computeRunMetrics(null, { windowStartIso: WINDOW, costPerMinute: DEFAULT_COST_PER_MINUTE });
  const report = formatReport(m, { ts: '2026060110', lookbackDays: 90 });
  assert.match(report, /insufficient-data/i);
});