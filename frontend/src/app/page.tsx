import { FeatureCard } from "@/components/feature-card";
import { Hero } from "@/components/hero";
import { SiteFooter } from "@/components/site-footer";
import { FEATURES } from "@/lib/features";

export default function Home() {
  return (
    <>
      <Hero />
      <main id="workflows" className="mx-auto w-full max-w-5xl flex-1 px-6 pb-24">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold text-white">
            The delivery pipeline
          </h2>
          <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-400">
            GitHub Actions
          </span>
        </div>
        <div id="features" className="mt-8 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </main>
      <SiteFooter>
        PDM reference implementation — AI-Augmented Fintech Delivery Engine
      </SiteFooter>
    </>
  );
}