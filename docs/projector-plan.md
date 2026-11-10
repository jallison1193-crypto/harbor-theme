# Projector: build plan

Status: plan only, nothing built. Written 2026-11-08. Harbor facts below come from Harbor's source at 0.9.113 (`beta-branch`, commit 8a16e41) and have not yet been checked in the running app.

## 1. What Projector is
A Harbor theme for daily use. The idea is a dark room where the artwork is the only light source: the page takes its light and color from whatever you are looking at, so it looks different every day while the theme itself stays calm.

Goals:
- Visually impressive, but through light, type and motion when you do something, not through constant effects.
- Practical every day: sharp text, fast navigation, nothing that gets tiring.
- Cheap to run: close to Harbor with no theme at all.
- Not Apple-like, and not a palette swap (Catppuccin, Nord and similar already exist).

### Scope rule
**We are building a theme, not rebuilding Harbor.** If Harbor already has a feature, Projector styles it and never adds a second version. Projector only adds things a theme is for: look, motion, navigation chrome, and its own settings.

## 2. Look
| Part | Direction |
|---|---|
| Base | Neutral near-black (not Fathom's blue-black). Chrome stays gray and quiet so artwork carries the color. |
| Type | A display serif for big titles, a clean sans for everything else. Must differ from Fathom (Newsreader, Hanken Grotesk) and avoid the current default picks. Chosen in milestone 1 from mockups. |
| Color | Accent comes from the current artwork, with a fixed fallback per film stock. |
| Shapes | Smaller corners than Fathom (posters 6 to 8px, panels 12px). Flat surfaces, hairline edges, soft shadows drawn once. |
| Motion | Answers an action (slide change, hover, open, play) or scroll position. Nothing loops in the background. |

### Appearance setting
A choice, never forced:
- **Dark** (default)
- **Light**: paper tones, dark ink.
- **Follow time of day**: light in the day, dark at night, warmer near dawn and dusk. The page switches once at dawn (default 7:00) and once at dusk (default 18:00); both can be changed. No location access. Recalculated every 15 minutes.
- **Follow Windows**: tracks the system light or dark setting.

### Film stocks
These replace color themes. Each sets Harbor's 12 color tokens plus a light grade on the banner artwork.

| Stock | Feel |
|---|---|
| Neutral | True grays, artwork unchanged (default) |
| Warm print | Slightly warm blacks and ink, a touch of amber |
| Cool | Blue-gray shadows |
| Mono | Grayscale chrome, artwork keeps its color |
| Faded | Lifted blacks, softer contrast, like an old print |

Each stock has a dark and a light version, so it works with every appearance mode.

## 3. Features
Verdicts from checking Harbor's source. "Style" means Harbor already has the feature and Projector only restyles it.

### The cinema layer (theme-only)
| Feature | What it does | How it stays cheap | Release |
|---|---|---|---|
| Light spill | The banner's colors glow softly onto the page around it. | A small blurred copy of the artwork, made once per slide in a canvas and scaled up. Nothing filters live. | 1.0 |
| Focus pull | Each new banner slide goes from soft to sharp. | Crossfade from the blurred copy to the real image. | 1.0 |
| Title reveal | Banner title words rise in with a stagger. | Transforms on a few spans, once per slide. | 1.0 |
| House lights | The page behind Harbor's hover preview dims slightly. Pressing Play fades to black just before the player appears. | One overlay fading in and out. Must be fully gone when the player mounts (see risks). | 1.0 |
| Accent from artwork | Buttons, focus rings and highlights take each title's color. | Sampled once per slide (carried over from Fathom). | 1.0 |
| Rise-in on scroll | Posters and row titles rise and fade in as they enter the screen. | CSS scroll-driven animation, no JavaScript. | 1.0 |
| Hover lift and poster light | A poster lifts (Harbor's own lift) and lights the row in its own colors, like YouTube's ambient mode. The same light sits behind Harbor's hover preview card, whose edge light and title rule take the poster's color. | Two reused canvases with a blurred, saturated copy of the poster, drawn once per poster at a quarter size and only faded. The image is drawn but never read back, so it works with any artwork host. Falls back to a radial glow. Switch: Cinema, "Poster light" (key `glow`). | 1.0 |
| Credits layout | Detail pages set director, cast, year and runtime like opening credits. | Styling only. | 1.0 |
| Banner follows the pointer | Added after the mockup at Josh's request: the banner tilts slightly toward the pointer (about 2.4 degrees), the picture shifts the other way (about 16px), the text drifts a little. Same feel as Fathom's hero. On by default, switch in Cinema. | Transforms only, updated only while the pointer moves over the banner, eases back when it leaves. Off for touch and reduced motion. The only pointer effect carried over from Fathom. | 1.0 |
| Widescreen banner | Optional wide cinema ratio with bars that open on load. | One transform. | 1.1 |
| Grain | Optional film grain that jumps position about 10 times a second. | One tile drawn once, moved with transforms. | 1.1 |
| Projector beam | A shaft of light with faint rays falls from just above the poster you point at (or reach with the keyboard) and pools at its top, tinted by the poster's color, with a faint lamp flicker. On by default. | Static gradients on two pseudo-elements, faded in by opacity; the flicker is an opacity keyframe that never drops below 85%. | 1.0 |

### Signature pieces (added 2026-11-09)
What sets Projector apart from Harbor's default and other themes. All one family: film, theater and projection-booth details, drawn in the accent.

| Piece | What it does | How it stays cheap | Switch |
|---|---|---|---|
| Projector icons | Film-themed line icons on every sidebar page: marquee, spotlight, reel, film frame, old TV, popcorn, sparkle, book, on-air waves, tickets, calendar with clock, film cans, film strip, cartridge, dial. The current page's icon is lit in the accent. | One style sheet built once (`js/25-icons.js`). Harbor's svg is hidden in place and a CSS mask draws the new icon, so the layout and badges don't move. | Cinema, "Projector icons" |
| Light leak | One warm band sweeps across the window when the page changes. | A layer that exists for 0.8 s, transform and opacity only. Triggered by a MutationObserver on the sidebar's `data-active`. Off in Lite and with motion off. | Cinema, "Light leak" |
| Title cards | Page headings get a short lit rule above them. | CSS only. | always |
| Playbill details | Year, ratings and runtime on detail pages read like a program line: hairlines, perforated separators, display type. | CSS only (Fragile). | always |
| Showtimes calendar | Italic serif weekdays, display-face day numbers, today lit like a marquee, each title a slip with an accent edge. | CSS only (Fragile). | always |
| Sprocket progress | The progress track becomes a row of film perforations. | Static gradient (Fragile). | always |
| Projector flicker | Loading placeholders flicker unevenly like a lamp warming up. | Opacity keyframes; still with motion off (Fragile). | follows Motion |

### Harbor features Projector styles
| Harbor feature | Projector's version | Release |
|---|---|---|
| Hover preview | Credits-style card, artwork glow, house lights behind it. | 1.0 |
| Idle screensaver | "Intermission": big title type, slow crossfades, a clock. Restyled, not replaced. | 1.0 |
| Spoiler hiding | Projector's own treatment (frosted print look) instead of Harbor's default blur, if the classes allow it cheaply. | 1.0 |
| Ranking numerals and Top 10 ribbon | Large serif numerals. | 1.0 |
| Continue watching cards and progress | Thin accent progress line, cleaner card. | 1.0 |
| New-episode badges, rating badges | Unified small badges in the film stock's colors. | 1.0 |
| Keyboard and gamepad navigation | Strong, clear focus ring in the accent color. Harbor handles the input. | 1.0 |
| Search overlay, modals, back to top | Styled to match. | 1.0 |
| Home row order, hide, rename | Not touched. Harbor's own settings do this. | n/a |
| Surprise me, Wrapped | Styled only if they look out of place. | 1.1 |

### Theme-only tools
| Feature | Notes | Release |
|---|---|---|
| Command palette (Ctrl+K) | Pages, theme settings (appearance, film stock, motion), open the theme panel, and a hand-off to Harbor's own search. Harbor has no palette; its only global key is `/` for search. | 1.0 |
| Shortcut hints | Small key hints on theme controls and a `?` sheet listing the theme's keys. | 1.0 |
| Settings panel, settings code, reset | Carried over from Fathom and reworked. | 1.0 |

### Needs a test before it's promised
| Idea | Question to answer in milestone 0 |
|---|---|
| A to Z bar on Library | Harbor has none. Can the theme read Library's titles from the page and scroll to the first one for a letter? |
| Quick-resume grid | Can the Continue Watching row be found reliably and laid out as a grid in CSS? |
| Poster opens into the page | Can a clone of the clicked poster animate into the banner while Harbor swaps pages, without flicker? |

### Cut
| Idea | Reason |
|---|---|
| Watch diary, heatmap | Harbor's playback history keeps only 30 days and 200 entries, one per title. Wrapped already covers stats. |
| Film of the day | Needs the theme to fetch the library itself, which is rebuilding Harbor. |
| Recent searches, recently opened | Search is Harbor's. |
| Fits tonight | Dropped. |
| Glass, refraction, moving wallpaper, pointer light, poster tilt | Fathom's main costs, and none of them help daily use. The banner's pointer tilt is the one exception, by request. |

### Learned from the mockup (`mockups/projector/`, 2026-11-08)
- **Follow time of day** can't blend continuously from light to dark: somewhere in the middle ink and canvas are too close to read. It switches family once at dawn (default 7:00) and once at dusk (default 18:00), and only drifts warmer or cooler within each family.
- **Light spill** drawn from a blurred copy of the artwork was nearly invisible, because the bottom of most artwork is dark. It uses the artwork's strongest color, with the blurred copy mixed in.
- **Top 10 numerals** need their own wider column or posters cover them. At narrow widths they still tuck partly behind.
- **Defaults:** Premiere type (Bodoni Moda with Schibsted Grotesk) and the Neutral stock. Paperback and Title card stay as options, plus Harbor's own fonts.
- **Navigation: Marquee** (Josh's pick from four mocked styles). Styles Harbor's own sidebar:
  1. A "Now showing" 16:9 thumbnail of the current banner slide at the top, with its title in the display serif and a soft accent shadow. Follows each slide with an opacity fade. Needs theme.js to read the active banner image (Fathom's `heroParts()` already finds it).
  2. Pages grouped under small italic serif headings, done in CSS: Browse (Home to Anime), On air (Live, Calendar), Yours (Library, Settings).
  3. The current page gets a 3px accent lamp on its left edge with a static glow and an accent wash across the row.
  4. A faint accent tint at the top left of the sidebar, and a hairline above the tools at the bottom.
  5. Narrow windows: a glowing accent line above the current item in the bottom bar; thumbnail and headings hidden.
  Reference: `mockups/projector/` (CSS block "Navigation styles", JS `NAV_STYLES` and `side-now`).
  In the theme: "Yours" starts at Calendar (Harbor's second sidebar group), and on windows under 1000px tall "Now showing" becomes a compact row so every page fits without scrolling. Harbor's sidebar has no bottom-bar mode; below 1024px wide it is a 72px icon column, where only the lamp shows.

### Learned while building milestone 1 (2026-11-08)
- **Contrast:** the stocks' subtle text fell to 3.2:1 on raised surfaces. theme.js now nudges muted and subtle text (and the accent, to 3:1) toward the ink until they pass on all four surfaces, in every stock, mode and time-of-day blend.
- **Accent Play only in the banner:** Harbor already pairs ink and accent buttons on detail pages, so turning every ink button accent made Play and Trailer identical.
- **Poster corners:** Projector sets Harbor's poster radius to 6px, which overrides Harbor's own poster-corner setting while the theme is on. A panel option can hand it back later.
- **Search:** Harbor blurs behind search at 93% opacity; Projector drops the blur (no visible change, one less full-screen filter).

### Learned while building milestones 2 to 4 (2026-11-09)
- **Source split by area:** `projector/src/js/*.js` and `css/*.css` are joined in name order by the build inside one function. Modules register on `hooks.apply`, `hooks.scan`, `hooks.player` and `hooks.dispose` in `00-core.js`. Hook order matters: the tools module puts its performance switch first, because the cinema layer reads `data-pj-perf` in its own apply hook.
- **Cinema switches:** each effect is one `html[data-pj-<name>]` = on or off attribute that already folds in the motion setting and Lite, so the CSS checks one attribute.
- **Hover lift is Harbor's:** Harbor already lifts posters on hover (`[data-preview-anchor]`), so Projector only adds the glow behind it.
- **Harbor features are CSS only:** milestone 3 needed no JavaScript. Badges, Top 10 numerals, spoilers, hover preview, Intermission, focus ring, back to top and search are restyled under the Fragile heading of `css/40-features.css`.
- **Harbor's own stagger in the hover preview** follows only Windows reduced motion, not Projector's motion setting.
- **Text on the accent** now picks whichever of dark or white text contrasts more. The old luminance cut-off gave 3.2:1 on mid-bright accents such as #d07a20.
- **Auto performance** caps its refresh estimate at 17.5 ms, so a steady 30 fps counts as slow (Fathom counted it as smooth).
- **Panel on Harbor's Settings page:** unavailable there, because Harbor hides theme chrome on that page.
- **First run opens the panel itself** (changed 2026-11-09 at Josh's request): the first time the theme is applied, the settings panel opens on Look with a short welcome strip that points to "Customize theme" and Alt T. Opening the panel any way marks it seen. The earlier first-run card is gone.
- **"Customize theme" button** sits at the bottom of Harbor's sidebar and copies Harbor's own Collapse button (36px, same color and size), so it reads as part of Harbor.
- **Hover pop-up on or off:** Harbor already has this (Settings, Library, Hover preview), so Projector doesn't duplicate it.
- **Bench:** posters now match Harbor (the ring and the poster are the same element). The bench runs on port 5179 only. A hidden browser pane pauses animation frames, so the banner tilt and the frame timing need the pane shown.

### Navigation options (added 2026-11-09)
- **Style:** Marquee (page names) or Icons. This is Harbor's own `sidebarCollapsed` setting: the panel reads `aside[data-collapsed]` and presses Harbor's collapse button (`[data-harbor-sidebar-toggle]`), so Harbor's button and the panel always agree. Below 1024px wide Harbor shows icons only either way.
- **Position:** Left, Top or Bottom (`navPos`, written as `html[data-pj-nav]`). Top and bottom lay Harbor's own sidebar out as a 60px bar: its shell (`[data-harbor-native-backdrop]`) turns into a column, groups run sideways and scroll if they overflow, the lamp moves to the edge facing the page, and the brand, footer buttons and profile shrink to icons. "Now showing" and the group headings are vertical-only. Selectors follow Harbor 1.0.3 `chrome/sidebar.tsx`.
- Harbor's account menu opens upward (`placement="up"`), so with the bar at the top it may open off-screen until Harbor flips it. Not checked in Harbor itself yet.

## 4. Settings panel
Five tabs, all live:

| Tab | Options |
|---|---|
| Look | Appearance (Dark, Light, Time of day, Windows), sunrise and sunset times, film stock, accent (from artwork, swatches, any color), type pairing, navigation style (Marquee or Icons) and position (Left, Top or Bottom) |
| Cinema | Projector icons, light spill and its strength, focus pull, title reveal, house lights, light leak, poster light, projector beam, rise-in on scroll, widescreen banner, grain |
| Navigation | Navigation style (see open decisions), command palette shortcut, shortcut hints on or off |
| Motion | Animations on, off or follow Windows, speed |
| Speed and backup | Auto, Balanced, Lite. Settings code, reset |

## 5. Performance budget
Measured on the bench with `__perf.run()` (scroll, pointer sweep), Balanced mode, every 1.0 effect on, compared with the theme off.

| Measure | Target |
|---|---|
| Slow frames, scroll | At most 1 point above theme off |
| Slow frames, pointer sweep | At most 2 points above theme off |
| p95 frame time | At most 1.2x theme off |
| Work while idle | No animation loop. Timers: a banner check every 1.5 s (one DOM query, skipped while hidden or playing), the 15-minute appearance check, and the grain (when on). |
| Canvas memory | Artwork copies at most 480px wide, one per slide, old ones released |

Rules:
1. Only `transform` and `opacity` animate.
2. No `backdrop-filter` anywhere in 1.0. If a surface needs a frosted look, use a blurred image made once.
3. Anything costly (glow, grain, beam, blurred artwork) is drawn once and then only moved or faded.
4. At most one animation loop, running only during an interaction, paused while the window is hidden or the player is open.
5. No page-wide `:has()` rules tied to hover.
6. Every effect is measured before it is kept. An effect that misses the budget is cut or moved to Full mode.

Lite mode turns off light spill, glow and rise-in. With these rules, Auto mode should rarely step down.

## 6. Architecture
### Repository layout
Projector lives in this repository next to Fathom, so it can share the build script and test bench:

```
fathom/src/            Fathom's current src/, moved (one commit, no content changes)
projector/src/         manifest.json, theme.css, theme.js, theme.html
build/build.mjs        takes a theme folder: node build/build.mjs projector
dist/                  fathom.json, projector.json and their .harborstyle files
preview/               shared bench, ?build=dist/projector.json
docs/                  shared notes and this plan
```
Moving Fathom's files is the only change to existing work, and it waits for Josh's OK (see open decisions).

### Carried over from Fathom
| Fathom part (`src/theme.js`) | Use in Projector |
|---|---|
| Helpers, settings model, storage | As is, renamed keys (`projector.*`) |
| Color sampling from artwork | Accent from artwork, film stock grading |
| Hero glass (blurred canvas copy per slide, with CSS fallback when the image can't be read) | Base for light spill and focus pull |
| Performance measurement and Auto mode | As is, with the new budget |
| Settings panel, first-run card, settings code | Reworked to the new tabs and look |
| Player handling (step aside while `[data-harbor-player]` is mounted) | As is. Essential on Windows. |
| Cleanup (`window.__harborThemeCleanup`) | As is, plus the new listeners and observers |
| Build validation | As is |

Not carried over: refraction, light rays, moving wallpaper, pointer light, tilt, rim light, dock magnification.

### CSS sections
Same structure as Fathom so fragile parts stay in one place:
1. Variables and film stocks
2. Appearance modes
3. Projector's own layers (spill, house lights, grain)
4. Navigation
5. Settings panel and command palette
6. Posters and rows
7. Banner
8. Detail page (credits layout)
9. Harbor features (hover preview, screensaver, spoilers, numerals, badges, focus ring)
10. Performance and motion
11. **Fragile overrides**: everything that depends on Harbor's internal utility classes. The hover preview and screensaver have no stable selectors, so their styling lives here.

### Harbor hooks
- Stable: `[data-preview-anchor]` (Harbor 0.9.113 has no `.pick-card`), `.harbor-poster`, `.glass-card`, `.modal-panel`, `[data-harbor-player]`, `[data-harbor-nav]`, `[data-scroll-anchor="hero"]`, `main`, `html[data-chrome-hidden]`, `harbor:scroll-top` event, `window.harbor.navigate()`.
- Fragile (section 11): hover preview (fixed layer at `z-[110]`), screensaver (`components/screensaver/`), continue card internals, spoiler blur classes.

## 7. Milestones
Each one ends with a build that imports into Harbor and passes the bench.

| # | Milestone | Done when |
|---|---|---|
| 0 | **Groundwork and checks** | Repository layout agreed and set up. Build takes a theme folder. Bench gains Harbor's hover preview, screensaver and continue card markup from source. In the real app: confirm the WebView2 version supports scroll-driven animations, that artwork can be read into a canvas, and whether Harbor's own navigation can be used with a custom theme. Spikes for A to Z, quick-resume grid and poster-to-page, each with a keep or drop verdict. |
| 1 | **The look** | Tokens for all 5 film stocks in dark and light. Appearance modes work, including time of day and Windows. Type chosen from 2 or 3 mockups. Posters, rows, banner, detail page and navigation styled. Text contrast at least 4.5:1 in every stock and mode. |
| 2 | **The cinema layer** | Light spill, focus pull, title reveal, house lights, accent from artwork, rise-in, hover lift and glow. Each one measured on its own against the budget. |
| 3 | **Harbor features** | Hover preview, Intermission, spoilers, numerals, continue cards, badges, focus ring, search overlay and modals styled. Checked with keyboard and a gamepad in the real app. |
| 4 | **Tools** | Command palette with full keyboard support and screen-reader labels. Shortcut hints and `?` sheet. Settings panel, first-run card, settings code, reset. |
| 5 | **Release 1.0** | Full budget run on the bench. A day of real use in Harbor, including playback on Windows. Unload leaves nothing behind (bench check). README and design notes written. |
| 6 | **1.1** | Widescreen banner, grain, any spikes that passed, Surprise me and Wrapped styling if needed. |

## 8. Testing
- **Bench** (`preview/`): every milestone. Theme on and off, `__perf.run()` before and after each effect, the unload leftovers check, the player stripes check (nothing of Projector's may cover the native video layer).
- **Real app**: end of milestones 0, 3 and 5. Windows 11, Harbor 0.9.113 or newer. Check playback, hover preview, screensaver, gamepad, every appearance mode, and switching themes back and forth.
- **Reduced motion**: with Windows animations off, every effect is either off or instant.

## 9. Risks
| Risk | Plan |
|---|---|
| Harbor changes the hover preview or screensaver markup | Those styles live in the fragile section only. Fall back to Harbor's default look if a selector stops matching. |
| House lights fade covers playback | The fade sits in Projector's own layer, which is removed the moment `[data-harbor-player]` appears, and has a hard timeout. Tested against the bench's native video stripes. |
| Artwork can't be read into a canvas (cross-origin images) | Fathom's fallback: same picture with a CSS filter, made once. |
| Appearance changes repaint the whole page | Happens at most every 15 minutes, in small steps. Measure once to confirm it's not noticeable. |
| Scroll-driven animations unsupported in an older WebView2 | Feature check at startup. Without support, posters simply appear. |

## 10. Open decisions for Josh
| Decision | Recommendation |
|---|---|
| Name | Projector, unless something better comes up during mockups. |
| Same repository, with Fathom moved to `fathom/src/` | Yes. Shared build and bench, one place for Harbor notes. The alternative is a new repository with a copied bench. |
| Navigation | Style Harbor's own navigation instead of building custom chrome like Fathom. Fits the scope rule and cuts a lot of JavaScript. Depends on the milestone 0 check. |
| Which features ship in 1.0 | As listed in section 3. |
