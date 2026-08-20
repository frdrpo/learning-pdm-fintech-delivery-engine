// test-scaffold.mjs — generate vitest-style test scaffolds for a changed file.
//
// Issue #173 MVP: the "model" (mock or real) receives the diff analysis and must
// return *suggested* test scaffolds (skeleton tests with file paths + example
// assertions) and a short changelog paragraph. Generation here is deterministic
// and template-based so the dry-run is predictable and unit-testable.

/**
 * Build a vitest skeleton with example assertions around exported symbols.
 * @param {{symbols?: string[]}} analysis
 * @returns {string}
 */
export function skeleton(analysis = {}) {
  const symbols = analysis.symbols ?? [];
  const its = symbols
    .map(
      (s) => `  it("should exercise ${s}", () => {\n    // TODO: assert observed ${s} behaviour\n  });`,
    )
    .join("\n");
  return [
    "import { describe, expect, it } from \"vitest\";",
    "",
    "describe(\"<module under test>\", () => {",
    its || "  it(\"should behave as documented\", () => {\n    // TODO: add first assertion\n  });",
    "});",
    "",
  ].join("\n");
}

/** An example assertion line for a suggested test. */
export function assertionFor(symbol) {
  return `expect(${symbol}).toBeDefined();`;
}

/**
 * Compose the suggested scaffold record for one changed file.
 * @param {object} file - entry from analyzeChangedFiles()
 * @param {object} [options]
 * @returns {{sourceFile, testFile, kind, suggestion}}
 */
export function scaffoldFor(file, options = {}) {
  const testFile =
    options.testPath ?? file.filepath.replace(/\.(ts|tsx|js|jsx)$/, ".test.$1");
  const so = file.symbols ?? [];
  const suggestion = skeleton({ symbols: so });
  const kind = so.length ? "exports" : "skeleton";
  return { sourceFile: file.filepath, testFile, kind, suggestion };
}

/**
 * Short changelog paragraph summarizing the changed TS surface of a PR,
 * derived from the deterministic analysis only (no model output needed).
 * @param {Array<object>} files - entries from analyzeChangedFiles()
 * @returns {string}
 */
export function changelogParagraph(files = []) {
  if (!files.length) {
    return "No TypeScript changes detected in this PR; no changelog suggestion supplied.";
  }
  const lines = files.map((f) => {
    const symbols = f.symbols ?? [];
    const touched = symbols.length
      ? ` (exports touched: ${symbols.join(", ")})`
      : " (no named exports detected)";
    return `- ${f.filepath} — ${f.status}${touched}`;
  });
  return `Suggested changelog entry (dry-run, human to confirm):\n${lines.join("\n")}`;
}