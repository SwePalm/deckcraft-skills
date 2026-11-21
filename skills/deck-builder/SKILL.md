---
name: deck-builder
description: >
  Build, edit, and render presentations natively in DeckCraft (deckcraft-cli or DeckCraft MCP)
  from a storyboard, brand tokens.json, and optional local visual assets. Use when generating
  DeckCraft command scripts, choreographing Morph transitions and animations, embedding PNG/MP4
  visuals, or exporting .deckcraft, .pptx, PDF, and 2x QA renders.
license: Apache-2.0
---

# Deck Builder (DeckCraft Engine & Choreography)

Build presentations using DeckCraft's engine-first command model (`960×540` pt widescreen canvas,
origin top-left, `x` right, `y` down, `rect: [x, y, width, height]`). Never write brittle OOXML
or LibreOffice pipelines—every slide, shape, transition, animation, and media embed is a clean,
deterministic DeckCraft command.

## Execution Model

Write a UTF-8 command file (`deck-commands.txt`, one `command={json}` per line, `#` comments allowed)
and run it through `scripts/deckcraft_runner.mjs`:

```bash
node skills/deck-builder/scripts/deckcraft_runner.mjs \
  --theme build/brand/theme-commands.txt \
  --commands build/deck-commands.txt \
  --out-dir build/output \
  --name my-deck \
  --export-pptx
```

This produces:
- `build/output/my-deck.deckcraft` (full native fidelity)
- `build/output/my-deck.pptx` (optional PowerPoint exchange)
- `build/output/slides/slide-01.png ...` (2x retina PNGs for `deck-eval`)
- `build/output/transitions/slide-NN-t0.250.png ...` (automatic Morph/transition frames for QA)
- `build/output/build-manifest.json` (paths & slide metadata for `deck-eval`)

### Live Co-Editing Mode (Optional)
If the user is running the DeckCraft desktop app with `deckcraft --control 7990`, connect via
`deckcraft-cli mcp --connect 127.0.0.1:7990` so edits appear live in the GUI with shared undo history.

## DeckCraft Command Essentials

- **Start clean:** `file.new={"blank":true}` followed by `theme-commands.txt` (`design.colors`, `design.fonts`, `design.background`), then `slide.new={"layout":"blank"}` for full compositional control.
- **Selection rule:** Inserting a shape (`shape.insert`, `insert.textBox`, `insert.picture`, `insert.video`) automatically selects it; subsequent `shape.fill`, `shape.line`, `shape.smoothCorners`, `shape.effects`, `format.*`, `shape.rename` act on the newly inserted shape.
- **Squircles & Depth:** Always pass an explicit `radius` with `shape.smoothCorners={"smoothing":65,"radius":14}` on `roundRect` cards (omitting `radius` produces overly large pill-like corners). Use `shape.effects` for subtle shadows, glow, or native `threeD` camera/extrusion.
- **Text Formatting:** Always set explicit `format.fontDialog` (`family`, `size`, `bold`, `color`), `format.align`, `format.anchor`, `format.margins`, and `format.lineSpacing` so text never relies on ambiguous defaults.
- **Media Embedding:**
  - Transparent 3D stills / diagrams / charts: `insert.picture={"path":"...","rect":[x,y,w,h]}`
  - Looping 3D / shader / motion clips: `insert.video={"path":"...","rect":[x,y,w,h]}` followed by `media.options={"autoplay":true,"loop":true,"volume":0}`
- **Speaker Notes:** Always place spoken narrative cues in `slide.notes={"text":"..."}`, never crammed onto the slide canvas.

## Motion & Transition Choreography Rules

Never put the same `fade` transition on every slide—choreograph transitions to match the **narrative shift** and **audience tone** (restrained & spatial for executives; never gimmicky like `airplane`/`origami` in a boardroom):
- **Dark-to-light reveal:** `uncover` (`u`) or `reveal` (`smoothlyLeft`) to lift the curtain into an analytical frame.
- **Forward progression / timeline:** `push` (`l`) or `pan` (`r`) to create forward momentum across sequential chapters.
- **Concept → Product / Detail:** `zoom` (`in`) to dive from high-level strategy into a concrete UI mockup or data deep-dive.
- **Morph choreography (matched shapes across Slide N → N+1):**
  1. Name matched shapes identically (`shape.rename`) or duplicate the slide (`slide.duplicate`).
  2. Avoid crossing trajectories (keep morphed elements on clean, non-crossing paths).
  3. Set `transition.set={"kind":"morph","duration":750}` on the destination slide.
- **Purposeful on-slide builds:** Use subtle staggered `animation.add` (`fade` / `fly` with `afterPrevious` or `withPrevious` + `120–180ms` delay) on stacked layers, roadmaps, or decision asks so the audience's eye follows the spoken story.
- **Verify motion in QA:** `deckcraft_runner.mjs` automatically runs `deckcraft-cli render-transition` at `t=0.25, 0.50, 0.75` so `deck-eval` inspects every mid-transition frame.

## Anti-Slop Craft Rules (Non-Negotiable)

Adapted from Anthropic's Apache-2.0 `pptx` craft standards for DeckCraft:
- **Strict safe margins:** Keep all content inside `marginPt` (default `48pt` on `960×540` → safe box `x: 48..912`, `y: 44..496`) unless intentionally using a full-bleed background visual.
- **Minimum gutters:** At least `20–24pt` between sibling cards/columns; leave ≥35% open breathing room on live slides.
- **Consistent title anchor:** Content slides of the same type place their title at the exact same `(x, y)`, font, size, and alignment. Never end slide titles with a period.
- **Typography floors:** Titles `34–44pt` bold; section headers `20–26pt` bold; body `14–18pt` (never `<14pt`); captions `10–12pt` (never `<10pt`). Left-align body text; center only titles or stat callouts.
- **NEVER use AI-slop filler:**
  - No decorative accent underlines under titles.
  - No vertical color bars or thin accent stripes along card edges or slide margins.
  - Use tonal surface shifts (`surface` vs `background`), whitespace, typography scale, or genuine visuals instead.
- **Vary layouts across consecutive slides:** Never repeat the exact same grid/column structure back-to-back unless intentionally animating a Morph progression.
- **Anti-Flatness Rule (2026 Visual Standard):** Never ship more than 2 consecutive text-in-cards slides. At least 50% of slides in a flagship deck must feature a genuine bespoke visual from `deck-visuals` (Three.js 3D scene/loop, isometric glass architecture, high-DPI product UI mockup, or editorial D3 data-viz). Use dark/light contrast pacing (cinematic dark cover & focal moments paired with crisp analytical slides) rather than 8 identical pale backgrounds.
- **One focal point per slide:** Every slide earns its place by advancing the `NARRATIVE.md` thesis.
