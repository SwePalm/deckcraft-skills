#!/usr/bin/env node
/**
 * parse_design_md.mjs
 * Zero-dependency DESIGN.md parser, WCAG contrast auditor, and DeckCraft theme compiler.
 * Follows the google-labs-code/design.md dual-layer spec (YAML tokens + 8 canonical sections).
 *
 * Usage:
 *   node skills/deck-brand/scripts/parse_design_md.mjs <DESIGN.md> [--out-dir <dir>]
 */

import fs from "node:fs";
import path from "node:path";

const CANONICAL_SECTIONS = [
  "Overview",
  "Colors",
  "Typography",
  "Layout",
  "Elevation & Depth",
  "Shapes",
  "Components",
  "Do's and Don'ts",
];

// Minimal, deterministic YAML parser for DESIGN.md token blocks (nested maps, lists, strings, numbers, bools)
function parseSimpleYaml(text) {
  const root = {};
  const stack = [{ indent: -1, container: root }];

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith("#")) continue;

    const indent = raw.match(/^(\s*)/)[1].length;
    const trimmed = raw.trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].container;

    if (trimmed.startsWith("- ")) {
      const val = parseScalar(trimmed.slice(2).trim());
      if (Array.isArray(parent)) {
        parent.push(val);
      }
      continue;
    }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const rest = trimmed.slice(colonIdx + 1).trim();

    if (rest === "" || rest.startsWith("#")) {
      // Peek next non-empty line to decide array vs object
      let isArray = false;
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim();
        if (!next || next.startsWith("#")) continue;
        if (next.startsWith("- ")) isArray = true;
        break;
      }
      const child = isArray ? [] : {};
      parent[key] = child;
      stack.push({ indent, container: child });
    } else {
      // Strip inline comment outside quotes
      const cleaned = stripInlineComment(rest);
      parent[key] = parseScalar(cleaned);
    }
  }
  return root;
}

function stripInlineComment(str) {
  let inQuote = null;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if ((ch === '"' || ch === "'") && str[i - 1] !== "\\") {
      inQuote = inQuote === ch ? null : inQuote || ch;
    } else if (ch === "#" && !inQuote && (i === 0 || /\s/.test(str[i - 1]))) {
      return str.slice(0, i).trim();
    }
  }
  return str.trim();
}

function parseScalar(val) {
  if (val === "true") return true;
  if (val === "false") return false;
  if (val === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  if (val.startsWith("[") && val.endsWith("]")) {
    return val
      .slice(1, -1)
      .split(",")
      .map((s) => parseScalar(s.trim()))
      .filter((x) => x !== "");
  }
  return val;
}

function deepMerge(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === "object" && !Array.isArray(v) && target[k] && typeof target[k] === "object") {
      deepMerge(target[k], v);
    } else {
      target[k] = v;
    }
  }
  return target;
}

function getByPath(obj, dotPath) {
  return dotPath.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

function resolveReferences(obj, root) {
  if (typeof obj === "string") {
    const m = obj.match(/^\{([^}]+)\}$/);
    if (m) {
      const resolved = getByPath(root, m[1].trim());
      return resolved !== undefined ? resolveReferences(resolved, root) : obj;
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map((item) => resolveReferences(item, root));
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = resolveReferences(v, root);
    }
    return out;
  }
  return obj;
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
  return 0.2126 * toLin(rgb.r) + 0.7152 * toLin(rgb.g) + 0.0722 * toLin(rgb.b);
}

function contrastRatio(hexA, hexB) {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

function parseDesignMd(markdown) {
  let body = markdown;
  const rawTokens = {};

  // 1. YAML frontmatter
  const fmMatch = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (fmMatch) {
    deepMerge(rawTokens, parseSimpleYaml(fmMatch[1]));
    body = markdown.slice(fmMatch[0].length);
  }

  // 2. Interleaved ```yaml blocks
  const yamlBlockRegex = /```ya?ml\r?\n([\s\S]*?)```/g;
  let blockMatch;
  while ((blockMatch = yamlBlockRegex.exec(body)) !== null) {
    deepMerge(rawTokens, parseSimpleYaml(blockMatch[1]));
  }

  const resolvedTokens = resolveReferences(rawTokens, rawTokens);

  // 3. Parse ## sections
  const sections = {};
  const sectionOrder = [];
  const sectionRegex = /^##\s+(.+)$/gm;
  const matches = [...body.matchAll(sectionRegex)];
  for (let i = 0; i < matches.length; i++) {
    const heading = matches[i][1].trim();
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
    sections[heading] = body.slice(start, end).trim();
    sectionOrder.push(heading);
  }

  // Validate canonical ordering
  const orderWarnings = [];
  let lastCanonicalIdx = -1;
  for (const h of sectionOrder) {
    const idx = CANONICAL_SECTIONS.findIndex(
      (c) => c.toLowerCase() === h.toLowerCase() || (c === "Overview" && h.toLowerCase() === "brand & style") || (c === "Layout" && h.toLowerCase() === "layout & spacing") || (c === "Elevation & Depth" && h.toLowerCase() === "elevation")
    );
    if (idx !== -1) {
      if (idx < lastCanonicalIdx) {
        orderWarnings.push(`Section "## ${h}" appears out of canonical DESIGN.md order.`);
      }
      lastCanonicalIdx = idx;
    }
  }

  // Extract Do's and Don'ts bullets
  const dos = [];
  const donts = [];
  const rulesText = sections["Do's and Don'ts"] || "";
  for (const line of rulesText.split(/\r?\n/)) {
    const t = line.trim();
    if (/^[-*]\s+\*\*Do\b/i.test(t) || /^[-*]\s+Do:/i.test(t)) dos.push(t.replace(/^[-*]\s+/, ""));
    else if (/^[-*]\s+\*\*Don'?t\b/i.test(t) || /^[-*]\s+Don'?t:/i.test(t)) donts.push(t.replace(/^[-*]\s+/, ""));
  }

  // Normalize colors
  const c = resolvedTokens.colors || {};
  const background = normalizeHex(c.background || c.bg || c.surface) || "#0B1326";
  const isDark = relativeLuminance(background) < 0.25;
  const mode = resolvedTokens.mode || (isDark ? "dark" : "light");

  const palette = {
    background,
    surface: normalizeHex(c.surface || c.card) || (isDark ? "#152036" : "#F8FAFC"),
    surfaceAlt: normalizeHex(c.surfaceAlt || c.surface2) || (isDark ? "#1E2D4A" : "#E2E8F0"),
    text: normalizeHex(c.text || c.foreground || c.onSurface) || (isDark ? "#F8FAFC" : "#0F172A"),
    textMuted: normalizeHex(c.textMuted || c.muted || c.secondaryText) || (isDark ? "#94A3B8" : "#475569"),
    primary: normalizeHex(c.primary || c.accent1) || "#38BDF8",
    secondary: normalizeHex(c.secondary || c.accent2) || "#818CF8",
    accent: normalizeHex(c.accent || c.accent3) || "#34D399",
    warning: normalizeHex(c.warning || c.accent4) || "#F59E0B",
    danger: normalizeHex(c.danger || c.accent5) || "#F43F5E",
    extra: normalizeHex(c.extra || c.accent6) || "#A78BFA",
  };

  // Normalize typography
  const t = resolvedTokens.typography || {};
  const typography = {
    headingFont: t.headingFont || t.headline?.fontFamily || t.heading?.fontFamily || "Inter",
    bodyFont: t.bodyFont || t.body?.fontFamily || "Inter",
    monoFont: t.monoFont || t.mono?.fontFamily || "Liberation Mono",
    titleSizePt: Number(t.titleSizePt || 40),
    sectionSizePt: Number(t.sectionSizePt || 24),
    bodySizePt: Number(t.bodySizePt || 16),
    captionSizePt: Number(t.captionSizePt || 11),
  };

  // Normalize layout & shapes
  const l = resolvedTokens.layout || {};
  const s = resolvedTokens.shapes || resolvedTokens.rounded || {};
  const layout = {
    slideWidthPt: Number(l.slideWidthPt || 960),
    slideHeightPt: Number(l.slideHeightPt || 540),
    marginPt: Number(l.marginPt || 44),
    gapPt: Number(l.gapPt || 24),
    maxWordsLiveSlide: Number(l.maxWordsLiveSlide || 45),
    maxWordsPrereadSlide: Number(l.maxWordsPrereadSlide || 110),
  };

  const shapes = {
    cornerRadiusPt: Number(s.cornerRadiusPt ?? 12),
    smoothCorners: Number(s.smoothCorners ?? 60),
    style: s.style || "rounded",
  };

  // WCAG contrast audit
  const contrastAudit = [
    { pair: "text on background", fg: palette.text, bg: palette.background, ratio: contrastRatio(palette.text, palette.background), minRequired: 4.5 },
    { pair: "text on surface", fg: palette.text, bg: palette.surface, ratio: contrastRatio(palette.text, palette.surface), minRequired: 4.5 },
    { pair: "textMuted on background", fg: palette.textMuted, bg: palette.background, ratio: contrastRatio(palette.textMuted, palette.background), minRequired: 4.5 },
    { pair: "textMuted on surface", fg: palette.textMuted, bg: palette.surface, ratio: contrastRatio(palette.textMuted, palette.surface), minRequired: 4.5 },
    { pair: "primary on background (large/UI)", fg: palette.primary, bg: palette.background, ratio: contrastRatio(palette.primary, palette.background), minRequired: 3.0 },
  ].map((item) => ({ ...item, pass: item.ratio >= item.minRequired }));

  // DeckCraft theme mapping
  const deckcraftTheme = {
    colors: {
      dk1: palette.text,
      lt1: palette.background,
      dk2: palette.textMuted,
      lt2: palette.surface,
      accent1: palette.primary,
      accent2: palette.secondary,
      accent3: palette.accent,
      accent4: palette.warning,
      accent5: palette.danger,
      accent6: palette.extra,
      hlink: palette.primary,
      folHlink: palette.secondary,
    },
    fonts: {
      major: typography.headingFont,
      minor: typography.bodyFont,
    },
    background: palette.background,
  };

  // Optional dark/alternate section palette for hybrid dark+light keynote decks
  const dc = resolvedTokens.darkColors || resolvedTokens.altColors || null;
  const darkPalette = dc
    ? Object.fromEntries(
        Object.entries(dc)
          .map(([k, v]) => [k, normalizeHex(v)])
          .filter(([, v]) => Boolean(v))
      )
    : null;

  // Approved palette set for Gate 1 token compliance linting (includes optional darkPalette)
  const approvedHexColors = [
    ...new Set([
      ...Object.values(palette),
      ...(darkPalette ? Object.values(darkPalette) : []),
      "#FFFFFF",
      "#000000",
    ].filter(Boolean)),
  ];

  return {
    name: resolvedTokens.name || "Untitled Brand",
    mode,
    palette,
    darkPalette,
    approvedHexColors,
    typography,
    layout,
    shapes,
    deckcraftTheme,
    contrastAudit,
    sectionsFound: sectionOrder,
    orderWarnings,
    dos,
    donts,
  };
}

function buildThemeCommands(tokens) {
  const lines = [
    `# Auto-generated by deck-brand from DESIGN.md (${tokens.name})`,
    `design.colors=${JSON.stringify({ colors: tokens.deckcraftTheme.colors })}`,
    `design.fonts=${JSON.stringify(tokens.deckcraftTheme.fonts)}`,
    `design.background=${JSON.stringify({ color: tokens.deckcraftTheme.background, all: true })}`,
  ];
  return lines.join("\n") + "\n";
}

// CLI entry point
const args = process.argv.slice(2);
if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log("Usage: node parse_design_md.mjs <DESIGN.md> [--out-dir <dir>]");
  process.exit(0);
}

const inputPath = path.resolve(args[0]);
const outDirIdx = args.indexOf("--out-dir");
const outDir = outDirIdx !== -1 && args[outDirIdx + 1] ? path.resolve(args[outDirIdx + 1]) : null;

const markdown = fs.readFileSync(inputPath, "utf8");
const tokens = parseDesignMd(markdown);

if (outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "tokens.json"), JSON.stringify(tokens, null, 2) + "\n", "utf8");
  fs.writeFileSync(path.join(outDir, "theme-commands.txt"), buildThemeCommands(tokens), "utf8");
  console.log(`Compiled DESIGN.md ("${tokens.name}", ${tokens.mode} mode) → ${outDir}`);
} else {
  console.log(JSON.stringify(tokens, null, 2));
}

const failedContrast = tokens.contrastAudit.filter((c) => !c.pass);
if (failedContrast.length > 0) {
  console.error("WCAG contrast warnings:");
  for (const f of failedContrast) {
    console.error(`  - ${f.pair}: ${f.ratio}:1 (min ${f.minRequired}:1) [${f.fg} on ${f.bg}]`);
  }
}
if (tokens.orderWarnings.length > 0) {
  console.error("DESIGN.md section order warnings:");
  for (const w of tokens.orderWarnings) console.error(`  - ${w}`);
}
