// diff-parser.mjs — parse GitHub PR diffs and extract TypeScript-change signals.
//
// Issue #173 MVP scope: only TypeScript files (.ts/.tsx, optionally .js/.jsx)
// changed in a PR are analyzed. The parser is deterministic and dependency-free:
// it consumes a GitHub "files" payload (the shape of rest.pulls.listFiles) and
// produces a compact analysis the mock/recommended model can turn into test
// scaffolds + a changelog snippet.

const TS_RE = /\.(ts|tsx)$/;
const JS_RE = /\.(js|jsx)$/;

/**
 * Normalize a file record from the GitHub "files" API into a local shape.
 * @param {{filename?: string, status?: string, additions?: number, deletions?: number, patch?: string}} raw
 * @returns {{filepath: string, status: string, additions: number, deletions: number, patch: string}}
 */
export function normalizeFile(raw) {
  return {
    filepath: raw.filename ?? raw.filepath ?? "",
    status: raw.status ?? "modified",
    additions: Number(raw.additions ?? 0),
    deletions: Number(raw.deletions ?? 0),
    patch: raw.patch ?? "",
  };
}

/**
 * Decide whether a path is in scope for the MVP (TS/TSX by default; JS/JSX
 * optional via the `includeJs` option).
 * @param {string} filepath
 * @param {{includeJs?: boolean}} options
 */
export function inScope(filepath, { includeJs = false } = {}) {
  if (!filepath || filepath.includes("__tests__") || /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filepath)) {
    return false;
  }
  if (includeJs) return TS_RE.test(filepath) || JS_RE.test(filepath);
  return TS_RE.test(filepath);
}

/** Extract exported symbol names from added lines of a patch (best-effort). */
export function exportedSymbols(patchLines /* string[] */) {
  const symbols = [];
  for (const line of patchLines) {
    const trimmed = line.replace(/^\s*[+-]\s*/, "").trim();
    let m = trimmed.match(/^export\s+(?:default\s+)?(?:function|class|interface|type)\s+([A-Za-z_$][\w$]*)/);
    if (m) {
      symbols.push(m[1]);
      continue;
    }
    m = trimmed.match(/^export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/);
    if (m) {
      symbols.push(m[1]);
      continue;
    }
    m = trimmed.match(/^export\s{/);
    if (m) {
      symbols.push("*");
      continue;
    }
    m = trimmed.match(/^export\s+default\s+([A-Za-z_$][\w$]*)/);
    if (m) {
      symbols.push(m[1]);
      continue;
    }
  }
  return [...new Set(symbols)];
}

/**
 * Split a patch's payload into added and removed code lines (ignoring hunk
 * headers and context).
 * @param {string} patch
 * @returns {{added: string[], removed: string[]}}
 */
export function patchLines(patch) {
  const added = [];
  const removed = [];
  for (const line of patch.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) added.push(line);
    else if (line.startsWith("-") && !line.startsWith("---")) removed.push(line);
  }
  return { added, removed };
}

/**
 * Analyze a raw GitHub files payload.
 * @param {Array<{[k: string]: any}>} files
 * @param {{includeJs?: boolean}} [options]
 * @returns {Array<{filepath, status, additions, deletions, added: string[], removed: string[], symbols: string[]}>}
 */
export function analyzeChangedFiles(files, options = {}) {
  if (!Array.isArray(files)) return [];
  return files
    .map(normalizeFile)
    .filter((f) => inScope(f.filepath, options))
    .map((f) => {
      const { added, removed } = patchLines(f.patch);
      return {
        filepath: f.filepath,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        added,
        removed,
        symbols: exportedSymbols(added),
      };
    });
}

/**
 * Derive a suggested test file path from a source file path
 * (src/a/b.ts -> src/a/b.test.ts; next to the source, colocated).
 */
export function suggestedTestPath(filepath) {
  return filepath.replace(/\.(ts|tsx|js|jsx)$/, ".test.$1");
}