// diff-parser.test.mjs — unit tests for lib/diff-parser.mjs (Issue #173).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeFile,
  inScope,
  exportedSymbols,
  patchLines,
  analyzeChangedFiles,
  suggestedTestPath,
} from "../lib/diff-parser.mjs";

const SAMPLE_FILES = [
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
  {
    filename: "frontend/src/components/QuoteCard.tsx",
    status: "added",
    additions: 2,
    deletions: 0,
    patch: [
      "@@ -0,0 +1,2 @@",
      "+export function QuoteCard() { return null; }",
      "+export default QuoteCard;",
    ].join("\n"),
  },
  { filename: "scripts/risk-review.mjs", status: "modified", additions: 1, deletions: 0, patch: "@@ -1,0 +1 @@\n+// not TS" },
  { filename: "README.md", status: "modified", additions: 3, deletions: 0, patch: "@@ -1,0 +3 @@\n+# hi\n+## hello\n+ok" },
];

test("normalizeFile maps GitHub files API fields", () => {
  const f = normalizeFile(SAMPLE_FILES[0]);
  assert.equal(f.filepath, "frontend/src/features/onboarding/use-quote.ts");
  assert.equal(f.status, "modified");
  assert.equal(f.additions, 6);
  assert.equal(f.deletions, 1);
  assert.ok(f.patch.includes("@@ -12,4 +12,9 @@"));
});

test("inScope keeps TS files, drops non-TS, honors includeJs", () => {
  assert.ok(inScope("a/b.ts"));
  assert.ok(inScope("a/b.tsx"));
  assert.ok(!inScope("a/b.js"));
  assert.ok(inScope("a/b.js", { includeJs: true }));
  assert.ok(inScope("a/b.jsx", { includeJs: true }));
  assert.ok(!inScope("a/README.md"));
  assert.ok(!inScope("a/b.test.ts"), "test files are out of scope");
  assert.ok(!inScope(""));
});

test("exportedSymbols extracts export names from added lines", () => {
  const syms = exportedSymbols([
    "+export function buildQuote(input: string) {",
    "+  const x = 1;",
    "+export class QuoteRepo {",
    "+export default QuoteCard;",
    "+export const QUOTE_CONST = 1;",
  ]);
  assert.deepEqual(syms.sort(), ["QUOTE_CONST", "QuoteCard", "QuoteRepo", "buildQuote"]);
});

test("patchLines separates added and removed code lines", () => {
  const { added, removed } = patchLines(SAMPLE_FILES[0].patch);
  assert.deepEqual(added, [
    "+export function buildQuote(input: string) {",
    "+  return { input, ready: true };",
    "+}",
    "+export class QuoteRepo {",
    "+  fetch() { return Promise.resolve(); }",
    "+}",
  ]);
  assert.deepEqual(removed, ["-export function oldQuote() { return null; }"]);
});

test("analyzeChangedFiles filters to TS scope and attaches symbols", () => {
  const files = analyzeChangedFiles(SAMPLE_FILES);
  assert.equal(files.length, 2);
  const [quote] = files;
  assert.equal(quote.filepath, "frontend/src/features/onboarding/use-quote.ts");
  assert.ok(quote.symbols.includes("buildQuote"));
  assert.ok(quote.symbols.includes("QuoteRepo"));
});

test("suggestedTestPath colocations .test.<ext>", () => {
  assert.equal(suggestedTestPath("a/b.ts"), "a/b.test.ts");
  assert.equal(suggestedTestPath("a/b.tsx"), "a/b.test.tsx");
  assert.equal(suggestedTestPath("a/b.js"), "a/b.test.js");
});