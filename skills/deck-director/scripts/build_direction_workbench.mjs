#!/usr/bin/env node
/**
 * build_direction_workbench.mjs
 * Injects a JSON payload of 2–3 creative directions into direction-workbench-template.html
 * to produce a zero-network, self-contained interactive HTML coaching workbench.
 *
 * Usage:
 *   node skills/deck-director/scripts/build_direction_workbench.mjs \
 *     --data directions.json \
 *     --out build/direction-workbench.html
 */

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const dataIdx = args.indexOf("--data");
const outIdx = args.indexOf("--out");
if (dataIdx === -1 || outIdx === -1) {
  console.error("Usage: node build_direction_workbench.mjs --data directions.json --out out.html");
  process.exit(1);
}

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const templatePath = path.resolve(scriptDir, "../resources/direction-workbench-template.html");
const template = fs.readFileSync(templatePath, "utf8");
const payload = JSON.parse(fs.readFileSync(path.resolve(args[dataIdx + 1]), "utf8"));

// Escape closing script tags so JSON payload can never break out of <script>
const safeJson = JSON.stringify(payload).replace(/<\/script/gi, "<\\/script");
const html = template.replace("__WORKBENCH_JSON__", safeJson);

const outPath = path.resolve(args[outIdx + 1]);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html, "utf8");
console.log(`Built interactive Direction Workbench → ${outPath}`);
