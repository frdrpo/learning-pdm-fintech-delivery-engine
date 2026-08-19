// Types for the committed delivery-health snapshot (P23). The snapshot mirrors
// the shape written by scripts/delivery-telemetry.mjs (metrics + audit), wrapped
// in a self-labeling envelope: kind: "delivery-snapshot" (ADR 0010 labeling
// ethos) and generated_at preserved so consumers can reason about staleness.

export type SnapshotKind = "delivery-snapshot";

export type InsufficientData = {
  status: "insufficient-data";
  value: null;
  note: string;
};

export type ComputedMetric<T> = { status: "computed" } & T;

export type MetricResult<T> = ComputedMetric<T> | InsufficientData;

export type LeadTimeForChanges = MetricResult<{
  hours: number;
  prs_sampled: number;
}>;

export type ChangeFailureRate = MetricResult<{
  deployments: number;
  failures: number;
  ratio: number;
}>;

export type TimeToRecovery = MetricResult<{
  hours: number;
  events_sampled: number;
}>;

export type ReleaseTrainOnTime = MetricResult<{
  interval_days: number;
  anchor_date: string | null;
  planned_trains: number;
  trains_delivered: number;
  on_time_rate: number;
  missed_train_numbers: number[];
}>;

export type DeploymentFrequency = {
  count: number;
  per_week: number;
};

export type DeploymentFrequencyPerWeek = Record<string, DeploymentFrequency>;

export type MetricsWindow = {
  days: number;
  start: string;
  end: string;
};

export type MetricsCounts = {
  deployments: number;
  releases: number;
  merged_pulls: number;
  failure_events: number;
};

export type DeliveryMetrics = {
  generated_at: string;
  window: MetricsWindow;
  counts: MetricsCounts;
  deployment_frequency_per_week: DeploymentFrequencyPerWeek;
  lead_time_for_changes_hours: LeadTimeForChanges;
  change_failure_rate: ChangeFailureRate;
  time_to_recovery_hours: TimeToRecovery;
  release_train_on_time: ReleaseTrainOnTime;
};

export type DeploymentEvent = {
  id: number;
  environment: string;
  ref: string;
  description: string | null;
  created_at: string | null;
};

export type ReleaseEvent = {
  tag: string;
  name: string;
  published_at: string | null;
};

export type MergedPull = {
  number: number;
  title: string;
  merge_commit_sha: string;
  merged_at: string | null;
};

export type FailureEvent = {
  number: number;
  title: string;
  created_at: string | null;
};

export type TrainRecord = {
  train: number;
  planned_departure: string;
  delivered: boolean;
};

export type DeliveryAudit = {
  generated_at: string;
  repository: string;
  lookback_days: number;
  window_start: string;
  deployments: DeploymentEvent[];
  releases: ReleaseEvent[];
  merged_pulls: MergedPull[];
  failure_events: FailureEvent[];
  release_trains: TrainRecord[];
};

export type DeliverySnapshot = {
  kind: SnapshotKind;
  generated_at: string;
  repository: string;
  metrics: DeliveryMetrics;
  audit: DeliveryAudit;
};
