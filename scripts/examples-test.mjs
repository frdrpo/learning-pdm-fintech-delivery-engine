#!/usr/bin/env node
// Issue #184 — integration test for the examples/templates tree.
//
// Runs the example deliverables' offline checks (no GitHub, no Docker):
//   1. every example subproject has a README + the structure its own test needs
//   2. the fintech-agent-runner fleet passes its own scrub-rule test
//   3. the agent-skills-demo contract test passes (mocked "agent runner")
//   4. the pdm-workflow-templates workflows parse as YAML and pass actionlint
//   5. template invariants mirror the repo's gotchas: artifact uploads are
//      guarded for PR-independent runs, or the trigger is dispatch-only
//
// Usage: node scripts/examples-test.mjs [--examples <dir>]
// Exit 0 when every check passes; non-zero with a FAIL matrix otherwise.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXAMPLES = path.resolve(
  process.argv.indexOf("--examples") >= 0
    ? process.argv[process.argv.indexOf("--examples") + 1]
    : path.join(ROOT, "examples"),
);

const RESULTS = [];

function record(id, name, pass, detail = "") {
  RESULTS.push({ id, name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id}  ${name}${detail ? `  — ${detail}` : ""}`);
}

function yamlKey(text, key) {
  const m = text.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
  return m ? m[1] : null;
}

const subprojects = () =>
  readdirSync(EXAMPLES, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name);

// ---- 1. structure: README + expected top-levels ----
(async () => {
  const dirs = subprojects();
  record("E1", "examples/ has >= 2 reference implementations", dirs.length >= 2, dirs.join(", "));

  for (const dir of dirs) {
    const base = path.join(EXAMPLES, dir);
    record(
      `E1-${dir}`,
      `${dir}/README.md exists with adoption instructions`,
      existsSync(path.join(base, "README.md")),
    );
  }

  // ---- 2. fintech-agent-runner fleet hygiene ----
  const runner = path.join(EXAMPLES, "fintech-agent-runner");
  if (existsSync(runner)) {
    try {
      execFileSync("node", ["--test", "test/*.test.mjs"], { cwd: runner, stdio: "pipe" });
      record("E2", "fintech-agent-runner fleet test green (scrub rules, frontmatter)", true);
    } catch (e) {
      record("E2", "fintech-agent-runner fleet test green (scrub rules, frontmatter)", false,
        String(e.stdout ?? e.message).split("\n").slice(-4).join(" "));
    }
  } else {
    record("E2", "fintech-agent-runner fleet test green (scrub rules, frontmatter)", false, "missing subproject");
  }

  // ---- 3. agent-skills-demo contract (mocked runner) ----
  const demo = path.join(EXAMPLES, "agent-skills-demo");
  if (existsSync(demo)) {
    try {
      execFileSync("node", ["--test", "test/*.test.mjs"], { cwd: demo, stdio: "pipe" });
      record("E3", "agent-skills-demo contract test green (mocked runner)", true);
    } catch (e) {
      record("E3", "agent-skills-demo contract test green (mocked runner)", false,
        String(e.stdout ?? e.message).split("\n").slice(-4).join(" "));
    }
  } else {
    record("E3", "agent-skills-demo contract test green (mocked runner)", false, "missing subproject");
  }

  // ---- 4 + 5. template workflows: YAML parse + actionlint + guard invariants ----
  const templatesDir = path.join(EXAMPLES, "pdm-workflow-templates", "templates");
  if (existsSync(templatesDir)) {
    const ymlFiles = readdirSync(templatesDir).filter((f) => f.endsWith(".yml"));
    record("E4", "pdm-workflow-templates has >= 1 template workflow", ymlFiles.length >= 1);

    // actionlint is required in the quality-gate step and validates full YAML +
    // GitHub expressions. Here we do light structural checks first (zero-dep),
    // then actionlint for the strict parse.
    let actionlintOk = false;
    for (const f of ymlFiles) {
      const abs = path.join(templatesDir, f);
      const text = readFileSync(abs, "utf8");
      record(`E4-${f}-has-name`, `${f} has a name:`, /^name:\s*\S/m.test(text));
      record(`E4-${f}-has-jobs`, `${f} has on: and jobs:`, /^on:\s*$/m.test(text) && /^jobs:\s*$/m.test(text));
    }

    try {
      execFileSync("actionlint", ymlFiles.map((f) => path.join("templates", f)),
        { cwd: path.join(EXAMPLES, "pdm-workflow-templates"), stdio: "pipe" });
      actionlintOk = true;
      record("E5", "template workflows pass actionlint", true);
    } catch (e) {
      actionlintOk = false;
      record("E5", "template workflows pass actionlint", false,
        String(e.stdout ?? e.message).split("\n").slice(-6).join(" "));
    }

    // Artifact-guard invariant: a PR-triggered workflow that uploads artifacts
    // must guard on github.event.pull_request (else non-PR runs write to the tree).
    for (const f of ymlFiles) {
      const text = readFileSync(path.join(templatesDir, f), "utf8");
      const uploads = text.includes("upload-artifact");
      if (!uploads) continue;
      const prTriggered = /^\s*pull_request:\s*$/m.test(text);
      const guarded = text.includes("github.event.pull_request");
      record(
        `E5-${f}-guards`,
        `${f} artifact upload ${prTriggered ? "guarded for PR runs" : "dispatch-only (no guard needed)"}`,
        !prTriggered || guarded,
      );
    }
    void actionlintOk;
  } else {
    record("E4", "pdm-workflow-templates has >= 1 template workflow", false, "missing templates/");
    record("E5", "template workflows pass actionlint", false, "missing templates/");
  }

  // ---- Report ----
  const summary = RESULTS.reduce(
    (acc, r) => ({ pass: acc.pass + Number(r.pass), fail: acc.fail + Number(!r.pass) }),
    { pass: 0, fail: 0 },
  );
  console.log(`\nSummary: ${summary.pass} pass, ${summary.fail} fail`);
  process.exitCode = summary.fail === 0 ? 0 : 1;
})();