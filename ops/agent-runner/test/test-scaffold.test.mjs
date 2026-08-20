// test-scaffold.test.mjs — unit tests for lib/test-scaffold.mjs (Issue #173).
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeChangedFiles } from "../lib/diff-parser.mjs";
import {
  skeleton,
  assertionFor,
  scaffoldFor,
  changelogParagraph,
} from "../lib/test-scaffold.mjs";

const FILES = [
  {
    filename: "frontend/src/features/onboarding/use-quote.ts",
    status: "modified",
    additions: 6,
    deletions: 1,
    patch: [
      "@@ -12,4 +12,9 @@",
      " export const QUOTE_CONST = 1;",
      "-export function oldQuote() { return null; }",
      "+export function buildQuote(input: string) {",
      "+  return { input, ready: true };",
      "+}",
      "+export class QuoteRepo {",
      "+  fetch() { return Promise.resolve(); }",
      "+}",
    ].join("\n"),
  },
];

test("skeleton emits a vitest describe/it scaffold with symbol assertions", () => {
  const [analysis] = analyzeChangedFiles(FILES);
  const s = skeleton(analysis);
  assert.match(s, /vitest/);
  assert.match(s, /describe\("</);
  assert.match(s, /it\("should exercise buildQuote/);
  assert.match(s, /it\("should exercise QuoteRepo/);
});

test("skeleton falls back to a TODO it for files without exports", () => {
  const s = skeleton({ symbols: [] });
  assert.match(s, /\/\/ TODO: add first assertion/);
});

test("assertionFor builds an expect(…).toBeDefined() line", () => {
  assert.equal(assertionFor("buildQuote"), "expect(buildQuote).toBeDefined();");
});

test("scaffoldFor colocations the .test.<ext> path and classifies kind", () => {
  const [analysis] = analyzeChangedFiles(FILES);
  const sc = scaffoldFor(analysis);
  assert.equal(sc.sourceFile, "frontend/src/features/onboarding/use-quote.ts");
  assert.equal(sc.testFile, "frontend/src/features/onboarding/use-quote.test.ts");
  assert.equal(sc.kind, "exports");
  assert.ok(sc.suggestion.includes("buildQuote"));
});

test("changelogParagraph summarizes changed files, or states none", () => {
  const [analysis] = analyzeChangedFiles(FILES);
  const paragraph = changelogParagraph([analysis]);
  assert.match(paragraph, /frontend\/src\/features\/onboarding\/use-quote\.ts — modified/);
  assert.match(paragraph, /exports touched: buildQuote, QuoteRepo/);
  assert.match(changelogParagraph([]), /No TypeScript changes detected/);
});