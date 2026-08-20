// render-comment.test.mjs — unit tests for render-comment.mjs (Issue #173).
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderComment } from "../render-comment.mjs";

const SAMPLE = {
  kind: "agent-advisory",
  dry_run: true,
  files_analyzed: 1,
  suggestions: {
    model_version: "mock-v1",
    suggestion_files: [
      {
        sourceFile: "src/api/client.ts",
        testFile: "src/api/client.test.ts",
        kind: "exports",
        suggestion: 'import { describe, it } from "vitest";\n\ndescribe(...)',
      },
    ],
    changelog: "Suggested changelog entry:\n- src/api/client.ts — added",
  },
  telemetry: {
    call_count: 1,
    error_count: 0,
    latency_ms: 12,
    model_version_placeholder: "mock-v1",
    no_sensitive_data: true,
  },
};

test("renderComment includes dry-run banner, scaffold, changelog, telemetry (no sensitive data)", () => {
  const body = renderComment(SAMPLE);
  assert.match(body, /AI Agent MVP \(dry-run\)/);
  assert.match(body, /No files were changed/);
  assert.match(body, /src\/api\/client\.test\.ts/);
  assert.match(body, /### Changelog/);
  assert.match(body, /calls=1 errors=0 latency_ms=12 model=mock-v1/);
  assert.ok(!body.includes("ghp_"));
});

test("renderComment handles error reports and empty diffs honestly", () => {
  const err = renderComment({ error: "boom", telemetry: { error_count: 1 } });
  assert.match(err, /\*\*Runner error\*\*: boom/);
  const empty = renderComment({ files_analyzed: 0, telemetry: {} });
  assert.match(empty, /No TypeScript changes detected/);
});