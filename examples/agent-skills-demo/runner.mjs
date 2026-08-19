// Minimal "agent runner": resolves a skill definition by matching the request
// against each skill's `description` frontmatter (the same contract the opencode
// `skill` tool uses: description match -> load instructions). Kept dependency-free
// so the mock CI test can exercise it offline.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILLS = path.resolve(HERE, "skills");

export function skillNameFrom(fm) {
  return fm?.name ?? path.basename(SKILLS, ".md");
}

export function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2];
  }
  return fm;
}

export function loadSkills(dir = SKILLS) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const text = readFileSync(path.join(dir, f), "utf8");
      const fm = parseFrontmatter(text);
      return { file: f, name: skillNameFrom(fm), description: fm?.description ?? "" };
    });
}

export function resolveSkill(request, skills = loadSkills()) {
  const norm = (s) => s.toLowerCase().replace(/[\s_-]+/g, " ");
  const q = norm(request);
  return (
    skills.find((s) => norm(s.name).includes(q)) ??
    skills.find((s) => norm(s.description).includes(q)) ?? {
      name: "none",
      description: "No skill matched this request.",
    }
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const request = process.argv[2] ?? "no request";
  const skill = resolveSkill(request);
  console.log(`Resolved skill for "${request}": ${skill.name}`);
}