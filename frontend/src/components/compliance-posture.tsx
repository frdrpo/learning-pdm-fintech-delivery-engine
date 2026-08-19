import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ComplianceControl, ControlStatus } from "@/lib/compliance";

export type { ComplianceControl, ControlStatus } from "@/lib/compliance";

const CONTROL_LABEL: Record<ControlStatus, string> = {
  pass: "Pass",
  pending: "Pending",
};

const CONTROL_TONE: Record<ControlStatus, BadgeTone> = {
  pass: "green",
  pending: "amber",
};

type CompliancePostureProps = {
  controls: readonly ComplianceControl[];
};

export function CompliancePosture({ controls }: CompliancePostureProps) {
  const green = controls.filter((control) => control.status === "pass").length;

  return (
    <Card as="section">
      <h3 className="text-lg font-semibold text-white">Compliance posture</h3>
      <p
        className="mt-2 text-sm text-slate-400"
        aria-label={`${green} of ${controls.length} controls green`}
      >
        {green} of {controls.length} controls green — shift-left by default.
      </p>
      <ul className="mt-4 space-y-3">
        {controls.map((control) => (
          <li key={control.id}>
            <Card variant="row">
              <span className="text-sm text-slate-200">{control.name}</span>
              <Badge
                size="sm"
                tone={CONTROL_TONE[control.status]}
                label={CONTROL_LABEL[control.status]}
              >
                {CONTROL_LABEL[control.status]}
              </Badge>
            </Card>
          </li>
        ))}
      </ul>
    </Card>
  );
}