---
last_verified: 2026-11-21
refresh_after_days: 30
sources:
  - "Apple / Stripe / Linear / Vercel keynote & product launch craft"
  - "2026 presentation & editorial design synthesis"
---

# Living Taste Ledger & Decay Watchlist

> **Freshness Rule:** `tools/check.mjs` checks `last_verified` against `refresh_after_days`. When stale,
> run a quick live web research pass on current design-led keynotes and studio showreels before
> designing a flagship deck, then update this ledger and date stamp.

---

## 1. Active High-Craft Mechanics (Steal These)

### A. Ambient Realism & Stage Lighting (Never Flat Hex)
- **Canvas base:** Rich deep obsidian/midnight (`#040B16`–`#0A0D14`) or tactile warm/cool paper (`#F4F7FA`–`#FAF9F6`), never default `#000000` or generic `#FFFFFF` void.
- **Overhead / radial stage light:** Soft heavily-blurred radial gradient at `(50%, -8%)` or behind the primary 3D subject (`rgba(primary, 0.18–0.24)` fading to `0` by `68–76%`).
- **1px Catchlight Borders:** Glass containers use `border: 1px solid rgba(148,176,204,0.16)` + `box-shadow: 0 1px 0 rgba(255,255,255,0.12) inset` so light visibly catches the top edge.
- **Micro-grain:** `3–4%` subtle dot/noise texture across dark atmospheric canvases eliminates cheap digital gradient banding.

### B. Typography as Architecture (Kill Box-itis)
- **Extreme scale contrast:** Pair monumental tabular numerals (`36–96pt` bold) or tight-tracked display headlines (`40–52pt`, line-height `1.06–1.12`) with `10–11pt` tracked-out uppercase monospace labels (`Liberation Mono`, `letter-spacing: 0.08em`).
- **Unboxed grouping:** Separate key metrics or takeaways with a single fading luminous hairline (`1px`) and generous negative space rather than wrapping every metric in a rounded rectangle.

### C. Asymmetric Bento Architecture
- Weight container size to narrative importance (e.g., `grid-template-columns: 1.35fr 1fr 1fr` with a 2-row primary hero tile and a 2-column closing callout tile).
- Mark every Bento tile with `data-zone="tile-name" data-pad="24"` so `render_visual.mjs` auto-exports exact DeckCraft `[x, y, w, h]` safe coordinates into `.zones.json`.
- Use monumental low-opacity ghost numerals (`72–112pt`, `5–10%` opacity) anchored in the bottom-right corner of Bento tiles for editorial depth.

---

## 2. Decay Watchlist (Retired Clichés — Do NOT Use)

| Retired Pattern | Why It Feels Dated / "AI" | What to Do Instead |
| :--- | :--- | :--- |
| **Purple-pink neon AI gradients** | Overused across 2023–2024 SaaS/AI templates | Domain-authentic palettes from `DESIGN.md` with restrained radial stage light |
| **Generic glowing wireframe orb (ungrounded)** | Reads like a Three.js starter tutorial | Ground 3D geometry in a domain motif (e.g., shipping arcs + radar rings + coordinates) |
| **Accent bar / underline under slide titles** | #1 tell of AI-generated slideware | Whitespace, typographic scale contrast, and mono kickers |
| **4–5 identical stacked rounded rectangles** | Flat corporate list disguised as boxes | Asymmetric Bento grid OR unboxed editorial layout with hairline dividers |
| **Monotonous `fade` on every slide** | Flattens narrative rhythm | Audience-tuned motion arc (`uncover`, `push`, `zoom`, `reveal`, `pan`, `morph`) |

---

## 3. Domain-Native Visual Motif Playbook

Anchor every deck in **1–2 subtle motifs** drawn from the audience's real world:
- **Maritime / Energy / Logistics:** Subtle bathymetric contour lines, quiet radar sweep arcs, geographic coordinates (`59.91° N`), crisp signal-flag status pills.
- **Finance / Board / Executive:** Fine editorial newspaper rules, monumental tabular figures, crisp paper grain, minimalist single-accent D3 charts (no gridline clutter).
- **Software / Platform / AI Infrastructure:** Isometric translucent glass layer stacks, luminous vertical data conduits, 3D-angled dark-glass product UI stages.
- **Product Launch / Consumer:** Full-bleed stage-lit hero hardware/UI renders, immense negative space, kinetic single-sentence slides, Morph zooms into product details.
