#!/usr/bin/env node
// Workflow-run telemetry & cost estimator.
//
// Usage: node scripts/workflow-run-telemetry.mjs <outdir>
//
// Reads GitHub Actions workflow runs via the REST API and derives per-workflow
// run counts, durations, success rates, and an estimated runner cost. Writes:
//
//   delivery-workflow-runs-<ts>.json   per-workflow metrics + cost estimate
//   delivery-workflow-runs-<ts>.md     human-readable report section
//
// Env:
//   GITHUB_TOKEN            required — repo read access (the default actions token)
//   GITHUB_REPOSITORY       owner/repo (set natively by GitHub Actions)
//   GITHUB_API_URL          API base, defaults to https://api.github.com
//   LOOKBACK_DAYS           measurement window, default 90
//   RUNNER_COST_PER_MINUTE  estimated USD per runner-minute, default 0.008
//                           (GitHub-hosted ubuntu-latest private-repo rate;
//                           public repos run free — see the wiki Telemetry page)
//
// Cost is an ESTIMATE, never an API number: the org billing endpoint needs
// elevated tokens, so we multiply sampled run minutes by the published rate
// and document the assumptions. When the runs API is unreachable the report
// says insufficient-data rather than inventing numbers (telemetry-honesty).

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DEFAULT_COST_PER_MINUTE = 0.008;

const median = (nums) => {
  if (nums.length === 0) return null;
  const sorted = nums.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// Derive per-workflow run metrics + a cost estimate from a list of workflow
// runs (the GitHub Actions "list workflow runs" payload). `runs` is null when
// the API was unreachable — the caller then gets an honest insufficient-data
// result instead of invented numbers.
export function computeRunMetrics(runs, { windowStartIso, costPerMinute = DEFAULT_COST_PER_MINUTE }) {
  if (runs === null) {
    return { status: 'insufficient-data', note: 'workflow-runs API unreachable', workflows: {}, totals: {}, cost_estimate: null };
  }

  const windowStart = new Date(windowStartIso).getTime();
  const inWindow = runs.filter((r) => r.run_started_at && new Date(r.run_started_at).getTime() >= windowStart);

  const byWorkflow = new Map();
  for (const r of inWindow) {
    const key = String(r.workflow_id);
    if (!byWorkflow.has(key)) {
      byWorkflow.set(key, { id: key, name: r.name || `workflow ${key}`, durations: [], success: 0, failure: 0, other: 0 });
    }
    const wf = byWorkflow.get(key);
    const started = new Date(r.run_started_at).getTime();
    const updated = new Date(r.updated_at || r.run_started_at).getTime();
    const minutes = Math.max(0, (updated - started) / 60000);
    wf.durations.push(minutes);
    if (r.conclusion === 'success') wf.success += 1;
    else if (r.conclusion === 'failure') wf.failure += 1;
    else wf.other += 1;
  }

  const workflows = Object.fromEntries(
    [...byWorkflow.entries()].map(([key, wf]) => [
      key,
      {
        name: wf.name,
        runs: wf.durations.length,
        success: wf.success,
        failure: wf.failure,
        other: wf.other,
        total_minutes: Number(wf.durations.reduce((a, b) => a + b, 0).toFixed(2)),
        median_minutes: median(wf.durations) === null ? null : Number(median(wf.durations).toFixed(2)),
      },
    ]),
  );

  const totalMinutes = Object.values(workflows).reduce((a, w) => a + w.total_minutes, 0);
  const totalRuns = Object.values(workflows).reduce((a, w) => a + w.runs, 0);
  const totalSuccess = Object.values(workflows).reduce((a, w) => a + w.success, 0);

  return {
    status: 'computed',
    workflows,
    totals: {
      runs: totalRuns,
      minutes: Number(totalMinutes.toFixed(2)),
      success: totalSuccess,
      success_rate: totalRuns === 0 ? null : Number((totalSuccess / totalRuns).toFixed(3)),
    },
    cost_estimate: {
      usd: Number((totalMinutes * costPerMinute).toFixed(2)),
      rate_per_minute: costPerMinute,
      note: 'estimate: sampled run minutes x published GitHub-hosted ubuntu-latest rate; public repos run free',
    },
  };
}

export function formatReport(metrics, { ts, lookbackDays }) {
  if (metrics.status === 'insufficient-data') {
    return [
      '### Workflow-run metrics & cost estimate',
      '',
      `  - _insufficient-data: ${metrics.note} — no workflow-run data this window._`,
      '',
    ].join('\n');
  }

  const wfLines = Object.values(metrics.workflows).map(
    (w) =>
      `  - **${w.name}**: ${w.runs} run(s) — median ${w.median_minutes ?? 'n/a'}m, total ${w.total_minutes}m (${w.success} success / ${w.failure} failure / ${w.other} other)`,
  );

  return [
    '### Workflow-run metrics & cost estimate',
    '',
    `_Sampled from the GitHub Actions runs API (most recent 100 runs, last ${lookbackDays} days). Durations are run_started_at → updated_at; cost is an estimate with documented assumptions, not a billing figure._`,
    '',
    ...(wfLines.length > 0 ? wfLines : ['  - _No workflow runs recorded in the window._']),
    '',
    `  - **Total**: ${metrics.totals.runs} run(s), ${metrics.totals.minutes}m — success rate ${metrics.totals.success_rate === null ? 'n/a' : `${(metrics.totals.success_rate * 100).toFixed(1)}%`}`,
    `  - **Estimated cost**: $${metrics.cost_estimate.usd.toFixed(2)} at $${metrics.cost_estimate.rate_per_minute}/min (${metrics.cost_estimate.note})`,
    '',
    `_Raw metrics: \`delivery-workflow-runs-${ts}.json\`._`,
    '',
  ].join('\n');
}

async function ghGet(apiBase, token, pathname) {
  const resp = await fetch(`${apiBase}${pathname}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'pdm-workflow-run-telemetry',
    },
  });
  if (!resp.ok) {
    console.warn(`WARN: ${pathname} -> ${resp.status} ${resp.statusText}`);
    return null;
  }
  return resp.json();
}

export async function fetchWorkflowRuns({ apiBase, owner, repo, token, windowStartIso }) {
  const created = encodeURIComponent(`>=${windowStartIso}`);
  const data = await ghGet(apiBase, token, `/repos/${owner}/${repo}/actions/runs?per_page=100&created=${created}`);
  return data && Array.isArray(data.workflow_runs) ? data.workflow_runs : null;
}

async function main() {
  const outDir = process.argv[2];
  if (!outDir) {
    console.error('usage: node scripts/workflow-run-telemetry.mjs <outdir>');
    process.exit(2);
  }
  mkdirSync(outDir, { recursive: true });

  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const lookbackDays = Number(process.env.LOOKBACK_DAYS || 90) || 90;
  const costPerMinute = Number(process.env.RUNNER_COST_PER_MINUTE || DEFAULT_COST_PER_MINUTE) || DEFAULT_COST_PER_MINUTE;

  if (!token || !repository) {
    console.error('GITHUB_TOKEN and GITHUB_REPOSITORY are required.');
    process.exit(2);
  }

  const apiBase = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');
  const [owner, repo] = repository.split('/');
  const now = new Date();
  const windowStartIso = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

  const runs = await fetchWorkflowRuns({ apiBase, owner, repo, token, windowStartIso });
  const metrics = computeRunMetrics(runs, { windowStartIso, costPerMinute });
  const ts = now.toISOString().replace(/[:.]/g, '').slice(0, 13);

  writeFileSync(`${outDir}/delivery-workflow-runs-${ts}.json`, JSON.stringify(metrics, null, 2) + '\n');
  writeFileSync(`${outDir}/delivery-workflow-runs-${ts}.md`, formatReport(metrics, { ts, lookbackDays }));
  console.log(`Wrote delivery-workflow-runs-${ts}.json/.md`);
  console.log(`workflow_runs=${metrics.totals.runs ?? 'n/a'}`);
  console.log(`workflow_run_minutes=${metrics.totals.minutes ?? 'n/a'}`);
  console.log(`estimated_cost_usd=${metrics.cost_estimate ? metrics.cost_estimate.usd : 'n/a'}`);
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isCli) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}