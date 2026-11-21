---
name: deck-narrative
description: >
  Architect the story, audience perception contract, and slide-by-slide thesis of a presentation
  before any slide or visual is built. Use at the start of any new deck or deck makeover to produce
  NARRATIVE.md, select the right narrative arc (Keynote, Pyramid, SCQA, Tech Walkthrough, Pitch),
  and justify every planned visual or Morph transition in service of the story.
license: Apache-2.0
---

# Deck Narrative (Story Architect)

Narrative is the guiding light. Cool 3D renders, shaders, and Morph transitions only make a deck
great when they sharpen the audience's understanding and emotional takeaway. Every deck starts by
locking **`NARRATIVE.md`** before touching `deck-visuals` or `deck-builder`.

## What `NARRATIVE.md` Must Contain

Write `NARRATIVE.md` with four required sections:

1. **Audience & Delivery Mode**
   - Who is in the room (executives, engineers, investors, customers)?
   - Delivery mode: `live` (presenter speaks; slides stay under ~40 words and carry visual punch) or
     `preread` (read solo/async; slides carry complete takeaways up to ~100 words).
   - Target runtime & slide budget (~1.5–2 min per slide for `live` decks).

2. **Perception Contract (Feeds `deck-eval` Gate 2!)**
   - **Think:** What single thesis must the audience believe by the end?
   - **Feel:** What emotional tone should the deck evoke (e.g., *calm technical authority*, *urgent momentum*, *editorial clarity*)?
   - **Do:** What concrete decision or action should happen right after the last slide?
   - **Anti-Perception (Never feel like):** 2–3 things this deck must *not* feel like (e.g., *hype-y AI slop*, *dense spreadsheet dump*, *generic corporate pitch*).

3. **Narrative Job → Experience Format (Break Default Slide Grammar)**
   Never assume every story belongs in `Kicker + Header + Content Box` slides. Let the **Narrative Job**
   select the **Experience Format**:
   - **Discovery & Intuition** *(scientific breakthrough, mystery, "how it really works")* → **Continuous 3D Camera Journey + Film Beats** (one living 3D world, zero slide headers, camera fly-throughs between stops).
   - **Product Reveal / Vision Shift** → **Film-Edited Documentary Beats** (wide atmospheric shot → monumental `120pt+` tension stat → live animated demo → quiet close).
   - **Complex System / Strategy** → **Infinite Spatial Canvas** (one unified map panning & zooming into subsystems via Morph).
   - **Executive Decision / Pre-Read** → **Editorial Magazine / Asymmetric Bento** (Pyramid arc, D3 data-viz, crisp decisions).
   - **Self-Paced Exploration** → **Dual-Artifact Interactive Web Story → Compiled `.pptx`**.

   Also pick the **Story Arc** (see `references/narrative-patterns.md`):
     - **Pyramid (Exec / Decision):** Answer first → supporting pillars → evidence → decision/next steps.
     - **SCQA (Strategic / Pitch):** Situation → Complication → Question → Answer + Proof.
     - **Keynote Tension-Release:** Status quo → Crack/Insight → New World → Proof/Demo → Call to Adventure.
     - **Technical Walkthrough:** Problem/Constraint → System Mental Model → Morph Zoom into Subsystems → Trade-offs & Results.

4. **Slide-by-Slide Storyboard Table**
   For every slide, specify:
   - **Slide # & Role** (Title, Tension, Pillar Overview, Morph Zoom, Data Proof, Architecture, Close)
   - **Headline (Thesis, not a topic label):** e.g., *"Morph turns static architecture into guided focus"* rather than *"Architecture Overview"*. Never end headlines with a period.
   - **Core Point & Speaker Notes Cue:** What the audience reads vs. what the presenter says.
   - **Visual / Motion Justification:** *Why* this slide uses a Morph transition, Three.js 3D visual, editorial chart, or pure typography. If a visual doesn't clarify or elevate the thesis, cut it.

## Narrative Guardrails

- **One message per slide.** If a slide has two competing claims, split it into two slides.
- **No orphan slides.** Read only the slide headlines in sequence—they should tell the entire story from start to finish without gaps.
- **Earn every visual.** Every 3D object, chart, or Morph move must answer: *"What does the audience understand faster or feel more deeply because this is here?"*
