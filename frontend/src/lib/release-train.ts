export type SlipPolicy = "carry";

export type SimulationFeature = {
  id: string;
  size: number;
  readiness: number;
};

export type ReleaseTrainConfig = {
  trainIntervalDays: number;
  capacity: number;
  gatePassRate: number;
  slipPolicy: SlipPolicy;
  seed: number;
  maxTrains: number;
  backlog: SimulationFeature[];
};

export type FeatureOutcome = {
  id: string;
  status: "on-time" | "slipped" | "unboarded";
  trainBoarded: number | null;
  delayTrains: number;
  kind: "simulation";
};

export type TrainSchedule = {
  train: number;
  features: string[];
  kind: "simulation";
};

export type SimulationResult = {
  kind: "simulation";
  trains: TrainSchedule[];
  features: FeatureOutcome[];
  throughput: number;
  onTimeRate: number;
  averageDelayTrains: number;
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function assertValid(config: ReleaseTrainConfig): void {
  if (!Number.isInteger(config.capacity) || config.capacity < 1) {
    throw new RangeError("capacity must be a positive integer");
  }
  if (!Number.isFinite(config.gatePassRate) || config.gatePassRate < 0 || config.gatePassRate > 1) {
    throw new RangeError("gatePassRate must be between 0 and 1");
  }
  if (!Number.isInteger(config.seed)) {
    throw new RangeError("seed must be an integer");
  }
  if (!Number.isInteger(config.maxTrains) || config.maxTrains < 1) {
    throw new RangeError("maxTrains must be a positive integer");
  }
  if (!Number.isFinite(config.trainIntervalDays) || config.trainIntervalDays < 1) {
    throw new RangeError("trainIntervalDays must be a positive number");
  }
  for (const feature of config.backlog) {
    if (
      !Number.isFinite(feature.size) ||
      feature.size < 0
    ) {
      throw new RangeError(`size must be a non-negative number (${feature.id})`);
    }
    if (
      !Number.isFinite(feature.readiness) ||
      feature.readiness < 0 ||
      feature.readiness > 1
    ) {
      throw new RangeError(`readiness must be between 0 and 1 (${feature.id})`);
    }
  }
}

export function simulateReleaseTrain(
  config: ReleaseTrainConfig,
): SimulationResult {
  assertValid(config);

  const random = mulberry32(config.seed);
  const pending = config.backlog.map((feature) => ({ ...feature }));
  const trains: TrainSchedule[] = [];
  const outcomes = new Map<string, FeatureOutcome>();

  const maxTrains = Math.max(config.maxTrains, 1);
  for (let train = 1; train <= maxTrains && pending.length > 0; train++) {
    const remaining = [...pending];
    const boardable: SimulationFeature[] = [];

    for (const feature of remaining) {
      const ready = random() < feature.readiness;
      const passesGate = random() < config.gatePassRate;
      if (ready && passesGate) {
        boardable.push(feature);
      }
    }

    boardable.sort((a, b) => b.readiness - a.readiness || a.id.localeCompare(b.id));

    const boarding: string[] = [];
    const taken = new Set<string>();
    for (const feature of boardable) {
      if (boarding.length >= config.capacity) break;
      boarding.push(feature.id);
      taken.add(feature.id);
    }

    if (boarding.length > 0) {
      trains.push({ train, features: boarding, kind: "simulation" });
    }

    const nextPending: SimulationFeature[] = [];
    for (const feature of remaining) {
      if (taken.has(feature.id)) {
        outcomes.set(feature.id, {
          id: feature.id,
          status: train === 1 ? "on-time" : "slipped",
          trainBoarded: train,
          delayTrains: train - 1,
          kind: "simulation",
        });
      } else {
        nextPending.push(feature);
      }
    }
    pending.splice(0, pending.length, ...nextPending);
  }

  for (const feature of pending) {
    outcomes.set(feature.id, {
      id: feature.id,
      status: "unboarded",
      trainBoarded: null,
      delayTrains: config.maxTrains,
      kind: "simulation",
    });
  }

  const features = config.backlog.map((feature) => {
    const outcome = outcomes.get(feature.id);
    if (!outcome) {
      return {
        id: feature.id,
        status: "unboarded" as const,
        trainBoarded: null,
        delayTrains: config.maxTrains,
        kind: "simulation" as const,
      };
    }
    return outcome;
  });

  const boarded = features.filter((f) => f.status !== "unboarded");
  const total = features.length;
  const boardedCount = boarded.length;
  const onTime = boarded.filter((f) => f.status === "on-time").length;
  const totalDelay = boarded.reduce((sum, f) => sum + f.delayTrains, 0);

  return {
    kind: "simulation",
    trains,
    features,
    throughput: total === 0 ? 0 : boardedCount / total,
    onTimeRate: boardedCount === 0 ? 0 : onTime / boardedCount,
    averageDelayTrains:
      boardedCount === 0 ? 0 : totalDelay / boardedCount,
  };
}
