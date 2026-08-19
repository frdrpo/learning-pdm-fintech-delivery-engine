import type { Metadata } from "next";
import { CompliancePosture } from "@/components/compliance-posture";
import { DeliveryDashboard } from "@/components/delivery-dashboard";
import { FeatureStatusCard } from "@/components/feature-status-card";
import { PageHeader } from "@/components/page-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import {
  DASHBOARD_CONTROLS,
  DASHBOARD_FEATURES,
  DASHBOARD_GATES,
  DASHBOARD_TRAIN,
} from "@/lib/dashboard";

export const metadata: Metadata = {
  title: "Delivery Dashboard",
  description:
    "A delivery-readiness view: quality gates, the next release-train window, compliance posture, and feature boarding status.",
};

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Delivery dashboard"
        subtitle="A single view of what is ready to board the next release train and what is blocking it."
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <DeliveryDashboard gates={DASHBOARD_GATES} train={DASHBOARD_TRAIN} />
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <CompliancePosture controls={DASHBOARD_CONTROLS} />
          <Card as="section">
            <h3 className="text-lg font-semibold text-white">
              Feature boarding status
            </h3>
            <div className="mt-4 grid gap-4">
              {DASHBOARD_FEATURES.map((feature) => (
                <FeatureStatusCard key={feature.name} {...feature} />
              ))}
            </div>
          </Card>
        </section>
        <p className="mt-8 text-center text-xs text-slate-500">
          Sample snapshot for illustration — the live view is generated from
          GitHub-native delivery records by scripts/delivery-telemetry.mjs.
        </p>
      </main>
      <SiteFooter>
        PDM reference implementation — telemetry is read from real events,
        never invented.
      </SiteFooter>
    </>
  );
}