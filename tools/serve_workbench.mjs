#!/usr/bin/env node
/**
 * tools/serve_workbench.mjs
 * Tiny zero-dependency local server for interactive HTML workbenches.
 * Serves the single-file HTML on 127.0.0.1 and accepts POST /api/save to write
 * artifacts (NARRATIVE.md, DESIGN.md, MISSES.md, etc.) directly into --project-dir
 * with zero copy/paste or browser Downloads juggling.
 *
 * Usage:
 *   node tools/serve_workbench.mjs \
 *     --html path/to/workbench.html \
 *     --project-dir path/to/project \
 *     [--port 0] \
 *     [--stay-open]
 */

import fs from "node:fs";
import path from "node:path";
import http from "node:http";

const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const htmlPath = getArg("--html");
const projectDir = getArg("--project-dir");
const port = Number(getArg("--port") || 0);
const stayOpen = args.includes("--stay-open");

if (!htmlPath || !projectDir) {
  console.error("Usage: node tools/serve_workbench.mjs --html <workbench.html> --project-dir <dir> [--port 0] [--stay-open]");
  process.exit(1);
}

const absHtml = path.resolve(htmlPath);
const absProjectDir = path.resolve(projectDir);
fs.mkdirSync(absProjectDir, { recursive: true });

const server = http.createServer((req, res) => {
  const urlPath = (req.url || "/").split("?")[0];

  if (req.method === "GET" && (urlPath === "/" || urlPath === "/index.html")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(fs.readFileSync(absHtml, "utf8"));
    return;
  }

  if (req.method === "GET" && urlPath === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, projectDir: absProjectDir }));
    return;
  }

  if (req.method === "POST" && urlPath === "/api/save") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString("utf8");
      if (body.length > 10 * 1024 * 1024) req.destroy();
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        const files = payload.files || {};
        const written = [];

        for (const [relName, content] of Object.entries(files)) {
          // Strict path confinement inside absProjectDir
          const safeBase = path.basename(relName);
          if (!safeBase || safeBase !== relName || safeBase.startsWith(".")) {
            throw new Error(`Invalid filename: ${relName}`);
          }
          const dest = path.join(absProjectDir, safeBase);
          fs.writeFileSync(dest, String(content), "utf8");
          written.push(dest);
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, written }));
        console.log(`Saved ${written.length} file(s) to ${absProjectDir}:`);
        for (const w of written) console.log(`  - ${w}`);

        if (!stayOpen) {
          setTimeout(() => server.close(() => process.exit(0)), 250);
        }
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(port, "127.0.0.1", () => {
  const addr = server.address();
  console.log(`Workbench ready at http://127.0.0.1:${addr.port}/`);
  console.log(`Saving selections directly into: ${absProjectDir}`);
});
