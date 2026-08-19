// Display formatting for the delivery-health dashboard (P23-T2). Mirrors the
// human-readable conventions of scripts/delivery-telemetry.mjs so the product
// surface and the run-artifact reports agree on how values are presented.

export function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours < 0) return "0m";
  const days = Math.floor(hours / 24);
  const remainingHours = Math.floor(hours % 24);
  const minutes = Math.round((hours - days * 24 - remainingHours) * 60);
  if (days > 0) return `${days}d ${remainingHours}h`;
  if (remainingHours > 0) return `${remainingHours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(1)}%`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().slice(0, 10);
}