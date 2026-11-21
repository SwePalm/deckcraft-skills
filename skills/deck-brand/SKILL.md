---
name: deck-brand
description: >
  Align presentations to a brand using DESIGN.md (per google-labs-code/design.md) instead of rigid
  PowerPoint templates. Use when parsing an existing DESIGN.md, creating a new DESIGN.md from a brief
  or brand guidelines, decompiling a legacy .pptx template into a DESIGN.md, validating WCAG color
  contrast, or compiling brand tokens into tokens.json and DeckCraft theme commands.
license: Apache-2.0
---

# Deck Brand (`DESIGN.md` Compiler)

Brand alignment freezes **identity and design rules** (`DESIGN.md`), not rigid placeholder boxes.
A single `DESIGN.md` compiles into a machine-readable `tokens.json` that feeds **both** `deck-builder`
(DeckCraft theme, colors, fonts, radii) and `deck-visuals` (Three.js lighting/materials, D3 charts,
SVG diagrams, shaders) so every slide and custom visual speaks the exact same visual language.

## Three Onboarding Paths → One `DESIGN.md`

1. **User supplies `DESIGN.md`:** Validate and compile directly with `scripts/parse_design_md.mjs`.
2. **User supplies a legacy `.pptx` / `.potx` template:** Run `scripts/decompile_pptx.mjs <file.pptx> --out DESIGN.md` to automatically extract dominant colors, fonts, and slide dimensions into a clean `DESIGN.md` rather than fighting legacy template boxes.
3. **No brand file yet:** Draft a topic-specific `DESIGN.md` following the 8 canonical sections from
   `google-labs-code/design.md`, verify WCAG contrast, and save it alongside the project.

> **Hybrid Dark + Light Decks:** Add an optional `darkColors:` block in `DESIGN.md` frontmatter alongside `colors:` when using cinematic dark cover/focal slides with light analytical slides. `parse_design_md.mjs` automatically approves both palettes in `tokens.approvedHexColors`.

## Canonical `DESIGN.md` Structure

Follow the `google-labs-code/design.md` specification:
- **YAML Frontmatter** (normative machine-readable tokens: `name`, `mode`, `colors`, `typography`, `layout`, `shapes`).
- **Eight Canonical Markdown Sections** (in fixed order; omit only if irrelevant):
  1. `## Overview` — product/brand identity, audience, visual ethos, and anti-patterns.
  2. `## Colors` — palette roles (`background`, `surface`, `text`, `textMuted`, `primary`, `secondary`, `accent`) and WCAG contrast intent.
  3. `## Typography` — heading, body, and mono font families (prefer DeckCraft's bundled OFL fonts like `Inter`, `Poppins`, `Montserrat`, `Playfair Display`, `Merriweather`, `Source Sans 3`, `Source Serif 4`, `Roboto`, `Lato`, `Liberation Mono` unless custom TTF/OTF fonts are loaded via `font.add`).
  4. `## Layout` — safe margins (≥ `36pt` / `0.5"` on DeckCraft's `960×540` canvas), spacing scale, density philosophy.
  5. `## Elevation & Depth` — flat tonal shifts vs. shadows, borders, glow, or 3D depth treatment.
  6. `## Shapes` — corner radius philosophy (`sharp` / `rounded` / `squircle`) and visual motif.
  7. `## Components` — slide cards, stat callouts, diagram nodes, tables, and chart framing rules.
  8. `## Do's and Don'ts` — explicit enforceable rules checked by `deck-eval`.

## Compiling `DESIGN.md`

Run the compiler script (zero external npm dependencies, Node 18+):

```bash
node skills/deck-brand/scripts/parse_design_md.mjs path/to/DESIGN.md --out-dir build/brand
```

This produces:
- `build/brand/tokens.json` — normalized palette, typography, layout, shape tokens, WCAG audit, and parsed `dos`/`donts`.
- `build/brand/theme-commands.txt` — ready-to-run `deckcraft-cli --cmd-file` commands (`design.colors`, `design.fonts`, `design.background`).

## Brand Craft Guardrails

- **Dominance over equality:** 60–70% visual weight on background/surface, 20–30% on primary text/structure, 5–10% on sharp accent.
- **No generic defaults:** Never default to corporate blue or beige/cream unless explicitly specified in `DESIGN.md`.
- **Contrast first:** Body text against `background` and `surface` must meet **WCAG AA (≥ 4.5:1)**; large display titles and UI accents must meet **≥ 3.0:1**. Fix contrast in `DESIGN.md` before building slides.
- **Font availability:** Check bundled DeckCraft fonts first; if the brand requires a custom font file (`.ttf`/`.otf`), register it via `font.add` in `deck-builder`.
