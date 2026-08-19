#!/usr/bin/env node
// Fintech agent-runner fleet hygiene test (node --test).
//
// Enforces the ADR 0015 scrub rules on the example's agent definitions:
// - valid YAML frontmatter with `description` + `mode`
// - `mode` is a valid opencode mode
// - no model pins, no absolute paths, no secrets/tokens
// - no failure-classifier words in the description (telemetry honesty)
// - the runtime config template only references env vars (never literal models)
//
// Usage: node --test test/agents.test.mjs

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AGENTS = path.resolve(HERE, "..", "agents");

const VALID_MODES = new Set(["primary", "subagent", "all"]);
const SECRET_PATTERNS = [
  /\b(?:secret|token|password|private[_ ]?key|api[_ ]?key)\b\s*[:=]/i,
  /\bghp_[A-Za-z0-9]{20,}\b/,
  /\bxox[bap]-[A-Za-z0-9-]{10,}\b/,
];
const MODEL_PIN_PATTERNS = [
  /(?:model|small_model)\s*[:=]\s*["']?[^"'{\s]+\/[^"'{\s]+/,
  /\b(?:claude|gpt|qwen|llama|deepseek|ollama)\/[^"'{\s]+/i,
];
const ABSOLUTE_PATH_PATTERNS = [/\/Users\//, /\/home\//, /[A-Za-z]:\\/];
const CLASSIFIER_WORDS = /\b(rollback|incident|outage|hotfix|regression)\b/i;

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2];
  }
  return fm;
}

function agentFiles() {
  return readdirSync(AGENTS)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(AGENTS, f));
}

function runtimeTemplate() {
  const p = path.join(AGENTS, "opencode.example.json");
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

test("every agent definition has valid frontmatter with description + mode", () => {
  const files = agentFiles();
  assert.ok(files.length >= 3, "expected at least 3 agent definitions");
  for (const f of files) {
    const fm = parseFrontmatter(readFileSync(f, "utf8"));
    assert.ok(fm, `${path.basename(f)} missing YAML frontmatter`);
    assert.ok(fm.description?.length, `${path.basename(f)} missing description`);
    assert.ok(
      VALID_MODES.has(fm.mode),
      `${path.basename(f)} has invalid mode "${fm.mode}"`,
    );
  }
});

test("agents are scrub-clean (no model pins, absolute paths, secrets, classifier words)", () => {
  for (const f of agentFiles()) {
    const text = readFileSync(f, "utf8");
    const base = path.basename(f);
    assert.ok(!MODEL_PIN_PATTERNS.some((re) => re.test(text)), `${base}: model pin`);
    assert.ok(!ABSOLUTE_PATH_PATTERNS.some((re) => re.test(text)), `${base}: absolute path`);
    assert.ok(!SECRET_PATTERNS.some((re) => re.test(text)), `${base}: secret/token`);
    const fm = parseFrontmatter(text);
    assert.ok(
      !CLASSIFIER_WORDS.test(fm?.description ?? ""),
      `${base}: failure-classifier word in description`,
    );
  }
});

test("read-only reviewer subagent denies edit + bash", () => {
  const reviewer = path.join(AGENTS, "compliance-reviewer.md");
  const text = readFileSync(reviewer, "utf8");
  assert.match(text, /edit:\s*deny/);
  assert.match(text, /bash:\s*deny/);
});

test("runtime config template references env only, never literal models", () => {
  const cfg = runtimeTemplate();
  assert.ok(cfg, "agents/opencode.example.json must exist and parse as JSON");
  assert.equal(cfg.model, "{env:OPENCODE_MODEL}");
  assert.equal(cfg.small_model, "{env:OPENCODE_SMALL_MODEL}");
  for (const key of ["model", "small_model"]) {
    const v = cfg[key];
    assert.ok(
      /^\{env:[A-Z_]+\}$/.test(v ?? ""),
      `config field "${key}" should reference an env var, got "${v}"`,
    );
  }
});