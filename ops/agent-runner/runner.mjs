#!/usr/bin/env node
// runner.mjs — Issue #173 MVP agent runner (CLI entry point).
//
// Accepts PR diff + repo metadata and returns suggested test scaffolds + a
// changelog snippet. Dry-run by default: no commits, no pushes, no merges.
// With no model endpoint configured it uses the deterministic mock model
// (mock-model.mjs); a future real endpoint replaces it behind the same input.
//
// Usage:
//   node ops/agent-runner/runner.mjs                 # reads stdin JSON
//   node ops/agent-runner/runner.mjs --files pr-files.json --out report.json
//   node ops/agent-runner/runner.mjs --help
//
// Input JSON (either stdin or --files):
//   {
//     "number": 123,            // PR number (optional)
//     "title": "feat: ...",     // PR title (optional)
//     "files": [                // GitHub rest.pulls.listFiles payload
//       { filename, status, additions, deletions, patch }
//     ],
//     "includeJs": false
//   }

import { readFileSync, writeFileSync } from "node:fs";
import { analyzeChangedFiles } from "./lib/diff-parser.mjs";
import { mockModelSuggest, assertNoSecrets } from "./lib/mock-model.mjs";
import { createTelemetry } from "./lib/telemetry.mjs";

function parseArgs(argv) {
  const out = { files: null, out: null, inputJson: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--files") out.files = argv[i + 1];
    else if (argv[i] === "--out") out.out = argv[i + 1];
    else if (argv[i] === "--help") out.help = true;
  }
  return out;
}

function loadInput(cli) {
  const src = cli.files ? readFileSync(cli.files, "utf8") : readFileSync(0, "utf8");
  return JSON.parse(src);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Issue #173 agent runner — dry-run test-scaffold + changelog suggestions.");
    console.log("Options: --files <json>  --out <json>   (default: stdin, stdout)");
    process.exit(0);
  }

  const started = Date.now();
  const tel = createTelemetry();
  const startedAt = started;

  try {
    const input = loadInput(args);
    const options = { includeJs: Boolean(input.includeJs ?? false) };

    // Refuse secret-looking payloads before they reach a model (mock or real).
    assertNoSecrets(input.files ?? []);
    const files = analyzeChangedFiles(input.files ?? [], options);
    tel.recordCall("mock-v1");
    const suggestions = mockModelSuggest(files, {
      number: input.number,
      title: input.title,
    });
    const telemetry = tel.snapshot(startedAt);
    const result = {
      kind: "agent-advisory",
      dry_run: true,
      files_analyzed: files.length,
      suggestions,
      telemetry,
    };
    const body = JSON.stringify(result, null, 2);
    if (args.out) writeFileSync(args.out, body, "utf8");
    else process.stdout.write(body + "\n");
  } catch (err) {
    tel.recordError();
    const result = {
      kind: "agent-advisory",
      dry_run: true,
      error: String(err?.message ?? err),
      telemetry: tel.snapshot(startedAt),
    };
    const body = JSON.stringify(result, null, 2);
    if (args.out) writeFileSync(args.out, body, "utf8");
    else process.stdout.write(body + "\n");
    process.exitCode = 1;
  }
}

main();