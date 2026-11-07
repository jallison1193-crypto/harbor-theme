# Fathom design notes

## Idea
Deep water at night. The interface is glass floating above a dark sea, lit from below by slow currents and by whatever you are watching. The one bold thing is depth: glass that sits at a real angle and catches light from the pointer. Everything else stays quiet.

## Palette
| Name | Hex | Role |
|---|---|---|
| Abyss | `#05080e` | Wallpaper base |
| Trench | `#070b12` | Harbor canvas token |
| Hull | `#131b29` | Raised surfaces |
| Foam | `#eef3fa` | Primary text |
| Brine | `#a5b1c4` | Secondary text |
| Biolume | `#6fe3d0` | Default accent |

Accent options are named for the subject: Biolume teal, Sonar blue, Jelly lilac, Lure amber, Coral, Pearl.

## Type
- **Newsreader** (optical-size serif) for featured titles: reads like film credits, and its optical sizing keeps it sharp at 68px.
- **Hanken Grotesk** for all interface text.
- "All sans" and "Harbor's fonts" are offered for people who prefer them.

## Decisions made against the generic default
- Accent moved from sky blue (the stock "glass UI" color) to a bioluminescent teal tied to the deep-water subject.
- No tracked-out all-caps labels. Section titles in the panel are sentence case.
- Instrument Serif and Geist (from the mockup) replaced: both are the current default picks.
- No decorative entrance animations. Motion answers the pointer (tilt, light, magnification) or is the slow wallpaper current, which can be turned off.
- The settings panel uses denser glass than the chrome and no tilt, so text stays crisp over bright artwork.

## Spacing scale
Every gap, padding and margin in Fathom's own UI comes from five steps, set as variables in `src/theme.css`:

| Token | Value | Used for |
|---|---|---|
| `--fx-s1` | 4px | Gaps between dock icons and between segmented-control options, padding inside tracks |
| `--fx-s2` | 8px | Dock padding, gap between icon and label, button and row gaps, tooltip padding |
| `--fx-s3` | 12px | Padding inside cards and nav items, distance of floating chrome from the window edge, tooltip offset |
| `--fx-s4` | 16px | Panel margins (header, tabs, body all line up on it), menu bar side padding, first-run card padding |
| `--fx-s5` | 24px | Space above a panel section, hero card padding, gap between the sidebar and page content |

Text uses explicit line heights (16px for 12 to 13px labels, 20px for 14px labels) so controls built from the scale come out at even heights: segmented options and tabs 28px, panel buttons 32px, menu bar buttons 28px.

## Radius hierarchy
Corners step down as surfaces nest, so an inner shape never looks rounder than the thing holding it.

| Token | Value | Used for |
|---|---|---|
| `--fx-r-lg` | 22px (the Corner roundness setting) | Settings panel, sidebar, first-run card |
| `--fx-r-md` | 12px | Cards, look and color tiles, tab and segmented tracks, sidebar items, nav rows, stat box |
| `--fx-r-sm` | 8px | Anything inside a 12px track (tabs, segment options), buttons, inputs, tooltips, menu bar links |
| `--fx-r-xs` | 4px | Sliders' tracks, keyboard hints |
| `--fx-r-pill` | 999px | Dock, island and its items, toggles. Dock icons and the dock's selection pill are circles |

The hero card uses 24px inside Harbor's 28px banner. A track with 4px padding and 12px corners holds 8px-cornered options, which keeps the inner and outer curves parallel.

## 1.1: Liquid Glass and color themes
- The glass moved from frosted acrylic to liquid glass: low blur, little frost, strong saturation, a bright rim that turns toward the pointer, darker thickness along the far edge, and real refraction at the edges on Chromium.
- The dock lost its per-icon tiles. Glyphs sit on the glass; the current page gets a glass pill that flows to the next page with a slight stretch.
- Chrome no longer tilts in 3D. Tilted text went soft and tooltips skewed. Depth now lives in the banner and posters, where there is no small text.
- Color themes ("waters") recolor Harbor's own 12 tokens from one hue and a strength, so every Harbor surface follows. Each pairs with an accent: Deep (teal), Graphite (pearl), Kelp (amber), Twilight (lilac), Vent (orange), Polar (ice), From the artwork.
- The banner card darkens itself when the artwork behind its text is bright (an adaptive scrim from the sampled image), and its body text is lifted toward full ink.

## 1.2: Polish pass
- Playback: every Fathom layer steps aside while Harbor's player is mounted, because on Windows the video can be a native layer behind a transparent web view.
- Customize is a labeled button in every navigation style, plus a one-time card that points at it after install.
- Dock magnification is transform-only: the glyph and the selection pill scale in place, centered in their slot, following a smoothed pointer position with a cosine falloff. Icons no longer spread apart and the dock glass keeps its size, so a fast sweep never re-lays out the dock or re-blurs its backdrop, and refraction stays on while magnifying.
- The sidebar fits its labels (152px with the default pages, was 220px).
- Spacing and corners come from the scale and hierarchy above.
- Speed: see the Performance section of the README for what changed and the measurements.
