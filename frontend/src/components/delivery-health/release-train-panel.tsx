import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/delivery-health/format";
import {
  buildTrainWindows,
  type TrainWindowStatus,
} from "@/lib/delivery-health/train-window";
import type { ReleaseTrainOnTime } from "@/lib/delivery-health/types";

const STATUS_LABEL: Record<TrainWindowStatus, string> = {
  delivered: "Delivered",
  missed: "Missed",
  pending: "Pending",
};

const STATUS_TONE: Record<TrainWindowStatus, BadgeTone> = {
  delivered: "green",
  missed: "rose",
  pending: "cyan",
};

type ReleaseTrainPanelProps = {
  onTime: ReleaseTrainOnTime;
  deliveredTrains: number[];
  now: string;
};

export function ReleaseTrainPanel({
  onTime,
  deliveredTrains,
  now,
}: ReleaseTrainPanelProps) {
  if (onTime.status !== "computed") {
    return (
      <Card as="section">
        <h3 className="text-lg font-semibold text-white">Release train status</h3>
        <div className="mt-4 flex items-center gap-2">
          <Badge size="sm" tone="amber">
            Insufficient data
          </Badge>
          <p className="text-sm text-slate-400">{onTime.note}</p>
        </div>
      </Card>
    );
  }

  const windows = buildTrainWindows({
    anchorDate: onTime.anchor_date,
    intervalDays: onTime.interval_days,
    now,
    deliveredTrains,
    plannedTrains: onTime.planned_trains,
  });

  return (
    <Card as="section">
      <h3 className="text-lg font-semibold text-white">Release train status</h3>
      <p className="mt-2 text-sm text-slate-400">
        <span className="font-medium text-slate-100">
          {((onTime.on_time_rate ?? 0) * 100).toFixed(1)}%
        </span>{" "}
        on-time — {onTime.trains_delivered} of {onTime.planned_trains} planned
        train{onTime.planned_trains === 1 ? "" : "s"} shipped on a{" "}
        {onTime.interval_days}-day cadence anchored {formatDate(onTime.anchor_date)}.
      </p>
      <ul className="mt-4 space-y-3">
        {windows.map((window) => (
          <li key={window.train}>
            <Card variant="row">
              <div>
                <p className="text-sm font-medium text-slate-200">
                  Train {window.train}
                </p>
                <p className="text-xs text-slate-500">
                  departs {formatDate(window.departure)} · cutoff{" "}
                  {formatDate(window.cutoff)}
                </p>
              </div>
              <Badge size="sm" tone={STATUS_TONE[window.status]} label={STATUS_LABEL[window.status]}>
                {STATUS_LABEL[window.status]}
              </Badge>
            </Card>
          </li>
        ))}
      </ul>
    </Card>
  );
}