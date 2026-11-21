#!/usr/bin/env node
/**
 * evals/run_eval.mjs
 * Layer 3 Skill-Level Benchmark Harness.
 * Runs deck-brand -> deck-builder -> deck-eval (Gate 1) -> Review Workbench across all
 * fixtures in evals/fixtures/ and writes a comparative scorecard to evals/runs/latest-scorecard.md.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const FIXTURES_DIR = path.join(ROOT, "evals", "fixtures");
const RUNS_DIR = path.join(ROOT, "evals", "runs");
fs.mkdirSync(RUNS_DIR, { recursive: true });

const fixtures = fs
  .readdirSync(FIXTURES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const results = [];

for (const name of fixtures) {
  const fDir = path.join(FIXTURES_DIR, name);
  const designMd = path.join(fDir, "DESIGN.md");
  const cmdsFile = path.join(fDir, "commands.txt");
  if (!fs.existsSync(designMd) || !fs.existsSync(cmdsFile)) continue;

  const mode = name.includes("exec") ? "preread" : "live";
  const runDir = path.join(RUNS_DIR, name);
  const brandDir = path.join(runDir, "brand");
  const outDir = path.join(runDir, "output");
  const evalDir = path.join(runDir, "eval");
  fs.mkdirSync(runDir, { recursive: true });

  const t0 = Date.now();
  let status = "PASS";
  let report = null;
  let errorMsg = null;

  try {
    execFileSync(
      process.execPath,
      [path.join(ROOT, "skills/deck-brand/scripts/parse_design_md.mjs"), designMd, "--out-dir", brandDir],
      { stdio: "pipe" }
    );
    execFileSync(
      process.execPath,
      [
        path.join(ROOT, "skills/deck-builder/scripts/deckcraft_runner.mjs"),
        "--theme",
        path.join(brandDir, "theme-commands.txt"),
        "--commands",
        cmdsFile,
        "--out-dir",
        outDir,
        "--name",
        name,
        "--export-pptx",
      ],
      { stdio: "pipe" }
    );

    try {
      execFileSync(
        process.execPath,
        [
          path.join(ROOT, "skills/deck-eval/scripts/lint_deck.mjs"),
          path.join(outDir, `${name}.deckcraft`),
          "--tokens",
          path.join(brandDir, "tokens.json"),
          "--mode",
          mode,
          "--out-dir",
          evalDir,
        ],
        { stdio: "pipe" }
      );
    } catch {
      // lint_deck exits 1 on blocks_signing; read report JSON regardless
    }

    report = JSON.parse(fs.readFileSync(path.join(evalDir, "check-report.json"), "utf8"));
    status = report.summary.pass ? "PASS" : "FAIL";

    execFileSync(
      process.execPath,
      [
        path.join(ROOT, "skills/deck-eval/scripts/build_review_workbench.mjs"),
        "--report",
        path.join(evalDir, "check-report.json"),
        "--manifest",
        path.join(outDir, "build-manifest.json"),
        "--out",
        path.join(runDir, "review-workbench.html"),
      ],
      { stdio: "pipe" }
    );
  } catch (err) {
    status = "ERROR";
    errorMsg = err.stderr?.toString().trim() || err.message;
  }

  const elapsedSec = Number(((Date.now() - t0) / 1000).toFixed(2));
  results.push({
    fixture: name,
    mode,
    status,
    elapsedSec,
    slides: report?.summary?.slideCount ?? 0,
    blocksSigning: report?.summary?.blocksSigning ?? "-",
    fixIfTime: report?.summary?.fixIfTime ?? "-",
    cosmetic: report?.summary?.cosmetic ?? "-",
    errorMsg,
  });
}

const mdLines = [
  `# Layer 3 Benchmark Scorecard`,
  ``,
  `Generated: ${new Date().toISOString()}`,
  ``,
  `| Fixture | Mode | Status | Slides | Blocks | Fix if time | Cosmetic | Time |`,
  `| :--- | :--- | :--- | ---: | ---: | ---: | ---: | ---: |`,
  ...results.map(
    (r) =>
      `| \`${r.fixture}\` | \`${r.mode}\` | **${r.status}** | ${r.slides} | ${r.blocksSigning} | ${r.fixIfTime} | ${r.cosmetic} | ${r.elapsedSec}s |`
  ),
  ``,
  `## Not Checked by Automated Harness`,
  `- Gate 2 multimodal visual & narrative perception scoring (requires vision LLM critic pass).`,
  ``,
];

const scorecardMd = mdLines.join("\n");
fs.writeFileSync(path.join(RUNS_DIR, "latest-scorecard.md"), scorecardMd, "utf8");
fs.writeFileSync(path.join(RUNS_DIR, "latest-scorecard.json"), JSON.stringify(results, null, 2) + "\n", "utf8");
console.log(scorecardMd);

if (results.some((r) => r.status !== "PASS")) {
  process.exitCode = 1;
}
