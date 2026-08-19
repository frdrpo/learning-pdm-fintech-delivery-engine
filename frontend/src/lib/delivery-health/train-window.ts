// ADR 0009 release-train window logic (P23-T2). A train departs every
// TRAIN_INTERVAL_DAYS from the anchor (the earliest release in the telemetry
// window); each train's readiness cutoff is departure - CUTOFF_BUFFER_DAYS
// (default 3, per ADR 0009). A departed train is "delivered" when at least one
// release published inside its [departure, departure + interval) window, and
// "missed" otherwise. The next train after the last planned one is "pending".

export type TrainWindowStatus = "delivered" | "missed" | "pending";

export type TrainWindow = {
  train: number;
  departure: string;
  cutoff: string;
  status: TrainWindowStatus;
};

export type TrainWindowInput = {
  anchorDate: string | null;
  intervalDays: number;
  now: string;
  deliveredTrains: number[];
  plannedTrains: number;
  cutoffBufferDays?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function trainCutoff(departureIso: string, bufferDays: number): string {
  if (!Number.isFinite(bufferDays) || bufferDays <= 0) {
    throw new RangeError("cutoffBufferDays must be a positive number");
  }
  return new Date(new Date(departureIso).getTime() - bufferDays * DAY_MS).toISOString();
}

export function buildTrainWindows(input: TrainWindowInput): TrainWindow[] {
  if (!Number.isFinite(input.intervalDays) || input.intervalDays <= 0) {
    throw new RangeError("intervalDays must be a positive number");
  }
  if (!Number.isInteger(input.plannedTrains) || input.plannedTrains < 0) {
    throw new RangeError("plannedTrains must be a non-negative integer");
  }
  if (!input.anchorDate) return [];
  const anchorMs = Date.parse(input.anchorDate);
  if (Number.isNaN(anchorMs)) return [];

  const bufferDays = input.cutoffBufferDays ?? 3;
  const intervalMs = input.intervalDays * DAY_MS;
  const delivered = new Set(input.deliveredTrains);

  const windows: TrainWindow[] = [];
  for (let train = 1; train <= input.plannedTrains; train++) {
    const departure = new Date(anchorMs + (train - 1) * intervalMs).toISOString();
    windows.push({
      train,
      departure,
      cutoff: trainCutoff(departure, bufferDays),
      status: delivered.has(train) ? "delivered" : "missed",
    });
  }

  // The next train after the last planned one is pending (not yet departed).
  const nextTrain = input.plannedTrains + 1;
  const nextDeparture = new Date(
    anchorMs + (nextTrain - 1) * intervalMs,
  ).toISOString();
  windows.push({
    train: nextTrain,
    departure: nextDeparture,
    cutoff: trainCutoff(nextDeparture, bufferDays),
    status: "pending",
  });

  return windows;
}