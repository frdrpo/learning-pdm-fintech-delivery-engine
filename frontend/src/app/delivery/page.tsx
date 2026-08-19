import type { Metadata } from "next";
import { DeliveryHealthPage } from "@/components/delivery-health/delivery-health-page";
import { PageHeader } from "@/components/page-header";
import { SiteFooter } from "@/components/site-footer";
import { loadDeliverySnapshot } from "@/lib/delivery-health/snapshot";

export const metadata: Metadata = {
  title: "Delivery Health",
  description:
    "Live delivery telemetry from GitHub-native records: DORA metrics, the release-train status, and the audit trail.",
};

export default function DeliveryPage() {
  const snapshot = loadDeliverySnapshot();

  return (
    <>
      <PageHeader
        title="Delivery health"
        subtitle="DORA-style delivery telemetry read from GitHub-native records — deployments, releases, merged PRs, and failure events."
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <DeliveryHealthPage snapshot={snapshot} />
      </main>
      <SiteFooter>
        PDM reference implementation — telemetry is read from real events,
        never invented.
      </SiteFooter>
    </>
  );
}