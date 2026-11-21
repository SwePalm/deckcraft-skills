#!/usr/bin/env node
/**
 * deckcraft_runner.mjs
 * Executes DeckCraft command files, exports .deckcraft/.pptx/.pdf,
 * renders 2x slide PNGs, and renders transition frames for Morph/animated slides.
 *
 * Usage:
 *   node skills/deck-builder/scripts/deckcraft_runner.mjs \
 *     [--theme theme-commands.txt] \
 *     --commands deck-commands.txt \
 *     --out-dir build/output \
 *     [--name deck] \
 *     [--scale 2] \
 *     [--export-pptx] \
 *     [--export-pdf]
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export function findDeckcraftCli(startDir = process.cwd()) {
  if (process.env.DECKCRAFT_CLI && fs.existsSync(process.env.DECKCRAFT_CLI)) {
    return process.env.DECKCRAFT_CLI;
  }

  // Search upward for .tools/deckcraft-cli-*/deckcraft-cli
  let dir = path.resolve(startDir);
  for (let i = 0; i < 6; i++) {
    const toolsDir = path.join(dir, ".tools");
    if (fs.existsSync(toolsDir)) {
      for (const entry of fs.readdirSync(toolsDir)) {
        const candidate = path.join(toolsDir, entry, "deckcraft-cli");
        if (fs.existsSync(candidate)) return candidate;
      }
      const direct = path.join(toolsDir, "deckcraft-cli");
      if (fs.existsSync(direct)) return direct;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Fallback to PATH
  try {
    const resolved = execFileSync("which", ["deckcraft-cli"], { encoding: "utf8" }).trim();
    if (resolved) return resolved;
  } catch {
    // not on PATH
  }
  throw new Error(
    "deckcraft-cli not found. Set DECKCRAFT_CLI, place it in .tools/, or install it on PATH."
  );
}

function parseArgs(argv) {
  const opts = {
    theme: null,
    commands: null,
    outDir: null,
    name: "deck",
    scale: 2,
    exportPptx: false,
    exportPdf: false,
    print: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--theme") opts.theme = argv[++i];
    else if (a === "--commands") opts.commands = argv[++i];
    else if (a === "--out-dir") opts.outDir = argv[++i];
    else if (a === "--name") opts.name = argv[++i];
    else if (a === "--scale") opts.scale = Number(argv[++i]);
    else if (a === "--export-pptx") opts.exportPptx = true;
    else if (a === "--export-pdf") opts.exportPdf = true;
    else if (a === "--print") opts.print = true;
    else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: node deckcraft_runner.mjs [--theme theme.txt] --commands cmds.txt --out-dir dir [--name deck] [--scale 2] [--export-pptx] [--export-pdf]"
      );
      process.exit(0);
    }
  }
  if (!opts.commands || !opts.outDir) {
    throw new Error("--commands and --out-dir are required.");
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const cli = findDeckcraftCli();

  const outDir = path.resolve(opts.outDir);
  const slidesDir = path.join(outDir, "slides");
  const transitionsDir = path.join(outDir, "transitions");
  fs.mkdirSync(slidesDir, { recursive: true });
  fs.mkdirSync(transitionsDir, { recursive: true });

  // Clean stale slide PNGs from previous runs
  for (const f of fs.readdirSync(slidesDir)) {
    if (f.endsWith(".png")) fs.unlinkSync(path.join(slidesDir, f));
  }
  for (const f of fs.readdirSync(transitionsDir)) {
    if (f.endsWith(".png")) fs.unlinkSync(path.join(transitionsDir, f));
  }

  const deckPath = path.join(outDir, `${opts.name}.deckcraft`);
  const runArgs = ["run", "--cmd", 'file.new={"blank":true}'];
  const postThemeCmds = [];
  if (opts.theme) {
    const themeLines = fs
      .readFileSync(path.resolve(opts.theme), "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    for (const line of themeLines) {
      if (line.startsWith("design.background")) {
        postThemeCmds.push(line);
      } else {
        runArgs.push("--cmd", line);
      }
    }
  }
  const cmdsText = fs.readFileSync(path.resolve(opts.commands), "utf8");
  const hasExplicitBg = /^\s*design\.background\b/m.test(cmdsText);

  runArgs.push("--cmd-file", path.resolve(opts.commands));
  if (!hasExplicitBg) {
    for (const line of postThemeCmds) {
      runArgs.push("--cmd", line);
    }
  }
  runArgs.push("--save", deckPath);
  if (opts.print) runArgs.push("--print");

  const runOutput = execFileSync(cli, runArgs, { encoding: "utf8" });
  if (opts.print && runOutput.trim()) {
    console.log(runOutput.trim());
  }

  // Optional .pptx / .pdf exports
  const exports = {};
  if (opts.exportPptx) {
    const pptxPath = path.join(outDir, `${opts.name}.pptx`);
    execFileSync(cli, ["convert", deckPath, pptxPath], { encoding: "utf8" });
    exports.pptx = pptxPath;
  }
  if (opts.exportPdf) {
    const pdfPath = path.join(outDir, `${opts.name}.pdf`);
    execFileSync(cli, ["convert", deckPath, pdfPath], { encoding: "utf8" });
    exports.pdf = pdfPath;
  }

  // Inspect deck metadata
  const infoRaw = execFileSync(cli, ["info", deckPath], { encoding: "utf8" });
  const info = JSON.parse(infoRaw);

  // Render all slides at requested scale
  execFileSync(cli, ["render", deckPath, "--all", "--scale", String(opts.scale), slidesDir], {
    encoding: "utf8",
  });
  const slideImages = fs
    .readdirSync(slidesDir)
    .filter((f) => f.endsWith(".png"))
    .sort()
    .map((f) => path.join(slidesDir, f));

  // Render transition frames for any slide (index > 0) with a transition configured
  const transitionRenders = [];
  for (const slide of info.slides || []) {
    if (slide.index > 0 && slide.transition) {
      const baseOut = path.join(
        transitionsDir,
        `slide-${String(slide.index + 1).padStart(2, "0")}.png`
      );
      execFileSync(
        cli,
        ["render-transition", deckPath, "--slide", String(slide.index), "--t", "0.25,0.5,0.75", baseOut],
        { encoding: "utf8" }
      );
      const prefix = `slide-${String(slide.index + 1).padStart(2, "0")}-t`;
      const frames = fs
        .readdirSync(transitionsDir)
        .filter((f) => f.startsWith(prefix) && f.endsWith(".png"))
        .sort()
        .map((f) => path.join(transitionsDir, f));
      transitionRenders.push({
        slideIndex: slide.index,
        transition: slide.transition,
        frames,
      });
    }
  }

  const manifest = {
    deckPath,
    exports,
    slideSize: info.slideSize,
    slideCount: (info.slides || []).length,
    fonts: info.fonts,
    slideImages,
    transitionRenders,
  };

  const manifestPath = path.join(outDir, "build-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(
    `Built ${manifest.slideCount} slides → ${deckPath} (${slideImages.length} PNGs, ${transitionRenders.length} transition strips)`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
