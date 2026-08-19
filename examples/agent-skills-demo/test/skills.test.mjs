#!/usr/bin/env node
// Agent-skills-demo mock test scaffold (node --test). Zero dependencies:
// the "CI" here is a local node test that mocks the skill-resolution contract
// an agent runner uses, instead of launching a real runner.

import assert from "node:assert/strict";
import { loadSkills, parseFrontmatter, resolveSkill } from "../runner.mjs";

assert.ok(parseFrontmatter, "runner exports parseFrontmatter");
assert.ok(loadSkills, "runner exports loadSkills");
assert.ok(resolveSkill, "runner exports resolveSkill");

const skills = loadSkills();

assert.equal(typeof skills.length, "number");
assert.ok(skills.length >= 2, "expected at least 2 skill definitions");

const compliance = skills.find((s) => s.name === "compliance-review");
assert.ok(compliance, "compliance-review skill exists");
assert.match(compliance.description, /compliance/i);

const brief = skills.find((s) => s.name === "delivery-brief");
assert.ok(brief, "delivery-brief skill exists");
assert.match(brief.description, /delivery/i);

assert.equal(resolveSkill("compliance review").name, "compliance-review");
assert.equal(resolveSkill("delivery brief").name, "delivery-brief");

const nomatch = resolveSkill("nothing matches this");
assert.equal(nomatch.name, "none");

// Every skill carries a name + description frontmatter (the opencode contract).
for (const s of loadSkills()) {
  assert.ok(s.name && s.name !== "none", `${s.file} missing name frontmatter`);
  assert.ok(s.description, `${s.file} missing description frontmatter`);
}