// mock-model.mjs — the "mocked agent endpoint" for Issue #173's initial pilot.
//
// MVP scope says: "Dry-run only, using mocked model responses for initial pilot."
// This module plays the role the real agent endpoint will play later: it accepts
// the diff analysis and returns deterministic suggestions (test scaffolds +
// changelog snippet). Keeping it a separate module means swapping in a real
// endpoint later only changes this file (the workflow always calls runner.mjs).

import { scaffoldFor, changelogParagraph } from "./test-scaffold.mjs";

const MODEL_VERSION = "mock-v1";

/**
 * Produce mock suggestions from a diff analysis.
 * @param {Array<object>} files - entries from analyzeChangedFiles()
 * @param {object} [meta] - optional PR metadata (title, number) for the changelog
 * @returns {{ model_version: string, suggestion_files: Array<object>, changelog: string }}
 */
export function mockModelSuggest(files, meta = {}) {
  const suggestion_files = files.map((f) => scaffoldFor(f));
  const pr = meta.number ? ` (PR #${meta.number})` : "";
  const changelog = changelogParagraph(files) + pr;
  return { model_version: MODEL_VERSION, suggestion_files, changelog };
}

/**
 * Validate that a "real" model payload shape carries no plaintext secrets.
 * MVP note: the dry-run agent never receives secrets. A future real endpoint
 * would layer PII/PCI masking here (documented in the runbook).
 */
export function assertNoSecrets(files) {
  const joined = JSON.stringify(files ?? []);
  const secretRe =
    /(ghp_[A-Za-z0-9]{20,}|BEGIN\s+(RSA\s+)?PRIVATE\s+KEY|(?:"|')?\b(api|secret|token)_?key(?:"|')?\s*[:=])/i;
  if (secretRe.test(joined)) {
    throw new Error("diff payload contains a secret-looking value; refusing to send to a model");
  }
  return true;
}