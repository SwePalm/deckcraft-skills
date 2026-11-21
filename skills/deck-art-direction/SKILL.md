---
name: deck-art-direction
description: >
  Act as an Art Director & Just-in-Time Taste Radar for presentations. Researches current
  high-craft presentation, keynote, and editorial visual trends (so taste never goes stale),
  distills domain-specific visual metaphors into TASTE_BRIEF.md, and designs full-canvas
  atmospheric lighting, bento asymmetry, and extreme typographic scale contrast—eliminating
  the "isolated 3D clipart + stacked rectangles" AI look.
license: Apache-2.0
---

# Deck Art Direction (Taste Radar & Full-Canvas Composition)

Technical competence (zero overlaps, clean WCAG contrast) only gets a deck to "corporate ok."
**Art direction** is what makes a room stop and pay attention. Run this skill *after* `deck-narrative`
and `deck-brand`, and *before* `deck-visuals` and `deck-builder`.

## Step 1: Just-in-Time Taste Radar (`TASTE_BRIEF.md`)

Never rely on frozen aesthetic instincts. Before designing a flagship deck:
1. Read `references/taste-ledger.md` and check its `last_verified` date. If it is older than
   `refresh_after_days` (30 days) or the deck enters a brand-new domain, run 1–2 quick live web
   searches on current design-led keynotes and studio showreels (Apple, Stripe, Linear, Vercel,
   Pentagram), update `references/taste-ledger.md` (including its **Decay Watchlist** of retired
   clichés), and stamp today's date.
2. Translate the active craft mechanics and **Domain-Native Visual Motif Playbook** into
   **3–5 domain-specific visual metaphors** for *this* presentation in `TASTE_BRIEF.md`.

## Step 2: Full-Canvas Art Direction Rules (Death to Box-itis)

1. **Ambient Realism Over Flat Hex Fills:**
   - Never leave a hero or focal slide on a flat, lifeless solid hex (`#061527`).
   - Render a **full-bleed 1920×1080 atmospheric backdrop** via `deck-visuals` (Playwright Canvas/SVG/CSS):
     deep obsidian/navy base + soft radial stage-light mesh glow + subtle micro-grain + faint
     domain-specific geometric texture (e.g., bathymetric contours, architectural grid, radial rings)
     with **intentional quiet negative space** reserved for editable DeckCraft typography.
2. **Kill Box-itis (Unboxed Editorial Typography):**
   - Never reflexively wrap every bullet or paragraph in a rounded rectangle.
   - Let **negative space, alignment, and extreme typographic scale contrast** (`96pt` monumental
     numbers paired with `11pt` tracked-out uppercase mono labels and `16pt` crisp body copy)
     carry the hierarchy.
3. **Asymmetric Bento Over Identical Stacked Bars:**
   - When grouping 3–5 items (like 4 executive decisions or 5 pilot patterns), use an **asymmetric
     Bento layout** (varying cell sizes by narrative importance) with **1px gradient edge light**
     (`rgba(255,255,255,0.14)` top catchlight fading down)—never 5 identical horizontal bars.
4. **Hybrid Editable Architecture (`data-zone` → `zones.json`):**
   - Place the full-bleed atmospheric/bento-frame backdrop on the slide as `bg-art` (`rect: [0,0,960,540]`),
     and mark every text container in the backdrop HTML with `data-zone="tile-1" data-pad="24"`.
   - `deck-visuals/scripts/render_visual.mjs` automatically exports `<backdrop>.zones.json` with
     exact `safeRect: [x, y, w, h]` coordinates so `deck-builder` places **100% native editable
     DeckCraft text** inside every Bento tile with zero manual coordinate math.

## Output Artifact: `TASTE_BRIEF.md`
Save `TASTE_BRIEF.md` inside the project folder listing:
- Current craft principles applied (with date of taste check)
- 3–5 domain-specific visual metaphors
- Slide-by-slide visual composition plan (atmospheric backdrop, typography hero, bento vs. negative space)
