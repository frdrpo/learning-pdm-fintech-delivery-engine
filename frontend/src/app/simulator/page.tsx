import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { SimulationPanel } from "@/components/simulation-panel";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Release Train Simulator",
  description:
    "Model a fixed-cadence release train: configure capacity, gate pass rate, and seed to see which features board on time.",
};

export default function SimulatorPage() {
  return (
    <>
      <PageHeader
        title="Release train simulator"
        subtitle="Tune the train capacity, gate pass rate, and seed to see a deterministic what-if simulation of features boarding each train."
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <SimulationPanel />
      </main>
      <SiteFooter>
        PDM reference implementation — simulation outputs are labeled, never
        real delivery records.
      </SiteFooter>
    </>
  );
}