#!/usr/bin/env node
// Delivery telemetry & audit trail exporter.
//
// Usage: node scripts/delivery-telemetry.mjs <outdir>
//
// Reads the GitHub-native audit trail (deployments, releases, merged PRs, and
// rollback/incident issues) via the REST API and derives DORA-style delivery
// telemetry: deployment frequency, lead time for changes, change failure rate,
// and a time-to-recovery proxy. Writes three files into <outdir>:
//
//   delivery-audit-<ts>.json       raw event snapshot (the audit trail)
//   delivery-telemetry-<ts>.json   derived metrics (+ per-environment and PR data)
//   delivery-telemetry-<ts>.md     human-readable report
//
// Env:
//   GITHUB_TOKEN       required — repo read access (the default actions token)
//   GITHUB_REPOSITORY  owner/repo (set natively by GitHub Actions)
//   GITHUB_API_URL     API base, defaults to https://api.github.com
//   LOOKBACK_DAYS      measurement window, default 90
//
// Undefined metrics are reported as "insufficient-data" rather than failing:
// GitHub-native records are the source of truth, and a fresh repo (or pure
// dry-run activity) legitimately has none yet.

import { writeFileSync, mkdirSync } from 'node:fs';

const outDir = process.argv[2];

if (!outDir) {
  console.error('usage: node scripts/delivery-telemetry.mjs <outdir>');
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const lookbackDays = Number(process.env.LOOKBACK_DAYS || 90) || 90;

if (!token || !repository) {
  console.error('GITHUB_TOKEN and GITHUB_REPOSITORY are required.');
  process.exit(2);
}

const apiBase = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');
const [owner, repo] = repository.split('/');
const now = new Date();
const windowStart = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
const fail = (value) => ({ status: 'insufficient-data', value: null, note: value });

async function ghGet(path) {
  const resp = await fetch(`${apiBase}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'pdm-delivery-telemetry',
    },
  });
  if (!resp.ok) {
    console.warn(`WARN: ${path} -> ${resp.status} ${resp.statusText}`);
    return [];
  }
  return resp.json();
}

async function listAll(path, perPage) {
  const data = await ghGet(`${path}${path.includes('?') ? '&' : '?'}per_page=${perPage}&page=1`);
  return data && Array.isArray(data) ? data : [];
}

const inWindow = (iso) => iso && new Date(iso) >= windowStart;
const isoDate = (iso) => (iso ? new Date(iso).toISOString() : null);
const median = (nums) => {
  if (nums.length === 0) return null;
  const sorted = nums.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const hoursToParts = (h) => {
  const days = Math.floor(h / 24);
  const hours = Math.floor(h % 24);
  const minutes = Math.round((h - days * 24 - hours) * 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

// ---- Audit trail: raw events from the GitHub-native API ---------------------
const [deployments, releases, closedPulls, issues] = await Promise.all([
  listAll(`/repos/${owner}/${repo}/deployments`, 100),
  listAll(`/repos/${owner}/${repo}/releases`, 100),
  listAll(`/repos/${owner}/${repo}/pulls?state=closed&sort=updated&direction=desc`, 100),
  listAll(`/repos/${owner}/${repo}/issues?state=all&sort=created&direction=desc`, 100),
]);

deployments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
releases.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
const mergedPulls = closedPulls
  .filter((p) => p.merged_at)
  .sort((a, b) => new Date(b.merged_at) - new Date(a.merged_at));

// A "failure event" is any issue carrying a dedicated failure label
// (`rollback`, `incident`, `outage`, `hotfix`, or `regression`). Title text is
// deliberately NOT inspected: feature tasks (e.g. "Rollback + post-deploy
// verification") often mention rollback and must not count as failures.
// P10-T2's controlled drill files a deliberately labeled issue so CFR/MTTR
// compute a real, intended value from a single event.
const failureLabel = /^(rollback|incident|outage|hotfix|regression)$/i;
const failureEvents = issues
  .filter(
    (i) =>
      !i.pull_request &&
      inWindow(i.created_at) &&
      Array.isArray(i.labels) &&
      i.labels.some((l) => failureLabel.test(l.name))
  )
  .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

const audit = {
  generated_at: now.toISOString(),
  repository,
  lookback_days: lookbackDays,
  window_start: windowStart.toISOString(),
  deployments: deployments
    .filter((d) => inWindow(d.created_at))
    .map((d) => ({
      id: d.id,
      environment: d.environment,
      ref: d.ref || d.sha,
      description: d.description || null,
      created_at: isoDate(d.created_at),
    })),
  releases: releases
    .filter((r) => inWindow(r.published_at))
    .map((r) => ({ tag: r.tag_name, name: r.name, published_at: isoDate(r.published_at) })),
  merged_pulls: mergedPulls
    .filter((p) => inWindow(p.merged_at))
    .map((p) => ({
      number: p.number,
      title: p.title,
      merge_commit_sha: p.merge_commit_sha,
      merged_at: isoDate(p.merged_at),
    })),
  failure_events: failureEvents.map((i) => ({
    number: i.number,
    title: i.title,
    created_at: isoDate(i.created_at),
  })),
};

// ---- Metrics ----------------------------------------------------------------

// Deployment frequency per environment, in deployments per week.
const envNames = [...new Set(audit.deployments.map((d) => d.environment))];
const deploymentFrequency = Object.fromEntries(
  envNames.map((env) => {
    const count = audit.deployments.filter((d) => d.environment === env).length;
    return [env, { count, per_week: count / (lookbackDays / 7) }];
  })
);

// Lead time for changes: median gap between a merged PR and the first
// deployment that references the PR's merge commit SHA.
const leadTimes = audit.merged_pulls
  .map((pr) => {
    const deploy = audit.deployments.find((d) => d.ref === pr.merge_commit_sha);
    if (!deploy) return null;
    return (new Date(deploy.created_at) - new Date(pr.merged_at)) / (60 * 60 * 1000);
  })
  .filter((h) => h !== null && h >= 0);
const leadTimeHours = median(leadTimes);

// Change failure rate: failure events in the window divided by deployments.
// Like MTTR, CFR only computes when a failure event is actually on record —
// a 0% CFR on placeholder/dry-run deployments would be invented confidence.
const changeFailureRate =
  failureEvents.length > 0 && audit.deployments.length > 0
    ? { status: 'computed', deployments: audit.deployments.length, failures: failureEvents.length, ratio: failureEvents.length / audit.deployments.length }
    : fail('no failure events in window');

// Time to recovery (proxy): median gap from a failure event to the next
// deployment in any environment.
const recoveries = failureEvents
  .map((ev) => {
    const next = audit.deployments.find((d) => new Date(d.created_at) >= new Date(ev.created_at));
    return next ? (new Date(next.created_at) - new Date(ev.created_at)) / (60 * 60 * 1000) : null;
  })
  .filter((h) => h !== null && h >= 0);
const mttrHours = median(recoveries);

const metrics = {
  generated_at: now.toISOString(),
  window: { days: lookbackDays, start: windowStart.toISOString(), end: now.toISOString() },
  counts: {
    deployments: audit.deployments.length,
    releases: audit.releases.length,
    merged_pulls: audit.merged_pulls.length,
    failure_events: failureEvents.length,
  },
  deployment_frequency_per_week: deploymentFrequency,
  lead_time_for_changes_hours:
    leadTimeHours !== null
      ? { status: 'computed', hours: leadTimeHours, prs_sampled: leadTimes.length }
      : fail(`no deployment matched a merged PR by merge commit SHA (${leadTimes.length} PRs sampled)`),
  change_failure_rate: changeFailureRate,
  time_to_recovery_hours:
    mttrHours !== null
      ? { status: 'computed', hours: mttrHours, events_sampled: recoveries.length }
      : fail('no failure events in window'),
};

// ---- Reports ----------------------------------------------------------------

const ts = now.toISOString().replace(/[:.]/g, '').slice(0, 13);

writeFileSync(`${outDir}/delivery-audit-${ts}.json`, JSON.stringify(audit, null, 2) + '\n');
writeFileSync(`${outDir}/delivery-telemetry-${ts}.json`, JSON.stringify(metrics, null, 2) + '\n');

const freqLines =
  Object.keys(deploymentFrequency).length === 0
    ? ['  - _No deployments recorded in the window._']
    : Object.entries(deploymentFrequency).map(
        ([env, v]) =>
          `  - **${env}**: ${v.count} deployment(s) in ${lookbackDays} days (${v.per_week.toFixed(2)}/week)`
      );

const leadLine =
  metrics.lead_time_for_changes_hours.status === 'computed'
    ? `  - **median**: ${hoursToParts(metrics.lead_time_for_changes_hours.hours)} (sampled ${metrics.lead_time_for_changes_hours.prs_sampled} merged PR${metrics.lead_time_for_changes_hours.prs_sampled === 1 ? '' : 's'})`
    : `  - _${metrics.lead_time_for_changes_hours.note}._`;

const cfr = metrics.change_failure_rate;
const cfrLine =
  cfr.status === 'computed'
    ? `  - **${(cfr.ratio * 100).toFixed(1)}%** (${cfr.failures} failure event${cfr.failures === 1 ? '' : 's'} over ${cfr.deployments} deployment${cfr.deployments === 1 ? '' : 's'})`
    : `  - _${cfr.note}._`;

const mttr = metrics.time_to_recovery_hours;
const mttrLine =
  mttr.status === 'computed'
    ? `  - **median**: ${hoursToParts(mttr.hours)} (sampled ${mttr.events_sampled} event${mttr.events_sampled === 1 ? '' : 's'})`
    : `  - _${mttr.note}._`;

const report = [
  '## Delivery Telemetry & Audit Trail',
  '',
  `_Generated ${now.toISOString()} | source: GitHub-native records (deployments, releases, merged PRs, rollback/incident issues) | window: last ${lookbackDays} days_`,
  '',
  '### Deployment frequency',
  ...freqLines,
  '',
  '### Lead time for changes',
  leadLine,
  '',
  '### Change failure rate',
  cfrLine,
  '',
  '### Time to recovery (proxy)',
  mttrLine,
  '',
  '### Counts in window',
  `  - **Deployments**: ${metrics.counts.deployments}`,
  `  - **Releases**: ${metrics.counts.releases}`,
  `  - **Merged PRs to the base branch**: ${metrics.counts.merged_pulls}`,
  `  - **Rollback/incident issues**: ${metrics.counts.failure_events}`,
  '',
  '### Audit trail',
  '',
  `_The raw event snapshot lives in \`delivery-audit-${ts}.json\` (deployments, releases, PRs, and failure events); the metrics machine-read it from \`delivery-telemetry-${ts}.json\`. Metrics marked insufficient-data mean the GitHub-native record has no matching events yet — e.g. a new repo or untouched-by-real-activity environments._`,
  '',
  '_Generated by `scripts/delivery-telemetry.mjs` — reads the GitHub Deployment/Releases/Pulls/Issues APIs; pick a longer `LOOKBACK_DAYS` or real (non-dry-run) deployments to populate the DORA-style metrics._',
  '',
].join('\n');

writeFileSync(`${outDir}/delivery-telemetry-${ts}.md`, report);
console.log(`Wrote delivery-audit-${ts}.json, delivery-telemetry-${ts}.json/.md`);
const envSummary = Object.keys(deploymentFrequency)
  .map((env) => `${env}:${deploymentFrequency[env].count}`)
  .join(', ') || 'none';
console.log(`deployment_counts=${envSummary}`);
console.log(`deployments_total=${audit.deployments.length}`);
console.log(`merged_pulls=${audit.merged_pulls.length}`);
console.log(`failure_events=${failureEvents.length}`);