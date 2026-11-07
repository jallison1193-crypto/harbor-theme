# What Harbor's theme engine allows

Read from Harbor's source on 2026-11-07 (repo `3-pr/harbor`, default branch). Files: `src/components/custom-code-mount.tsx`, `src/lib/custom-themes.ts`, `src/views/settings/theme-panel/theme-studio/cheat-sheet-data.ts`, `cheat-sheet-recipes.ts`, `src/lib/theme.ts`.

## Verified facts

### How the three files run
| File | How Harbor uses it | Implication |
|---|---|---|
| `theme.css` | Put in a `<style id="harbor-theme-css">` in `<head>`. | Full CSS over the whole app. |
| `theme.js` | Run once with `new Function(code)()` when the theme loads. Full page access. | Can build UI, read/write `localStorage`, listen to events, observe the DOM. |
| `theme.html` | Injected into `#harbor-custom-overlay`: fixed, full screen, `z-index:100`, `pointer-events:none`, `aria-hidden`, hidden while the player is open. | Interactive bits need `pointer-events:auto`. Because the overlay is `aria-hidden`, real navigation is better built by JS directly in `<body>`. |

- Cleanup: Harbor calls `window.__harborThemeCleanup()` when the theme's JS changes or unloads. Our JS must set it and remove everything it added.
- Navigation API: `window.harbor.navigate(viewId)` and `window.harbor.back()`.
- View ids: `home, discover, movies, shows, anime, live, calendar, library, settings`.

### Tokens (the only colors a theme file stores)
`--color-canvas, --color-surface, --color-elevated, --color-raised, --color-ink, --color-ink-muted, --color-ink-subtle, --color-edge, --color-edge-soft, --color-accent, --color-accent-soft, --color-danger`.
Fonts: `--font-display, --font-sans, --font-mono`. Easing: `--ease-out, --ease-in-out`.

### State on `<html>`
| Attribute | Values |
|---|---|
| `data-theme-layout` | sidebar, topdock, rail, stremio, minui, dracula, nord, forest, royal, custom |
| `data-theme-card` | flat, glass, stremio, minui, crunch, noir, custom |
| `data-theme-button` | flat, glossy, minui, crunch, noir, custom |
| `data-theme-bokeh` | on, off |
| `data-chrome-hidden` | present while player, play picker or immersive Live TV is active |

### Stable selectors (Harbor's own list)
`.pick-card` (posters), `.harbor-cinema-badge`, `.harbor-chat-toast`, `.harbor-together-pill`, `.harbor-search-backdrop`, `.harbor-minui-shell`, `.glass-card`, `.modal-panel`, `[data-harbor-player]`, `[data-harbor-nav]` (+ `[data-active]`), `[data-tauri-drag-region]`, `main`.

### Z-index map
Topbar 55, built-in chrome 60, back pill 70, Together overlays 80, theme HTML overlay 100, modals 150, search 200, studio 210+.

### Window events
`harbor:immersive`, `harbor:reset-row-scrolls`, `harbor:scroll-top` (detail has `view`, good for tracking the current page), `harbor:open-theme-editor`, `harbor:error`.

### Theme file
Export is JSON with `name, blurb, swatch[3 hex], tokens{12}, layout, cardStyle, buttonStyle, fontPair, bokeh, background{image, dim}, logo{wordmark, mark}, chrome, css, js, html`. There is also a text `.harborstyle` format with `@tokens / @css / @html / @js` blocks.

### Built-in themes to stay clear of
Harbor already ships **Aurora** ("Liquid glass / Frutiger Aero. Top dock, glossy cards, bokeh sky"), **Velvet** (eggplant, gold, serif, old theatre), **Noir** (pure black), **MinUI** (floating icon dock), plus Nord, Dracula, Forest, Royal, Crunchy, Stremio.

## Inferred (not yet tested in the app)
- Harbor is a Tauri app, so on Windows it renders in WebView2 (Chromium). `backdrop-filter`, `@property`, container queries and View Transitions should work. Need to confirm in the running app.
- Anything outside the stable selectors is Tailwind utility classes that can change between Harbor releases. Keep those overrides in one isolated section.
- `backdrop-filter` over scrolling poster rails is the main performance risk. Needs a lighter fallback mode.

## Unknowns
- Arum Dock's actual option list. It did not show up in public search; it is likely only in Harbor's community theme browser.
- Whether `theme.js` re-runs on view change (source says no: once per theme load).
