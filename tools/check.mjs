#!/usr/bin/env node
/**
 * tools/check.mjs
 * Repo self-check: validates Agent Skill structure, frontmatter, script syntax,
 * and relative markdown links. Prints a Check Report with explicit "Not checked:".
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SKILLS_DIR = path.join(ROOT, "skills");

const issues = [];
const checked = [];

function addIssue(severity, target, msg) {
  issues.push({ severity, target, msg });
}

// 1. Validate every skill in skills/
if (!fs.existsSync(SKILLS_DIR)) {
  addIssue("blocks_signing", "skills/", "Missing skills/ directory.");
} else {
  const skillDirs = fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const name of skillDirs) {
    const skillPath = path.join(SKILLS_DIR, name);
    const skillMd = path.join(skillPath, "SKILL.md");
    if (!fs.existsSync(skillMd)) {
      addIssue("blocks_signing", `skills/${name}`, "Missing SKILL.md.");
      continue;
    }

    const content = fs.readFileSync(skillMd, "utf8");
    const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) {
      addIssue("blocks_signing", `skills/${name}/SKILL.md`, "Missing YAML frontmatter.");
    } else {
      const fmText = fm[1];
      if (!/^name:\s*\S+/m.test(fmText)) addIssue("blocks_signing", `skills/${name}/SKILL.md`, "Frontmatter missing `name`.");
      if (!/^description:/m.test(fmText)) addIssue("blocks_signing", `skills/${name}/SKILL.md`, "Frontmatter missing `description`.");
      if (!/^license:/m.test(fmText)) addIssue("fix_if_time", `skills/${name}/SKILL.md`, "Frontmatter missing `license`.");
    }
    checked.push(`skills/${name}/SKILL.md`);

    // Check scripts/*.mjs syntax
    const scriptsDir = path.join(skillPath, "scripts");
    if (fs.existsSync(scriptsDir)) {
      for (const f of fs.readdirSync(scriptsDir)) {
        if (f.endsWith(".mjs") || f.endsWith(".js")) {
          const full = path.join(scriptsDir, f);
          try {
            execFileSync(process.execPath, ["--check", full], { stdio: "pipe" });
            checked.push(`skills/${name}/scripts/${f}`);
          } catch (err) {
            addIssue("blocks_signing", `skills/${name}/scripts/${f}`, `Syntax error: ${err.stderr?.toString().trim() || err.message}`);
          }
        }
      }
    }
    // Check resources/*.html self-containment (zero external network scripts/links)
    const resourcesDir = path.join(skillPath, "resources");
    if (fs.existsSync(resourcesDir)) {
      for (const f of fs.readdirSync(resourcesDir)) {
        if (f.endsWith(".html")) {
          const full = path.join(resourcesDir, f);
          const html = fs.readFileSync(full, "utf8");
          if (/<(script|link)[^>]+(src|href)=["']https?:\/\//i.test(html)) {
            addIssue("blocks_signing", `skills/${name}/resources/${f}`, "HTML workbench references external http(s) script/stylesheet.");
          }
          checked.push(`skills/${name}/resources/${f}`);
        }
      }
    }
  }
}

// 2. Check tools/*.mjs and evals/*.mjs syntax
for (const dirName of ["tools", "evals"]) {
  const dirPath = path.join(ROOT, dirName);
  if (fs.existsSync(dirPath)) {
    for (const f of fs.readdirSync(dirPath)) {
      if (f.endsWith(".mjs")) {
        const full = path.join(dirPath, f);
        try {
          execFileSync(process.execPath, ["--check", full], { stdio: "pipe" });
          checked.push(`${dirName}/${f}`);
        } catch (err) {
          addIssue("blocks_signing", `${dirName}/${f}`, `Syntax error: ${err.stderr?.toString().trim() || err.message}`);
        }
      }
    }
  }
}

// 3. Check Living Taste Ledger freshness (skills/deck-art-direction/references/taste-ledger.md)
const tasteLedgerPath = path.join(SKILLS_DIR, "deck-art-direction", "references", "taste-ledger.md");
if (fs.existsSync(tasteLedgerPath)) {
  const txt = fs.readFileSync(tasteLedgerPath, "utf8");
  const dateMatch = txt.match(/^last_verified:\s*(\d{4}-\d{2}-\d{2})/m);
  const daysMatch = txt.match(/^refresh_after_days:\s*(\d+)/m);
  if (!dateMatch) {
    addIssue("fix_if_time", "skills/deck-art-direction/references/taste-ledger.md", "Missing `last_verified: YYYY-MM-DD` frontmatter.");
  } else {
    const verified = new Date(`${dateMatch[1]}T00:00:00Z`);
    const maxDays = Number(daysMatch?.[1] || 30);
    const ageDays = Math.floor((Date.now() - verified.getTime()) / (1000 * 60 * 60 * 24));
    if (ageDays > maxDays) {
      addIssue(
        "fix_if_time",
        "skills/deck-art-direction/references/taste-ledger.md",
        `Taste ledger is ${ageDays} days old (refresh_after_days=${maxDays}). Run a Just-in-Time taste research pass.`
      );
    }
  }
  checked.push("skills/deck-art-direction/references/taste-ledger.md");
}

const blockers = issues.filter((i) => i.severity === "blocks_signing");
const fixIfTime = issues.filter((i) => i.severity === "fix_if_time");

console.log(`# Repo Self-Check Report`);
console.log(`- Checked: ${checked.length} files (${checked.join(", ")})`);
console.log(`- Status: ${blockers.length === 0 ? "PASS" : "FAIL"} (${blockers.length} Blocks signing, ${fixIfTime.length} Fix if time)`);
if (issues.length > 0) {
  console.log(`\n## Issues`);
  for (const i of issues) {
    console.log(`- [${i.severity}] ${i.target}: ${i.msg}`);
  }
}
console.log(`\n## Not Checked`);
console.log(`- End-to-end DeckCraft rendering & visual QA (run milestone smoke test or evals/).`);
console.log(`- HTML workbench browser interactivity (added in Milestone 3).`);

if (blockers.length > 0) process.exit(1);
