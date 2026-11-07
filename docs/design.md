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

## Radius hierarchy
Panel and sidebar 22px (adjustable), featured card 26px, controls 12px, inner buttons 9px. Dock items are circles; the dock itself is a capsule.

## 1.1: Liquid Glass and color themes
- The glass moved from frosted acrylic to liquid glass: low blur, little frost, strong saturation, a bright rim that turns toward the pointer, darker thickness along the far edge, and real refraction at the edges on Chromium.
- The dock lost its per-icon tiles. Glyphs sit on the glass; the current page gets a glass pill that flows to the next page with a slight stretch.
- Chrome no longer tilts in 3D. Tilted text went soft and tooltips skewed. Depth now lives in the banner and posters, where there is no small text.
- Color themes ("waters") recolor Harbor's own 12 tokens from one hue and a strength, so every Harbor surface follows. Each pairs with an accent: Deep (teal), Graphite (pearl), Kelp (amber), Twilight (lilac), Vent (orange), Polar (ice), From the artwork.
- The banner card darkens itself when the artwork behind its text is bright (an adaptive scrim from the sampled image), and its body text is lifted toward full ink.
