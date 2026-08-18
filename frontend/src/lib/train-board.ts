// Train calendar model following ADR 0009 (docs/decisions/0009-release-train-cadence.md):
// fixed-cadence windows anchored at the earliest release, a readiness cutoff
// `cutoffDays` before each departure, and an on-time signal derived purely from
// release timestamps. Trains report honestly: delivered (release in window),
// missed (window fully past, no release), or pending (window open / ahead).

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type TrainStatus = "delivered" | "pending" | "missed";

export type TrainSlot = {
  id: number;
  departure: Date;
  nextDeparture: Date;
  cutoff: Date;
  releases: string[];
  releaseDates: Date[];
  status: TrainStatus;
};

export type TrainRelease = { tag: string; publishedAt: Date };

export type TrainCalendarInput = {
  /** Earliest release `published_at` in the measurement window (ADR 0009 anchor). */
  anchor: Date;
  now: Date;
  intervalDays: number;
  cutoffDays: number;
  count: number;
  releaseDates: TrainRelease[];
};

export function isDateInWindow(
  date: Date,
  windowStart: Date,
  windowEnd: Date,
): boolean {
  return date >= windowStart && date < windowEnd;
}

export function buildTrainCalendar(input: TrainCalendarInput): TrainSlot[] {
  const { anchor, now, intervalDays, cutoffDays, count, releaseDates } = input;
  const slots: TrainSlot[] = [];

  for (let index = 0; index < count; index += 1) {
    const departure = new Date(anchor.getTime() + index * intervalDays * MS_PER_DAY);
    const nextDeparture = new Date(
      departure.getTime() + intervalDays * MS_PER_DAY,
    );
    const cutoff = new Date(departure.getTime() - cutoffDays * MS_PER_DAY);
    const publishedInWindow = releaseDates.filter((release) =>
      isDateInWindow(release.publishedAt, departure, nextDeparture),
    );

    let status: TrainStatus;
    if (publishedInWindow.length > 0) {
      status = "delivered";
    } else if (nextDeparture <= now) {
      status = "missed";
    } else {
      status = "pending";
    }

    slots.push({
      id: index + 1,
      departure,
      nextDeparture,
      cutoff,
      releases: publishedInWindow.map((release) => release.tag),
      releaseDates: publishedInWindow.map((release) => release.publishedAt),
      status,
    });
  }

  return slots;
}

export function boardingTrain(slots: TrainSlot[]): TrainSlot | undefined {
  return slots.find((slot) => slot.status === "pending");
}

export function daysUntilDate(target: Date, now: Date): number {
  return Math.round((target.getTime() - now.getTime()) / MS_PER_DAY);
}