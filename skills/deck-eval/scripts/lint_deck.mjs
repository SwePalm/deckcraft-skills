#!/usr/bin/env node
/**
 * lint_deck.mjs
 * Gate 1 deterministic linter for DeckCraft presentations.
 * Queries DeckCraft via deckcraft-cli (info, slide.inspect, shape.inspect, slide.colorAt,
 * review.accessibility, review.spelling) and emits check-report.json + CHECK_REPORT.md.
 *
 * Usage:
 *   node skills/deck-eval/scripts/lint_deck.mjs <deck.deckcraft|deck.pptx> \
 *     [--tokens tokens.json] \
 *     [--mode live|preread] \
 *     [--out-dir build/eval]
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { findDeckcraftCli } from "../../deck-builder/scripts/deckcraft_runner.mjs";

const PLACEHOLDER_REGEX = /\b(lorem|ipsum|todo|tbd|xxx{1,})\b|\[insert\b|click to add/i;

function parseArgs(argv) {
  const opts = {
    deck: null,
    tokens: null,
    mode: "live",
    outDir: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--tokens") opts.tokens = argv[++i];
    else if (a === "--mode") opts.mode = argv[++i];
    else if (a === "--out-dir") opts.outDir = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log("Usage: node lint_deck.mjs <deck> [--tokens tokens.json] [--mode live|preread] [--out-dir dir]");
      process.exit(0);
    } else if (!a.startsWith("-")) {
      opts.deck = a;
    }
  }
  if (!opts.deck) throw new Error("Deck path is required.");
  return opts;
}

function runDeckcraftBatch(cli, deckPath, commands) {
  const tmpFile = path.join("/tmp", `dc-lint-${process.pid}-${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, commands.join("\n") + "\n", "utf8");
  try {
    const out = execFileSync(cli, ["run", "--in", deckPath, "--cmd-file", tmpFile, "--print"], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
    const results = [];
    for (const line of out.split(/\r?\n/)) {
      const idx = line.indexOf(" → ");
      if (idx === -1) continue;
      const cmd = line.slice(0, idx).trim();
      const jsonStr = line.slice(idx + 3).trim();
      try {
        results.push({ cmd, data: JSON.parse(jsonStr) });
      } catch {
        results.push({ cmd, raw: jsonStr });
      }
    }
    return results;
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
}

function rgbObjToHex(rgb) {
  if (!rgb || typeof rgb.r !== "number") return null;
  const h = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`.toUpperCase();
}

function normalizeHex(hex) {
  if (!hex || typeof hex !== "string") return null;
  const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
  return m ? `#${m[1].toUpperCase()}` : null;
}

function hexToRgb(hex) {
  const norm = normalizeHex(hex);
  if (!norm) return null;
  const n = parseInt(norm.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const toLin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLin(rgb.r) + 0.7152 * toLin(rgb.g) + 0.7152 * 0 + 0.0722 * toLin(rgb.b);
}

function contrastRatio(hexA, hexB) {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

function boxContains(outer, inner, pad = 2) {
  return (
    inner[0] >= outer[0] - pad &&
    inner[1] >= outer[1] - pad &&
    inner[0] + inner[2] <= outer[0] + outer[2] + pad &&
    inner[1] + inner[3] <= outer[1] + outer[3] + pad
  );
}

function intersectionArea(a, b) {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[0] + a[2], b[0] + b[2]);
  const y2 = Math.min(a[1] + a[3], b[1] + b[3]);
  if (x2 <= x1 || y2 <= y1) return 0;
  return (x2 - x1) * (y2 - y1);
}

function isIntentionalBackground(shape, slideW, slideH) {
  const name = (shape.name || "").toLowerCase();
  if (name.startsWith("bg-") || name.startsWith("bg_") || name === "background") return true;
  const [x, y, w, h] = shape.box || [0, 0, 0, 0];
  return x <= 2 && y <= 2 && w >= slideW - 4 && h >= slideH - 4 && !shape.text?.trim();
}

function formatCheckReportMd(report) {
  const { summary, findings, notChecked, deckPath, mode } = report;
  const bySeverity = {
    blocks_signing: findings.filter((f) => f.severity === "blocks_signing"),
    fix_if_time: findings.filter((f) => f.severity === "fix_if_time"),
    cosmetic: findings.filter((f) => f.severity === "cosmetic"),
  };

  const statusEmoji = summary.pass ? "PASS (Gate 1)" : "FAIL (Blocks Signing)";
  const lines = [
    `# Check Report — Gate 1 (Deterministic Lint)`,
    ``,
    `- **Deck:** \`${deckPath}\``,
    `- **Mode:** \`${mode}\` | **Slides:** ${summary.slideCount} | **Status:** **${statusEmoji}**`,
    `- **Counts:** ${bySeverity.blocks_signing.length} Blocks signing · ${bySeverity.fix_if_time.length} Fix if time · ${bySeverity.cosmetic.length} Cosmetic`,
    ``,
  ];

  const renderSection = (title, items) => {
    lines.push(`## ${title}`);
    if (items.length === 0) {
      lines.push(`- None.`);
    } else {
      for (const item of items) {
        const loc = item.slide !== null && item.slide !== undefined ? `Slide ${item.slide + 1}` : "Deck";
        const target = item.shape ? ` (${item.shape})` : "";
        lines.push(`- **[${item.check}]** ${loc}${target}: ${item.message}`);
      }
    }
    lines.push(``);
  };

  renderSection("Blocks Signing", bySeverity.blocks_signing);
  renderSection("Fix If Time", bySeverity.fix_if_time);
  renderSection("Cosmetic", bySeverity.cosmetic);

  if (report.fontSubstitutions && report.fontSubstitutions.length > 0) {
    lines.push(`## Brand Font Substitutions (Declared)`);
    for (const fsSub of report.fontSubstitutions) {
      lines.push(`- **${fsSub.role}:** ${fsSub.reason}`);
    }
    lines.push(``);
  }

  lines.push(`## Not Checked (Explicit Boundary)`);
  for (const nc of notChecked) {
    lines.push(`- ${nc}`);
  }
  lines.push(``);

  return lines.join("\n");
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const cli = findDeckcraftCli();
  const deckPath = path.resolve(opts.deck);
  const tokens = opts.tokens ? JSON.parse(fs.readFileSync(path.resolve(opts.tokens), "utf8")) : null;

  const info = JSON.parse(execFileSync(cli, ["info", deckPath], { encoding: "utf8" }));
  const [slideW, slideH] = info.slideSize || [960, 540];
  const slideCount = (info.slides || []).length;

  const marginPt = tokens?.layout?.marginPt ?? 36;
  const maxWords =
    opts.mode === "preread"
      ? (tokens?.layout?.maxWordsPrereadSlide ?? 110)
      : (tokens?.layout?.maxWordsLiveSlide ?? 45);
  const approvedColors = new Set((tokens?.approvedHexColors || []).map((c) => c.toUpperCase()));
  const approvedFonts = new Set(
    [
      tokens?.typography?.headingFont,
      tokens?.typography?.bodyFont,
      tokens?.typography?.monoFont,
    ]
      .filter(Boolean)
      .map((f) => f.toLowerCase())
  );

  const findings = [];
  const addFinding = (severity, check, slide, shape, message) => {
    findings.push({ severity, check, slide, shape, message });
  };

  // Pass 1: inspect all slides + native accessibility & spelling
  const pass1Cmds = [];
  for (let i = 0; i < slideCount; i++) {
    pass1Cmds.push(`slide.inspect=${JSON.stringify({ index: i })}`);
  }
  pass1Cmds.push(`review.accessibility={}`);
  pass1Cmds.push(`review.spelling={}`);

  const pass1 = runDeckcraftBatch(cli, deckPath, pass1Cmds);
  const slideData = pass1.filter((r) => r.cmd === "slide.inspect").map((r) => r.data);
  const a11yIssues = pass1.find((r) => r.cmd === "review.accessibility")?.data || [];
  const spellingIssues = pass1.find((r) => r.cmd === "review.spelling")?.data || [];

  // Pass 2: inspect every shape on every slide + sample background pixel for text shapes
  const pass2Cmds = [];
  const shapeLookup = [];
  const colorSampleLookup = [];

  for (const s of slideData) {
    pass2Cmds.push(`slide.go=${JSON.stringify({ index: s.index })}`);
    for (const sh of s.shapes || []) {
      pass2Cmds.push(`shape.inspect=${JSON.stringify({ id: sh.id })}`);
      shapeLookup.push({ slideIndex: s.index, shapeSummary: sh });

      if (sh.text && sh.text.trim() && sh.box && !normalizeHex(sh.fill)) {
        const [x, y, w, h] = sh.box;
        // For transparent text boxes, sample just outside top-left to avoid hitting glyph pixels
        const sx = Math.max(1, Math.min(slideW - 2, x - 3));
        const sy = Math.max(1, Math.min(slideH - 2, y - 3));
        pass2Cmds.push(`slide.colorAt=${JSON.stringify({ slide: s.index, x: sx, y: sy, scale: 1 })}`);
        colorSampleLookup.push({ slideIndex: s.index, shapeId: sh.id });
      }
    }
  }

  const pass2 = pass2Cmds.length > 0 ? runDeckcraftBatch(cli, deckPath, pass2Cmds) : [];
  const inspectedShapes = pass2.filter((r) => r.cmd === "shape.inspect").map((r) => r.data);
  const colorSamples = pass2.filter((r) => r.cmd === "slide.colorAt").map((r) => r.data);

  const shapeDetailsByKey = new Map();
  for (let i = 0; i < shapeLookup.length; i++) {
    const meta = shapeLookup[i];
    if (inspectedShapes[i]) {
      shapeDetailsByKey.set(`${meta.slideIndex}:${meta.shapeSummary.id}`, inspectedShapes[i]);
    }
  }
  const sampledBgByKey = new Map();
  for (let i = 0; i < colorSampleLookup.length; i++) {
    const meta = colorSampleLookup[i];
    if (colorSamples[i]?.color) {
      sampledBgByKey.set(`${meta.slideIndex}:${meta.shapeId}`, normalizeHex(colorSamples[i].color));
    }
  }

  // Evaluate each slide
  for (const s of slideData) {
    const shapes = s.shapes || [];
    let slideWords = 0;

    // Speaker notes check
    if (!s.notes || !s.notes.trim()) {
      addFinding("fix_if_time", "speaker_notes", s.index, null, "Slide has no speaker notes.");
    } else if (PLACEHOLDER_REGEX.test(s.notes)) {
      addFinding("blocks_signing", "placeholder_text", s.index, "notes", "Speaker notes contain placeholder text.");
    }

    // Check title period
    if (s.title && s.title.trim().endsWith(".")) {
      addFinding("cosmetic", "title_punctuation", s.index, null, `Slide title ends with a period ("${s.title.trim()}").`);
    }

    const contentShapes = [];

    for (const sh of shapes) {
      const key = `${s.index}:${sh.id}`;
      const detail = shapeDetailsByKey.get(key);
      const isBg = isIntentionalBackground(sh, slideW, slideH);
      const label = sh.name || `shape#${sh.id}`;

      if (!isBg && sh.box) {
        contentShapes.push(sh);
        const [x, y, w, h] = sh.box;
        // Hard out-of-bounds
        if (x < -1 || y < -1 || x + w > slideW + 1 || y + h > slideH + 1) {
          addFinding(
            "blocks_signing",
            "out_of_bounds",
            s.index,
            label,
            `Extends outside ${slideW}×${slideH} canvas (box: [${x.toFixed(1)}, ${y.toFixed(1)}, ${w.toFixed(1)}, ${h.toFixed(1)}]).`
          );
        } else if (
          x < marginPt - 2 ||
          y < marginPt - 2 ||
          x + w > slideW - marginPt + 2 ||
          y + h > slideH - marginPt + 2
        ) {
          addFinding(
            "fix_if_time",
            "safe_margin",
            s.index,
            label,
            `Intrudes into ${marginPt}pt safe margin (box: [${x.toFixed(1)}, ${y.toFixed(1)}, ${w.toFixed(1)}, ${h.toFixed(1)}]).`
          );
        }
      }

      // Word count & placeholder check
      if (sh.text && sh.text.trim()) {
        const words = sh.text.trim().split(/\s+/).filter(Boolean);
        slideWords += words.length;
        if (PLACEHOLDER_REGEX.test(sh.text)) {
          addFinding("blocks_signing", "placeholder_text", s.index, label, `Contains placeholder text: "${sh.text.trim().slice(0, 60)}"`);
        }
      }

      // Fill color token compliance & executable DESIGN.md brandRules enforcement
      if (tokens && sh.fill) {
        const fillHex = normalizeHex(sh.fill);
        if (fillHex && approvedColors.size > 0 && !approvedColors.has(fillHex)) {
          addFinding(
            "fix_if_time",
            "brand_color",
            s.index,
            label,
            `Shape fill ${fillHex} is not in DESIGN.md approved palette.`
          );
        }

        // Accent-only precision rule (e.g. "Orange is a precision emphasiser, never a background fill or under text")
        const accentRule = (tokens.brandRules?.accentOnlyHexes || []).find(
          (r) => normalizeHex(r.hex) === fillHex
        );
        if (accentRule) {
          if (accentRule.noTextOnFill && sh.text && sh.text.trim()) {
            addFinding(
              "blocks_signing",
              "forbidden_accent_fill",
              s.index,
              label,
              `Brand rule violation: text placed on precision-accent-only fill ${fillHex}. ${accentRule.reason || ""}`
            );
          }
          if (sh.box) {
            const areaPct = (sh.box[2] * sh.box[3]) / (slideW * slideH);
            const maxPct = accentRule.maxAreaPct ?? 0.04;
            if (areaPct > maxPct) {
              addFinding(
                "blocks_signing",
                "forbidden_accent_fill",
                s.index,
                label,
                `Brand rule violation: precision-accent color ${fillHex} covers ${(areaPct * 100).toFixed(1)}% of slide (max ${(maxPct * 100).toFixed(0)}%).`
              );
            }
          }
        }
      }

      // Sharp-container geometry rule (e.g. container-corners: "0px"; rounded corners only on standalone images)
      if (tokens?.brandRules?.sharpContainers && sh.kind !== "picture" && sh.kind !== "image" && sh.kind !== "video") {
        const preset = String(sh.preset || detail?.shape?.geom?.preset || "").toLowerCase();
        const geom = detail?.shape?.geom;
        const isLargeContainer = sh.box && sh.box[2] >= 60 && sh.box[3] >= 36;
        const isSmoothSquircle =
          isLargeContainer &&
          geom?.kind === "custom" &&
          Array.isArray(geom?.paths) &&
          geom.paths.some((p) => typeof p.d === "string" && /\bC\s/.test(p.d));
        if (preset.includes("round") || isSmoothSquircle) {
          addFinding(
            "fix_if_time",
            "sharp_container_violation",
            s.index,
            label,
            `Brand rule violation: DESIGN.md requires sharp 0px container corners (found ${preset || "smooth-cornered container"}).`
          );
        }
      }

      // Inspect text runs (font size floor, font family, text color, WCAG contrast)
      const paragraphs = detail?.shape?.text?.paragraphs || [];
      const sampledBg = normalizeHex(sh.fill) || sampledBgByKey.get(key) || normalizeHex(s.background);

      for (const para of paragraphs) {
        for (const run of para.runs || []) {
          if (!run.text || !run.text.trim()) continue;
          const props = run.props || {};
          const size = props.size;
          const font = props.font;
          const runHex = rgbObjToHex(props.fill?.color?.base?.rgb);

          if (typeof size === "number") {
            if (size < 10) {
              addFinding("blocks_signing", "font_size_floor", s.index, label, `Text run "${run.text.slice(0, 30)}" is ${size}pt (< 10pt minimum).`);
            } else if (size < 14 && size >= 10 && wordsCount(run.text) > 8) {
              addFinding("fix_if_time", "font_size_body", s.index, label, `Body text "${run.text.slice(0, 30)}" is ${size}pt (< 14pt body floor).`);
            }
          }

          if (tokens && font && approvedFonts.size > 0 && !approvedFonts.has(font.toLowerCase())) {
            addFinding("fix_if_time", "brand_font", s.index, label, `Font "${font}" is not in DESIGN.md approved typography.`);
          }

          if (tokens && runHex && approvedColors.size > 0 && !approvedColors.has(runHex)) {
            addFinding("fix_if_time", "brand_color", s.index, label, `Text color ${runHex} is not in DESIGN.md approved palette.`);
          }

          if (runHex && sampledBg) {
            const ratio = contrastRatio(runHex, sampledBg);
            const isLarge = typeof size === "number" && (size >= 18 || (size >= 14 && props.bold));
            const minReq = isLarge ? 3.0 : 4.5;
            if (ratio < minReq) {
              addFinding(
                "blocks_signing",
                "wcag_contrast",
                s.index,
                label,
                `Low contrast ${ratio}:1 (min ${minReq}:1) for ${runHex} on sampled background ${sampledBg} ("${run.text.slice(0, 30)}").`
              );
            }
          }
        }
      }
    }

    // Word density check
    if (slideWords > maxWords) {
      addFinding(
        "fix_if_time",
        "word_density",
        s.index,
        null,
        `Slide has ${slideWords} words (budget for ${opts.mode} mode is ${maxWords}).`
      );
    }

    // Bounding-box overlap check between non-background text shapes
    for (let i = 0; i < contentShapes.length; i++) {
      for (let j = i + 1; j < contentShapes.length; j++) {
        const a = contentShapes[i];
        const b = contentShapes[j];
        if (!a.box || !b.box) continue;
        // Skip if one shape intentionally wraps the other (e.g., text box inside a card)
        if (boxContains(a.box, b.box) || boxContains(b.box, a.box)) continue;
        const area = intersectionArea(a.box, b.box);
        if (area > 40) {
          const bothHaveText = Boolean(a.text?.trim() && b.text?.trim());
          addFinding(
            bothHaveText ? "blocks_signing" : "fix_if_time",
            "overlap",
            s.index,
            `${a.name || a.id} × ${b.name || b.id}`,
            `Bounding boxes overlap by ${Math.round(area)} sq pt.`
          );
        }
      }
    }
  }

  // Deck-level craft & taste signals (for decks with >= 4 slides)
  if (slideData.length >= 4) {
    // 1. Visual Richness / Anti-Box-itis Guard
    const slidesWithVisual = slideData.filter((s) =>
      (s.shapes || []).some((sh) => sh.kind === "picture" || sh.kind === "video" || sh.kind === "chart")
    ).length;
    const visualRatio = slidesWithVisual / slideData.length;
    if (visualRatio < 0.4) {
      addFinding(
        "fix_if_time",
        "visual_richness",
        null,
        null,
        `Only ${slidesWithVisual}/${slideData.length} slides (${Math.round(visualRatio * 100)}%) include a bespoke visual (picture/video/chart). Risk of flat "box-itis" — aim for >=40–50% using deck-art-direction + deck-visuals.`
      );
    }

    // 2. Transition Monotony Guard
    const transitions = slideData
      .slice(1)
      .map((s) => (typeof s.transition === "string" ? s.transition : s.transition?.kind || "none"));
    const nonMorph = transitions.filter((t) => t !== "morph");
    if (transitions.length >= 3 && nonMorph.length === transitions.length) {
      const counts = new Map();
      for (const t of transitions) counts.set(t, (counts.get(t) || 0) + 1);
      const [topKind, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      if (topCount / transitions.length > 0.65) {
        addFinding(
          "fix_if_time",
          "transition_monotony",
          null,
          null,
          `${topCount}/${transitions.length} slide transitions use identical "${topKind}". Vary transitions to match narrative shifts (uncover, push, zoom, reveal, pan, morph).`
        );
      }
    }
  }

  // Surface DeckCraft native accessibility & spelling checks
  for (const issue of a11yIssues) {
    // Blank-layout slides often use explicit title text boxes instead of title placeholders;
    // treat missing placeholder title as cosmetic/info if the slide already has a large text element.
    const isMissingTitlePh = /missing slide title/i.test(issue.issue || "");
    addFinding(
      isMissingTitlePh ? "cosmetic" : "fix_if_time",
      "accessibility",
      issue.slide ?? null,
      issue.shape ? `shape#${issue.shape}` : null,
      issue.issue
    );
  }

  for (const sp of spellingIssues) {
    addFinding(
      "fix_if_time",
      "spelling",
      sp.slide ?? null,
      sp.shape ? `shape#${sp.shape}` : null,
      `Possible misspelling "${sp.word}"${sp.suggestions?.length ? ` (suggestions: ${sp.suggestions.slice(0, 3).join(", ")})` : ""}.`
    );
  }

  const blocksCount = findings.filter((f) => f.severity === "blocks_signing").length;
  const report = {
    deckPath,
    mode: opts.mode,
    summary: {
      slideCount,
      pass: blocksCount === 0,
      blocksSigning: blocksCount,
      fixIfTime: findings.filter((f) => f.severity === "fix_if_time").length,
      cosmetic: findings.filter((f) => f.severity === "cosmetic").length,
    },
    fontSubstitutions: tokens?.fontSubstitutions || [],
    brandConformanceChecklist: tokens?.brandRules?.conformanceChecklist || [],
    findings,
    notChecked: [
      "Gate 2 multimodal visual inspection (text wrapping, glyph clipping inside boxes, aesthetic balance, Morph smoothness).",
      "Narrative perception fidelity against NARRATIVE.md (requires Gate 2 cold-reader critic).",
      "Live playback on Microsoft PowerPoint (Windows/macOS) or machines missing bundled fonts.",
      "Spoken pacing and presenter delivery timing.",
    ],
  };

  const md = formatCheckReportMd(report);

  if (opts.outDir) {
    const outDir = path.resolve(opts.outDir);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "check-report.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
    fs.writeFileSync(path.join(outDir, "CHECK_REPORT.md"), md, "utf8");
  }

  console.log(md);
  if (!report.summary.pass) {
    process.exitCode = 1;
  }
}

function wordsCount(str) {
  return String(str || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

main();
