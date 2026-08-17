import { isReadyForRelease } from "@/lib/delivery";

export function Hero() {
  const ready = isReadyForRelease({
    lint: true,
    test: true,
    build: true,
    compliance: true,
  });

  return (
    <header className="relative overflow-hidden">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 py-28 text-center">
        <span
          role="status"
          className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-emerald-300"
        >
          {ready ? "Delivery ready" : "Gates pending"}
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
          AI-Augmented Fintech{" "}
          <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
            Delivery Engine
          </span>
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-400">
          Combine agile release trains, trunk-based development, shift-left
          compliance, and automated AI runners to ship complex fintech products
          predictably — and on time.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <a
            href="#features"
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
          >
            See the pipeline
          </a>
          <a
            href="#workflows"
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-white/30"
          >
            Explore workflows
          </a>
        </div>
      </div>
    </header>
  );
}