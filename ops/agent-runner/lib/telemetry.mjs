// telemetry.mjs — minimal, developer-visible telemetry for the agent runner.
//
// Issue #173 MVP: basic metrics (call count, latency, model version placeholder,
// errors) with NO sensitive data in the payload. Output is a JSON artifact a
// workflow can upload so the run is developer-visible without an observability
// service (ADR 0008: GitHub-native telemetry over an external tool).

/**
 * Create a telemetry accumulator.
 * @returns {{recordCall(modelVersion: string|null): void, recordError(message: string): void, snapshot(startedAt: number): object}}
 */
export function createTelemetry() {
  let calls = 0;
  let errors = 0;
  const sampleModelVersion = ["mock-v1"];

  return {
    recordCall(modelVersion = null) {
      calls += 1;
      if (modelVersion) sampleModelVersion[0] = modelVersion;
    },
    recordError() {
      errors += 1;
    },
    snapshot(startedAt = Date.now()) {
      return {
        kind: "agent-runner-telemetry",
        call_count: calls,
        error_count: errors,
        model_version_placeholder: sampleModelVersion[0],
        latency_ms: Date.now() - startedAt,
        emitted_utc: new Date().toISOString(),
        no_sensitive_data: true,
      };
    },
  };
}