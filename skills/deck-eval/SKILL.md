---
name: deck-eval
description: >
  Run 3-layer quality, visual, and narrative evaluations on a DeckCraft presentation and produce
  a Check Report Before Result. Use after building or editing a deck to run Gate 1 deterministic
  linting (margins, overlaps, brand tokens, pixel WCAG contrast, accessibility, spelling), Gate 2
  cold multimodal + narrative perception critique (slides + Morph transition frames), or to produce
  structured fix tickets and the Post-Build Review Workbench.
license: Apache-2.0
---

# Deck Eval (3-Layer QA & Check Report Before Result)

Never hand a deck to the user without running **Gate 1** and **Gate 2** and presenting a concise
**Check Report** *before* the deliverable link.

## Core Verification Rules

1. **Checks belong to the owner:** Never soften, skip, or delete a failing check just to produce a pass.
2. **3-attempt escalation:** If the same `Blocks signing` defect fails 3 fix attempts, stop and ask the user with the exact evidence instead of silently lowering the bar.
3. **Explicit `"Not checked:"` boundary:** Every Check Report MUST state what was *not* verified (e.g., live playback in Microsoft PowerPoint on Windows, spoken timing with the presenter's voice, custom font availability on another machine).
4. **Fresh eyes for Gate 2:** Run the visual & narrative critic in a fresh context (or subagent) that did *not* write the deck commands, so it judges what actually rendered rather than what the builder intended.

## Gate 1: Deterministic Linting (Run First)

Run the zero-dependency linter against the built `.deckcraft` (or `.pptx`) and `tokens.json`:

```bash
node skills/deck-eval/scripts/lint_deck.mjs build/output/my-deck.deckcraft \
  --tokens build/brand/tokens.json \
  --mode live \
  --out-dir build/eval
```

Gate 1 deterministically checks:
- **Canvas bounds & safe margins** (excluding intentional full-bleed shapes named `bg-*`).
- **Text-shape bounding-box collisions** (distinguishing accidental overlaps from intentional card containment).
- **Placeholder / leftover text** (`TODO`, `TBD`, `lorem ipsum`, `[insert ...`).
- **Typography floors & font compliance** (no text `< 10pt`, body `< 14pt`, font families in `DESIGN.md`).
- **Brand palette compliance** (fills & text colors checked against `tokens.approvedHexColors`).
- **Pixel-level WCAG contrast** using DeckCraft's `slide.colorAt` eyedropper on the actual rendered canvas.
- **Word density** (`live` vs `preread` budget from `DESIGN.md`) and title punctuation hygiene.
- **DeckCraft native reviews** (`review.accessibility` and `review.spelling`).

It writes `build/eval/check-report.json` and `build/eval/CHECK_REPORT.md`. Fix all `Blocks signing`
issues before moving to Gate 2.

## Gate 2: Cold Multimodal & Narrative Critic

Inspect **every** rendered slide PNG (`build/output/slides/slide-*.png`) and **every** Morph/transition
frame (`build/output/transitions/slide-*-t*.png`) alongside `NARRATIVE.md` and `DESIGN.md`.

Score each dimension `1–5` (any score `< 4` emits a concrete fix ticket with `slide`, `shapeId/name`,
and exact change):

1. **Narrative Perception Fidelity (Guiding Light):** Reading the slides cold as the target audience,
   do you walk away believing/feeling/wanting to do what `NARRATIVE.md`'s **Perception Contract** promised?
2. **3-Second Scannability & Hierarchy:** Is the primary takeaway on each slide obvious within 3 seconds?
3. **Brand Fidelity:** Does the deck genuinely embody `DESIGN.md`—including its `Do's and Don'ts`?
4. **Aesthetic Craft, Depth & Motion Coherence (2026 Bar):** Whitespace, alignment, visual depth,
   dark/light pacing, and smooth Morph transitions. **Hard scoring cap:** a flat deck made mostly of
   rounded rectangles with text inside can NEVER score above `3/5` here—require genuine bespoke
   visuals (Three.js 3D, UI mockups, editorial D3 charts, or looping motion) on ≥50% of slides.
5. **Legibility & Visual Artifacts:** Text wrapping, orphan words/units (`"26"` on one line, `"M"` on the next),
   contrast over 3D/video visuals, crispness.

## Check Report Format

Always summarize findings in three severity tiers + explicit boundary:
- **Blocks signing:** Must be fixed before delivery (overlap, clipping, contrast fail, off-narrative slide, placeholder text).
- **Fix if time:** Meaningful craft improvements (minor spacing asymmetry, slightly dense slide, missing speaker notes).
- **Cosmetic:** Optional polish (title trailing period, tiny alignment nudge).
- **Not checked:** Explicit list of what this run did *not* verify.
