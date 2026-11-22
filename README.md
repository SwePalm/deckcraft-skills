# DeckCraft Skills (`deckcraft-skills`)

A portable, 100% local **Agent Skills** suite for creating narrative-first, brand-aligned presentations and visual journeys powered by [**DeckCraft**](https://github.com/storytold/deckcraft) instead of LibreOffice/OOXML surgery — informed by Anthropic's Apache-2.0 [`pptx` skill](https://github.com/anthropics/skills/tree/main/skills/pptx), Google's [`DESIGN.md`](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md), and the interactive Coach / Check Report pattern from [`ictv-coach`](https://github.com/SwePalm/ictv-coach).

> **Portability:** All 7 skills live in `skills/` and are symlinked into `.agents/skills/` and `.claude/skills/` so Antigravity, Claude Code, Cursor, and Codex discover them automatically when cloning this repo.

## Architecture (1 Orchestrator + 6 Specialist Skills)

| Skill | Role | Key Scripts / Resources |
| :--- | :--- | :--- |
| [`skills/deck-director`](skills/deck-director/SKILL.md) | **Orchestrator + Creative Coach** (Studio Direction Workbench + Autopilot) | `scripts/build_direction_workbench.mjs`, `resources/direction-workbench-template.html` |
| [`skills/deck-narrative`](skills/deck-narrative/SKILL.md) | **Story Architect** (`NARRATIVE.md`, Perception Contract, Narrative → Experience Format) | `references/narrative-patterns.md` |
| [`skills/deck-brand`](skills/deck-brand/SKILL.md) | **Executable `DESIGN.md` Compiler & `.pptx` Decompiler** (real-world aliases, WCAG, font substitutions, brand guardrails) | `scripts/parse_design_md.mjs`, `scripts/decompile_pptx.mjs` |
| [`skills/deck-art-direction`](skills/deck-art-direction/SKILL.md) | **Just-in-Time Taste Radar & Art Director** (full-canvas lighting, Bento, anti-box-itis) | `references/taste-ledger.md` (with 30-day freshness check + Decay Watchlist) |
| [`skills/deck-visuals`](skills/deck-visuals/SKILL.md) | **Local Visual Studio** (Three.js 3D, D3, looping MP4s, `data-zone` → `zones.json`) | `scripts/render_visual.mjs`, `references/recipes/` |
| [`skills/deck-builder`](skills/deck-builder/SKILL.md) | **DeckCraft Engine & Motion Choreography** | `scripts/deckcraft_runner.mjs` |
| [`skills/deck-eval`](skills/deck-eval/SKILL.md) | **3-Layer QA & Check Report Before Result** (Box-itis, Transition, & executable `DESIGN.md` rule enforcement) | `scripts/lint_deck.mjs`, `scripts/build_review_workbench.mjs`, `resources/review-workbench-template.html` |

## Key Capabilities

- **Narrative-Driven Experience Formats:** The story job chooses the format (*Continuous 3D Camera Journey*, *Film-Edited Beats*, *Infinite Spatial Canvas*, *Editorial Bento*, or *Dual-Artifact Web Story → `.pptx`*) instead of forcing every topic into 1987 `Header + Bullets` slideware.
- **Studio Direction Workbench (v0.4):** Zero-network, direct-save HTML coaching UI with source-generated **Story Angle chips**, same-subject **Visual Style cards** (`Auto-select` default), compact **Delivery / Length / Detail / Language** segmented controls, **Polymorphic Grounding** (`file`, `web`, `chat` sources with progressive disclosure), and an inline **Editable Story Beats** drawer.
- **Executable `DESIGN.md` Enforcement (Brand-Locked Mode):** Drop in any real-world `DESIGN.md` — the workbench auto-reskins candidate directions into your brand palette & geometry, `parse_design_md.mjs` compiles flexible brand keys + declares font substitutions explicitly (never silent), and Gate 1 `lint_deck.mjs` deterministically blocks forbidden accent fills (`forbidden_accent_fill`) and sharp-container violations (`sharp_container_violation`).
- **Anti-Stale Taste Radar:** `skills/deck-art-direction/references/taste-ledger.md` is freshness-checked (30-day TTL) by `npm run check` so design taste stays current.

## Quick Commands

```bash
# 1. Run repo self-check (validates all SKILL.md frontmatter, JS syntax, self-contained HTML)
npm run check

# 2. Run Layer 3 benchmark suite across evals/fixtures/
npm run eval
```

## Local Dependencies
- **Node.js 18+** (`playwright`, `three`, `d3` installed locally in `node_modules/`)
- **`deckcraft-cli` v0.18.1+** (placed in `.tools/` or on `$PATH` or set via `DECKCRAFT_CLI`)
- **`ffmpeg`** (for deterministic H.264 MP4 encoding of looping 3D/Canvas visuals)

See [`PROGRESS.md`](PROGRESS.md) for current milestone status and next-session ideas.
