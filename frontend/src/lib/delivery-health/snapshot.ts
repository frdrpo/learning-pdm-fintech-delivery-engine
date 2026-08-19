// Delivery-health data layer (P23-T1). Loads the committed, versioned snapshot
// (delivery-snapshot.json) at build time — no runtime fetch — and exposes it as
// typed data. Honesty contract: a missing or malformed snapshot returns null so
// the UI renders an explicit empty state; every metric carries its own
// computed / insufficient-data status from the telemetry exporter (ADR 0008).

import snapshotJson from "./delivery-snapshot.json";
import type {
  ChangeFailureRate,
  DeliveryAudit,
  DeliveryMetrics,
  DeliverySnapshot,
  DeploymentFrequencyPerWeek,
  LeadTimeForChanges,
  ReleaseTrainOnTime,
  SnapshotKind,
  TimeToRecovery,
} from "./types";

const SNAPSHOT_KIND: SnapshotKind = "delivery-snapshot";
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && ISO_TIMESTAMP.test(value);
}

function isMetric<T>(
  value: unknown,
  isComputed: (record: Record<string, unknown>) => boolean,
): value is Record<string, unknown> & ({ status: "computed" } & T) {
  if (!isRecord(value)) return false;
  if (value.status === "computed") return isComputed(value);
  if (value.status === "insufficient-data") {
    return value.value === null && typeof value.note === "string";
  }
  return false;
}

const isLeadTime = (r: Record<string, unknown>) =>
  typeof r.hours === "number" && typeof r.prs_sampled === "number";

const isCfr = (r: Record<string, unknown>) =>
  typeof r.deployments === "number" &&
  typeof r.failures === "number" &&
  typeof r.ratio === "number";

const isMttr = (r: Record<string, unknown>) =>
  typeof r.hours === "number" && typeof r.events_sampled === "number";

const isOnTime = (r: Record<string, unknown>) =>
  typeof r.interval_days === "number" &&
  (r.anchor_date === null || isIsoTimestamp(r.anchor_date)) &&
  typeof r.planned_trains === "number" &&
  typeof r.trains_delivered === "number" &&
  typeof r.on_time_rate === "number" &&
  Array.isArray(r.missed_train_numbers) &&
  r.missed_train_numbers.every((n) => typeof n === "number");

function parseDeploymentFrequency(value: unknown): DeploymentFrequencyPerWeek | null {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value);
  const valid = entries.every(
    ([, v]) =>
      isRecord(v) && typeof v.count === "number" && typeof v.per_week === "number",
  );
  return valid ? (value as DeploymentFrequencyPerWeek) : null;
}

export function parseDeliverySnapshot(input: unknown): DeliverySnapshot | null {
  if (!isRecord(input)) return null;
  if (input.kind !== SNAPSHOT_KIND) return null;
  if (!isIsoTimestamp(input.generated_at)) return null;
  if (typeof input.repository !== "string") return null;

  const metrics = input.metrics;
  if (!isRecord(metrics)) return null;
  if (!isIsoTimestamp(metrics.generated_at)) return null;
  if (!isRecord(metrics.window)) return null;
  if (
    typeof metrics.window.days !== "number" ||
    !isIsoTimestamp(metrics.window.start) ||
    !isIsoTimestamp(metrics.window.end)
  ) {
    return null;
  }
  const counts = metrics.counts;
  if (
    !isRecord(counts) ||
    typeof counts.deployments !== "number" ||
    typeof counts.releases !== "number" ||
    typeof counts.merged_pulls !== "number" ||
    typeof counts.failure_events !== "number"
  ) {
    return null;
  }

  const deploymentFrequency = parseDeploymentFrequency(
    metrics.deployment_frequency_per_week,
  );
  if (!deploymentFrequency) return null;
  if (!isMetric<LeadTimeForChanges>(metrics.lead_time_for_changes_hours, isLeadTime)) return null;
  if (!isMetric<ChangeFailureRate>(metrics.change_failure_rate, isCfr)) return null;
  if (!isMetric<TimeToRecovery>(metrics.time_to_recovery_hours, isMttr)) return null;
  if (!isMetric<ReleaseTrainOnTime>(metrics.release_train_on_time, isOnTime)) return null;

  const audit = input.audit;
  if (!isRecord(audit)) return null;
  if (!isIsoTimestamp(audit.generated_at)) return null;
  if (typeof audit.repository !== "string") return null;
  if (typeof audit.lookback_days !== "number") return null;
  if (!isIsoTimestamp(audit.window_start)) return null;
  if (!Array.isArray(audit.deployments)) return null;
  if (!Array.isArray(audit.releases)) return null;
  if (!Array.isArray(audit.merged_pulls)) return null;
  if (!Array.isArray(audit.failure_events)) return null;
  if (!Array.isArray(audit.release_trains)) return null;

  return {
    kind: SNAPSHOT_KIND,
    generated_at: input.generated_at,
    repository: input.repository,
    metrics: metrics as unknown as DeliveryMetrics,
    audit: audit as unknown as DeliveryAudit,
  };
}

export function loadDeliverySnapshot(): DeliverySnapshot | null {
  return parseDeliverySnapshot(snapshotJson);
}

export function isSnapshotStale(
  snapshot: DeliverySnapshot,
  maxAgeDays = 30,
  now: Date = new Date(),
): boolean {
  const generated = Date.parse(snapshot.generated_at);
  if (Number.isNaN(generated)) return true;
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  return now.getTime() - generated > maxAgeMs;
}
