---
name: "Nordic Slate — Technical Keynote"
mode: "dark"
colors:
  background: "#0B1326"
  surface: "#15223B"
  surfaceAlt: "#1E3052"
  text: "#F8FAFC"
  textMuted: "#94A3B8"
  primary: "#38BDF8"
  secondary: "#818CF8"
  accent: "#34D399"
  warning: "#F59E0B"
  danger: "#F43F5E"
  extra: "#A78BFA"
typography:
  headingFont: "Inter"
  bodyFont: "Inter"
  monoFont: "Liberation Mono"
  titleSizePt: 40
  sectionSizePt: 24
  bodySizePt: 16
  captionSizePt: 11
layout:
  slideWidthPt: 960
  slideHeightPt: 540
  marginPt: 48
  gapPt: 24
  maxWordsLiveSlide: 40
  maxWordsPrereadSlide: 100
shapes:
  cornerRadiusPt: 14
  smoothCorners: 65
  style: "squircle"
---

## Overview
Editorial dark-mode keynote identity for technical founders, engineers, and product leaders.
Built for clarity in a live room: calm deep-navy surfaces, crisp high-contrast typography,
and luminous cyan/emerald accents reserved strictly for focal insights and data highlights.

## Colors
- **Background (`#0B1326`)**: Deep Nordic midnight canvas (~65% of visual area).
- **Surface (`#15223B`)**: Elevated cards and diagram containers via tonal shift rather than heavy borders.
- **Text (`#F8FAFC`)** & **Muted (`#94A3B8`)**: Crisp legibility exceeding WCAG AA on both background and surface.
- **Primary (`#38BDF8`)** & **Accent (`#34D399`)**: Used sparingly for the single focal takeaway, key metric, or active node.

## Typography
- **Headlines (`Inter`, 36–44pt Bold)**: Short, thesis-driven statements—never end titles with a period.
- **Body (`Inter`, 15–18pt Regular)**: Left-aligned, generous line spacing (1.25–1.35x).
- **Code & Metrics (`Liberation Mono`)**: Used for technical identifiers and tabular callouts.

## Layout
- 960×540 widescreen canvas with a strict `48pt` outer safe margin and `24pt` minimum gutter between blocks.
- Live keynote density: aim for under 40 words per slide and at least 35% open breathing room.

## Elevation & Depth
- Prefer tonal surface layering (`#0B1326` → `#15223B` → `#1E3052`) with subtle `1pt` translucent dividers over harsh drop shadows.
- Reserve 3D depth and luminous glow for hero visuals and focal diagram nodes.

## Shapes
- Smooth squircle cards (`smoothCorners: 65`) for structured callouts and visual frames.
- Never mix sharp 90° cards and pill-rounded cards on the same slide.

## Components
- **Stat Callouts**: 56–64pt bold primary-colored figure paired with a crisp 13–14pt muted label below.
- **Diagrams**: Clean nodes on `surface` fill with `primary` highlight on the active element; use Morph transitions to step through complex flows.

## Do's and Don'ts
- **Do** give every slide one clear focal point and let whitespace frame it.
- **Do** use Morph transitions when zooming into or evolving a visual concept across consecutive slides.
- **Don't** place decorative accent lines under slide titles or vertical color stripes on card edges.
- **Don't** crowd more than 3 content blocks onto a single live-keynote slide.
- **Don't** use unapproved colors outside the YAML palette or shrink body text below 14pt.
