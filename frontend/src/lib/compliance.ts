export type ControlStatus = "pass" | "pending";

export type ComplianceControl = {
  id: string;
  name: string;
  status: ControlStatus;
};