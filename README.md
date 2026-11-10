# Fathom for Harbor

A liquid-glass theme for [Harbor](https://github.com/3-pr/harbor). Clear glass that bends light at its edges, seven color themes, depth that follows the pointer, and a full settings panel inside Harbor. Open it with the **Customize** button (in the dock, sidebar, island or menu bar) or **Alt+T**.

## Projector (in progress)
A second theme in this repository, built for daily use: a dark room lit by the artwork. It restyles Harbor's own sidebar, banner, rows, detail pages and built-in features instead of replacing them, and keeps the cost low (no blur, effects drawn once and only faded or moved). Plan and design notes: [docs/projector-plan.md](docs/projector-plan.md).

- **Look:** appearance Dark, Light, Follow time of day or Follow Windows. Five film stocks (Neutral, Warm, Cool, Mono, Faded), four type pairings, and an accent that can follow the artwork. Text contrast is held at 4.5:1 or better in every combination.
- **Navigation:** Harbor's own sidebar, styled as a marquee with group headings, a lit active page and a "Now showing" card. In the panel's Look tab: Marquee (names) or Icons, and Left, Top or Bottom.
- **Cinema layer:** light spill from the artwork under the banner, a focus pull and title reveal on each slide, house lights that dim for the hover preview and fade before playback, a poster light that spills each poster's own colors around it (and behind Harbor's hover preview), rise-in on scroll, and a banner that tilts toward the pointer. Widescreen bars and grain are optional.
- **Signature pieces:** film-themed sidebar icons, a projector beam with faint rays falling on the poster you point at, a light leak between pages, title-card headings, playbill details on detail pages, a showtimes calendar, sprocket progress bars and a flickering lamp for loading placeholders.
- **Harbor features restyled:** hover preview, Intermission (screensaver), spoilers, Top 10 numerals, badges, continue-watching progress, focus ring, back to top and search. The hover pop-up is Harbor's own and off by default: turn it on in Settings, Library & metadata, Cards, Hover preview (style Default or Marquee).
- **Tools:** a command palette (Ctrl+K), a shortcut sheet (?), the settings panel (Alt+T, or **Customize theme** at the bottom of the sidebar) with Look, Cinema, Motion and Speed tabs, a settings code, and a performance mode (Auto, Balanced or Lite). The panel opens by itself the first time the theme is applied.

Build it with `npm run build:projector` and import `dist/projector.json`.

## Install
1. Build it (or use the files already in `dist/`):
   ```bash
   npm run build
   ```
2. In Harbor: Settings, Theme, Your themes, import `dist/fathom.json` (or `dist/fathom.harborstyle`).
3. Apply Fathom. A card next to the Customize button asks once whether you want to customize now. It stays until you pick "Customize Fathom" or "Later". Customize is always one click away after that, or press Alt+T.

## What you can change
Six tabs in the panel, all live:

| Tab | Options |
|---|---|
| Look | 6 looks (Clear water, Shallows, Pack ice, Still water, Bioluminescent, Abyss). 7 color themes (Deep, Graphite, Kelp, Twilight, Vent, Polar, From the artwork), plus base hue and color strength sliders. Accent swatches, any color, or accent from the artwork. Type: serif titles, all sans, or Harbor's fonts. |
| Glass | Blur, frost, edge light, color through the glass, corner roundness. Refraction (bend light at the edges) and its strength. Artwork tint and strength, color shift on poster hover. Wallpaper: Currents, Still, Abyss, your own image, or Harbor's background; moving light, light rays, grain, wallpaper behind every page. Glass card on the featured banner, sheen on panels, liquid or flat buttons. |
| Layout | Dock, sidebar, island or menu bar. Dock position, icon size, magnification, auto-hide, names on hover. Sidebar fits its page names, or set a width, or icons only. Menu bar, clock, date, 24-hour time. Pages: match Harbor's own navigation or keep Fathom's own list. Poster corner size. |
| Motion | Depth, banner follows the pointer, poster hover (tilt, lift, glow, none) and tilt angle, sheen, glow in the poster's color, pointer light, dim other rows, animations on/off/system, animation speed. |
| Speed | Balanced (default), Full, Lite or Auto. Frame rate and slow-frame share measured while browsing. Pause effects while scrolling. |
| Backup | Copy a settings code, paste one to apply, reset everything. |

## Performance
Balanced is the default. Full adds refraction and light rays; Lite drops blur entirely. Auto picks between them by measuring.

- The moving wallpaper is plain gradient layers that are drawn once and only moved, about 12 steps a second. (Soft masks made each layer an offscreen pass that was redrawn on every step, and every glass surface above re-blurred with it.)
- The banner card's glass is a small image of what sits behind it (artwork plus Harbor's shading), blurred, saturated and, in Full, refracted at the edges, made once per slide in a canvas. Tilting and scrolling only move that image; no CSS filter runs. Artwork that can't be read into a canvas falls back to the same picture filtered by CSS. While Harbor plays a trailer, the card switches to a live blur.
- Light rays (Full) are drawn once into an image with their fade baked in.
- Dock magnification is animated per frame after a smoothed pointer position instead of by CSS transitions, which a fast sweep restarted on every icon every frame. On the bench a fast back-and-forth sweep went from 43% slow frames to under 1%.
- Refraction on the dock, island and sidebar (Full, Chromium only) never switches on or off abruptly. Its strength fades to zero while the dock magnifies, while you scroll, and while a shape is rebuilt, then fades back. The menu bar no longer refracts.
- The pointer light hides while the pointer is over Fathom's glass, so the glass never re-blurs a moving light under it.
- Row dimming is set by script when the hovered row changes, instead of a page-wide `:has(:hover)` rule.
- The rim light turns toward the pointer at most five times a second.
- Animations only move `transform` and `opacity`. One pointer handler, throttled to one update per frame. Scrolling writes one attribute when it starts and one when it ends.
- Effects pause while you scroll, while the window is hidden, and during playback.
- **Auto** measures frames while you scroll or move the pointer. It starts at Balanced, steps down after two slow readings in a row (more than 12% slow frames) and steps up only after four smooth ones, ignoring readings taken right after a change and waiting two minutes after any step down. If Full ever stutters, Auto stays below it on that machine until you press "Try full quality again".
- Lite turns every blur into a solid tinted panel and switches off tilt, pointer light and moving wallpaper.
- Reduced-motion settings in Windows are respected by default.

Measured on the test bench (Chromium, 120Hz display, 1440x900, every effect on including refraction and light rays in Full) with `__perf.run()`. Share of frames slower than 1.5x the refresh interval, two runs each, then p95 frame time:

| Mode | Scroll | Pointer sweep | Dock sweep | Pointer p95 |
|---|---|---|---|---|
| Theme off | 0% / 0% | 0% / 0% | n/a | 8.5 ms |
| Balanced, 1.1 | 12% / 0% | 46% / 24% | 60% / 77% | 25 ms |
| Balanced, 1.2 | 0.2% / 0% | 3.5% / 3.4% | 2% / 0% | 8.5 ms |
| Full, 1.1 | 0% / 1% | 96% / 95% | 99% / 98% | 33 to 42 ms |
| Full, 1.2 | 0% / 0% | 5% / 5% | 0.3% / 0.8% | 9 to 17 ms |

Bench numbers are noisy: the same Full run measured 12% slow pointer frames later in the session. The scripted sweep also leaves the dock magnified, so refraction is faded for part of the Full pointer runs; sweeps with refraction held on measured 10 to 21% in Full. Balanced stays the default for that reason.

## How it fits Harbor
- Uses Harbor's `custom` layout and builds its own navigation in JavaScript, so it stays keyboard and screen-reader accessible. Harbor's HTML overlay is `aria-hidden`, so it is left empty on purpose.
- Navigation uses `window.harbor.navigate()`. Buttons carry `data-harbor-nav`, so Harbor itself marks the active page.
- Hides its chrome when Harbor sets `data-chrome-hidden` (player, picker, Settings). While the player is mounted (`[data-harbor-player]`) it also hides the wallpaper, pointer light and panel, because on Windows Harbor can draw the video in a native layer behind a transparent web view.
- Leaves Harbor's Together-button proxy (`.harbor-chrome-proxy`, invisible in Harbor itself) unpainted.
- Unloads cleanly. Switching themes calls `window.__harborThemeCleanup`, which removes every element, listener, timer and attribute Fathom added.
- Selectors were checked against Harbor's source at 0.9.36 (`main`) and 0.9.113 (`beta-branch`). Rules that depend on Harbor's internal class names are grouped in section 12 of `fathom/src/theme.css`, so a Harbor update that breaks one is a one-place fix.

## Project layout
```
fathom/src/manifest.json  name, blurb, swatch, the 12 Harbor color tokens
fathom/src/theme.css      all styles, driven by --fx-* variables and html[data-fx-*] switches
fathom/src/theme.js       chrome, settings panel, depth, artwork color, performance, cleanup
fathom/src/theme.html     intentionally empty (see above)
projector/src/            Projector: manifest, js/ and css/ parts joined in name order by the build (see docs/projector-plan.md)
build/build.mjs     validates like Harbor's importer, writes dist/ (node build/build.mjs fathom|projector)
dist/               fathom.json, projector.json and their .harborstyle files, ready to import
preview/            test bench: Harbor's DOM, rebuilt from its source, that loads dist/ the way Harbor does
mockups/            the original concept mockups
docs/               Harbor theme API notes, directions, design notes
```

## Test bench
```bash
python -m http.server 5179 --bind 127.0.0.1
```
Then open `http://127.0.0.1:5179/preview/`. The bench panel switches pages, toggles the player, opens a modal, reloads or unloads the theme, and reports anything left behind after unloading.

- The player works like Harbor's mpv embed on Windows: the player is mounted only while playing, has no background, and a striped "native video" layer sits behind the page. If anything of Fathom's covers the stripes, playback would be covered in Harbor too.
- `?theme=projector` loads Projector instead of Fathom.
- `?build=path/to/theme.json` loads another build (same origin) for before and after comparisons.
- Frame timing: in the console, `await __perf.run("balanced")` (or `"off"`, `"lite"`, `"full"`) runs a scripted scroll, a pointer sweep across the page and a sweep along the dock with every effect on, and returns frame-interval stats (p50, p95, share of frames slower than 1.5x the refresh interval). Numbers only mean something while the page is visible and its window focused.
