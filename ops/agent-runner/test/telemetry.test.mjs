// telemetry.test.mjs — unit tests for lib/telemetry.mjs (Issue #173).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createTelemetry } from "../lib/telemetry.mjs";

test("telemetry counts calls and errors, tracks latency + model placeholder", async () => {
  const tel = createTelemetry();
  const started = Date.now();
  await new Promise((r) => setTimeout(r, 5));
  tel.recordCall("mock-v1");
  tel.recordCall("mock-v1");
  tel.recordError();
  const snap = tel.snapshot(started);
  assert.equal(snap.call_count, 2);
  assert.equal(snap.error_count, 1);
  assert.equal(snap.model_version_placeholder, "mock-v1");
  assert.ok(snap.latency_ms >= 0);
  assert.equal(snap.no_sensitive_data, true);
  assert.ok(typeof snap.emitted_utc === "string");
});

test("telemetry marks no_sensitive_data flag and never includes diff content", () => {
  const snap = createTelemetry().snapshot();
  const raw = JSON.stringify(snap);
  assert.ok(!raw.includes("secret"));
  assert.ok(!raw.includes("patch"));
});