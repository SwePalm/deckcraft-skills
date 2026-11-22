#!/usr/bin/env node
/**
 * render_visual.mjs
 * 100% local, port-free headless visual renderer (Playwright/Chromium + ffmpeg).
 * Uses Playwright page.route() to serve scene files and node_modules directly from disk
 * (zero network, zero port binding — works inside strict sandboxes).
 *
 * Usage:
 *   node skills/deck-visuals/scripts/render_visual.mjs \
 *     --scene path/to/scene.html \
 *     --out path/to/output.png|.mp4 \
 *     [--tokens path/to/tokens.json] \
 *     [--data path/to/data.json] \
 *     [--width 600] [--height 600] [--scale 2] \
 *     [--mode png|mp4] [--transparent] [--fps 30] [--duration 4]
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

function findProjectRoot(startDir = process.cwd()) {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, "node_modules"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(startDir);
}

function parseArgs(argv) {
  const opts = {
    scene: null,
    out: null,
    tokens: null,
    data: null,
    width: 600,
    height: 600,
    scale: 2,
    mode: null,
    transparent: false,
    fps: 30,
    duration: 4,
    t: 0,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--scene") opts.scene = argv[++i];
    else if (a === "--out") opts.out = argv[++i];
    else if (a === "--tokens") opts.tokens = argv[++i];
    else if (a === "--data") opts.data = argv[++i];
    else if (a === "--width") opts.width = Number(argv[++i]);
    else if (a === "--height") opts.height = Number(argv[++i]);
    else if (a === "--scale") opts.scale = Number(argv[++i]);
    else if (a === "--mode") opts.mode = argv[++i];
    else if (a === "--transparent") opts.transparent = true;
    else if (a === "--fps") opts.fps = Number(argv[++i]);
    else if (a === "--duration") opts.duration = Number(argv[++i]);
    else if (a === "--t") opts.t = Number(argv[++i]);
    else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: node render_visual.mjs --scene scene.html --out out.png [--tokens tokens.json] [--data data.json] [--width 600] [--height 600] [--scale 2] [--mode png|mp4] [--transparent] [--fps 30] [--duration 4]"
      );
      process.exit(0);
    }
  }
  if (!opts.scene || !opts.out) throw new Error("--scene and --out are required.");
  if (!opts.mode) {
    opts.mode = opts.out.toLowerCase().endsWith(".mp4") ? "mp4" : "png";
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const scenePath = path.resolve(opts.scene);
  const sceneDir = path.dirname(scenePath);
  const outPath = path.resolve(opts.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const tokens = opts.tokens ? JSON.parse(fs.readFileSync(path.resolve(opts.tokens), "utf8")) : null;
  const data = opts.data ? JSON.parse(fs.readFileSync(path.resolve(opts.data), "utf8")) : null;
  const projectRoot = findProjectRoot();

  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: opts.width, height: opts.height },
      deviceScaleFactor: opts.mode === "mp4" ? 1 : opts.scale,
    });
    const page = await context.newPage();
    page.on("pageerror", (err) => console.error("Scene pageerror:", err));

    // Port-free virtual origin serving local scene + node_modules directly from disk
    await page.route("https://local.studio/**", async (route) => {
      const u = new URL(route.request().url());
      const urlPath = decodeURIComponent(u.pathname);
      let filePath;
      if (urlPath === "/" || urlPath === "/scene.html") {
        filePath = scenePath;
      } else if (urlPath.startsWith("/node_modules/")) {
        filePath = path.join(projectRoot, urlPath);
      } else {
        filePath = path.join(sceneDir, urlPath.replace(/^\/+/, ""));
      }

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        await route.fulfill({ status: 404, body: "Not found" });
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      await route.fulfill({
        status: 200,
        contentType: MIME_TYPES[ext] || "application/octet-stream",
        body: fs.readFileSync(filePath),
      });
    });

    await page.addInitScript(
      ({ tokensVal, dataVal, transparentVal }) => {
        window.BRAND_TOKENS = tokensVal;
        window.VISUAL_DATA = dataVal;
        window.VISUAL_TRANSPARENT = transparentVal;
      },
      { tokensVal: tokens, dataVal: data, transparentVal: opts.transparent }
    );

    await page.goto("https://local.studio/scene.html", { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      if (window.SCENE_READY && typeof window.SCENE_READY.then === "function") {
        await window.SCENE_READY;
      }
    });

    if (opts.mode === "png") {
      await page.evaluate((tVal) => {
        const fn = window.renderFrame || window.__renderFrame;
        if (typeof fn === "function") fn(tVal);
      }, opts.t);
      await page.screenshot({ path: outPath, omitBackground: opts.transparent });

      // Auto-export [data-zone] layout coordinates for zero-math DeckCraft text placement
      const zones = await page.evaluate(() => {
        const els = [...document.querySelectorAll("[data-zone]")];
        if (els.length === 0) return null;
        const out = {};
        for (const el of els) {
          const name = el.getAttribute("data-zone");
          const pad = Number(el.getAttribute("data-pad") || 0);
          const r = el.getBoundingClientRect();
          out[name] = {
            box: [
              Number(r.x.toFixed(1)),
              Number(r.y.toFixed(1)),
              Number(r.width.toFixed(1)),
              Number(r.height.toFixed(1)),
            ],
            safeRect: [
              Number((r.x + pad).toFixed(1)),
              Number((r.y + pad).toFixed(1)),
              Number(Math.max(10, r.width - pad * 2).toFixed(1)),
              Number(Math.max(10, r.height - pad * 2).toFixed(1)),
            ],
            pad,
          };
        }
        return out;
      });

      if (zones) {
        const zonesPath = outPath.replace(/\.[^.]+$/, ".zones.json");
        fs.writeFileSync(
          zonesPath,
          JSON.stringify({ viewport: [opts.width, opts.height], zones }, null, 2) + "\n",
          "utf8"
        );
        console.log(
          `Rendered PNG (${opts.width * opts.scale}×${opts.height * opts.scale}) → ${outPath} (+ ${Object.keys(zones).length} zones → ${zonesPath})`
        );
      } else {
        console.log(`Rendered PNG (${opts.width * opts.scale}×${opts.height * opts.scale}) → ${outPath}`);
      }
    } else if (opts.mode === "mp4") {
      const hasHook = await page.evaluate(
        () => typeof (window.renderFrame || window.__renderFrame) === "function"
      );
      if (!hasHook) {
        throw new Error(
          `Scene "${opts.scene}" does not define window.renderFrame(t). Refusing to encode a frozen MP4.`
        );
      }
      const totalFrames = Math.max(2, Math.round(opts.fps * opts.duration));
      const framesDir = path.join("/tmp", `dc-frames-${process.pid}-${Date.now()}`);
      fs.mkdirSync(framesDir, { recursive: true });
      try {
        for (let f = 0; f < totalFrames; f++) {
          const t = f / totalFrames;
          await page.evaluate((tVal) => {
            const fn = window.renderFrame || window.__renderFrame;
            if (typeof fn === "function") fn(tVal);
          }, t);
          const framePath = path.join(framesDir, `frame-${String(f).padStart(5, "0")}.png`);
          await page.screenshot({ path: framePath, omitBackground: false });
        }

        execFileSync(
          "ffmpeg",
          [
            "-y",
            "-framerate",
            String(opts.fps),
            "-i",
            path.join(framesDir, "frame-%05d.png"),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-crf",
            "18",
            "-movflags",
            "+faststart",
            outPath,
          ],
          { stdio: "pipe" }
        );
        console.log(
          `Rendered MP4 (${opts.width}×${opts.height}, ${opts.fps}fps, ${opts.duration}s, ${totalFrames} frames) → ${outPath}`
        );
      } finally {
        fs.rmSync(framesDir, { recursive: true, force: true });
      }
    } else {
      throw new Error(`Unsupported mode: ${opts.mode}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
