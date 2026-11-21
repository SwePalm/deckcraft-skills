---
name: deck-visuals
description: >
  Generate bespoke, brand-tokenized 3D renders (Three.js), editorial data visualizations (D3/SVG),
  and deterministic looping motion clips (MP4) 100% locally via headless Playwright/Chromium and
  ffmpeg. Use whenever a slide in NARRATIVE.md calls for a hero 3D visual, custom architecture
  diagram, publication-grade chart, or subtle looping motion background—never rely on generic
  AI-generated images for diagrams, charts, or text.
license: Apache-2.0
---

# Deck Visuals (100% Local Code-First Visual Studio)

Every visual generated here is **code-first, deterministic, and brand-tokenized**:
- Reads `window.BRAND_TOKENS` (injected automatically from `deck-brand`'s `tokens.json`) and optional `window.VISUAL_DATA` (from `--data data.json`).
- Imports local packages (`three`, `d3`) from the local ephemeral static server—**zero external network or CDN calls**.
- Renders crisp 2x retina transparent PNGs (`--mode png`) or seamless looping H.264 MP4 clips (`--mode mp4`) ready for `insert.picture` or `insert.video` in `deck-builder`.

## Visual Selection Guide (Narrative First)

| Narrative Need | Best Tool / Built-in Recipe | Output |
| :--- | :--- | :--- |
| Step through a diagram or zoom into one pillar | **DeckCraft Morph** (`deck-builder`) | Native vector shapes |
| Iconic cover / concept anchor / 3D hero | **Three.js** (`three-hero-orb.html`) | Transparent 2x PNG or 3–4s looping MP4 |
| Layered system / platform architecture | **Three.js Isometric** (`three-isometric-layers.html`) | Transparent 2x PNG |
| Effort scale / maturity / phased roadmap | **Three.js Terraces** (`three-ascending-steps.html`) | Transparent 2x PNG |
| Reusable flywheel / N-pattern operating model | **Three.js Flywheel** (`three-orbital-flywheel.html`) | Seamless looping MP4 or 2x PNG |
| Quantified proof, trends, rankings, comparisons | **D3 / SVG** (`editorial-chart.html`) | Transparent 2x PNG |
| Product / UI walkthrough | **HTML/CSS 3D Perspective Stage** (Playwright) | Transparent 2x PNG |
| Genuine real-world photography | User-provided photo (or optional future cloud hook) | Cropped picture |

## Rendering a Visual Asset

### 1. Transparent Retina PNG (3D still, D3 chart, SVG diagram)
```bash
node skills/deck-visuals/scripts/render_visual.mjs \
  --scene skills/deck-visuals/references/recipes/three-hero-orb.html \
  --tokens build/brand/tokens.json \
  --width 600 --height 600 --scale 2 \
  --mode png --transparent \
  --out build/assets/hero-3d.png
```

### 2. Deterministic Looping MP4 (3D turntable, animated diagram, shader)
Expose `window.renderFrame = (t) => { ... }` where `t` runs smoothly from `0` to `1` (wrap seamlessly so `t=0` and `t=1` match!). Then run:
```bash
node skills/deck-visuals/scripts/render_visual.mjs \
  --scene skills/deck-visuals/references/recipes/three-hero-orb.html \
  --tokens build/brand/tokens.json \
  --width 600 --height 600 --scale 1 \
  --mode mp4 --fps 30 --duration 4 \
  --out build/assets/hero-3d-loop.mp4
```

### 3. Passing Custom Data to Charts/Diagrams
Pass `--data path/to/chart-data.json`—the runner injects it as `window.VISUAL_DATA` before the scene script executes.

## Quality Rule: Inspect Before Embedding
Always inspect every rendered PNG (or video mid-frame) in isolation before placing it on a DeckCraft slide:
- Check transparency & edge anti-aliasing (no harsh bounding-box seam against the slide background).
- Check that chart labels are crisp, non-overlapping, and at least equivalent to 11–12pt at target slide rect size.
- Check that all colors harmonize with `tokens.json`.
