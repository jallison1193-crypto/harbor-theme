/* Projector for Harbor, v__THEME_VERSION__
   Runs once when the theme loads (Harbor calls it with new Function).
   Everything it adds is removed again by window.__harborThemeCleanup.
   This file: helpers, color, film stocks, type, settings, appearance, Harbor tokens, module hooks, the banner reader.
   The theme is built by joining projector/src/js/*.js in name order (build/build.mjs). Plan: docs/projector-plan.md. */
(() => {
  "use strict";
  const VERSION = "__THEME_VERSION__";
  const KEY = "projector.settings.v1";
  const SCHEMA = 1;
  const doc = document, root = doc.documentElement, win = window;

  if (typeof win.__projectorDispose === "function") { try { win.__projectorDispose(); } catch (e) { /* stale instance */ } }

  /* ---------- small helpers ---------- */
  let disposed = false;
  const cleanups = [];
  const listen = (t, ev, fn, opt) => { t.addEventListener(ev, fn, opt); cleanups.push(() => t.removeEventListener(ev, fn, opt)); };
  const every = (ms, fn) => { const id = setInterval(fn, ms); cleanups.push(() => clearInterval(id)); };
  const el = (tag, attrs) => { const n = doc.createElement(tag); if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage full or blocked */ } },
  };
  const mq = (q) => (win.matchMedia ? win.matchMedia(q) : null);
  const lightMQ = mq("(prefers-color-scheme: light)");
  const reduceMQ = mq("(prefers-reduced-motion: reduce)");
  const onMQ = (m, fn) => { if (!m) return; m.addEventListener("change", fn); cleanups.push(() => m.removeEventListener("change", fn)); };

  /* ---------- color math ---------- */
  const hexToRgb = (h) => { const n = parseInt(h.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgbToHex = (c) => "#" + c.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("");
  const mixHex = (a, b, t) => { const x = hexToRgb(a), y = hexToRgb(b); return rgbToHex(x.map((v, i) => v + (y[i] - v) * t)); };
  const lum = (h) => { const c = hexToRgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  function rgbToHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hslToHex(h, s, l) {
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return rgbToHex([f(0) * 255, f(8) * 255, f(4) * 255]);
  }
  const mixTokens = (a, b, t) => { const o = {}; for (const k in a) o[k] = mixHex(a[k], b[k], t); return o; };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // Moves a text color toward the ink until it reaches `min` against every surface it can sit on.
  function readable(fg, surfaces, min, toward) {
    let c = fg;
    for (let i = 0; i < 24 && surfaces.some((s) => contrast(c, s) < min); i++) c = mixHex(c, toward, 0.08);
    return c;
  }
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  /* ---------- film stocks (values from the mockup, mockups/projector/projector.js) ---------- */
  const STOCKS = {
    neutral: {
      name: "Neutral", grade: "none",
      dark: { canvas: "#131314", surface: "#19191b", elevated: "#212124", raised: "#2a2a2e", ink: "#efeee9", muted: "#a8a7a1", subtle: "#8a8983", accent: "#e9c37f" },
      // Light is "house lights half up": soft mid-light rooms, never paper white, so artwork keeps its punch.
      light: { canvas: "#d0cfcb", surface: "#c6c5c1", elevated: "#dad9d5", raised: "#bdbcb6", ink: "#141416", muted: "#41403c", subtle: "#4a4944", accent: "#6a4209" },
    },
    warm: {
      name: "Warm print", grade: "sepia(.16) saturate(1.06)",
      dark: { canvas: "#17120f", surface: "#1f1915", elevated: "#28201b", raised: "#332922", ink: "#f4e9dc", muted: "#bba996", subtle: "#9a8775", accent: "#f0a85a" },
      light: { canvas: "#d4caba", surface: "#cbc0ae", elevated: "#ded5c8", raised: "#c1b49f", ink: "#22180f", muted: "#4c3c29", subtle: "#534231", accent: "#6e350a" },
    },
    cool: {
      name: "Cool", grade: "saturate(.88) hue-rotate(8deg)",
      dark: { canvas: "#0f1216", surface: "#151a20", elevated: "#1d232b", raised: "#262d37", ink: "#e8eef5", muted: "#9eaab8", subtle: "#7d8998", accent: "#86b9ea" },
      light: { canvas: "#cbd1d8", surface: "#c2c8d1", elevated: "#d6dbe1", raised: "#b7bfc9", ink: "#0f1620", muted: "#3a4655", subtle: "#414b59", accent: "#1c4775" },
    },
    mono: {
      name: "Mono", grade: "none", fixedAccent: true,
      dark: { canvas: "#111111", surface: "#181818", elevated: "#202020", raised: "#2b2b2b", ink: "#f2f2f2", muted: "#a8a8a8", subtle: "#8a8a8a", accent: "#f2f2f2" },
      light: { canvas: "#cfcfcf", surface: "#c5c5c5", elevated: "#d9d9d9", raised: "#bbbbbb", ink: "#111111", muted: "#3f3f3f", subtle: "#484848", accent: "#111111" },
    },
    faded: {
      name: "Faded", grade: "contrast(.86) saturate(.8) brightness(1.05)",
      dark: { canvas: "#1d1c1f", surface: "#242327", elevated: "#2d2c31", raised: "#38363c", ink: "#e7e3dc", muted: "#aaa59e", subtle: "#8f8a84", accent: "#dba9a2" },
      light: { canvas: "#ccc8c2", surface: "#c3beb6", elevated: "#d5d3cd", raised: "#b9b4aa", ink: "#2a292c", muted: "#47443f", subtle: "#47433f", accent: "#653632" },
    },
  };
  // Evening and early-morning targets for "Follow time of day".
  const WARM_DARK = { canvas: "#211a15", surface: "#29211b", elevated: "#322822", raised: "#3c3029", ink: "#f4e9dc", muted: "#bba996", subtle: "#9f8c79", accent: "#f0a85a" };
  const WARM_LIGHT = { canvas: "#d0c4b4", surface: "#c6b9a5", elevated: "#dad0c1", raised: "#bcad96", ink: "#22180f", muted: "#4a3a28", subtle: "#4d3d2d", accent: "#673107" };

  const TYPES = {
    premiere: { name: "Premiere", family: "Bodoni+Moda:opsz,wght@6..96,400..700&family=Schibsted+Grotesk:wght@400..700", display: '"Bodoni Moda", Georgia, "Times New Roman", serif', sans: '"Schibsted Grotesk", system-ui, "Segoe UI", sans-serif', weight: 500, stretch: "100%", track: "-0.015em" },
    paperback: { name: "Paperback", family: "Brygada+1918:wght@400..700&family=Albert+Sans:wght@400..700", display: '"Brygada 1918", Georgia, serif', sans: '"Albert Sans", system-ui, "Segoe UI", sans-serif', weight: 600, stretch: "100%", track: "-0.01em" },
    titlecard: { name: "Title card", family: "Archivo:wdth,wght@62..125,400..800", display: '"Archivo", "Arial Narrow", sans-serif', sans: '"Archivo", system-ui, "Segoe UI", sans-serif', weight: 760, stretch: "68%", track: "-0.005em" },
    harbor: { name: "Harbor's fonts", family: "", display: "", sans: "", weight: 600, stretch: "100%", track: "-0.01em" },
  };

  /* ---------- settings ---------- */
  const DEFAULTS = {
    schema: SCHEMA,
    appearance: "dark",   // dark | light | time | windows
    dawn: 7, dusk: 18,    // hours for "time"; the page switches family once at each
    stock: "neutral",
    type: "premiere",
    accent: "artwork",    // artwork | stock
    motion: "system",     // on | off | system
    // Cinema layer (milestone 2). Toggles in the panel's Cinema tab.
    spill: true, focus: true, reveal: true, lights: true, glow: true, rise: true, parallax: true,
    icons: true, beam: true, leak: true,   // signature pieces (js/25-icons.js, js/70-signature.js)
    wide: false, grain: false,
    brand: true, bulbs: true, curtain: true,    // streaming tile glow, Continue Watching bulbs, curtain between pages
    perf: "auto",         // auto | balanced | lite (milestone 4 panel, Speed tab)
    navPos: "left",       // left | top | bottom: where Harbor's sidebar sits (js/20-nav.js, css/20-nav.css)
  };
  const BOOLS = ["spill", "focus", "reveal", "lights", "glow", "rise", "parallax", "wide", "grain", "icons", "beam", "leak", "brand", "bulbs", "curtain"];
  function load() {
    let s = {};
    try { s = JSON.parse(store.get(KEY) || "{}") || {}; } catch (e) { s = {}; }
    return normalize(s);
  }
  function normalize(s) {
    const o = Object.assign({}, DEFAULTS, s, { schema: SCHEMA });
    if (!["dark", "light", "time", "windows"].includes(o.appearance)) o.appearance = DEFAULTS.appearance;
    if (!STOCKS[o.stock]) o.stock = DEFAULTS.stock;
    if (!TYPES[o.type]) o.type = DEFAULTS.type;
    if (!["artwork", "stock"].includes(o.accent)) o.accent = DEFAULTS.accent;
    if (!["on", "off", "system"].includes(o.motion)) o.motion = DEFAULTS.motion;
    o.dawn = clamp(Number(o.dawn) || DEFAULTS.dawn, 3, 11);
    o.dusk = clamp(Number(o.dusk) || DEFAULTS.dusk, 15, 23);
    for (const k of BOOLS) if (typeof o[k] !== "boolean") o[k] = DEFAULTS[k];
    if (!["auto", "balanced", "lite"].includes(o.perf)) o.perf = DEFAULTS.perf;
    if (!["left", "top", "bottom"].includes(o.navPos)) o.navPos = DEFAULTS.navPos;
    delete o.navStyle; // mirrors Harbor's own sidebarCollapsed setting, never stored by the theme
    return o;
  }
  const state = load();
  let saveTimer = 0;
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => store.set(KEY, JSON.stringify(state)), 250); };
  // For testing on the bench before the panel exists: __projector.set({ appearance: "light" }).
  // hourOverride is not saved; it fakes the clock for "Follow time of day".
  let hourOverride = null;

  /* ---------- appearance ---------- */
  function hourNow() {
    if (hourOverride != null) return hourOverride;
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  }
  function palette() {
    const st = STOCKS[state.stock];
    const a = state.appearance;
    if (a === "light") return { t: st.light, light: true };
    if (a === "windows") { const light = !!(lightMQ && lightMQ.matches); return { t: light ? st.light : st.dark, light }; }
    if (a === "time") {
      // Readable at every moment: the page switches family once at dawn and once at dusk and only drifts warmer or
      // cooler within a family. A continuous light-to-dark blend passes through a middle where ink and canvas are
      // too close to read (found in the mockup).
      const h = hourNow(), dawn = state.dawn, dusk = state.dusk;
      if (h >= dawn && h < dusk) {
        const warm = h < dawn + 2 ? (1 - smooth(dawn, dawn + 2, h)) * 0.6 : smooth(dusk - 3.5, dusk, h) * 0.85;
        return { t: mixTokens(st.light, WARM_LIGHT, warm), light: true };
      }
      const warm = h >= dusk ? 1 - smooth(dusk, dusk + 4.5, h) : smooth(dawn - 2.5, dawn, h) * 0.6;
      return { t: mixTokens(st.dark, WARM_DARK, warm), light: false };
    }
    return { t: st.dark, light: false };
  }

  // Set by the artwork sampler (js/30-cinema.js) through setArtColor(). Until then the stock's accent is used.
  let artColor = null;
  function setArtColor(rgb) { artColor = rgb; apply(); }
  function accentFor(light, fallback) {
    if (STOCKS[state.stock].fixedAccent || state.accent !== "artwork" || !artColor) return fallback;
    const [h, s] = rgbToHsl(artColor);
    if (s < 0.12) return fallback;
    return hslToHex(h, clamp(s, 0.42, 0.78), light ? 0.36 : 0.7);
  }

  /* ---------- module hooks ----------
     The source is split by area (js/20-nav.js, 30-cinema.js, 40-features.js, 50-tools.js); the build joins the files
     in name order inside this one function, so they all share what is declared here. A module registers:
       hooks.apply   (light) => void   after colors and settings are written (set data-pj-* switches here)
       hooks.scan    () => void        every 1.5 s and on page changes, only while visible and not playing
       hooks.player  (on) => void      when Harbor's player mounts (true) or unmounts (false)
       hooks.dispose () => void        on unload: remove every node, listener and attribute the module added */
  const hooks = { apply: [], scan: [], player: [], dispose: [] };
  const runHooks = (list, arg) => list.forEach((f) => { try { f(arg); } catch (e) { console.warn("[projector]", e); } });
  function runScan() {
    if (disposed || doc.hidden || root.hasAttribute("data-chrome-hidden")) return;
    runHooks(hooks.scan);
  }

  /* ---------- DOM we own ---------- */
  const varsStyle = el("style", { id: "projector-vars" });
  const fontLink = el("link", { rel: "stylesheet", id: "projector-fonts" });
  doc.head.append(fontLink, varsStyle);

  const ATTRS = new Set();
  const setAttr = (k, v) => { ATTRS.add(k); if (root.getAttribute("data-" + k) !== v) root.setAttribute("data-" + k, v); };
  const motionOn = () => state.motion === "on" || (state.motion === "system" && !(reduceMQ && reduceMQ.matches));

  let lastVars = "";
  function apply() {
    if (disposed) return;
    const p = palette(), light = p.light, t = Object.assign({}, p.t);
    // Text contrast at least 4.5:1 (accent 3:1) on all four surfaces, in every stock, mode and time-of-day blend.
    const surfaces = [t.canvas, t.surface, t.elevated, t.raised];
    t.muted = readable(t.muted, surfaces, 4.5, t.ink);
    t.subtle = readable(t.subtle, surfaces, 4.5, t.ink);
    const accent = readable(accentFor(light, t.accent), surfaces, 3, t.ink);
    const ink = hexToRgb(t.ink);
    const a = (n) => Math.round(n * 255).toString(16).padStart(2, "0");
    const ty = TYPES[state.type];
    const tokens = {
      "--color-canvas": t.canvas, "--color-surface": t.surface, "--color-elevated": t.elevated, "--color-raised": t.raised,
      "--color-ink": t.ink, "--color-ink-muted": t.muted, "--color-ink-subtle": t.subtle,
      "--color-edge": rgbToHex(ink) + a(light ? 0.13 : 0.1), "--color-edge-soft": rgbToHex(ink) + a(light ? 0.08 : 0.06),
      "--color-accent": accent, "--color-accent-soft": accent + "2e", "--color-danger": light ? "#c0392f" : "#f0716b",
    };
    let css = ":root{";
    for (const k in tokens) css += `${k}:${tokens[k]} !important;`;
    if (ty.display) css += `--font-display:${ty.display} !important;--font-sans:${ty.sans} !important;`;
    css += `--pj-on-accent:${contrast(accent, "#16130e") >= contrast(accent, "#ffffff") ? "#16130e" : "#ffffff"};--pj-grade:${STOCKS[state.stock].grade};` +
      `--pj-d-weight:${ty.weight};--pj-d-stretch:${ty.stretch};--pj-d-track:${ty.track};--poster-radius:6px !important;` +
      `color-scheme:${light ? "light" : "dark"};}`;
    // Light mode keeps the banner a dark screen with the house lights up around it: inside the banner Harbor's own
    // tokens switch to the stock's dark set, so its fades run to near-black, the art keeps its color and white
    // title logos stay readable.
    if (light) {
      const d = STOCKS[state.stock].dark, dAcc = readable(accentFor(false, d.accent), [d.canvas, d.surface], 3, d.ink), dInk = hexToRgb(d.ink);
      css += `[data-scroll-anchor="hero"]{--color-canvas:${d.canvas} !important;--color-surface:${d.surface} !important;` +
        `--color-elevated:${d.elevated} !important;--color-raised:${d.raised} !important;--color-ink:${d.ink} !important;` +
        `--color-ink-muted:${readable(d.muted, [d.canvas], 4.5, d.ink)} !important;--color-ink-subtle:${readable(d.subtle, [d.canvas], 4.5, d.ink)} !important;` +
        `--color-edge:${rgbToHex(dInk)}1a !important;--color-edge-soft:${rgbToHex(dInk)}0f !important;--color-accent:${dAcc} !important;` +
        `--pj-on-accent:${contrast(dAcc, "#16130e") >= contrast(dAcc, "#ffffff") ? "#16130e" : "#ffffff"};color-scheme:dark;color:var(--color-ink);}`;
    }
    if (css !== lastVars) { varsStyle.textContent = css; lastVars = css; }
    const href = ty.family ? `https://fonts.googleapis.com/css2?family=${ty.family}&display=swap` : "";
    if (href && fontLink.getAttribute("href") !== href) fontLink.setAttribute("href", href);
    if (!href && fontLink.hasAttribute("href")) fontLink.removeAttribute("href");
    setAttr("pj", VERSION);
    setAttr("pj-scheme", light ? "light" : "dark");
    setAttr("pj-stock", state.stock);
    setAttr("pj-type", state.type);
    setAttr("pj-motion", motionOn() ? "on" : "off");
    runHooks(hooks.apply, light);
  }
  function set(patch) {
    Object.assign(state, normalize(Object.assign({}, state, patch)));
    save();
    apply();
  }

  /* ---------- the banner: what is showing ----------
     Harbor's home banner is [data-scroll-anchor="hero"]; the visible slide is the one with aria-hidden="false". Its
     title is a logo image (alt = title) or a heading. Checked against Harbor 0.9.113 components/hero.tsx. */
  function bannerNow() {
    const hero = doc.querySelector('[data-scroll-anchor="hero"]');
    if (!hero) return null;
    const slide = hero.querySelector('[aria-hidden="false"]') || hero;
    const img = slide.querySelector("img.object-cover");
    const src = img && (img.currentSrc || img.src);
    if (!src) return null;
    const head = slide.querySelector("h1, h2");
    const logo = slide.querySelector('img[alt]:not([alt=""]):not(.object-cover)');
    const title = (head && head.textContent.trim()) || (logo && logo.alt.trim()) || "";
    return { src, title };
  }

