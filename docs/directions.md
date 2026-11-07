# Directions

All five work inside Harbor's real limits (see `harbor-theme-api.md`). Each one ships the same customization engine below; the direction is the visual identity.

## 1. Deepwater Glass (recommended)
Dark liquid glass in the spirit of current macOS, not a copy of it. Near-black blue-graphite canvas, glass panels with a bright specular rim, soft inner refraction, and a faint caustic light drifting under the glass. Chrome options: macOS-style bottom dock with magnification, glass sidebar, top menu bar with clock, or a floating "island".
- Why it wins: matches what you asked for, looks premium in screenshots, and the glass tint can pick up colour from the artwork behind it.
- Distinct from Aurora: Aurora is light, sky, bokeh, Frutiger Aero. This is dark, deep, restrained.
- Risk: blur cost. Solved with performance tiers.

## 2. Ambilight
The UI takes its colour from whatever you are looking at. JS samples the hero or focused poster and shifts accent, glow and canvas gradient to match, like a TV backlight. Chrome stays minimal so the artwork leads.
- Strong as a feature inside #1 rather than a whole theme.

## 3. Monograph
Editorial and typographic. Huge display type, strict grid, hairline rules, poster cards with no rounded corners, film-credit style metadata. Feels like a printed film journal.
- Very fast (no blur), very different from everything on Harbor.
- Less "wow" in motion; the wow is in typography.

## 4. Spatial
Depth-first, like a headset UI on a flat screen. Floating panes at different depths, cursor-driven light and parallax tilt on posters, focused row comes forward, others recede.
- Most impressive in motion, hardest to keep smooth on long rails.

## 1+4. Fathom (fusion)
Deepwater's glass, wallpaper and chrome choices (dock, sidebar, island), plus Spatial's depth: the hero tilts and parallaxes with the pointer, posters tilt and catch light, the row you're in comes forward, and the dock, sidebar and settings panel sit at a slight 3D angle. One "Depth" slider scales all of it down to flat.
- Mockup: `mockups/index.html`, tab "1+4 Fathom".

## 5. Bridge
Cockpit HUD. Monospace labels, thin vector frames, live clock, scan-line details, accent in signal amber or cyan.
- Fun and distinct, but niche and tiring for long sessions.

## Shared customization engine (the part that beats other themes)
Built in `theme.js`. Opens from a floating button or a keyboard shortcut. Saves to `localStorage`, applies instantly through CSS variables and `data-*` attributes on `<html>`.

| Group | Options |
|---|---|
| Presets | Built-in looks, save your own, export/import a settings code, reset per group |
| Chrome | Dock, sidebar, menu bar, island, or hidden; position; size; auto-hide; labels on/off; dock magnification; nav items order/hide/rename |
| Glass / surface | Blur, saturation, tint strength, rim highlight, refraction, grain, corner radius |
| Colour | Accent picker + swatches, follow-artwork mode, intensity, contrast boost |
| Wallpaper | Animated mesh gradients, still gradients, image URL, dim, vignette |
| Posters | Size, radius, gap, hover style (lift, tilt, glow, none), title under/overlay/hidden, rating badges |
| Hero | Height, gradient fade, ken-burns motion on/off |
| Type | Display/body pairing, scale, weight |
| Motion | Speed, page transitions, reduce motion (respects the OS setting) |
| Widgets | Clock, date, greeting, now-watching chip |
| Performance | Full / Balanced / Lite, plus Auto that measures frame rate and steps down |
| Accessibility | Focus rings, larger targets, high-contrast text |

## Performance rules
- Blur only on a few fixed layers (chrome, modals), never on every poster.
- Animate only `transform` and `opacity`.
- One `requestAnimationFrame` loop at most, paused when the window is hidden or the player is open.
- Lite mode swaps blur for solid translucency.
- Everything added by JS is removed in `window.__harborThemeCleanup`.
