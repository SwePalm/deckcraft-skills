# Presentation Skill — Architecture & Progress Log

> Persistent project memory so work can pause and resume cleanly across sessions.

## Vision
Build a portable, open-source **Agent Skills** suite (following the Agent Skills spec) for creating narrative-first, brand-aligned, high-craft presentations powered by **DeckCraft** (`storytold/deckcraft`) instead of LibreOffice/OOXML surgery.

### Core Design Principles
1. **Narrative is the guiding light:** Every visual, 3D scene, and Morph transition exists to serve the story and desired audience perception (`NARRATIVE.md` + Perception Contract).
2. **`DESIGN.md` over rigid templates:** Brand alignment uses Google's `DESIGN.md` spec (YAML design tokens + 8 canonical markdown sections) compiled into a shared `tokens.json` consumed by DeckCraft *and* all visual generators.
3. **100% local & deterministic first:** DeckCraft (`deckcraft-cli` v0.18.1) + local Node/Playwright/Three.js/D3/`ffmpeg`. No cloud dependencies required (extension points kept clean for future optional cloud media).
4. **Coach Pattern (Recognition over Recall):** Inspired by `SwePalm/ictv-coach` — 2 optional interactive single-file HTML workbenches (Pre-Build `direction-workbench.html` and Post-Build `review-workbench.html`), plus full **Autopilot Mode** for headless runs and benchmarks.
5. **3-Layer Evals & Check Report Before Result:**
   - **Gate 1:** Deterministic linter (geometry, overlaps, safe margins, token compliance, pixel WCAG contrast via `slide.colorAt`, `review.accessibility`, `review.spelling`).
   - **Gate 2:** Cold-context Multimodal & Narrative Perception Critic (rendered 2x PNGs + `render-transition` Morph strips scored against `NARRATIVE.md`).
   - **Layer 3:** Benchmark suite (`evals/`) to measure skill quality across diverse prompts & brands.
   - Always reports `Blocks signing`, `Fix if time`, `Cosmetic`, and explicit `Not checked:`.

---

## Skill Suite Map (`skills/`)
- [x] `skills/deck-director/` — Orchestrator + Coach + `direction-workbench.html`
- [x] `skills/deck-narrative/` — Story Architect → `NARRATIVE.md` + Perception Contract
- [x] `skills/deck-brand/` — `DESIGN.md` parser/validator/decompiler → `tokens.json` + DeckCraft theme
- [x] `skills/deck-art-direction/` — Just-in-Time Taste Radar (`taste-ledger.md` + Decay Watchlist) & Full-Canvas Composition Director
- [x] `skills/deck-visuals/` — Local Visual Studio (Playwright + Three.js / D3 / SVG + `ffmpeg` + `data-zone` → `zones.json` auto-export)
- [x] `skills/deck-builder/` — DeckCraft engine runner, Motion & Morph choreography, anti-flatness craft
- [x] `skills/deck-eval/` — Gate 1 deterministic linter (incl. Box-itis & Transition Monotony guards) + Gate 2 cold critic + `review-workbench.html`

---

## Milestones

### Milestone 1: Deterministic Backbone (Complete ✓)
- [x] Verify `deckcraft-cli` v0.18.1 locally (`.tools/deckcraft-cli-0.18.1-macos-universal/deckcraft-cli`)
- [x] Fetch ground-truth references (`references/anthropic-pptx/SKILL.md`, `references/deckcraft-commands.txt`)
- [x] Repo foundation (`.gitignore`, `package.json`, `PROGRESS.md`)
- [x] `skills/deck-brand/` (`SKILL.md`, `scripts/parse_design_md.mjs`, example `DESIGN.md`)
- [x] `skills/deck-builder/` (`SKILL.md`, `scripts/deckcraft_runner.mjs`)
- [x] `skills/deck-eval/` (`SKILL.md`, `scripts/lint_deck.mjs` Gate 1 linter + Check Report)
- [x] `tools/check.mjs` (repo self-check)
- [x] End-to-end Milestone 1 smoke test (3-slide Morph deck + 2x PNGs + `render-transition` Morph strips + `.pptx` export + Gate 1 Check Report)

### Milestone 2: Narrative, Visual Studio & Orchestrator (Complete ✓)
- [x] `skills/deck-narrative/` (`SKILL.md`, `references/narrative-patterns.md`)
- [x] `skills/deck-visuals/` (`SKILL.md`, port-free `scripts/render_visual.mjs` + Three.js 3D orb & D3 editorial chart recipes + Playwright/Chromium + `ffmpeg` MP4 loop verified in DeckCraft)
- [x] `skills/deck-director/` (`SKILL.md`, interactive Coach Mode + zero-stop Autopilot Mode)

### Milestone 3: Interactive Coaching Workbenches & Layer 3 Benchmarks (Complete ✓)
- [x] `skills/deck-director/resources/direction-workbench-template.html` + `build_direction_workbench.mjs` (self-contained, zero-network, includes "Provide Your Own DESIGN.md" picker)
- [x] `skills/deck-eval/resources/review-workbench-template.html` + `build_review_workbench.mjs` (embeds Check Report + slides + transition strips + Miss Tagging)
- [x] `tools/serve_workbench.mjs` — zero-dependency local server enabling one-click direct save into the project folder (zero copy/paste)
- [x] `evals/` Layer 3 benchmark suite (`01-nordic-keynote`, `02-editorial-exec-review`, `evals/run_eval.mjs`) — both fixtures PASS in `< 0.8s` each
- [x] `tools/check.mjs` expanded to validate all 17 files including HTML workbench self-containment
- [x] **Real-World End-to-End Validation (Enterprise Steering-Committee Deck):** Full `deck-director` Coach loop on an 8-slide 2026 3D Spatial Edition (2 looping Three.js MP4s, 4 Three.js 3D scenes, 3D glassmorphic product UI mockup, dark-glass D3 runway, audience-tuned transitions & builds), Gate 1 PASS, user-approved via Review Workbench (`review-decision.json`: `"approved": true`).
- [x] Systemic upgrades baked back into skills from real test feedback: **Anti-Flatness Rule** + **Motion & Transition Choreography** in `deck-builder/SKILL.md`, **3/5 flat-deck scoring cap** in `deck-eval/SKILL.md`, and **Pre-Flight Brand Check (Never Assume `DESIGN.md`)** in `deck-director/SKILL.md`.

---

## v0.2 Systemic Upgrades (Complete ✓)
- [x] **Dual-Mode `DESIGN.md` (`colors:` + `darkColors:`):** Updated `parse_design_md.mjs` + `deckcraft_runner.mjs` (respects per-slide `design.background`) so hybrid dark+light keynote decks pass Gate 1 with `0` brand-color or contrast false positives.
- [x] **Legacy `.pptx` → `DESIGN.md` Decompiler:** Added `skills/deck-brand/scripts/decompile_pptx.mjs` and verified roundtrip into `parse_design_md.mjs`.
- [x] **Promoted Generalized 2026 3D Recipes:** Added brand-tokenized `three-isometric-layers.html`, `three-ascending-steps.html`, and `three-orbital-flywheel.html` to `skills/deck-visuals/references/recipes/`.
- [x] **Linter Accuracy Fix (`lint_deck.mjs`):** Fixed `slide.colorAt` sampling on zero-margin text boxes so anti-aliased glyph edges never trigger false contrast failures.
- [x] **Layer 3 Benchmark Fixture 03 (`03-hybrid-3d-keynote`):** `3/3` fixtures PASS (`0` Blocks, `0` Fix if time on Fixtures 02 & 03).

## v0.3 Narrative-Driven Experience Formats & Art Direction (Complete ✓)
- [x] **`skills/deck-art-direction/`:** Created 7th specialist skill with timestamped Living Taste Ledger (`references/taste-ledger.md`), Decay Watchlist (retired AI clichés), and Domain-Native Visual Motif Playbook; freshness enforced by `tools/check.mjs`.
- [x] **Zero-Math CSS Bento → DeckCraft Alignment (`data-zone` → `.zones.json`):** Upgraded `render_visual.mjs` to auto-export pixel-exact `box` and `safeRect` coordinates for every `[data-zone]` element.
- [x] **Deterministic Craft Guards in `lint_deck.mjs`:** Added `visual_richness` (Anti-Box-itis) and `transition_monotony` checks directly to Gate 1.
- [x] **Narrative → Experience Format Routing:** Updated `deck-narrative/SKILL.md` and `deck-director/SKILL.md` so the narrative job chooses the format (*Continuous 3D Camera Journey*, *Film-Edited Beats*, *Infinite Spatial Canvas*, *Editorial Bento*, or *Dual-Artifact Web Story → `.pptx`*) instead of defaulting to 1987 `Header + Bullets` slide grammar.
- [x] **Real-World Validation (`projects/riemann-2026/` & `projects/riemann-journey/`):**
  - Built & verified 7-slide Cosmic Harmonics Bento explainer (`projects/riemann-2026/`) with `data-zone` auto-alignment.
  - Built & user-approved (`"approved": true`) 4-shot **Zero-Slide-Grammar Continuous 3D Camera Journey** (`projects/riemann-journey/output/riemann-3d-journey.pptx`) — one living Three.js 3D world with 4 continuous camera fly-through MP4s and native editable typography.

## v0.4 Studio-Grade Direction Workbench UX (Complete ✓)
- [x] **Source-Generated Story Angle Chips:** Clickable narrative lenses derived from files, web research, or conversation context + custom angle input; selecting an angle highlights the recommended Experience Format.
- [x] **Same-Subject Visual Style Carousel + `Auto-select`:** Inline zero-network SVG thumbnails (`Auto-select`, `3D Camera Journey`, `Dark-Glass Bento`, `Editorial Monograph`, `Cinematic Film Beats`, `Spatial Blueprint`) so users choose visual grammar at a glance.
- [x] **Compact Segmented Controls:** `Delivery` (`Live Stage` | `Pre-read`), `Length` (`Short` | `Standard` | `Deep`), `Detail` (`Concise` | `Standard` | `Detailed`), and `Language` selector.
- [x] **Polymorphic Grounding / Sources:** Handles `file`, `web`, and `chat` sources with progressive disclosure (interactive checklist for 2+ sources, quiet grounding badge for 1 source, hidden for 0).
- [x] **Editable Story Beats Drawer:** Toggleable inline beat preview/editor before saving directly to `NARRATIVE.md`, `DESIGN.md`, and `direction-decision.json`.
- [x] **Executable `DESIGN.md` Enforcement & Brand-Locked Mode:**
  - Live client-side `DESIGN.md` parsing & Brand-Locked re-skinning in `direction-workbench-template.html`.
  - Flexible real-world `DESIGN.md` compiler in `parse_design_md.mjs` (inline YAML objects, color aliases like `beige`/`pale-blue`, declared `fontSubstitutions`, `brandRules.accentOnlyHexes`, `brandRules.sharpContainers`, and `conformanceChecklist` extraction).
  - Gate 1 enforcement in `lint_deck.mjs` (`forbidden_accent_fill` blocks signing on large/text-bearing accent fills; `sharp_container_violation` catches rounded/smooth containers when `0px` is required; declared font substitutions printed in `CHECK_REPORT.md`).

## Ideas for Next Session (v1.0 Packaging)
- Add `tools/setup.mjs` one-command bootstrapper to download the right `deckcraft-cli` binary for macOS/Linux/Windows + install Playwright Chromium.
- Add `lint_deck.mjs` awareness for `camera_journey` mode (so intentional `cut` transitions between full-bleed 3D fly-through MP4s aren't flagged as `transition_monotony`).
- Promote the 4-shot 3D Camera Journey rig into a parameterized recipe in `skills/deck-visuals/references/recipes/`.
