# Fathom for Harbor

A liquid-glass theme for [Harbor](https://github.com/3-pr/harbor). Clear glass that bends light at its edges, seven color themes, depth that follows the pointer, and a full settings panel inside Harbor. Press **Alt+T** to open it.

## Install
1. Build it (or use the files already in `dist/`):
   ```bash
   npm run build
   ```
2. In Harbor: Settings, Theme, Your themes, import `dist/fathom.json` (or `dist/fathom.harborstyle`).
3. Apply Fathom. A hint appears once. Press Alt+T, or the sliders button in the dock, to customize.

## What you can change
Six tabs in the panel, all live:

| Tab | Options |
|---|---|
| Look | 6 looks (Clear water, Shallows, Pack ice, Still water, Bioluminescent, Abyss). 7 color themes (Deep, Graphite, Kelp, Twilight, Vent, Polar, From the artwork), plus base hue and color strength sliders. Accent swatches, any color, or accent from the artwork. Type: serif titles, all sans, or Harbor's fonts. |
| Glass | Blur, frost, edge light, color through the glass, corner roundness. Refraction (bend light at the edges) and its strength. Artwork tint and strength, color shift on poster hover. Wallpaper: Currents, Still, Abyss, your own image, or Harbor's background; moving light, light rays, grain, wallpaper behind every page. Glass card on the featured banner, sheen on panels, liquid or flat buttons. |
| Layout | Dock, sidebar, island or menu bar. Dock position, icon size, magnification, auto-hide, names on hover. Sidebar width or icons only. Menu bar, clock, date, 24-hour time. Pages: match Harbor's own navigation or keep Fathom's own list. Poster corner size. |
| Motion | Depth, banner follows the pointer, poster hover (tilt, lift, glow, none) and tilt angle, sheen, glow in the poster's color, pointer light, dim other rows, animations on/off/system, animation speed. |
| Speed | Auto, Full, Balanced, Lite. Frame rate and slow-frame share measured while browsing. Pause effects while scrolling. |
| Backup | Copy a settings code, paste one to apply, reset everything. |

## Performance
- Live blur is limited to the chrome, the settings panel and modals. The banner card's glass is a blurred, refracted copy of the banner image, rendered once, so tilting and scrolling don't re-blur anything. While Harbor plays a trailer, the card switches to a live blur.
- Refraction (SVG displacement through `backdrop-filter`) is off by default because it measured too heavy at 120Hz. It is an opt-in in the Glass tab, runs only in Full mode, and only on Chromium, which is what Harbor uses on Windows.
- Animations only move `transform` and `opacity`. One pointer handler, throttled to one update per frame.
- Effects pause while you scroll, while the window is hidden, and during playback.
- **Auto** measures frames while you scroll or move the pointer. It starts at Balanced, moves up to Full after three smooth readings, and steps down after two slow ones (more than 12% slow frames). If Full ever stutters, Auto stays below it on that machine until you press "Try full quality again".
- Lite turns every blur into a solid tinted panel and switches off tilt, pointer light and moving wallpaper.
- Reduced-motion settings in Windows are respected by default.

## How it fits Harbor
- Uses Harbor's `custom` layout and builds its own navigation in JavaScript, so it stays keyboard and screen-reader accessible. Harbor's HTML overlay is `aria-hidden`, so it is left empty on purpose.
- Navigation uses `window.harbor.navigate()`. Buttons carry `data-harbor-nav`, so Harbor itself marks the active page.
- Hides itself when Harbor sets `data-chrome-hidden` (player, picker, Settings).
- Unloads cleanly. Switching themes calls `window.__harborThemeCleanup`, which removes every element, listener, timer and attribute Fathom added.
- Selectors were checked against Harbor's source at 0.9.36 (`main`) and 0.9.113 (`beta-branch`). Rules that depend on Harbor's internal class names are grouped in section 12 of `src/theme.css`, so a Harbor update that breaks one is a one-place fix.

## Project layout
```
src/manifest.json   name, blurb, swatch, the 12 Harbor color tokens
src/theme.css       all styles, driven by --fx-* variables and html[data-fx-*] switches
src/theme.js        chrome, settings panel, depth, artwork color, performance, cleanup
src/theme.html      intentionally empty (see above)
build/build.mjs     validates like Harbor's importer, writes dist/
dist/               fathom.json and fathom.harborstyle, ready to import
preview/            test bench: Harbor's DOM, rebuilt from its source, that loads dist/ the way Harbor does
mockups/            the original concept mockups
docs/               Harbor theme API notes, directions, design notes
```

## Test bench
```bash
python -m http.server 5179 --bind 127.0.0.1
```
Then open `http://127.0.0.1:5179/preview/`. The bench panel switches pages, toggles the player, opens a modal, reloads or unloads the theme, and reports anything left behind after unloading.
