import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/delivery-health/format";
import type { DeliveryAudit } from "@/lib/delivery-health/types";

type AuditEventKind = "deployment" | "release" | "merged-pr" | "failure-event";

type AuditRow = {
  id: string;
  kind: AuditEventKind;
  title: string;
  detail: string;
  date: string | null;
};

const KIND_LABEL: Record<AuditEventKind, string> = {
  deployment: "Deployment",
  release: "Release",
  "merged-pr": "Merged PR",
  "failure-event": "Failure event",
};

const KIND_TONE: Record<AuditEventKind, BadgeTone> = {
  deployment: "cyan",
  release: "violet",
  "merged-pr": "neutral",
  "failure-event": "rose",
};

function toRows(audit: DeliveryAudit): AuditRow[] {
  const rows: AuditRow[] = [
    ...audit.deployments.map((d) => ({
      id: `deploy-${d.id}`,
      kind: "deployment" as const,
      title: d.environment,
      detail: d.ref,
      date: d.created_at,
    })),
    ...audit.releases.map((r) => ({
      id: `release-${r.tag}`,
      kind: "release" as const,
      title: r.tag,
      detail: r.name,
      date: r.published_at,
    })),
    ...audit.merged_pulls.map((p) => ({
      id: `pr-${p.number}`,
      kind: "merged-pr" as const,
      title: `#${p.number}`,
      detail: p.title,
      date: p.merged_at,
    })),
    ...audit.failure_events.map((e) => ({
      id: `failure-${e.number}`,
      kind: "failure-event" as const,
      title: `#${e.number}`,
      detail: e.title,
      date: e.created_at,
    })),
  ];
  return rows.sort((a, b) => {
    const aMs = a.date ? Date.parse(a.date) : 0;
    const bMs = b.date ? Date.parse(b.date) : 0;
    return bMs - aMs;
  });
}

type AuditTrailTableProps = {
  audit: DeliveryAudit;
  maxRows?: number;
};

export function AuditTrailTable({ audit, maxRows = 10 }: AuditTrailTableProps) {
  const rows = toRows(audit);
  const visible = rows.slice(0, maxRows);

  return (
    <Card as="section">
      <h3 className="text-lg font-semibold text-white">Audit trail</h3>
      <p className="mt-2 text-sm text-slate-400">
        {rows.length} audit events in this snapshot — deployments, releases,
        merged PRs, and failure events from GitHub-native records.
      </p>
      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No audit events in this snapshot — run scripts/delivery-telemetry.mjs
          against a repo with real delivery activity.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Reference</th>
                <th className="py-2 pr-4">Detail</th>
                <th className="py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className="border-b border-white/5">
                  <td className="py-2.5 pr-4">
                    <Badge size="sm" tone={KIND_TONE[row.kind]} font="normal">
                      {KIND_LABEL[row.kind]}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-4 font-medium text-slate-200">
                    {row.title}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-400">{row.detail}</td>
                  <td className="py-2.5 text-slate-500">{formatDate(row.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}