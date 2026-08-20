// e2e.test.mjs — end-to-end integration test for the Issue #173 agent runner.
//
// Drives the real runner CLI (runner.mjs) with a sample PR files payload and
// asserts the full output contract: parsed files, deterministic mock-model
// scaffolds + changelog, telemetry fields, dry-run isolation (no writes to the
// repo tree). Model responses are mocked by runner.mjs by design (MVP scope).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUNNER = path.resolve(HERE, "..", "runner.mjs");

const PR_PAYLOAD = {
  number: 4242,
  title: "feat(query): add paginated quote search",
  files: [
    {
      filename: "api/src/quotes/search.ts",
      status: "modified",
      additions: 9,
      deletions: 2,
      patch: [
        "@@ -4,4 +4,11 @@",
        " export interface QuoteQuery { term: string }",
        "-export function searchQuotes(q) { return []; }",
        "+export function searchQuotes(query: QuoteQuery) {",
        "+  return [{ id: 1, term: query.term }];",
        "+}",
        "+export function countResults(list) {",
        "+  return list.length;",
        "+}",
      ].join("\n"),
    },
    {
      filename: "api/src/types.ts",
      status: "added",
      additions: 2,
      deletions: 0,
      patch: [
        "@@ -0,0 +1,2 @@",
        "+export interface QuoteQuery { term: string }",
        "+export type Quote = { id: number; term: string }",
      ].join("\n"),
    },
    { filename: "docs/README.md", status: "added", additions: 2, deletions: 0, patch: "@@ -0,0 +1,2 @@\n+# Changed\n+docs" },
  ],
};

test("e2e: runner CLI (mock model) produces scaffolds + changelog + telemetry from a sample PR", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "agent-runner-e2e-"));
  const inputFile = path.join(tmp, "pr-files.json");
  const outFile = path.join(tmp, "report.json");
  writeFileSync(inputFile, JSON.stringify(PR_PAYLOAD));

  const res = spawnSync(process.execPath, [RUNNER, "--files", inputFile, "--out", outFile], {
    encoding: "utf8",
  });
  assert.equal(res.status, 0, `runner exited non-zero: ${res.stderr}`);

  const report = JSON.parse(readFileSync(outFile, "utf8"));
  assert.equal(report.kind, "agent-advisory");
  assert.equal(report.dry_run, true);
  assert.equal(report.files_analyzed, 2); // only the two .ts files
  assert.equal(report.suggestions.model_version, "mock-v1");
  assert.equal(report.suggestions.suggestion_files.length, 2);
  assert.ok(report.suggestions.suggestion_files.some((f) => f.sourceFile.endsWith("search.ts")));
  assert.match(report.suggestions.changelog, /search\.ts — modified/);
  assert.equal(report.telemetry.call_count, 1);
  assert.equal(report.telemetry.error_count, 0);
  assert.equal(report.telemetry.no_sensitive_data, true);
});

test("e2e: runner refuses secret-looking payloads before reaching a model", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "agent-runner-e2e-"));
  const inputFile = path.join(tmp, "pr-files.json");
  writeFileSync(
    inputFile,
    JSON.stringify({
      number: 1,
      files: [
        {
          filename: "a.ts",
          patch: "+export const api_key = \"ghp_abcdefghijklmnopqrstuvwxyz\";",
        },
      ],
    }),
  );
  const res = spawnSync(process.execPath, [RUNNER, "--files", inputFile], { encoding: "utf8" });
  assert.equal(res.status, 1);
  assert.match(res.stdout, /refusing to send to a model/);
});