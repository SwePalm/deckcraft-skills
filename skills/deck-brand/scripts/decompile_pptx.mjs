#!/usr/bin/env node
/**
 * decompile_pptx.mjs
 * Inspects an existing .pptx or .deckcraft presentation via deckcraft-cli and
 * decompiles its dominant colors, fonts, and slide dimensions into a clean,
 * google-labs-code/design.md compliant DESIGN.md file.
 *
 * Usage:
 *   node skills/deck-brand/scripts/decompile_pptx.mjs <input.pptx|input.deckcraft> --out DESIGN.md [--name "Brand Name"]
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { findDeckcraftCli } from "../../deck-builder/scripts/deckcraft_runner.mjs";

const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const inputPath = args.find((a) => !a.startsWith("-") && a !== getArg("--out") && a !== getArg("--name"));
const outPath = getArg("--out");
const customName = getArg("--name");

if (!inputPath || !outPath) {
  console.error("Usage: node decompile_pptx.mjs <input.pptx|deck.deckcraft> --out DESIGN.md [--name 'Brand']");
  process.exit(1);
}

const cli = findDeckcraftCli();
const absIn = path.resolve(inputPath);
const info = JSON.parse(execFileSync(cli, ["info", absIn], { encoding: "utf8" }));

const [slideW, slideH] = info.slideSize || [960, 540];
const slideCount = Math.min((info.slides || []).length, 15); // sample up to 15 slides

const cmds = [];
for (let i = 0; i < slideCount; i++) {
  cmds.push(`slide.inspect=${JSON.stringify({ index: i })}`);
}

const tmpFile = path.join("/tmp", `dc-decompile-${process.pid}.txt`);
fs.writeFileSync(tmpFile, cmds.join("\n") + "\n", "utf8");
let slides = [];
try {
  const raw = execFileSync(cli, ["run", "--in", absIn, "--cmd-file", tmpFile, "--print"], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  for (const line of raw.split(/\r?\n/)) {
    const idx = line.indexOf(" → ");
    if (idx === -1) continue;
    if (line.slice(0, idx).trim() === "slide.inspect") {
      try {
        slides.push(JSON.parse(line.slice(idx + 3).trim()));
      } catch {
        // skip
      }
    }
  }
} finally {
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
}

const normalizeHex = (h) => {
  if (!h || typeof h !== "string") return null;
  const m = h.trim().match(/^#?([0-9a-fA-F]{6})$/);
  return m ? `#${m[1].toUpperCase()}` : null;
};

const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const toLin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLin((n >> 16) & 255) + 0.7152 * toLin((n >> 8) & 255) + 0.0722 * toLin(n & 255);
};

const saturation = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
};

const bgCounts = new Map();
const fillCounts = new Map();
const inc = (map, hex) => {
  const norm = normalizeHex(hex);
  if (norm) map.set(norm, (map.get(norm) || 0) + 1);
};

for (const s of slides) {
  inc(bgCounts, s.background);
  for (const sh of s.shapes || []) {
    inc(fillCounts, sh.fill);
  }
}

const sortByFreq = (map) => [...map.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
const topBgs = sortByFreq(bgCounts);
const topFills = sortByFreq(fillCounts);

const background = topBgs[0] || "#FFFFFF";
const isDark = luminance(background) < 0.25;
const surface = topFills.find((c) => c !== background && Math.abs(luminance(c) - luminance(background)) < 0.35) || (isDark ? "#15223B" : "#F8FAFC");
const accents = topFills.filter((c) => saturation(c) > 0.25 && c !== background && c !== surface);
const primary = accents[0] || (isDark ? "#38BDF8" : "#006699");
const accent = accents[1] || (isDark ? "#2DD4BF" : "#0F8A6C");
const text = isDark ? "#F8FAFC" : "#0F172A";
const textMuted = isDark ? "#94A3B8" : "#475569";

const headingFont = info.fonts?.major || "Inter";
const bodyFont = info.fonts?.minor || "Inter";
const brandName = customName || `${path.basename(absIn, path.extname(absIn))} Brand`;

const md = `---
name: "${brandName}"
mode: "${isDark ? "dark" : "light"}"
colors:
  background: "${background}"
  surface: "${surface}"
  surfaceAlt: "${isDark ? "#1E3052" : "#DCE5EF"}"
  text: "${text}"
  textMuted: "${textMuted}"
  primary: "${primary}"
  accent: "${accent}"
typography:
  headingFont: "${headingFont}"
  bodyFont: "${bodyFont}"
  monoFont: "Liberation Mono"
  titleSizePt: 36
  sectionSizePt: 22
  bodySizePt: 15
  captionSizePt: 11
layout:
  slideWidthPt: ${Math.round(slideW)}
  slideHeightPt: ${Math.round(slideH)}
  marginPt: 48
  gapPt: 24
  maxWordsLiveSlide: 48
  maxWordsPrereadSlide: 110
shapes:
  cornerRadiusPt: 10
  smoothCorners: 45
  style: "rounded"
---

## Overview
Decompiled automatically from \`${path.basename(absIn)}\` (${slides.length} slides inspected). Review and refine the rationale and Do's/Don'ts before building new decks.

## Colors
- **Background (\`${background}\`)** & **Surface (\`${surface}\`)**: Extracted from dominant slide backgrounds and containers.
- **Primary (\`${primary}\`)** & **Accent (\`${accent}\`)**: Highest-frequency brand accent colors found in shapes.
- **Text (\`${text}\`)** & **Muted (\`${textMuted}\`)**: High-contrast text defaults matched to \`${isDark ? "dark" : "light"}\` mode.

## Typography
- **Headlines**: \`${headingFont}\` (34–40pt Bold)
- **Body**: \`${bodyFont}\` (15–16pt Regular)

## Layout
- ${Math.round(slideW)}×${Math.round(slideH)} pt canvas with \`48pt\` safe margins and \`24pt\` gutters.

## Elevation & Depth
- Clean tonal surface layering; use Three.js 3D hero visuals and product UI stages for focal moments.

## Shapes
- Consistent \`10pt\` rounded corners (\`smoothCorners: 45\`).

## Components
- **Hero Slides**: Pair crisp headlines with bespoke 3D/D3 visuals from \`deck-visuals\`.

## Do's and Don'ts
- **Do** validate WCAG contrast with \`parse_design_md.mjs\` after editing tokens.
- **Don't** place decorative accent lines under titles or vertical color stripes on cards.
`;

const absOut = path.resolve(outPath);
fs.mkdirSync(path.dirname(absOut), { recursive: true });
fs.writeFileSync(absOut, md, "utf8");
console.log(`Decompiled ${path.basename(absIn)} (${slides.length} slides) → ${absOut}`);
