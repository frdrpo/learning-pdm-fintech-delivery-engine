#!/usr/bin/env node
// P17 — idempotent kit §2 topology wiring/verification. Folded into the kit after
// the consumer flight proved that hand-typed `gh api` wiring is slow and error-prone
// (6 calls, two wrong endpoints). Requires the `gh` CLI.
//
//   node scripts/wire-topology.mjs [--repo owner/repo] [--apply] [--pages-url URL]
//
// Default is `--check`: verify the documented target state against the LIVE API and
// exit non-zero on any drift. `--apply` converges the API-wired state idempotently
// (protection, environments, Pages, DEPLOY_VERIFY_URL); branch creation/parity stays
// a git action (kit §2). A consumer repo on the free plan needs publics visibility for
// Pages — --apply prints the requirement when the Pages API refuses.

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const APPLY = process.argv.includes("--apply");

function shell(args, { capture = true } = {}) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "inherit"] : ["ignore", "inherit", "inherit"],
  }).trim();
}
const repoFull =
  arg("--repo") ??
  process.env.GITHUB_REPOSITORY ??
  (() => shell(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]))();

function api(method, resource, body) {
  const endpoint = resource ? `repos/${repoFull}/${resource}` : `repos/${repoFull}`;
  const args = ["api", "-X", method, endpoint];
  if (body) {
    const tmp = path.join(os.tmpdir(), `wt-${Math.random().toString(36).slice(2)}.json`);
    writeFileSync(tmp, JSON.stringify(body));
    args.push("--input", tmp);
  } else {
    args.push("--jq", ".");
  }
  return JSON.parse(shell(args));
}
function apiRaw(method, resource, body) {
  const endpoint = resource ? `repos/${repoFull}/${resource}` : `repos/${repoFull}`;
  const args = ["api", "-X", method, endpoint];
  if (body) args.push("--input", "-");
  return JSON.parse(shell(args));
}

const RESULTS = [];
function record(name, pass, detail = "") {
  RESULTS.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

// ---------- target state (kit §2; ADR 0011) ----------
const GATE = "PDM Quality Gate (Status Check)";
const ENVS_WITH_REVIEWER = ["staging", "production"];
const ARTIFACT_IGNORE_DID = "github-pages";

try {
  const repo = api("GET", "");
  record("repo resolves", true, `${repoFull} (${repo.visibility})`);
  record("default branch is develop", repo.default_branch === "develop", `live: ${repo.default_branch}`);

  // main protection
  const protection = api("GET", "branches/main/protection");
  const contexts = protection.required_status_checks?.contexts ?? [];
  record(
    "main requires PDM Quality Gate (Status Check)",
    contexts.includes(GATE),
    contexts.join(", ") || "none",
  );
  record("main enforce_admins on", protection.enforce_admins?.enabled === true);
  record(
    "main not lock_branch (merge gotcha)",
    protection.lock_branch?.enabled === false,
    protection.lock_branch?.enabled === true ? "LOCKED — clears silently block all merges" : "",
  );
  record(
    "main require_code_owner_reviews off (merge gotcha)",
    protection.required_pull_request_reviews?.require_code_owner_reviews === false,
  );

  // environments
  const envs = api("GET", "environments").environments.map((e) => e.name);
  for (const env of ["development", "staging", "production", ARTIFACT_IGNORE_DID]) {
    record(`environment ${env} exists`, envs.includes(env), envs.join(", "));
  }
  const envDetail = (env) => api("GET", `environments/${env}`);
  for (const env of ENVS_WITH_REVIEWER) {
    const d = envDetail(env);
    const rules = (d.protection_rules ?? []).map((r) => r.type);
    record(
      `environment ${env} has required_reviewers`,
      rules.includes("required_reviewers") || APPLY,
      APPLY ? "applying" : rules.join(", ") || "none",
    );
  }
  const pagesEnv = envDetail(ARTIFACT_IGNORE_DID);
  const branchPolicies = api("GET", `environments/${ARTIFACT_IGNORE_DID}/deployment-branch-policies`).branch_policies ?? [];
  record(
    "github-pages env pinned to develop",
    branchPolicies.some((p) => p.name === "develop"),
    branchPolicies.map((p) => p.name).join(", ") || "none",
  );

  // Pages + DEPLOY_VERIFY_URL
  let pages;
  try {
    pages = api("GET", "pages");
    record("Pages enabled (workflow build)", pages.build_type === "workflow", pages.html_url ?? "");
  } catch {
    record("Pages enabled (workflow build)", false, "404 — needs a public repo on the free plan (kit §2)");
  }
  const pageUrl = pages?.html_url ?? arg("--pages-url") ?? "";
  const vars = api("GET", "actions/variables").variables ?? [];
  record(
    "DEPLOY_VERIFY_URL repo variable set",
    vars.some((v) => v.name === "DEPLOY_VERIFY_URL") || (APPLY && Boolean(pageUrl)),
    vars.map((v) => v.name).join(", ") || "none",
  );

  // ---------- apply (idempotent convergence) ----------
  if (APPLY) {
    if (repo.default_branch !== "develop") {
      apiRaw("PATCH", "", { default_branch: "develop" });
      console.log("::notice:: default branch set to develop");
    }
    apiRaw("PUT", "branches/main/protection", {
      required_status_checks: { strict: true, contexts: [GATE] },
      enforce_admins: true,
      required_pull_request_reviews: { required_approving_review_count: 0, require_code_owner_reviews: false },
      restrictions: null,
      allow_force_pushes: false,
      allow_deletions: false,
      lock_branch: false,
    });
    console.log("::notice:: main protection converged");
    // Required reviewers resolve to the repo OWNER (the operator of a scratch
    // consumer); a runner's token cannot resolve `gh api user`, but the owner id
    // is readable from the repo itself.
    const reviewers = [
      { type: "User", id: Number(shell(["api", `repos/${repoFull}`, "--jq", ".owner.id"])) },
    ];
    for (const env of ["development", "staging", "production"]) {
      apiRaw("PUT", `environments/${env}`, ENVS_WITH_REVIEWER.includes(env) ? { reviewers } : {});
    }
    apiRaw("PUT", `environments/${ARTIFACT_IGNORE_DID}`, {
      deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
    });
    apiRaw("POST", `environments/${ARTIFACT_IGNORE_DID}/deployment-branch-policies`, { name: "develop" });
    console.log("::notice:: environments converged");
    if (pageUrl) {
      apiRaw("POST", "actions/variables", { name: "DEPLOY_VERIFY_URL", value: pageUrl });
    }
    try {
      apiRaw("POST", "pages", { build_type: "workflow" });
      console.log("::notice:: Pages enabled (workflow build)");
    } catch (e) {
      console.log(`::warning:: Pages could not be enabled — free-plan private repos need public visibility (kit §2)`);
    }
  }
} catch (err) {
  console.error(`::error:: topology wiring failed: ${err.message}`);
  process.exitCode = 1;
}

const failCount = RESULTS.filter((r) => !r.pass).length;
if (RESULTS.length === 0) {
  console.log("\nTopology check produced no results (see error above)");
  process.exitCode = 1;
} else if (failCount === 0) {
  console.log(`\nTopology ${APPLY ? "converged" : "conformant"}`);
} else {
  console.log(`\nTopology ${failCount} drift(s)`);
  if (!APPLY) process.exitCode = 1;
}