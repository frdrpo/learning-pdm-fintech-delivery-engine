import { DoraMetricCard } from "@/components/delivery-health/dora-metric-card";
import { formatHours, formatPercent } from "@/lib/delivery-health/format";
import type { DeliveryMetrics } from "@/lib/delivery-health/types";

type DoraMetricsGridProps = {
  metrics: DeliveryMetrics;
};

function deploymentFrequencyHeadline(
  metrics: DeliveryMetrics,
): { value: string | null; detail: string } {
  const envs = Object.entries(metrics.deployment_frequency_per_week);
  if (envs.length === 0) {
    return { value: null, detail: "no deployments recorded in the window" };
  }
  const production = envs.find(([name]) => name === "production");
  const [headlineEnv, headline] = production ?? envs[0];
  const detail = envs
    .map(([name, freq]) => `${name}: ${freq.count} deploys (${freq.per_week.toFixed(2)}/wk)`)
    .join(" · ");
  return {
    value: `${headline.per_week.toFixed(1)}/wk`,
    detail: `${headlineEnv}: ${headline.count} deploys in ${metrics.window.days} days · ${detail}`,
  };
}

export function DoraMetricsGrid({ metrics }: DoraMetricsGridProps) {
  const windowLabel = `last ${metrics.window.days} days`;
  const frequency = deploymentFrequencyHeadline(metrics);

  const leadTime =
    metrics.lead_time_for_changes_hours.status === "computed"
      ? {
          value: formatHours(metrics.lead_time_for_changes_hours.hours),
          detail: `median of ${metrics.lead_time_for_changes_hours.prs_sampled} merged PRs`,
        }
      : { value: null, detail: metrics.lead_time_for_changes_hours.note };

  const cfr =
    metrics.change_failure_rate.status === "computed"
      ? {
          value: formatPercent(metrics.change_failure_rate.ratio),
          detail: `${metrics.change_failure_rate.failures} failure event(s) over ${metrics.change_failure_rate.deployments} deployments`,
        }
      : { value: null, detail: metrics.change_failure_rate.note };

  const mttr =
    metrics.time_to_recovery_hours.status === "computed"
      ? {
          value: formatHours(metrics.time_to_recovery_hours.hours),
          detail: `median of ${metrics.time_to_recovery_hours.events_sampled} recovery event(s)`,
        }
      : { value: null, detail: metrics.time_to_recovery_hours.note };

  return (
    <section className="grid gap-6 sm:grid-cols-2">
      <DoraMetricCard
        label="Deployment frequency"
        value={frequency.value}
        detail={frequency.detail}
        windowLabel={windowLabel}
      />
      <DoraMetricCard
        label="Lead time for changes"
        value={leadTime.value}
        detail={leadTime.detail}
        windowLabel={windowLabel}
      />
      <DoraMetricCard
        label="Change failure rate"
        value={cfr.value}
        detail={cfr.detail}
        windowLabel={windowLabel}
      />
      <DoraMetricCard
        label="Time to recovery"
        value={mttr.value}
        detail={mttr.detail}
        windowLabel={windowLabel}
      />
    </section>
  );
}