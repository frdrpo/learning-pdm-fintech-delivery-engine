import {
  assessTrainReadiness,
  type TrainReadiness,
  type TrainReadinessInput,
} from "@/lib/delivery";
import {
  boardingTrain,
  daysUntilDate,
  type TrainSlot,
  type TrainStatus,
} from "@/lib/train-board";

const STATUS_LABEL: Record<TrainStatus, string> = {
  delivered: "Delivered",
  pending: "Pending",
  missed: "Missed",
};

const STATUS_ACCENT: Record<TrainStatus, string> = {
  delivered: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  pending: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  missed: "border-rose-400/30 bg-rose-400/10 text-rose-300",
};

const READINESS_LABEL: Record<TrainReadiness, string> = {
  "on-schedule": "On schedule",
  "at-risk": "At risk",
  slipped: "Slipped",
};

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export type TrainBoardProps = {
  slots: TrainSlot[];
  now?: Date;
  readiness?: TrainReadinessInput;
};

export function TrainBoard({ slots, now = new Date(), readiness }: TrainBoardProps) {
  const boarding = boardingTrain(slots);
  const boardingReady =
    boarding !== undefined && readiness !== undefined
      ? assessTrainReadiness(readiness)
      : undefined;
  const cutoffCountdown =
    boarding !== undefined ? daysUntilDate(boarding.cutoff, now) : undefined;

  return (
    <section className="w-full max-w-5xl rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">Release train board</h3>
        {boarding !== undefined ? (
          <span role="status" className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
            Boarding now — train {boarding.id}
          </span>
        ) : (
          <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-400">
            No train boarding
          </span>
        )}
      </div>

      <ol className="mt-4 space-y-3">
        {slots.map((slot) => {
          const isBoarding = boarding?.id === slot.id;
          return (
            <li
              key={slot.id}
              className={`rounded-lg border px-4 py-3 ${
                isBoarding
                  ? "border-cyan-400/30 bg-cyan-400/5"
                  : "border-white/10 bg-slate-900"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    Train {slot.id}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDate(slot.departure)} → {formatDate(slot.nextDeparture)}
                    <span className="mx-1 text-slate-600">·</span>
                    cutoff {formatDate(slot.cutoff)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {slot.releases.length > 0 ? slot.releases.join(", ") : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isBoarding && cutoffCountdown !== undefined && (
                    <span className="rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] text-slate-300">
                      {cutoffCountdown >= 0
                        ? `${cutoffCountdown} days to cutoff`
                        : "cutoff passed"}
                    </span>
                  )}
                  {isBoarding && boardingReady !== undefined && (
                    <span
                      role="status"
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                        boardingReady === "at-risk"
                          ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                          : boardingReady === "slipped"
                            ? "border-rose-400/30 bg-rose-400/10 text-rose-300"
                            : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                      }`}
                    >
                      {READINESS_LABEL[boardingReady]}
                    </span>
                  )}
                  <span
                    role="status"
                    aria-label={STATUS_LABEL[slot.status]}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUS_ACCENT[slot.status]}`}
                  >
                    {STATUS_LABEL[slot.status]}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}