"use client";

import { useMemo, useState } from "react";
import {
  SimulationForm,
  type PanelConfig,
} from "@/components/simulation-form";
import { SimulationMetrics } from "@/components/simulation-metrics";
import { SimulationSchedule } from "@/components/simulation-schedule";
import { Badge } from "@/components/ui/badge";
import {
  simulateReleaseTrain,
  type ReleaseTrainConfig,
  type SimulationFeature,
} from "@/lib/release-train";

const DEFAULT_PANEL: PanelConfig = {
  capacity: 3,
  gatePassRatePct: 100,
  trainIntervalDays: 14,
  seed: 42,
};

const BACKLOG: SimulationFeature[] = [
  { id: "feat-a", size: 2, readiness: 1 },
  { id: "feat-b", size: 3, readiness: 1 },
  { id: "feat-c", size: 1, readiness: 1 },
];

function toModelConfig(config: PanelConfig): ReleaseTrainConfig {
  return {
    trainIntervalDays: config.trainIntervalDays,
    capacity: config.capacity,
    gatePassRate: config.gatePassRatePct / 100,
    slipPolicy: "carry",
    seed: config.seed,
    maxTrains: 10,
    backlog: [...BACKLOG],
  };
}

export function SimulationPanel() {
  const [config, setConfig] = useState<PanelConfig>(DEFAULT_PANEL);

  const result = useMemo(
    () => simulateReleaseTrain(toModelConfig(config)),
    [config],
  );

  return (
    <div className="w-full max-w-5xl space-y-8">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold text-white">
          Release train simulator
        </h2>
        <Badge size="md" tone="violet" font="normal">
          Simulated
        </Badge>
      </div>

      <SimulationForm config={config} onChange={setConfig} />
      <SimulationMetrics result={result} />
      <SimulationSchedule result={result} />
    </div>
  );
}