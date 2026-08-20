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
//   6. composite actions under .github/actions/ are structurally valid
//      (actionlint 1.7.x does NOT lint action.yml metadata, so this is a
//      structural check: name/description/runs.using/inputs/outputs schema)
//   7. canonical workflows only reference composite actions that exist
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

const subprojects = () =>
  readdirSync(EXAMPLES, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name);

const finish = () => {
  const summary = RESULTS.reduce(
    (acc, r) => ({ pass: acc.pass + Number(r.pass), fail: acc.fail + Number(!r.pass) }),
    { pass: 0, fail: 0 },
  );
  console.log(`\nSummary: ${summary.pass} pass, ${summary.fail} fail`);
  process.exitCode = summary.fail === 0 ? 0 : 1;
};

// ---- 1. structure: README + expected top-levels ----
(async () => {
  if (!existsSync(EXAMPLES)) {
    record("E1", "examples/ has >= 2 reference implementations", false, "examples/ missing");
    record("E2", "fintech-agent-runner fleet test green (scrub rules, frontmatter)", false, "examples/ missing");
    record("E3", "agent-skills-demo contract test green (mocked runner)", false, "examples/ missing");
    record("E4", "pdm-workflow-templates has >= 1 template workflow", false, "examples/ missing");
    record("E5", "template workflows pass actionlint", false, "examples/ missing");
    record("E6", ".github/actions/ has >= 1 composite action", false, "examples/ missing");
    record("E7", "canonical workflows reference existing composite actions", false, "examples/ missing");
    finish();
    return;
  }
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
    for (const f of ymlFiles) {
      const abs = path.join(templatesDir, f);
      const text = readFileSync(abs, "utf8");
      record(`E4-${f}-has-name`, `${f} has a name:`, /^name:\s*\S/m.test(text));
      record(`E4-${f}-has-jobs`, `${f} has on: and jobs:`, /^on:\s*$/m.test(text) && /^jobs:\s*$/m.test(text));
    }

    try {
      execFileSync("actionlint", ymlFiles.map((f) => path.join("templates", f)),
        { cwd: path.join(EXAMPLES, "pdm-workflow-templates"), stdio: "pipe" });
      record("E5", "template workflows pass actionlint", true);
    } catch (e) {
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
  } else {
    record("E4", "pdm-workflow-templates has >= 1 template workflow", false, "missing templates/");
    record("E5", "template workflows pass actionlint", false, "missing templates/");
  }

  // ---- 6. composite actions under .github/actions/ ----
  // actionlint 1.7.x treats action.yml as a workflow and rejects composite
  // metadata, so composite actions get structural checks instead: required
  // keys, runs.using: composite, >= 1 step, and inputs/outputs schema.
  const actionsDir = path.join(ROOT, ".github", "actions");
  const actionDirs = existsSync(actionsDir)
    ? readdirSync(actionsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith("."))
        .map((d) => d.name)
    : [];
  record("E6", ".github/actions/ has >= 1 composite action", actionDirs.length >= 1, actionDirs.join(", ") || "missing");

  const blockAfter = (text, key) => {
    const m = text.match(new RegExp(`^${key}:\\s*$\\n([\\s\\S]*?)(?=^\\S|$)`));
    return m ? m[1] : "";
  };
  const keyLines = (block) => [...block.matchAll(/^\s{2}(\S[^:]*):\s*$/gm)].map((m) => m[1]);

  for (const name of actionDirs) {
    const actionFile = path.join(actionsDir, name, "action.yml");
    if (!existsSync(actionFile)) {
      record(`E6-${name}-file`, `${name}/action.yml exists`, false, "missing action.yml");
      continue;
    }
    const text = readFileSync(actionFile, "utf8");
    record(`E6-${name}-name`, `${name} has name:`, /^name:\s*\S/m.test(text));
    record(`E6-${name}-desc`, `${name} has description:`, /^description:\s*\S/m.test(text));
    record(
      `E6-${name}-composite`,
      `${name} is a composite action (runs.using: composite)`,
      /^runs:\s*$/m.test(text) && /using:\s*composite/.test(text),
    );
    record(`E6-${name}-steps`, `${name} has >= 1 step`, /^\s+- name:\s*\S/m.test(text));

    const inputKeys = keyLines(blockAfter(text, "inputs"));
    const outputKeys = keyLines(blockAfter(text, "outputs"));
    if (inputKeys.length > 0) {
      const inputBlock = blockAfter(text, "inputs");
      record(
        `E6-${name}-inputs`,
        `${name} inputs each have a description`,
        inputKeys.every((k) => new RegExp(`^\\s{4}description:`).test(inputBlock)),
      );
    }
    if (outputKeys.length > 0) {
      const outputBlock = blockAfter(text, "outputs");
      record(
        `E6-${name}-outputs`,
        `${name} outputs each have a value`,
        outputKeys.every((k) => new RegExp(`^\\s{4}value:`).test(outputBlock)),
      );
    }
  }

  // ---- 7. canonical workflows only reference actions that exist ----
  const canonicalDir = path.join(ROOT, ".github", "pdm", "workflows");
  const wfFiles = existsSync(canonicalDir)
    ? readdirSync(canonicalDir).filter((f) => f.endsWith(".yml"))
    : [];
  const actionRefs = [];
  for (const f of wfFiles) {
    const text = readFileSync(path.join(canonicalDir, f), "utf8");
    for (const m of text.matchAll(/uses:\s*\.\/\.github\/actions\/([\w-]+)/g)) {
      actionRefs.push({ file: f, action: m[1] });
    }
  }
  record(
    "E7",
    "canonical workflows reference existing composite actions",
    actionRefs.every((r) => existsSync(path.join(actionsDir, r.action, "action.yml"))),
    actionRefs.length === 0
      ? "no references yet (vacuous until rollout phase 2)"
      : actionRefs.map((r) => `${r.file}->${r.action}`).join(", "),
  );

  // ---- Report ----
  finish();
})();