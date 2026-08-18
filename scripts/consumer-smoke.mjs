#!/usr/bin/env node
// P17 — in-repo "consumer-path" rehearsal (substitution, never labeled adoption).
//
// Executes the engine copy-kit exactly as a consumer would into a scratch
// workspace: the kit's §1 copy commands run verbatim, the stand-in app is
// brought into frontend/ (kit §3), and the kit §8 expectations are checked
// literally. `make lint` and `make test-frontend` run INSIDE the rehearsed
// consumer so the read-back (P17-T3) is real: actionlint + pnpm must be on PATH.
//
// Usage: node scripts/consumer-smoke.mjs [--root <engine-checkout>] [--consumer <dir>|--tmp]
// Exit 0 when every expectation passes; non-zero with a FAIL matrix otherwise.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

const ROOT = path.resolve(arg("--root") ?? process.cwd());
const CONSUMER =
  path.resolve(arg("--consumer") ?? mkdtempSync(path.join(os.tmpdir(), "pdm-consumer-")));
const KIT_WF = path.join("pdm", "workflows"); // relative to .github/
const RESULTS = [];

function record(id, name, pass, detail = "") {
  RESULTS.push({ id, name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id}  ${name}${detail ? `  — ${detail}` : ""}`);
}

function run(cmd, args, cwd, timeoutMs = 600_000) {
  return execFileSync(cmd, args, { cwd, stdio: "inherit", timeout: timeoutMs });
}

// ---- §1 copy (literal commands from docs/engine-copy-kit.md) ----
// NOTE: create only the consumer ROOT (not <consumer>/.github) — `cp -R SRC
// EXISTING_DIR` would copy INTO it (`.github/.github`); an absent destination
// is created by cp.
mkdirSync(CONSUMER, { recursive: true });
run("cp", ["-R", path.join(ROOT, ".github"), path.join(CONSUMER, ".github")], ROOT);
run("cp", ["-R", path.join(ROOT, "Makefile"), path.join(ROOT, "scripts"), CONSUMER], ROOT);
run("cp", ["-R", path.join(ROOT, "README.md"), path.join(ROOT, "AGENTS.md"), CONSUMER], ROOT);

// §3 bring-your-app (rehearsal stands in the reference app; consumers bring their own)
run("cp", ["-R", path.join(ROOT, "frontend"), path.join(CONSUMER, "frontend")], ROOT);
for (const junk of ["node_modules", "out", ".next", "dist"]) {
  run("rm", ["-rf", path.join(CONSUMER, "frontend", junk)], ROOT);
}

// §1 .gitignore step (folded into the kit after this phase's consumer flight):
// a consumer must keep node_modules, build output, and PDM run artifacts out of git.
writeFileSync(
  path.join(CONSUMER, ".gitignore"),
  [
    "# Build + dependency output",
    "dist/",
    "node_modules/",
    ".node_modules/",
    "",
    "# PDM run artifacts (written to ephemeral GitHub runners or local dry-runs)",
    ".github/pdm/deployments/",
    ".github/pdm/reports/",
    ".github/pdm/releases/",
    "",
  ].join("\n"),
);

// ---- A1: copy integrity (the §1 `cp -R` directory bug guard) ----
const canonical = path.join(CONSUMER, ".github", KIT_WF);
const execution = path.join(CONSUMER, ".github", "workflows");
record(
  "A1",
  "kit §1 copy lands both workflow trees",
  existsSync(canonical) && existsSync(execution),
  existsSync(canonical) ? "canonical+execution present" : "missing trees",
);
const gates = ["quality-gate.yml", "compliance-guardrail.yml", "risk-health-check.yml"];
record(
  "A1b",
  "the 3 PR gate workflows copied into both trees",
  gates.every((f) => existsSync(path.join(canonical, f)) && existsSync(path.join(execution, f))),
);
for (const f of ["Makefile", "README.md", "AGENTS.md"]) {
  record(`A1-${f}`, `engine file \`${f}\` present`, existsSync(path.join(CONSUMER, f)));
}
record(
  "A1-scripts",
  "scripts/ copied (engine code, no cp-directory bug)",
  existsSync(path.join(CONSUMER, "scripts", "delivery-telemetry.mjs")) &&
    existsSync(path.join(CONSUMER, "scripts", "risk-review.mjs")),
);

// ---- A2: bring-your-app ----
record(
  "A2",
  "consumer app present in frontend/ with lockfile (kit §3)",
  existsSync(path.join(CONSUMER, "frontend", "package.json")) &&
    existsSync(path.join(CONSUMER, "frontend", "pnpm-lock.yaml")),
);
record(
  "A2b",
  "no node_modules / build output copied into the consumer",
  !existsSync(path.join(CONSUMER, "frontend", "node_modules")) &&
    !existsSync(path.join(CONSUMER, "frontend", "out")),
);

// ---- A3: canonical vs execution drift (what `make lint` enforces) ----
const drifted = (() => {
  const canonFiles = readdirSync(canonical).filter((f) => f.endsWith(".yml")).sort();
  const execFiles = readdirSync(execution).filter((f) => f.endsWith(".yml")).sort();
  if (canonFiles.join() !== execFiles.join()) return true;
  return canonFiles.some((f) => {
    const a = readFileSync(path.join(canonical, f), "utf8");
    const b = readFileSync(path.join(execution, f), "utf8");
    return a !== b;
  });
})();
record("A3", "canonical == execution (byte-identical, no drift)", !drifted);

// ---- A4: never-commit rules (root .gitignore must exclude PDM run artifacts) ----
const ignorePath = path.join(CONSUMER, ".gitignore");
const ignoreTxt = existsSync(ignorePath) ? readFileSync(ignorePath, "utf8") : "";
const artifactIgnores = [
  ".github/pdm/deployments/",
  ".github/pdm/reports/",
  ".github/pdm/releases/",
];
record(
  "A4",
  "consumer .gitignore excludes PDM run-artifact dirs",
  artifactIgnores.every((p) => ignoreTxt.includes(p)),
  existsSync(ignorePath) ? "root .gitignore present" : "MISSING root .gitignore",
);

// ---- A5 + A6: the read-back gates run INSIDE the rehearsed consumer ----
try {
  run("make", ["lint"], CONSUMER);
  record("A5", "`make lint` green in the rehearsed consumer", true);
} catch {
  record("A5", "`make lint` green in the rehearsed consumer", false, "actionlint or drift failure");
}
try {
  run("make", ["test-frontend"], CONSUMER, 900_000);
  record("A6", "`make test-frontend` green in the rehearsed consumer", true);
} catch {
  record("A6", "`make test-frontend` green in the rehearsed consumer", false, "frontend suite failure");
}

// ---- A7: kit §8 gotcha literals, checked against the copied tree ----
const readYml = (f) => readFileSync(path.join(canonical, f), "utf8");
const risk = readYml("risk-health-check.yml");
const compliance = readYml("compliance-guardrail.yml");
const quality = readYml("quality-gate.yml");
const releasePipeline = readYml("release-pipeline.yml");
record(
  "A7-osv",
  "osv-scanner pinned to google/osv-scanner-action/osv-scanner-action@v2.5.0 with --recursive",
  risk.includes("osv-scanner-action/osv-scanner-action@v2.5.0") &&
    risk.includes("--recursive") &&
    !/-r=\./.test(risk + compliance),
);
record(
  "A7-ghscript",
  "github-script v7+/v9 — `const { context }` never redeclared",
  !/const\s*\{[^}]*context[^}]*\}/.test(quality) &&
    !/const\s*\{[^}]*context[^}]*\}/.test(releasePipeline),
);
const artifactGuardInvariant = readdirSync(canonical)
  .filter((f) => f.endsWith(".yml"))
  .every((f) => {
    const txt = readFileSync(path.join(canonical, f), "utf8");
    if (!txt.includes("upload-artifact")) return true;
    // A workflow may upload artifacts when it guards the upload for non-PR runs
    // (github.event.pull_request / real_deploy) OR when its triggers can never
    // produce a pull_request event (schedule/dispatch/push-only, per kit §8).
    const guarded = txt.includes("github.event.pull_request") || txt.includes("real_deploy");
    const prTriggered = /pull_request:\s*\n/.test(txt) || /pull_request_target:\s*\n/.test(txt);
    return guarded || !prTriggered;
  });
record(
  "A7-artifacts",
  "artifact uploads guard non-PR runs (guard token, or no PR trigger by construction)",
  artifactGuardInvariant,
);

// ---- Report ----
const summary = RESULTS.reduce((acc, r) => ({ pass: acc.pass + Number(r.pass), fail: acc.fail + Number(!r.pass) }), { pass: 0, fail: 0 });
let report = `# Copy-Kit Consumer-Path Rehearsal (P17 substitution)\n\nEngine \`${ROOT}\` → rehearsed consumer \`${CONSUMER}\`.\n\n`;
report += `| Expectation | Result | Note |\n|---|---|---|\n`;
for (const r of RESULTS) report += `| ${r.id} — ${r.name} | ${r.pass ? "PASS" : "FAIL"} | ${r.detail.replaceAll("|", "\\|")} |\n`;
report += `\n**Summary:** ${summary.pass} pass, ${summary.fail} fail.\n`;
const reportPath = path.join(CONSUMER, "consumer-smoke-report.md");
writeFileSync(reportPath, report);
console.log(`\nSummary: ${summary.pass} pass, ${summary.fail} fail`);
console.log(`Report: ${reportPath}`);

process.exitCode = summary.fail === 0 ? 0 : 1;