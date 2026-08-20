// mock-model.test.mjs — unit tests for lib/mock-model.mjs (Issue #173).
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeChangedFiles } from "../lib/diff-parser.mjs";
import { mockModelSuggest, assertNoSecrets } from "../lib/mock-model.mjs";

const FILES = [
  {
    filename: "frontend/src/api/client.ts",
    status: "added",
    additions: 3,
    deletions: 0,
    patch: [
      "@@ -0,0 +1,3 @@",
      "+export function createClient(baseUrl: string) { return { baseUrl }; }",
      "+export const MAX_RETRIES = 3;",
      "+export default createClient;",
    ].join("\n"),
  },
];

test("mockModelSuggest returns deterministic scaffolds + changelog with PR number", () => {
  const files = analyzeChangedFiles(FILES);
  const out = mockModelSuggest(files, { number: 200 });
  assert.equal(out.model_version, "mock-v1");
  assert.equal(out.suggestion_files.length, 1);
  assert.equal(out.suggestion_files[0].testFile, "frontend/src/api/client.test.ts");
  assert.match(out.changelog, /\(PR #200\)/);
  assert.match(out.changelog, /frontend\/src\/api\/client\.ts — added/);
});

test("mockModelSuggest handles an empty diff (returns empty, honest changelog)", () => {
  const out = mockModelSuggest([], { number: 201 });
  assert.equal(out.suggestion_files.length, 0);
  assert.match(out.changelog, /No TypeScript changes detected/);
});

test("assertNoSecrets rejects secret-looking payloads", () => {
  assert.doesNotThrow(() => assertNoSecrets(FILES));
  assert.throws(() =>
    assertNoSecrets([{ filename: "a.ts", patch: "+export const token = \"ghp_12345678901234567890\";" }]),
  );
  assert.throws(() =>
    assertNoSecrets([{ filename: "a.ts", patch: "+const key = \"github_pat_abcdefghijklmnop_12345678901234\";" }]),
  );
  assert.throws(() =>
    assertNoSecrets([{ filename: "a.ts", patch: "+const pem = \"-----BEGIN PRIVATE KEY-----\\nabcd\"" }]),
  );
  assert.doesNotThrow(() =>
    assertNoSecrets([{ filename: "README.md", patch: "+uses AI_AGENT_API_KEY from a GitHub Secret, never committed" }]),
  );
});