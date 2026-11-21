#!/usr/bin/env node
/**
 * build_review_workbench.mjs
 * Builds a single-file, zero-network Post-Build Review & Check Report HTML workbench
 * by embedding check-report.json and base64 slide/transition PNGs from build-manifest.json.
 *
 * Usage:
 *   node skills/deck-eval/scripts/build_review_workbench.mjs \
 *     --report build/eval/check-report.json \
 *     --manifest build/output/build-manifest.json \
 *     --out build/review-workbench.html
 */

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const reportPath = getArg("--report");
const manifestPath = getArg("--manifest");
const outPath = getArg("--out");
if (!reportPath || !manifestPath || !outPath) {
  console.error("Usage: node build_review_workbench.mjs --report check-report.json --manifest build-manifest.json --out review-workbench.html");
  process.exit(1);
}

const toDataUri = (imgPath) => {
  const buf = fs.readFileSync(imgPath);
  return `data:image/png;base64,${buf.toString("base64")}`;
};

const report = JSON.parse(fs.readFileSync(path.resolve(reportPath), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.resolve(manifestPath), "utf8"));

const payload = {
  deckName: path.basename(manifest.deckPath || report.deckPath || "deck"),
  report,
  slides: (manifest.slideImages || []).map((p) => ({ path: p, dataUri: toDataUri(p) })),
  transitions: (manifest.transitionRenders || []).map((tr) => ({
    slideIndex: tr.slideIndex,
    transition: tr.transition,
    frames: (tr.frames || []).map((f) => toDataUri(f)),
  })),
};

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const templatePath = path.resolve(scriptDir, "../resources/review-workbench-template.html");
const template = fs.readFileSync(templatePath, "utf8");
const safeJson = JSON.stringify(payload).replace(/<\/script/gi, "<\\/script");
const html = template.replace("__REVIEW_JSON__", safeJson);

const absOut = path.resolve(outPath);
fs.mkdirSync(path.dirname(absOut), { recursive: true });
fs.writeFileSync(absOut, html, "utf8");
console.log(`Built self-contained Review Workbench (${payload.slides.length} slides, ${payload.transitions.length} transitions) → ${absOut}`);
