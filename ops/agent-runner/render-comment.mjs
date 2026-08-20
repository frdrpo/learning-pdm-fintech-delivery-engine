#!/usr/bin/env node
// render-comment.mjs — turn an agent-runner report JSON into the dry-run
// suggestion comment body that the workflow posts on the PR (ADR 0017).
//
// Usage: node ops/agent-runner/render-comment.mjs report.json comment.md

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export function renderComment(report) {
  const lines = [];
  lines.push("## AI Agent MVP (dry-run) — test scaffolds + changelog suggestions");
  lines.push("");
  lines.push("> Advisory only (ADR 0017, issue #173). No files were changed. A maintainer applies any suggestion.");
  lines.push("");
  const tel = report.telemetry ?? {};
  if (report.error) {
    lines.push(`**Runner error**: ${report.error}`);
  } else if ((report.files_analyzed ?? 0) === 0) {
    lines.push("No TypeScript changes detected in this PR; nothing to scaffold.");
  } else {
    lines.push(`Analyzed **${report.files_analyzed}** TypeScript file(s) with model \`${report.suggestions?.model_version ?? "unknown"}\`.`);
    lines.push("");
    for (const s of report.suggestions?.suggestion_files ?? []) {
      lines.push(`### ${s.sourceFile}`);
      lines.push("");
      lines.push(`Suggested test file: \`${s.testFile}\``);
      lines.push("");
      lines.push("```ts");
      lines.push(s.suggestion);
      lines.push("```");
    }
    lines.push("### Changelog");
    lines.push("");
    lines.push(report.suggestions?.changelog ?? "");
  }
  lines.push("");
  lines.push(
    `_Telemetry: calls=${tel.call_count ?? 0} errors=${tel.error_count ?? 0} latency_ms=${tel.latency_ms ?? 0} model=${tel.model_version_placeholder ?? "mock-v1"} (no sensitive data)._`,
  );
  return `${lines.join("\n")}\n`;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) &&
  process.argv.length >= 4
) {
  const report = JSON.parse(readFileSync(process.argv[2], "utf8"));
  writeFileSync(process.argv[3], renderComment(report));
}