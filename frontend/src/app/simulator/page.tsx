import type { Metadata } from "next";
import { SimulationPanel } from "@/components/simulation-panel";

export const metadata: Metadata = {
  title: "Release Train Simulator",
  description:
    "Model a fixed-cadence release train: configure capacity, gate pass rate, and seed to see which features board on time.",
};

export default function SimulatorPage() {
  return (
    <>
      <header className="mx-auto w-full max-w-5xl px-6 pt-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Release train simulator
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
          Tune the train capacity, gate pass rate, and seed to see a
          deterministic what-if simulation of features boarding each train.
        </p>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <SimulationPanel />
      </main>
      <footer className="border-t border-white/10 py-10 text-center text-sm text-slate-500">
        PDM reference implementation — simulation outputs are labeled, never
        real delivery records.
      </footer>
    </>
  );
}