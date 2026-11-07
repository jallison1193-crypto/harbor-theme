/* Fathom for Harbor, v__FATHOM_VERSION__
   Runs once when the theme loads (Harbor calls it with new Function).
   Everything it adds is removed again by window.__harborThemeCleanup. */
(() => {
  "use strict";
  const VERSION = "__FATHOM_VERSION__";
  const KEY = "fathom.settings.v1";
  const AUTO_KEY = "fathom.auto.v1";
  const SEEN_KEY = "fathom.seen.v1";
  const SCHEMA = 3;
  const doc = document, root = doc.documentElement, win = window;
  const SVGNS = "http://www.w3.org/2000/svg";
  // Edge refraction uses backdrop-filter: url(#svg-filter), which only Chromium renders.
  // Harbor on Windows runs in WebView2 (Chromium); macOS and Linux builds fall back to plain blur.
  const LENS_OK = /\b(Chrome|Chromium)\/\d+/.test(navigator.userAgent);

  if (typeof win.__fathomDispose === "function") { try { win.__fathomDispose(); } catch (e) { /* stale instance */ } }

  /* ---------- small helpers ---------- */
  let disposed = false;
  const cleanups = [];
  const listen = (t, ev, fn, opt) => { t.addEventListener(ev, fn, opt); cleanups.push(() => t.removeEventListener(ev, fn, opt)); };
  const every = (ms, fn) => { const id = setInterval(fn, ms); cleanups.push(() => clearInterval(id)); };
  const later = (ms, fn) => { const id = setTimeout(fn, ms); cleanups.push(() => clearTimeout(id)); return id; };
  const idle = (fn) => (win.requestIdleCallback ? win.requestIdleCallback(() => { if (!disposed) fn(); }, { timeout: 900 }) : setTimeout(() => { if (!disposed) fn(); }, 80));
  const el = (tag, attrs) => { const n = doc.createElement(tag); if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage full or blocked */ } },
  };
  const reduceMQ = win.matchMedia ? win.matchMedia("(prefers-reduced-motion: reduce)") : null;

  /* ---------- icons ---------- */
  const ICONS = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    discover: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    catalogs: '<rect x="3" y="4" width="18" height="4" rx="1.5"/><rect x="3" y="10" width="18" height="4" rx="1.5"/><rect x="3" y="16" width="18" height="4" rx="1.5"/>',
    movies: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    shows: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 3l4 4 4-4"/>',
    kids: '<path d="M6 9h12l-1.6 11H7.6z"/><path d="M8 9a2.5 2.5 0 1 1 4-2.5A2.5 2.5 0 1 1 16 9"/><path d="M10 12v5M14 12v5"/>',
    anime: '<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>',
    manga: '<path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z"/><path d="M12 6v13.5"/>',
    live: '<circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>',
    vod: '<path d="M4 6h12M4 11h12M4 16h7"/><path d="M15 14.5v5l4-2.5z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    library: '<path d="M5 4v16M10 4v16M15 5l4 15"/>',
    downloads: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    addons: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><path d="M16.5 13v7M13 16.5h7"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/><circle cx="12" cy="12" r="7"/>',
    ebook: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h3"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    games: '<rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M7.5 10.5v4M5.5 12.5h4"/><circle cx="15.5" cy="11.5" r=".9"/><circle cx="17.5" cy="13.5" r=".9"/>',
    sports: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    playlists: '<path d="M4 6h12M4 11h12M4 16h7"/><path d="M15 14.5v5l4-2.5z"/>',
    collections: '<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M6 6h12M8.5 3h7"/>',
    plugins: '<path d="M9 3v4M15 3v4"/><rect x="5" y="7" width="14" height="6" rx="2"/><path d="M12 13v4a3 3 0 0 1-3 3"/>',
    page: '<rect x="5" y="4" width="14" height="16" rx="3"/><circle cx="12" cy="12" r="1.6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    tune: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    mark: '<path d="M4 14c2.5 2 5.5 3 8 3s5.5-1 8-3M12 3v14M8 7h8"/><circle cx="12" cy="4" r="1"/>',
    up: '<path d="M6 15l6-6 6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
  };
  const icon = (k) => `<svg class="fx-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k] || ICONS.page}</svg>`;

  /* ---------- pages ---------- */
  // Harbor view ids (window.harbor.navigate), from Harbor's NAV_ITEMS (chrome/nav-items.tsx, 0.9.113).
  const VIEWS = [
    ["home", "Home", true], ["discover", "Discover", true], ["catalogs", "Catalogs", false], ["movies", "Movies", true],
    ["shows", "Shows", true], ["kids", "Kids", false], ["anime", "Anime", true], ["manga", "Manga", false],
    ["live", "Live TV", true], ["vod", "Playlists", false], ["calendar", "Calendar", true], ["library", "My Library", true],
    ["downloads", "Downloads", false], ["addons", "Addons", false], ["settings", "Settings", true],
  ];
  const defaultNav = () => VIEWS.map(([id, label, visible]) => ({ id, label, visible }));
  const knownLabel = (id) => { const v = VIEWS.find((x) => x[0] === id); return v ? v[1] : id.charAt(0).toUpperCase() + id.slice(1); };
  // Harbor keeps the user's nav order, hidden pages and renames in harbor.settings.navCustomization
  // (Theme Studio > Layout > Navigation items). Mirroring it keeps Fathom in step with newer Harbor pages.
  let harborRaw = null, harborNav = null;
  function readHarborNav() {
    const raw = store.get("harbor.settings") || "";
    if (raw === harborRaw) return false;
    harborRaw = raw;
    let next = null;
    try {
      const c = (JSON.parse(raw || "null") || {}).navCustomization;
      if (c && Array.isArray(c.order)) {
        const hidden = Array.isArray(c.hidden) ? c.hidden : [], renamed = c.renamed && typeof c.renamed === "object" ? c.renamed : {};
        if (c.order.length || hidden.length || Object.keys(renamed).length) {
          const ids = c.order.filter((id) => typeof id === "string" && /^[a-z][a-z0-9-]*$/.test(id));
          for (const [id] of VIEWS) if (!ids.includes(id)) ids.push(id);
          next = ids.map((id) => ({ id, label: (typeof renamed[id] === "string" && renamed[id].trim()) || knownLabel(id), visible: !hidden.includes(id) }));
        }
      }
    } catch (e) { next = null; }
    const changed = JSON.stringify(next) !== JSON.stringify(harborNav);
    harborNav = next;
    return changed;
  }
  readHarborNav();

  /* ---------- settings model ---------- */
  const DEFAULTS = {
    schema: SCHEMA,
    look: "clear",
    water: "deep", hue: 255, chroma: 1, accent: "#6fe3d0", accentFollow: false,
    blur: 10, frost: 0.04, rim: 0.5, sat: 185, radius: 22, grain: 0.05, refraction: false, refractAmt: 0.6,
    artTint: true, artStrength: 0.5, hoverTint: false,
    wall: "currents", wallMotion: true, rays: false, wallImage: "", wallDim: 0.55, wallEverywhere: true,
    font: "serif", heroGlass: true, surfaces: true, buttons: "liquid",
    chrome: "dock", menubar: true, clock: true, date: true, clock24: false,
    dockPos: "bottom", dockSize: 48, magnify: true, magnifyAmt: 0.5, dockAutohide: false, dockLabels: true,
    sidebarFit: true, sidebarW: 200, sidebarCompact: false,
    navSource: "harbor", nav: defaultNav(),
    depth: 1, tilt: 10, heroParallax: true, light: true, lightAmt: 0.5, focusRow: true,
    hover: "tilt", sheen: true, cardGlow: true, posterRadiusOverride: false, posterRadius: 14,
    perf: "balanced", pauseOnScroll: true, motion: "system", speed: 1,
  };
  // Keys a Look may change. Colors, layout and navigation stay as the user set them.
  const LOOK_KEYS = ["blur", "frost", "rim", "sat", "grain", "refraction", "refractAmt", "artTint", "artStrength", "hoverTint",
    "wall", "wallMotion", "rays", "depth", "tilt", "heroParallax", "light", "lightAmt", "focusRow", "hover", "sheen", "cardGlow"];
  const LOOKS = [
    { id: "clear", name: "Clear water", note: "Refractive glass, gentle depth", v: {} },
    { id: "shallows", name: "Shallows", note: "Thinnest glass, flatter", v: { blur: 5, frost: 0.02, rim: 0.65, depth: 0.5, tilt: 6 } },
    { id: "packice", name: "Pack ice", note: "Frosted, softer glass", v: { blur: 28, frost: 0.14, rim: 0.3, sat: 150, refraction: false } },
    { id: "still", name: "Still water", note: "No motion or tilt. Lightest on the GPU", v: { depth: 0, tilt: 0, wall: "still", wallMotion: false, light: false, hover: "lift", focusRow: false, refraction: false } },
    { id: "biolume", name: "Bioluminescent", note: "Glows with the artwork", v: { artStrength: 0.85, hoverTint: true, rays: true, lightAmt: 0.8, hover: "glow" } },
    { id: "abyss", name: "Abyss", note: "Darker and quieter", v: { wall: "abyss", light: false, artTint: false, rim: 0.32, grain: 0.03 } },
  ];
  // Base colors ("waters"). Each pairs a base hue with an accent; both can be changed afterwards.
  const WATERS = [
    { id: "deep", name: "Deep", note: "Navy, bioluminescent teal", h: 255, c: 1, accent: "#6fe3d0" },
    { id: "graphite", name: "Graphite", note: "Neutral grey, pearl", h: 255, c: 0.12, accent: "#e6e9ef" },
    { id: "kelp", name: "Kelp", note: "Green-black, lure amber", h: 165, c: 0.9, accent: "#e8c37a" },
    { id: "twilight", name: "Twilight", note: "Violet, jelly lilac", h: 300, c: 1, accent: "#c6b3ff" },
    { id: "vent", name: "Vent", note: "Warm ember, orange", h: 35, c: 0.85, accent: "#ffb36b" },
    { id: "polar", name: "Polar", note: "Ice blue, frost", h: 225, c: 0.55, accent: "#bfe6ff" },
    { id: "art", name: "From the artwork", note: "Shifts with what you watch", h: 255, c: 1, accent: "" },
  ];
  const ACCENTS = [["#6fe3d0", "Biolume teal"], ["#7cc4ff", "Sonar blue"], ["#c6b3ff", "Jelly lilac"], ["#e8c37a", "Lure amber"], ["#ff8f7a", "Coral"], ["#e6e9ef", "Pearl"]];
  const FONTS = {
    serif: { display: '"Newsreader", "Iowan Old Style", Georgia, serif', sans: '"Hanken Grotesk", "General Sans", system-ui, sans-serif' },
    sans: { display: '"Hanken Grotesk", "General Sans", system-ui, sans-serif', sans: '"Hanken Grotesk", "General Sans", system-ui, sans-serif' },
    harbor: null,
  };

  function sanitize(raw) {
    const s = { ...DEFAULTS, nav: defaultNav() };
    if (!raw || typeof raw !== "object") return s;
    const from = typeof raw.schema === "number" ? raw.schema : 1;
    for (const k in DEFAULTS) {
      if (k === "nav" || k === "schema") continue;
      if (from < 2 && LOOK_KEYS.includes(k)) continue; // the glass changed in 1.1: start looks from the new defaults
      if (k in raw && typeof raw[k] === typeof DEFAULTS[k]) s[k] = raw[k];
    }
    // 1.2: Balanced replaced Auto as the default. Auto was only ever saved because it was the default, so move it once.
    if (from < 3 && s.perf === "auto") s.perf = "balanced";
    if (from < 3) s.sidebarFit = true; // the sidebar now fits its labels; 1.1 only had a fixed width
    s.sidebarW = clamp(s.sidebarW, 140, 300);
    if (!["auto", "full", "balanced", "lite"].includes(s.perf)) s.perf = DEFAULTS.perf;
    if (Array.isArray(raw.nav)) {
      const known = new Map(defaultNav().map((n) => [n.id, n]));
      const out = [];
      for (const n of raw.nav) {
        if (!n || !known.has(n.id) || out.some((o) => o.id === n.id)) continue;
        out.push({ id: n.id, label: typeof n.label === "string" && n.label.trim() ? n.label.slice(0, 24) : known.get(n.id).label, visible: n.visible !== false });
      }
      for (const n of known.values()) if (!out.some((o) => o.id === n.id)) out.push(n);
      s.nav = out;
    }
    if (!/^#[0-9a-f]{6}$/i.test(s.accent)) s.accent = DEFAULTS.accent;
    if (s.water !== "custom" && !WATERS.some((w) => w.id === s.water)) s.water = DEFAULTS.water;
    if (s.look && !LOOKS.some((l) => l.id === s.look)) s.look = "";
    s.hue = clamp(s.hue, 0, 360); s.chroma = clamp(s.chroma, 0, 1.5);
    s.schema = SCHEMA;
    return s;
  }
  let state = (() => { try { return sanitize(JSON.parse(store.get(KEY) || "null")); } catch (e) { return sanitize(null); } })();
  let saveTimer = 0;
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => store.set(KEY, JSON.stringify(state)), 250); };

  // Auto starts at Balanced (measured smooth on the test bench) and earns Full only after smooth readings.
  // If Full ever stutters on this machine, Auto remembers and stays below it until the user asks to retry.
  const FULL_FAILED_KEY = "fathom.auto.fullFailed";
  let autoLevel = ["full", "balanced", "lite"].includes(store.get(AUTO_KEY)) ? store.get(AUTO_KEY) : "balanced";
  let fullFailed = store.get(FULL_FAILED_KEY) === "1";
  const perfLevel = () => (state.perf === "auto" ? autoLevel : state.perf);
  const motionOn = () => (state.motion === "system" ? !(reduceMQ && reduceMQ.matches) : state.motion === "on");
  const depthOn = () => motionOn() && perfLevel() !== "lite" && state.depth > 0;
  const lightOn = () => state.light && motionOn() && perfLevel() !== "lite";
  const lensOn = () => LENS_OK && state.refraction && perfLevel() === "full";
  const menubarOn = () => state.chrome === "menubar" || (state.menubar && state.chrome !== "island");

  /* ---------- color ---------- */
  const toHex = (rgb) => "#" + rgb.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("");
  const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const relLum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  function toOklch([r, g, b]) {
    const R = lin(r), G = lin(g), B = lin(b);
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
    const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
    const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return [L, Math.hypot(a, bb), ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360];
  }
  function rgbToHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, s, l];
  }
  function hslToRgb([h, s, l]) {
    if (!s) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  const ok = (L, C, h, a) => `oklch(${L} ${C.toFixed(4)} ${h.toFixed(1)}${a != null ? " / " + a : ""})`;
  // Harbor's 12 tokens, derived from one hue and a color strength.
  function palette(h, c) {
    return {
      "--color-canvas": ok(0.155, 0.022 * c, h), "--color-surface": ok(0.19, 0.024 * c, h),
      "--color-elevated": ok(0.225, 0.026 * c, h), "--color-raised": ok(0.27, 0.028 * c, h),
      "--color-ink": ok(0.965, 0.008 * c, h), "--color-ink-muted": ok(0.78, 0.03 * c, h), "--color-ink-subtle": ok(0.6, 0.035 * c, h),
      "--color-edge": ok(0.4, 0.04 * c, h, 0.62), "--color-edge-soft": ok(0.4, 0.04 * c, h, 0.26),
    };
  }
  // The dominant colorful tone of a small image, plus a luminance grid for legibility checks.
  const TW = 32, TH = 20;
  function analyse(data) {
    let r = 0, g = 0, b = 0, w = 0, ar = 0, ag = 0, ab = 0, n = 0;
    const lum = new Float32Array(TW * TH);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const R = data[i], G = data[i + 1], B = data[i + 2];
      const max = Math.max(R, G, B), min = Math.min(R, G, B), l = (max + min) / 510, s = (max - min) / 255;
      const wt = s * s * Math.max(0.05, 1 - Math.abs(l - 0.5) * 1.7);
      r += R * wt; g += G * wt; b += B * wt; w += wt; ar += R; ag += G; ab += B; n++;
      lum[p] = relLum([R, G, B]);
    }
    return { rgb: w > 0.5 ? [r / w, g / w, b / w] : [ar / n, ag / n, ab / n], lum };
  }
  const colorCache = new Map();
  function sampleImage(src) {
    if (!src) return Promise.resolve(null);
    if (colorCache.has(src)) return Promise.resolve(colorCache.get(src));
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => {
        let out = null;
        try {
          const c = el("canvas"); c.width = TW; c.height = TH;
          const ctx = c.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, TW, TH);
          out = analyse(ctx.getImageData(0, 0, TW, TH).data);
          out.w = img.naturalWidth; out.h = img.naturalHeight;
        } catch (e) { out = null; } // the image host did not allow reading pixels
        if (colorCache.size > 200) colorCache.clear();
        colorCache.set(src, out);
        resolve(out);
      };
      img.onerror = () => { colorCache.set(src, null); resolve(null); };
      img.src = src;
    });
  }
  const glassTone = (rgb) => { const [h, s, l] = rgbToHsl(rgb); return toHex(hslToRgb([h, Math.min(1, s * 1.1), clamp(l, 0.32, 0.52)])); };
  const accentTone = (rgb) => { const [h, s, l] = rgbToHsl(rgb); return toHex(hslToRgb([h, clamp(s, 0.5, 0.9), clamp(l, 0.68, 0.76)])); };

  const art = { src: "", tone: null, accent: null, hue: null, heroTone: null, heroAccent: null, heroHue: null, hovering: false };
  const effHue = () => (state.water === "art" && art.hue != null ? art.hue : state.hue);
  function setArt(rgb, fromHover) {
    if (!rgb) return;
    art.tone = glassTone(rgb); art.accent = accentTone(rgb);
    const [, C, H] = toOklch(rgb);
    if (C > 0.03) art.hue = H; // greyscale art keeps the previous hue
    if (!fromHover) { art.heroTone = art.tone; art.heroAccent = art.accent; art.heroHue = art.hue; }
    root.style.setProperty("--fx-art", art.tone);
    if (state.accentFollow || state.water === "art") writeVars();
  }
  function restoreHeroArt() {
    if (!art.heroTone) return;
    art.tone = art.heroTone; art.accent = art.heroAccent; art.hue = art.heroHue;
    root.style.setProperty("--fx-art", art.tone);
    if (state.accentFollow || state.water === "art") writeVars();
  }
  // Harbor keeps hidden pages mounted (display: none), so only trust a hero that is actually on screen.
  const visibleHero = () => {
    const hero = doc.querySelector('[data-scroll-anchor="hero"]');
    return hero && hero.getClientRects().length ? hero : null;
  };
  function frontImage() {
    const hero = visibleHero();
    if (hero) {
      const img = hero.querySelector('[aria-hidden="false"] img.object-cover') || hero.querySelector("img.object-cover");
      if (img && img.currentSrc) return img.currentSrc;
    }
    const W = win.innerWidth, H = win.innerHeight;
    for (const main of doc.querySelectorAll("main")) {
      if (!main.getClientRects().length) continue;
      const imgs = main.getElementsByTagName("img");
      for (let i = 0; i < imgs.length && i < 60; i++) {
        const r = imgs[i].getBoundingClientRect();
        if (r.width > W * 0.45 && r.top < H * 0.5 && r.bottom > 0 && imgs[i].currentSrc) return imgs[i].currentSrc;
      }
    }
    return "";
  }
  function scanArt() {
    if (disposed || doc.hidden || root.hasAttribute("data-chrome-hidden")) return;
    syncHero();
    if (!(state.artTint || state.accentFollow || state.water === "art") || art.hovering) return;
    const src = frontImage();
    if (!src || src === art.src) return;
    art.src = src;
    sampleImage(src).then((a) => { if (art.src === src && a) setArt(a.rgb, false); });
  }

  /* ---------- DOM we own ---------- */
  const fontLink = el("link", { rel: "stylesheet", id: "fathom-fonts", href: "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400..700&family=Newsreader:opsz,wght@6..72,400..500&display=swap" });
  const varsStyle = el("style", { id: "fathom-vars" });
  const wall = el("div", { id: "fathom-wall", "aria-hidden": "true" });
  wall.innerHTML = '<div class="fx-blob fx-b1"></div><div class="fx-blob fx-b2"></div><div class="fx-blob fx-b3"></div><div class="fx-blob fx-b4"></div><div class="fx-rays"></div><div class="fx-image"></div><div class="fx-vignette"></div><div class="fx-grain"></div>';
  const light = el("div", { id: "fathom-light", "aria-hidden": "true" });
  const chrome = el("div", { id: "fathom-chrome" });
  const panel = el("aside", { id: "fathom-panel", class: "fx-glass", role: "dialog", "aria-label": "Fathom settings", hidden: "" });
  const filters = doc.createElementNS(SVGNS, "svg");
  filters.setAttribute("id", "fathom-filters"); filters.setAttribute("aria-hidden", "true"); filters.setAttribute("width", "0"); filters.setAttribute("height", "0");
  doc.head.append(fontLink, varsStyle);
  doc.body.append(wall, light, chrome, panel, filters);

  /* ---------- apply settings ---------- */
  const ATTRS = new Set();
  const setAttr = (k, v) => { ATTRS.add(k); if (root.getAttribute("data-" + k) !== v) root.setAttribute("data-" + k, v); };
  const safeUrl = (u) => (/^(https?:\/\/|data:image\/)/i.test(u) ? u.replace(/["\\\n\r]/g, "") : "");

  function writeVars() {
    const s = state, h = effHue(), c = s.chroma;
    const accent = s.accentFollow && art.accent ? art.accent : s.accent;
    const onAccent = relLum(hexToRgb(accent)) > 0.42 ? "#07101c" : "#ffffff";
    const f = FONTS[s.font], img = safeUrl(s.wallImage.trim()), pal = palette(h, c);
    let tokens = "";
    for (const k in pal) tokens += `${k}:${pal[k]} !important;`;
    varsStyle.textContent =
      `html[data-fx]{--fx-h:${h.toFixed(1)};--fx-c:${c};--fx-gc:${(0.03 * c).toFixed(4)};` +
      `--fx-blur:${s.blur}px;--fx-sat:${s.sat}%;--fx-frost:${s.frost};--fx-rim:${s.rim};--fx-radius:${s.radius}px;--fx-grain:${s.grain};` +
      `--fx-tint:${s.artTint ? Math.round(s.artStrength * 34) : 0}%;--fx-art-glow:${s.artStrength};--fx-depth:${depthOn() ? s.depth : 0};` +
      `--fx-light:${s.lightAmt};--fx-speed:${s.speed};--fx-dock-size:${s.dockSize}px;--fx-sidebar-w:${s.sidebarW}px;` +
      `--fx-poster-radius:${s.posterRadius}px;--fx-wall-dim:${s.wallDim};--fx-on-accent:${onAccent};` +
      (img ? `--fx-wall-image:url("${img}");` : "") + "}" +
      `:root{${tokens}--color-accent:${accent} !important;--color-accent-soft:${accent}2e !important;` +
      (f ? `--font-display:${f.display} !important;--font-sans:${f.sans} !important;` : "") + "}";
  }
  let chromeSig = "";
  function apply() {
    const s = state, motion = motionOn(), perf = perfLevel();
    writeVars();
    setAttr("fx", VERSION);
    setAttr("fx-chrome", s.chrome);
    setAttr("fx-menubar", menubarOn() ? "on" : "off");
    setAttr("fx-dockpos", s.dockPos);
    setAttr("fx-autohide", s.chrome === "dock" && s.dockAutohide ? "on" : "off");
    setAttr("fx-labels", s.dockLabels ? "on" : "off");
    setAttr("fx-compact", s.sidebarCompact ? "on" : "off");
    setAttr("fx-sidebarfit", s.sidebarFit ? "on" : "off");
    setAttr("fx-wall", s.wall === "image" && !safeUrl(s.wallImage.trim()) ? "currents" : s.wall);
    setAttr("fx-wallmotion", s.wallMotion && motion ? "on" : "off");
    setAttr("fx-rays", s.rays && motion ? "on" : "off");
    setAttr("fx-everywhere", s.wallEverywhere ? "on" : "off");
    setAttr("fx-arttint", s.artTint ? "on" : "off");
    setAttr("fx-font", s.font);
    setAttr("fx-heroglass", s.heroGlass ? "on" : "off");
    setAttr("fx-heroimg", s.heroGlass && perf !== "lite" ? "on" : "off");
    setAttr("fx-surfaces", s.surfaces ? "on" : "off");
    setAttr("fx-buttons", s.buttons);
    setAttr("fx-depthfx", depthOn() ? "on" : "off");
    setAttr("fx-parallax", depthOn() && s.heroParallax ? "on" : "off");
    setAttr("fx-light", lightOn() ? "on" : "off");
    setAttr("fx-lens", lensOn() ? "on" : "off");
    setAttr("fx-focusrow", s.focusRow ? "on" : "off");
    setAttr("fx-hover", s.hover === "tilt" && !depthOn() ? "lift" : s.hover);
    setAttr("fx-sheen", s.sheen ? "on" : "off");
    setAttr("fx-cardglow", s.cardGlow ? "on" : "off");
    setAttr("fx-radius", s.posterRadiusOverride ? "on" : "off");
    setAttr("fx-perf", perf);
    setAttr("fx-motion", motion ? "on" : "off");
    if (!depthOn()) { resetTilt(); resetHero(); }
    const sig = JSON.stringify([s.chrome, navList(), menubarOn(), s.dockPos, s.clock, s.date, s.sidebarCompact]);
    if (sig !== chromeSig) { chromeSig = sig; renderChrome(); }
    heroSig = "";
    syncHero();
    syncRays();
    scheduleLenses();
  }

  /* ---------- edge refraction (Chromium) ----------
     A displacement map per glass shape: neutral grey inside, pushing the backdrop inward near the rim,
     strongest at the edge. Built at half resolution on idle, only when a shape's size really changes.
     The lens is never switched on or off abruptly. Its strength (feDisplacementMap scale) fades to zero first, and
     only then does the element drop the lens filter, which at zero strength looks exactly like the plain glass.
     It fades out while you scroll and while a shape is being rebuilt, and fades back in once things settle.
     (Dock magnification only scales icons, so the dock keeps its size and its lens.) */
  function lensMap(w, h, r, edge) {
    const q = 2, W = Math.max(2, Math.ceil(w / q)), H = Math.max(2, Math.ceil(h / q));
    const E = Math.max(1, edge / q), hw = W / 2, hh = H / 2, R = Math.min(r / q, hw, hh);
    const c = el("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d"), im = ctx.createImageData(W, H), d = im.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const X = x + 0.5 - W / 2, Y = y + 0.5 - H / 2, qx = Math.abs(X) - (hw - R), qy = Math.abs(Y) - (hh - R);
      let dist, nx, ny;
      if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy); dist = R - l; nx = (qx / l) * Math.sign(X); ny = (qy / l) * Math.sign(Y); }
      else if (qx > qy) { dist = R - qx; nx = Math.sign(X); ny = 0; }
      else { dist = R - qy; nx = 0; ny = Math.sign(Y); }
      const t = clamp(1 - dist / E, 0, 1), m = t * t * (3 - 2 * t);
      const i = (y * W + x) * 4;
      d[i] = 128 - nx * m * 127; d[i + 1] = 128 - ny * m * 127; d[i + 2] = 128; d[i + 3] = 255;
    }
    ctx.putImageData(im, 0, 0);
    return c;
  }
  function lensFilter(id) {
    let f = filters.querySelector("#fx-lens-" + id);
    if (!f) {
      f = doc.createElementNS(SVGNS, "filter");
      f.setAttribute("id", "fx-lens-" + id);
      for (const [k, v] of [["x", "0"], ["y", "0"], ["width", "1"], ["height", "1"], ["filterUnits", "objectBoundingBox"], ["primitiveUnits", "userSpaceOnUse"], ["color-interpolation-filters", "sRGB"]]) f.setAttribute(k, v);
      f.innerHTML = '<feFlood flood-color="rgb(128,128,128)" result="n"/><feImage x="0" y="0" preserveAspectRatio="none" result="m0"/><feComposite in="m0" in2="n" operator="over" result="m"/><feDisplacementMap in="SourceGraphic" in2="m" xChannelSelector="R" yChannelSelector="G" scale="0"/>';
      filters.append(f);
    }
    return f;
  }
  // One record per refracting shape: { el, key, amt (current strength), target, raf, building }
  const LENS_PARTS = { dock: ["#fx-dock", 18], island: ["#fx-island", 16], sidebar: ["#fx-sidebar", 22] };
  const lenses = new Map();
  let lensTimer = 0;
  const lensStrength = () => Math.round(8 + 44 * state.refractAmt);
  const lensQuiet = () => root.hasAttribute("data-fx-scrolling") || doc.hidden;
  function fadeLens(L, to, ms) {
    cancelAnimationFrame(L.raf);
    L.target = to;
    const disp = lensFilter(L.id).querySelector("feDisplacementMap");
    if (to > 0 && L.el.isConnected) L.el.setAttribute("data-fx-lens-ready", "");
    const from = L.amt, t0 = performance.now(), dur = motionOn() ? ms : 0;
    const step = (now) => {
      const k = dur ? clamp((now - t0) / dur, 0, 1) : 1, e = k * k * (3 - 2 * k);
      L.amt = from + (to - from) * e;
      disp.setAttribute("scale", L.amt.toFixed(2));
      if (k < 1 && !disposed) { L.raf = requestAnimationFrame(step); return; }
      L.raf = 0;
      if (to === 0) L.el.removeAttribute("data-fx-lens-ready"); // invisible at zero strength
    };
    L.raf = requestAnimationFrame(step);
  }
  async function readyLens(L) {
    const w = L.el.offsetWidth, h = L.el.offsetHeight;
    if (!w || !h) return false;
    const r = Math.min(parseFloat(getComputedStyle(L.el).borderTopLeftRadius) || 0, w / 2, h / 2);
    const key = [w, h, Math.round(r)].join("x");
    if (L.key === key) return true;
    // Only build for a size that has held still for a moment (a resize or a settings change may still be animating).
    const now = performance.now();
    if (L.seen !== key) { L.seen = key; L.seenAt = now; return false; }
    if (now - L.seenAt < 250) return false;
    if (L.amt > 0 || L.el.hasAttribute("data-fx-lens-ready")) { fadeLens(L, 0, 120); return false; } // fade first, rebuild next pass
    if (L.building) return false;
    L.building = true;
    const url = lensMap(w, h, r, LENS_PARTS[L.id][1]).toDataURL();
    const probe = new Image(); probe.src = url;
    try { await probe.decode(); } catch (e) { /* still usable */ }
    L.building = false;
    if (disposed || !L.el.isConnected) return false;
    const fi = lensFilter(L.id).querySelector("feImage");
    fi.setAttribute("width", String(w)); fi.setAttribute("height", String(h)); fi.setAttribute("href", url);
    L.key = key;
    return true;
  }
  // Called whenever something might change what the lenses should be doing. Cheap when nothing changed.
  async function syncLenses() {
    for (const id in LENS_PARTS) {
      const node = chrome.querySelector(LENS_PARTS[id][0]);
      let L = lenses.get(id);
      if (L && L.el !== node) { cancelAnimationFrame(L.raf); L.el.removeAttribute("data-fx-lens-ready"); lenses.delete(id); L = null; }
      if (!node) continue;
      if (!L) { L = { id, el: node, key: "", seen: "", seenAt: 0, amt: 0, target: 0, raf: 0, building: false }; lenses.set(id, L); lensFilter(id).querySelector("feDisplacementMap").setAttribute("scale", "0"); }
      const want = lensOn() && !lensQuiet() ? lensStrength() : 0;
      if (!want) { if (L.target !== 0 || L.amt > 0) fadeLens(L, 0, 140); continue; }
      if (!(await readyLens(L))) { scheduleLenses(200); continue; }
      if (L.target !== want || (!L.raf && Math.abs(L.amt - want) > 0.01)) fadeLens(L, want, 320);
    }
  }
  // Fade every lens out right now (scrolling started). No idle wait: this must beat the motion.
  function quietLenses() { lenses.forEach((L) => { if (L.target !== 0 || L.amt > 0) fadeLens(L, 0, 100); }); scheduleLenses(320); }
  function scheduleLenses(ms) { clearTimeout(lensTimer); lensTimer = setTimeout(() => idle(syncLenses), ms == null ? 160 : ms); }
  const ro = win.ResizeObserver ? new ResizeObserver(() => { scheduleLenses(); measureSidebar(); }) : null;
  cleanups.push(() => { clearTimeout(lensTimer); if (ro) ro.disconnect(); lenses.forEach((L) => cancelAnimationFrame(L.raf)); });
  // The sidebar is as wide as its labels; content to its right is offset by its measured width.
  let sidebarW = 0;
  function measureSidebar() {
    const sb = chrome.querySelector("#fx-sidebar");
    const w = sb ? Math.round(sb.getBoundingClientRect().width) : 0;
    if (w === sidebarW) return;
    sidebarW = w;
    if (w) root.style.setProperty("--fx-sidebar-w", w + "px"); else root.style.removeProperty("--fx-sidebar-w");
  }

  /* ---------- light rays: drawn once into an image (half resolution) with their fade baked in ---------- */
  let raysKey = "", raysUrl = "";
  function syncRays() {
    if (root.getAttribute("data-fx-rays") !== "on" || perfLevel() !== "full") return;
    const W = Math.round((win.innerWidth * 1.2) / 2), H = Math.round((win.innerHeight * 0.9) / 2);
    const h = effHue(), c = state.chroma, key = [W, H, h.toFixed(0), c].join("|");
    if (!W || !H || key === raysKey) return;
    raysKey = key;
    idle(() => {
      const cv = el("canvas"); cv.width = W; cv.height = H;
      const x = cv.getContext("2d");
      x.fillStyle = `oklch(0.86 ${(0.08 * c).toFixed(3)} ${h.toFixed(1)})`; x.fillRect(0, 0, 1, 1);
      const [r, g, b] = x.getImageData(0, 0, 1, 1).data;
      const im = x.createImageData(W, H), d = im.data;
      // Stripes 4px wide every 140px at 105deg, faded inside an ellipse high on the left.
      const vx = Math.sin((105 * Math.PI) / 180), vy = -Math.cos((105 * Math.PI) / 180);
      const cx = 0.383 * W, cy = 0.2 * H, rx = 0.7 * W, ry = 0.78 * H;
      for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
        const fade = 1 - Math.hypot((px - cx) / rx, (py - cy) / ry);
        if (fade <= 0) continue;
        const m = ((((px * 2 * vx + py * 2 * vy) % 140) + 140) % 140);
        const line = clamp(2.5 - Math.abs(m - 62), 0, 1);
        if (!line) continue;
        const i = (py * W + px) * 4;
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = Math.round(255 * 0.02 * line * fade);
      }
      x.putImageData(im, 0, 0);
      cv.toBlob((blob) => {
        if (!blob || disposed || raysKey !== key) return;
        if (raysUrl) URL.revokeObjectURL(raysUrl);
        raysUrl = URL.createObjectURL(blob);
        wall.style.setProperty("--fx-rays-img", `url("${raysUrl}")`);
      });
    });
  }
  cleanups.push(() => { if (raysUrl) URL.revokeObjectURL(raysUrl); });

  /* ---------- hero glass: a blurred copy of the hero image under the card ----------
     Each card gets a small image of exactly what sits behind it (the artwork plus Harbor's two shading gradients),
     blurred, saturated and, in Full mode, refracted at the edges, drawn once into a canvas. The card shows that
     image with no CSS filter, so tilting and scrolling only move a texture. Artwork that can't be read into a
     canvas (no CORS headers) falls back to the same layers filtered by CSS. */
  let heroSig = "";
  const lastBd = new WeakMap();
  const bakeUrls = new Set();
  const imgCache = new Map();
  const CANVAS_FILTER = (() => { try { const c = el("canvas").getContext("2d"); c.filter = "blur(2px)"; return c.filter === "blur(2px)"; } catch (e) { return false; } })();
  function loadImage(src) {
    if (imgCache.has(src)) return imgCache.get(src);
    const p = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; img.decoding = "async";
      img.onload = () => resolve(img); img.onerror = () => resolve(null);
      img.src = src;
    });
    if (imgCache.size > 24) imgCache.clear();
    imgCache.set(src, p);
    return p;
  }
  function clearHero() {
    doc.querySelectorAll('[data-scroll-anchor="hero"] .max-w-2xl[data-fx-bd]').forEach((c) => {
      c.removeAttribute("data-fx-bd"); c.removeAttribute("data-fx-bd-url");
      ["--fx-bd", "--fx-bd-img", "--fx-pad", "--fx-bd-o", "--fx-scrim"].forEach((p) => c.style.removeProperty(p));
    });
    bakeUrls.forEach((u) => URL.revokeObjectURL(u)); bakeUrls.clear();
  }
  function offsetWithin(node, ancestor) {
    let x = 0, y = 0, n = node;
    while (n && n !== ancestor) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return n === ancestor ? [x, y] : null;
  }
  // Edge refraction applied to pixels: near the rim, each pixel reads from further inside the card.
  function refractPixels(ctx, W, H, pad, r, edge, strength) {
    const src = ctx.getImageData(0, 0, W, H), out = ctx.createImageData(W, H), s = src.data, d = out.data;
    const hw = W / 2 - pad, hh = H / 2 - pad, R = Math.min(r, hw, hh);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const X = x + 0.5 - W / 2, Y = y + 0.5 - H / 2, qx = Math.abs(X) - (hw - R), qy = Math.abs(Y) - (hh - R);
      let dist, nx, ny;
      if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; dist = R - l; nx = (qx / l) * Math.sign(X); ny = (qy / l) * Math.sign(Y); }
      else if (qx > qy) { dist = R - qx; nx = Math.sign(X); ny = 0; }
      else { dist = R - qy; nx = 0; ny = Math.sign(Y); }
      const t = clamp(1 - dist / edge, 0, 1), m = t * t * (3 - 2 * t) * strength;
      const sx = clamp(Math.round(x - nx * m), 0, W - 1), sy = clamp(Math.round(y - ny * m), 0, H - 1);
      const i = (y * W + x) * 4, j = (sy * W + sx) * 4;
      d[i] = s[j]; d[i + 1] = s[j + 1]; d[i + 2] = s[j + 2]; d[i + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
  }
  // Returns true when the card now shows a baked image, false when it can't (CORS), null when superseded.
  async function bakeCard(card, job) {
    const { src, pad, box, img, shade, imgAlpha, rtl, sec, key } = job;
    const image = await loadImage(src);
    if (disposed || !card.isConnected || lastBd.get(card) !== key) return null;
    if (!image) return false;
    const W = Math.ceil(box.w + pad * 2), H = Math.ceil(box.h + pad * 2);
    const canvasColor = getComputedStyle(card).getPropertyValue("--color-canvas").trim() || "#070b12";
    const layer = () => { const c = el("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"); x.translate(pad - box.x, pad - box.y); return [c, x]; };
    // 1. What sits behind the card, drawn in the hero section's coordinates.
    const [a, ax] = layer();
    ax.fillStyle = canvasColor; ax.fillRect(box.x - pad, box.y - pad, W, H);
    ax.drawImage(image, img.x, img.y, img.w, img.h);
    if (imgAlpha < 1) { ax.globalAlpha = 1 - imgAlpha; ax.fillRect(img.x, img.y, img.w, img.h); ax.globalAlpha = 1; }
    // Harbor's shades: canvas color faded by a gradient, left to right (to-r) and bottom up (to-t).
    const shadeLayer = (x0, y0, x1, y1, stops, rx, ry, rw, rh, alpha) => {
      const [t, tx] = layer();
      tx.fillStyle = canvasColor; tx.fillRect(rx, ry, rw, rh);
      const g = tx.createLinearGradient(x0, y0, x1, y1);
      stops.forEach(([o, v]) => g.addColorStop(o, `rgba(0,0,0,${v})`));
      tx.globalCompositeOperation = "destination-in"; tx.fillStyle = g; tx.fillRect(rx, ry, rw, rh);
      ax.save(); ax.setTransform(1, 0, 0, 1, 0, 0); ax.globalAlpha = alpha; ax.drawImage(t, 0, 0); ax.restore();
    };
    shadeLayer(rtl ? sec.w : 0, 0, rtl ? 0 : sec.w, 0, [[0, 1], [0.5, 0.85], [1, 0]], 0, 0, sec.w, sec.h, shade);
    shadeLayer(0, sec.h, 0, sec.h * 0.6, [[0, 1], [0.5, 0.7], [1, 0]], 0, sec.h * 0.6, sec.w, sec.h * 0.4, 1);
    // 2. Blur, saturate and brighten in one pass, like the glass does.
    const b = el("canvas"); b.width = W; b.height = H;
    const bx = b.getContext("2d", { willReadFrequently: true });
    bx.filter = `blur(${state.blur}px) saturate(${state.sat}%) brightness(1.04)`;
    bx.drawImage(a, 0, 0);
    bx.filter = "none";
    // 3. Refraction at the card's edges (Full mode only, like the chrome). Reading pixels also proves CORS is fine.
    try {
      if (lensOn()) refractPixels(bx, W, H, pad, 24, 30, (8 + 44 * state.refractAmt) / 2);
      else bx.getImageData(0, 0, 1, 1);
    } catch (e) { return false; }
    const blob = await new Promise((res) => { try { b.toBlob(res, "image/webp", 0.88); } catch (e) { res(null); } });
    if (disposed || !card.isConnected || lastBd.get(card) !== key) return null;
    if (!blob) return false;
    const url = URL.createObjectURL(blob);
    bakeUrls.add(url);
    // Decode before showing, so the swap from the CSS copy is seamless.
    const probe = new Image(); probe.src = url;
    try { await probe.decode(); } catch (e) { /* show anyway */ }
    if (disposed || !card.isConnected || lastBd.get(card) !== key) { URL.revokeObjectURL(url); bakeUrls.delete(url); return null; }
    const old = card.getAttribute("data-fx-bd-url");
    card.style.setProperty("--fx-bd-img", `url("${url}")`);
    card.setAttribute("data-fx-bd-url", url);
    card.setAttribute("data-fx-bd", "img");
    if (old && old !== url) later(1500, () => { URL.revokeObjectURL(old); bakeUrls.delete(old); });
    return true;
  }
  function syncHero() {
    const hero = visibleHero();
    if (!state.heroGlass || !hero) return;
    const cards = hero.querySelectorAll(".max-w-2xl");
    const pad = Math.ceil(state.blur * 2 + 6);
    let sig = String(pad);
    const jobs = [];
    cards.forEach((card) => {
      const section = card.closest(".group");
      const img = section && section.querySelector("img.object-cover");
      if (!img || !img.currentSrc || !img.naturalWidth || !section.offsetWidth) { card.removeAttribute("data-fx-bd"); lastBd.delete(card); return; }
      const cp = offsetWithin(card, section);
      if (!cp) return;
      const sw = section.offsetWidth, sh = section.offsetHeight;
      const bx = img.offsetLeft, by = img.offsetTop, bw = img.offsetWidth, bh = img.offsetHeight;
      const k = Math.max(bw / img.naturalWidth, bh / img.naturalHeight), dw = img.naturalWidth * k, dh = img.naturalHeight * k;
      const dx = bx + (bw - dw) / 2, dy = by + (bh - dh) / 2;
      const ox = pad - cp[0], oy = pad - cp[1];
      const grad = section.querySelector(".bg-gradient-to-r");
      const shade = grad ? clamp(parseFloat(getComputedStyle(grad).opacity) || 0, 0, 1) : 1;
      const imgAlpha = clamp(parseFloat(img.style.opacity) || 1, 0, 1) || 1;
      const rtl = getComputedStyle(section).direction === "rtl";
      const C = "var(--color-canvas)", mix = (p) => `color-mix(in srgb, ${C} ${Math.round(p * 100)}%, transparent)`;
      const px = (v) => v.toFixed(1) + "px";
      const src = img.currentSrc.replace(/["\\\n\r]/g, "");
      // CSS version of the same picture: shown until the baked image is ready, and when it can't be made.
      const bd = [
        `linear-gradient(to top, ${C}, ${mix(0.7)} 50%, transparent) ${px(ox)} ${px(oy + sh * 0.6)} / ${px(sw)} ${px(sh * 0.4)} no-repeat`,
        `linear-gradient(${rtl ? "to left" : "to right"}, ${mix(shade)}, ${mix(0.85 * shade)} 50%, transparent) ${px(ox)} ${px(oy)} / ${px(sw)} ${px(sh)} no-repeat`,
        `linear-gradient(${mix(1 - imgAlpha)}, ${mix(1 - imgAlpha)}) ${px(ox + dx)} ${px(oy + dy)} / ${px(dw)} ${px(dh)} no-repeat`,
        `url("${src}") ${px(ox + dx)} ${px(oy + dy)} / ${px(dw)} ${px(dh)} no-repeat ${C}`,
      ].join(", ");
      const origin = `${px(ox + bx + bw / 2)} ${px(oy + by + bh / 2)}`;
      const key = bd + origin + [state.blur, state.sat, lensOn() ? state.refractAmt : "-", effHue().toFixed(0), state.chroma].join("|");
      sig += bd.length + src;
      if (lastBd.get(card) !== key) {
        lastBd.set(card, key);
        card.style.setProperty("--fx-pad", pad + "px");
        card.style.setProperty("--fx-bd", bd);
        card.style.setProperty("--fx-bd-o", origin);
        if (card.getAttribute("data-fx-bd") !== "img") card.setAttribute("data-fx-bd", "css");
        const job = { src: img.currentSrc, pad, box: { x: cp[0], y: cp[1], w: card.offsetWidth, h: card.offsetHeight }, img: { x: dx, y: dy, w: dw, h: dh }, shade, imgAlpha, rtl, sec: { w: sw, h: sh }, key };
        const fallback = () => { if (lastBd.get(card) === key) card.setAttribute("data-fx-bd", "css"); };
        if (CANVAS_FILTER && perfLevel() !== "lite") idle(() => bakeCard(card, job).then((ok) => { if (ok === false) fallback(); }, fallback));
        else fallback();
      }
      jobs.push([card, img.currentSrc, [dx, dy, dw, dh], [cp[0], cp[1], card.offsetWidth, card.offsetHeight], sw, shade]);
    });
    if (sig === heroSig) return;
    heroSig = sig;
    // Adaptive scrim: darken the card's glass when the art behind its text is bright.
    for (const [card, src, [dx, dy, dw, dh], [cx, cy, cw, ch], sw, shade] of jobs) {
      sampleImage(src).then((a) => {
        if (!a || !card.isConnected) return;
        const vals = [];
        for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) {
          const x = dx + ((tx + 0.5) / TW) * dw, y = dy + ((ty + 0.5) / TH) * dh;
          if (x < cx || x > cx + cw || y < cy || y > cy + ch) continue;
          const g = (x / sw < 0.5 ? 1 - 0.3 * (x / sw) : 0.85 * (1 - (x / sw - 0.5) / 0.5)) * shade; // Harbor's left gradient
          vals.push(a.lum[ty * TW + tx] * (1 - g));
        }
        if (!vals.length) return;
        vals.sort((p, q) => p - q);
        const p80 = vals[Math.floor(vals.length * 0.8)];
        card.style.setProperty("--fx-scrim", clamp((p80 - 0.06) * 1.6, 0.06, 0.56).toFixed(3));
      });
    }
    scheduleLenses();
  }

  /* ---------- chrome ---------- */
  let current = "home";
  const navList = () => (state.navSource === "harbor" && harborNav ? harborNav : state.nav);
  const labelOf = (id) => (navList().find((n) => n.id === id) || { label: "" }).label;
  const navBtn = (n, cls, inner, extra) =>
    `<button type="button" class="fx-nb ${cls}" data-harbor-nav="${n.id}" data-fx-go="${n.id}" aria-label="${esc(n.label)}"${extra || ""}${current === n.id ? " data-active" : ""}>${inner}</button>`;
  const actBtn = (cls, act, label, inner) => `<button type="button" class="${cls}" data-fx-act="${act}" aria-label="${label}"${act === "panel" ? ' aria-keyshortcuts="Alt+T"' : ""}>${inner}</button>`;

  // Customize is always on screen, labeled, in whichever navigation style is active (and in the menu bar too).
  const CUSTOMIZE = "Customize";
  function renderChrome() {
    const s = state, items = navList().filter((n) => n.visible);
    const pages = items.filter((n) => n.id !== "settings"), tail = items.filter((n) => n.id === "settings");
    const search = !menubarOn(); // with a menu bar, search lives up there
    const custText = icon("tune") + `<span>${CUSTOMIZE}</span>`;
    let html = "";
    if (menubarOn()) {
      const middle = s.chrome === "menubar"
        ? `<nav class="fx-links" aria-label="Pages">${items.map((n) => navBtn(n, "fx-link", esc(n.label))).join("")}</nav>`
        : `<span class="fx-where" data-tauri-drag-region>${esc(current ? labelOf(current) : "")}</span>`;
      html += `<header id="fx-menubar" class="fx-glass fx-bar" data-tauri-drag-region>` +
        `<span class="fx-brand" data-tauri-drag-region>${icon("mark")}Harbor</span>${middle}` +
        `<span class="fx-right">` + actBtn("fx-ib", "search", "Search", icon("search")) +
        (s.clock ? '<span class="fx-clock" data-fx-clock></span>' : "") +
        actBtn("fx-ib fx-cust", "panel", "Customize Fathom", custText) + `</span></header>`;
    }
    const tip = (t) => `<span class="fx-tip" aria-hidden="true">${esc(t)}</span>`;
    if (s.chrome === "dock") {
      html += `<nav id="fx-dock" class="fx-glass" aria-label="Pages">` +
        pages.map((n) => navBtn(n, "fx-di", icon(n.id) + tip(n.label))).join("") +
        `<span class="fx-sep" aria-hidden="true"></span>` +
        (search ? actBtn("fx-nb fx-di", "search", "Search", icon("search") + tip("Search")) : "") +
        tail.map((n) => navBtn(n, "fx-di", icon(n.id) + tip(n.label))).join("") +
        actBtn("fx-nb fx-di fx-cust", "panel", "Customize Fathom", icon("tune") + tip(CUSTOMIZE)) + `</nav>`;
    } else if (s.chrome === "sidebar") {
      const t = (label) => (s.sidebarCompact ? ` title="${esc(label)}"` : "");
      html += `<nav id="fx-sidebar" class="fx-glass" aria-label="Pages">` +
        pages.map((n) => navBtn(n, "fx-si", icon(n.id) + `<span>${esc(n.label)}</span>`, t(n.label))).join("") +
        `<div class="fx-grow"></div>` +
        (search ? actBtn("fx-nb fx-si", "search", "Search", icon("search") + "<span>Search</span>") : "") +
        tail.map((n) => navBtn(n, "fx-si", icon(n.id) + `<span>${esc(n.label)}</span>`, t(n.label))).join("") +
        actBtn("fx-nb fx-si fx-cust", "panel", "Customize Fathom", custText).replace("<button ", `<button${t(CUSTOMIZE)} `) + `</nav>`;
    } else if (s.chrome === "island") {
      html += `<nav id="fx-island" class="fx-glass" aria-label="Pages" data-tauri-drag-region>` +
        pages.map((n) => navBtn(n, "fx-ii", icon(n.id) + `<span>${esc(n.label)}</span>`)).join("") +
        actBtn("fx-nb fx-ii fx-iconly", "search", "Search", icon("search")) +
        tail.map((n) => navBtn(n, "fx-ii fx-iconly", icon(n.id))).join("") +
        (s.clock ? '<span class="fx-clock" data-fx-clock></span>' : "") +
        actBtn("fx-nb fx-ii fx-cust", "panel", "Customize Fathom", custText) + `</nav>`;
    }
    chrome.innerHTML = html;
    tickClock();
    if (ro) { ro.disconnect(); chrome.querySelectorAll(".fx-glass").forEach((n) => ro.observe(n)); }
    measureSidebar();
    scheduleLenses();
    if (prompt) placePrompt();
  }
  function markActive() {
    chrome.querySelectorAll("[data-harbor-nav]").forEach((b) => b.toggleAttribute("data-active", b.getAttribute("data-harbor-nav") === current));
  }
  function updateWhere() {
    const w = chrome.querySelector(".fx-where");
    if (w) w.textContent = current ? labelOf(current) : "";
  }
  function go(id) {
    current = id; markActive();
    try { if (win.harbor && typeof win.harbor.navigate === "function") win.harbor.navigate(id); } catch (e) { /* Harbor not ready */ }
  }
  // Newer Harbor exposes harbor.search(); older builds only have the "/" hotkey on window.
  const openSearch = () => {
    if (win.harbor && typeof win.harbor.search === "function") { try { win.harbor.search(); return; } catch (e) { /* fall through */ } }
    win.dispatchEvent(new KeyboardEvent("keydown", { key: "/", bubbles: true, cancelable: true }));
  };
  function tickClock() {
    const now = new Date();
    const time = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: !state.clock24 });
    const date = state.date ? now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) + "   " : "";
    chrome.querySelectorAll("[data-fx-clock]").forEach((c) => { c.textContent = date + time; });
  }
  listen(chrome, "click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.fxGo) go(b.dataset.fxGo);
    else if (b.dataset.fxAct === "search") openSearch();
    else if (b.dataset.fxAct === "panel") togglePanel(b);
  });
  listen(win, "harbor:scroll-top", (e) => {
    const v = e && e.detail && e.detail.view;
    if (v && v !== current) { current = v; markActive(); updateWhere(); }
  });
  // Harbor sets data-active on every [data-harbor-nav] for its current page (none on a title or person page).
  // Following that keeps the label honest, and lets the selection pill flow from the old item to the new one.
  function morph(from, to) {
    const box = to.parentElement;
    if (!box || box !== from.parentElement || !motionOn()) return;
    const br = box.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    if (!a.width || !b.width) return;
    const inset = parseFloat(getComputedStyle(to).getPropertyValue("--fx-pill-inset")) || 0, bw = b.width - inset * 2, bh = b.height - inset * 2;
    const blob = el("span", { class: "fx-morph", "aria-hidden": "true" });
    blob.style.cssText = `left:${b.left - br.left + inset - box.clientLeft}px;top:${b.top - br.top + inset - box.clientTop}px;width:${bw}px;height:${bh}px;border-radius:${getComputedStyle(to).borderRadius}`;
    const dx = a.left - b.left, dy = a.top - b.top, sx = (a.width - inset * 2) / bw, sy = (a.height - inset * 2) / bh;
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    const mid = horizontal ? `scale(${((sx + 1) / 2) * 1.22}, ${((sy + 1) / 2) * 0.88})` : `scale(${((sx + 1) / 2) * 0.9}, ${((sy + 1) / 2) * 1.2})`;
    box.setAttribute("data-fx-morphing", "");
    box.append(blob);
    const anim = blob.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45}px) ${mid}`, offset: 0.42 },
      { transform: "translate(0, 0) scale(1, 1)" },
    ], { duration: 520 / state.speed, easing: "cubic-bezier(.3, 1.25, .45, 1)" });
    const done = () => { blob.remove(); if (!box.querySelector(".fx-morph")) box.removeAttribute("data-fx-morphing"); };
    anim.onfinish = done; anim.oncancel = done;
  }
  const navObserver = new MutationObserver((records) => {
    const added = new Map(), removed = new Map();
    for (const r of records) {
      const t = r.target;
      if (t.hasAttribute("data-active")) { if (r.oldValue === null) added.set(t.parentElement, t); }
      else if (r.oldValue !== null) removed.set(t.parentElement, t);
    }
    if (added.size) { const first = added.values().next().value; current = first.getAttribute("data-harbor-nav") || current; }
    else if (removed.size && !chrome.querySelector("[data-active]")) current = "";
    updateWhere();
    for (const [box, to] of added) { const from = removed.get(box); if (from) morph(from, to); }
  });
  navObserver.observe(chrome, { subtree: true, attributes: true, attributeFilter: ["data-active"], attributeOldValue: true });
  cleanups.push(() => navObserver.disconnect());

  // Dock magnification, animated per frame. 1.2 first resized the icons with 0.16s CSS transitions that a fast
  // sweep retargeted every frame, and every resize re-laid out the dock and re-blurred its backdrop: smooth when
  // slow, choppy when quick. Now the magnified spot glides after the pointer (time constant ~45ms), the effect
  // grows in and out on enter and leave, sizes follow a smooth cosine falloff, and only transforms change
  // (see #fx-dock .fx-di in theme.css). The loop runs only while something is still moving.
  const MAG_FOLLOW = 0.045, MAG_GROW = 0.09, MAG_SHRINK = 0.12; // seconds
  let magRaf = 0, magPtr = null, magPos = null, magAmt = 0, magWant = 0, magLast = 0;
  // Item centers relative to the dock's center, from the layout rules in theme.css (8px padding, 4px gaps,
  // separators 1px plus 4px margins), so nothing is measured while icons are scaled.
  function restCenters(dock) {
    const size = state.dockSize, kids = [...dock.children].filter((n) => n.classList.contains("fx-di") || n.classList.contains("fx-sep"));
    const out = [];
    let pos = 8;
    kids.forEach((n, i) => {
      const len = n.classList.contains("fx-sep") ? 9 : size;
      if (n.classList.contains("fx-di")) out.push(pos + len / 2);
      pos += len + (i < kids.length - 1 ? 4 : 0);
    });
    const total = pos + 8;
    return out.map((c) => c - total / 2);
  }
  const kickMag = () => { if (!magRaf && !disposed) magRaf = requestAnimationFrame(magFrame); };
  function magFrame(now) {
    magRaf = 0;
    const dock = chrome.querySelector("#fx-dock");
    if (!dock) { magAmt = 0; magPos = null; magLast = 0; return; }
    const dt = magLast ? Math.min(0.05, (now - magLast) / 1000) : 1 / 120;
    magLast = now;
    const vertical = state.dockPos === "left";
    const items = [...dock.querySelectorAll(".fx-di")], rest = restCenters(dock);
    const dr = dock.getBoundingClientRect(), center = vertical ? dr.top + dr.height / 2 : dr.left + dr.width / 2;
    const target = magPtr == null ? magPos : magPtr - center;
    if (target != null) magPos = magPos == null ? target : magPos + (target - magPos) * (1 - Math.exp(-dt / MAG_FOLLOW));
    magAmt += (magWant - magAmt) * (1 - Math.exp(-dt / (magWant > magAmt ? MAG_GROW : MAG_SHRINK)));
    if (magWant === 0 && magAmt < 0.003) {
      items.forEach((d) => d.style.removeProperty("--s"));
      magAmt = 0; magPos = null; magLast = 0;
      return;
    }
    const reach = state.dockSize * 2.4, A = state.magnifyAmt * magAmt;
    items.forEach((d, i) => {
      const x = Math.min(1, Math.abs((magPos || 0) - rest[i]) / reach);
      const v = (1 + A * (0.5 + 0.5 * Math.cos(Math.PI * x))).toFixed(3);
      if (d.style.getPropertyValue("--s") !== v) d.style.setProperty("--s", v);
    });
    const still = Math.abs((target == null ? magPos : target) - magPos) < 0.25 && Math.abs(magWant - magAmt) < 0.003;
    if (!still) kickMag(); else magLast = 0;
  }
  listen(chrome, "pointermove", (e) => {
    if (!e.target.closest || !e.target.closest("#fx-dock") || !state.magnify || !motionOn()) return;
    magPtr = state.dockPos === "left" ? e.clientY : e.clientX;
    magWant = 1;
    kickMag();
  });
  listen(chrome, "pointerout", (e) => {
    const dock = chrome.querySelector("#fx-dock");
    if (dock && !dock.contains(e.relatedTarget) && magWant) { magWant = 0; magPtr = null; kickMag(); }
  });
  const reveal = (on) => { if (on) root.setAttribute("data-fx-reveal", ""); else root.removeAttribute("data-fx-reveal"); };
  listen(chrome, "focusin", () => reveal(true));
  listen(chrome, "focusout", () => reveal(false));

  /* ---------- pointer: hero depth, poster tilt, light, rim highlight ---------- */
  let ptRaf = 0, lastEv = null, tilted = null, hoverCard = null, hoverTimer = 0, restoreTimer = 0, scrollTimer = 0;
  let heroMoved = null, lastLg = 999, lastLgAt = 0, focusRow = null;
  function setFocusRow(row) {
    if (focusRow) focusRow.removeAttribute("data-fx-row");
    focusRow = row;
    if (row) { row.setAttribute("data-fx-row", ""); root.setAttribute("data-fx-rowfocus", ""); }
    else root.removeAttribute("data-fx-rowfocus");
  }
  const paused = () => doc.hidden || root.hasAttribute("data-chrome-hidden") || (state.pauseOnScroll && root.hasAttribute("data-fx-scrolling"));
  function resetTilt() { if (tilted) { tilted.style.removeProperty("transform"); tilted = null; } }
  // The banner tilts as one piece; inside it the active image shifts, and that slide's card moves its glass copy
  // by the same amount so the glass keeps showing exactly what is behind it. Inline transforms on just these
  // three elements keep a pointer move from restyling the rest of the carousel.
  function heroParts(hero) {
    const slide = hero.querySelector('[aria-hidden="false"]') || hero;
    return { hero, img: slide.querySelector("img.object-cover"), card: slide.querySelector(".max-w-2xl") };
  }
  function moveHero(hero, px, py) {
    const d = state.depth, parts = heroMoved && heroMoved.hero === hero ? heroMoved : heroParts(hero);
    if (heroMoved && heroMoved !== parts) resetHero();
    const tx = (-px * 16 * d).toFixed(1) + "px", ty = (-py * 10 * d).toFixed(1) + "px";
    hero.style.transform = `perspective(1600px) rotateX(${(-py * 1.6 * d).toFixed(2)}deg) rotateY(${(px * 2.4 * d).toFixed(2)}deg)`;
    if (parts.img) parts.img.style.transform = `translate3d(${tx}, ${ty}, 0) scale(1.06)`;
    if (parts.card) { parts.card.style.setProperty("--fx-tx", tx); parts.card.style.setProperty("--fx-ty", ty); }
    heroMoved = parts;
  }
  function resetHero() {
    if (!heroMoved) return;
    const { hero, img, card } = heroMoved;
    hero.style.removeProperty("transform");
    if (img) img.style.removeProperty("transform");
    if (card) { card.style.removeProperty("--fx-tx"); card.style.removeProperty("--fx-ty"); }
    heroMoved = null;
  }
  function posterFrom(target) {
    if (!target || !target.closest) return null;
    const direct = target.closest(".harbor-poster");
    if (direct) return direct;
    const group = target.closest(".group");
    return group ? group.querySelector(".harbor-poster") : null;
  }
  function frame() {
    ptRaf = 0;
    const e = lastEv;
    if (!e || paused()) return;
    const W = win.innerWidth, H = win.innerHeight, x = e.clientX, y = e.clientY;
    // Reads first. Writing styles before reading layout would force a second layout every frame.
    const card = posterFrom(e.target);
    const cr = card ? card.getBoundingClientRect() : null;
    const hero = depthOn() && state.heroParallax ? visibleHero() : null;
    const hr = hero ? hero.getBoundingClientRect() : null;
    // Writes.
    if (state.chrome === "dock" && state.dockAutohide) reveal(state.dockPos === "left" ? x < 80 : y > H - 80);
    // The light lives under the chrome, so over the dock it would show as a blurred blob behind the icon (and make
    // the glass re-blur a moving light). It fades out while the pointer is on Fathom's own glass.
    const onGlass = !!(e.target && e.target.closest && e.target.closest("#fathom-chrome, #fathom-panel, #fathom-prompt"));
    if (lightOn()) {
      if (!onGlass) light.style.transform = `translate3d(${x - 360}px, ${y - 360}px, 0)`;
      light.style.opacity = onGlass ? "0" : "1";
    }
    // Rim light faces the pointer. Updated at most 5 times a second and only when the angle really moves,
    // because each update repaints the rims of the glass chrome.
    const now = performance.now();
    if (now - lastLgAt > 200) {
      const lg = Math.round((Math.atan2(y - H / 2, x - W / 2) * 180) / Math.PI + 270) % 360; // gradient runs away from the light
      const diff = Math.abs(((lg - lastLg + 540) % 360) - 180);
      if (diff > 12) { chrome.style.setProperty("--fx-lg", lg + "deg"); lastLg = lg; lastLgAt = now; }
    }
    // Dim the other rows: mark the row under the pointer, only when it changes.
    const row = state.focusRow && e.target && e.target.closest ? e.target.closest('main [class~="group/row"]') : null;
    if (row !== focusRow) setFocusRow(row);
    if (hero && hr) {
      const inside = x >= hr.left - 40 && x <= hr.right + 40 && y >= hr.top - 40 && y <= hr.bottom + 40;
      if (inside) moveHero(hero, clamp(((x - hr.left) / hr.width) * 2 - 1, -1, 1), clamp(((y - hr.top) / hr.height) * 2 - 1, -1, 1));
      else resetHero();
    } else resetHero();
    if (card !== tilted) resetTilt();
    if (card && cr) {
      const px = clamp((x - cr.left) / cr.width, 0, 1), py = clamp((y - cr.top) / cr.height, 0, 1);
      if (state.sheen) {
        card.style.setProperty("--fx-mx", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--fx-my", (py * 100).toFixed(1) + "%");
      }
      if (state.hover === "tilt" && depthOn() && state.tilt > 0) {
        const t = state.tilt;
        card.style.transform = `perspective(700px) rotateX(${((0.5 - py) * t).toFixed(2)}deg) rotateY(${((px - 0.5) * t).toFixed(2)}deg) translateZ(${(14 * state.depth).toFixed(1)}px) scale(1.04)`;
        tilted = card;
      }
    }
    if (card !== hoverCard) onHoverCard(card);
  }
  function onHoverCard(card) {
    hoverCard = card;
    clearTimeout(hoverTimer);
    if (!card) {
      if (art.hovering) { clearTimeout(restoreTimer); restoreTimer = setTimeout(() => { art.hovering = false; restoreHeroArt(); }, 900); }
      return;
    }
    clearTimeout(restoreTimer);
    if (!(state.cardGlow || state.hoverTint || state.hover === "glow")) return;
    hoverTimer = setTimeout(() => {
      const img = card.querySelector("img");
      const src = img && img.currentSrc;
      if (!src) return;
      sampleImage(src).then((a) => {
        if (!a || hoverCard !== card) return;
        card.style.setProperty("--fx-card", accentTone(a.rgb));
        if (state.hoverTint) { art.hovering = true; setArt(a.rgb, true); }
      });
    }, 160);
  }
  cleanups.push(() => { clearTimeout(hoverTimer); clearTimeout(restoreTimer); clearTimeout(scrollTimer); cancelAnimationFrame(ptRaf); cancelAnimationFrame(magRaf); });
  listen(win, "pointermove", (e) => { lastEv = e; noteActivity(); if (!ptRaf) ptRaf = requestAnimationFrame(frame); }, { passive: true });
  listen(root, "pointerleave", () => { resetTilt(); resetHero(); onHoverCard(null); setFocusRow(null); light.style.opacity = "0"; });
  // Scrolling: one attribute write when a scroll starts and one when it ends, nothing per scroll event.
  let scrolling = false;
  listen(doc, "scroll", () => {
    noteActivity();
    if (!scrolling) {
      scrolling = true;
      resetTilt();
      if (state.pauseOnScroll) { root.setAttribute("data-fx-scrolling", ""); quietLenses(); }
    }
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => { scrolling = false; root.removeAttribute("data-fx-scrolling"); scheduleLenses(0); }, 200);
  }, { capture: true, passive: true });

  /* ---------- performance: measured while you actually scroll or move the pointer ---------- */
  const perfStats = { frames: [], streak: 0, fps: 0, drop: -1 };
  let sampRaf = 0, sampLast = 0, sampUntil = 0, autoChangedAt = -1e9, autoDroppedAt = -1e9;
  function sampleTick(t) {
    if (sampLast) { const d = t - sampLast; if (d < 250) perfStats.frames.push(d); }
    sampLast = t;
    if (perfStats.frames.length >= 240) evaluatePerf();
    if (t < sampUntil && !doc.hidden && !disposed) sampRaf = requestAnimationFrame(sampleTick);
    else { sampRaf = 0; sampLast = 0; }
  }
  function noteActivity() {
    sampUntil = performance.now() + 1200;
    if (!sampRaf && !disposed) sampRaf = requestAnimationFrame(sampleTick);
  }
  function evaluatePerf() {
    const d = perfStats.frames.splice(0).sort((p, q) => p - q);
    const vsync = d[Math.floor(d.length * 0.1)] || 16.7; // the fastest typical frame is the display's refresh interval
    const median = d[Math.floor(d.length / 2)] || vsync;
    perfStats.fps = Math.round(1000 / median);
    perfStats.drop = d.filter((v) => v > vsync * 1.9).length / d.length;
    // Auto, with hysteresis so it can't flip back and forth: readings right after a change are ignored (the page
    // is still repainting), stepping down takes two slow readings in a row, and stepping up takes four smooth ones
    // and, after any step down, two quiet minutes.
    const now = performance.now();
    if (state.perf === "auto" && !root.hasAttribute("data-chrome-hidden") && now - autoChangedAt > 3000) {
      const before = autoLevel;
      perfStats.streak = perfStats.drop > 0.12 ? perfStats.streak + 1 : 0;
      perfStats.smooth = perfStats.drop < 0.02 ? (perfStats.smooth || 0) + 1 : 0;
      const mayRise = now - autoDroppedAt > 120000;
      if (perfStats.streak >= 2 && autoLevel !== "lite") {
        if (autoLevel === "full") { fullFailed = true; store.set(FULL_FAILED_KEY, "1"); }
        autoLevel = autoLevel === "full" ? "balanced" : "lite";
        autoDroppedAt = now;
      } else if (mayRise && perfStats.smooth >= 4 && (autoLevel === "lite" || (autoLevel === "balanced" && !fullFailed))) {
        autoLevel = autoLevel === "lite" ? "balanced" : "full";
      }
      if (autoLevel !== before) {
        autoChangedAt = now;
        perfStats.streak = 0; perfStats.smooth = 0;
        store.set(AUTO_KEY, autoLevel);
        apply();
        if (!panel.hidden && panelTab === "Speed") renderBody();
      }
    }
    const out = panel.hidden ? null : body.querySelector("[data-fx-fps]");
    if (out) out.textContent = statText();
  }
  const statText = () => (perfStats.drop < 0 ? "Scroll or move the pointer to measure" : `${perfStats.fps} fps, ${Math.round(perfStats.drop * 100)}% slow frames`);
  cleanups.push(() => cancelAnimationFrame(sampRaf));
  if (reduceMQ && reduceMQ.addEventListener) {
    const onReduce = () => apply();
    reduceMQ.addEventListener("change", onReduce);
    cleanups.push(() => reduceMQ.removeEventListener("change", onReduce));
  }

  /* ---------- settings panel ---------- */
  const TABS = ["Look", "Glass", "Layout", "Motion", "Speed", "Backup"];
  let panelTab = "Look", opener = null, backupMsg = "";
  panel.innerHTML =
    `<div class="fx-ph"><div><div class="fx-title">Fathom</div><div class="fx-sub">Changes apply as you make them</div></div>` +
    `<button type="button" class="fx-x" data-fx-close aria-label="Close settings">${icon("close")}</button></div>` +
    `<div class="fx-tabs" role="tablist" aria-label="Settings sections">${TABS.map((t) => `<button type="button" role="tab" id="fx-tab-${t}" aria-controls="fx-body" aria-selected="${t === panelTab}" tabindex="${t === panelTab ? 0 : -1}" data-fx-tab="${t}">${t}</button>`).join("")}</div>` +
    `<div class="fx-body" id="fx-body" role="tabpanel" aria-labelledby="fx-tab-${panelTab}"></div>`;
  const body = panel.querySelector(".fx-body");

  const SEG_NAMES = { wall: "Wallpaper", font: "Type", chrome: "Navigation style", hover: "Poster hover effect", perf: "Performance mode", motion: "Animations", navSource: "Page list" };
  const FMT = { px: (v) => v + "px", pct: (v) => Math.round(v * 100) + "%", x: (v) => Number(v).toFixed(2) + "×", deg: (v) => v + "°", raw: (v) => v, sat: (v) => v + "%" };
  const C = {
    h: (t, hint) => `<h3>${t}</h3>${hint ? `<p class="fx-hint">${hint}</p>` : ""}`,
    range: (k, label, min, max, step, fmt, cls) =>
      `<label class="fx-row"><span>${label}</span><output data-out="${k}">${FMT[fmt || "raw"](state[k])}</output>` +
      `<input type="range" data-k="${k}" data-fmt="${fmt || "raw"}" min="${min}" max="${max}" step="${step}" value="${state[k]}"${cls ? ` class="${cls}"` : ""}></label>`,
    toggle: (k, label, hint, disabled) =>
      `<button type="button" class="fx-tog" role="switch" data-k="${k}" aria-checked="${!!state[k] && !disabled}"${disabled ? ' aria-disabled="true"' : ""}><span>${label}${hint ? `<small>${hint}</small>` : ""}</span><i aria-hidden="true"></i></button>`,
    seg: (k, label, opts) =>
      `${label ? `<div class="fx-seglabel" id="fx-l-${k}">${label}</div>` : ""}<div class="fx-seg" role="radiogroup"${label ? ` aria-labelledby="fx-l-${k}"` : ` aria-label="${SEG_NAMES[k] || k}"`}>` +
      opts.map(([v, l]) => `<button type="button" role="radio" data-k="${k}" data-v="${v}" aria-checked="${state[k] === v}">${l}</button>`).join("") + `</div>`,
  };
  const waterChips = (w) => w.id === "art"
    ? `<i class="fx-artchip"></i>`
    : [ok(0.2, 0.03 * w.c, w.h), ok(0.44, 0.12 * w.c, w.h), w.accent].map((c) => `<i style="--c:${c}"></i>`).join("");
  const TAB_HTML = {
    Look() {
      const s = state;
      return C.h("Looks", "Glass and motion. Your colors and layout stay as they are.") +
        `<div class="fx-cards" role="radiogroup" aria-label="Looks">${LOOKS.map((p) =>
          `<button type="button" role="radio" data-look="${p.id}" aria-checked="${s.look === p.id}"><b>${p.name}</b><small>${p.note}</small></button>`).join("")}</div>` +
        C.h("Colors") +
        `<div class="fx-cards" role="radiogroup" aria-label="Colors">${WATERS.map((w) =>
          `<button type="button" role="radio" data-water="${w.id}" aria-checked="${s.water === w.id}"><span class="fx-chips">${waterChips(w)}</span><b>${w.name}</b><small>${w.note}</small></button>`).join("")}</div>` +
        (s.water === "art" ? `<p class="fx-hint" style="margin-top:10px">The base hue follows the featured artwork. Greyscale artwork keeps the last color.</p>`
          : C.range("hue", "Base hue", 0, 360, 1, "deg", "fx-hue") + C.range("chroma", "Color strength", 0, 1.5, 0.01, "pct")) +
        C.h("Accent") +
        `<div class="fx-sw" role="radiogroup" aria-label="Accent color">${ACCENTS.map(([v, l]) =>
          `<button type="button" role="radio" data-k="accent" data-v="${v}" style="--c:${v}" aria-label="${l}" aria-checked="${!s.accentFollow && s.accent.toLowerCase() === v}"></button>`).join("")}` +
        `<label title="Any color"><input type="color" data-k="accent" value="${s.accent}" aria-label="Pick any accent color"></label></div>` +
        C.toggle("accentFollow", "Take the accent from the artwork", "Uses the main color of whatever is featured") +
        C.h("Type") + C.seg("font", "", [["serif", "Serif titles"], ["sans", "All sans"], ["harbor", "Harbor's fonts"]]);
    },
    Glass() {
      const s = state;
      const lensNote = !LENS_OK ? "This system's web view can't bend light, so Fathom uses plain blur here. Harbor on Windows supports it."
        : perfLevel() !== "full" ? "Refraction runs in Full performance mode. It's paused right now." : "";
      return C.h("Material") +
        C.range("blur", "Blur", 0, 40, 1, "px") + C.range("frost", "Frost", 0, 0.2, 0.005, "pct") +
        C.range("rim", "Edge light", 0, 0.9, 0.01, "pct") + C.range("sat", "Color through the glass", 100, 220, 5, "sat") +
        C.range("radius", "Corner roundness", 8, 34, 1, "px") +
        C.h("Refraction", "Light bends at the edges of the glass, like a lens.") +
        C.toggle("refraction", "Bend light at the edges", lensNote || "Uses noticeably more graphics power. Runs only in Full performance mode.", !LENS_OK) +
        (LENS_OK && s.refraction ? C.range("refractAmt", "Strength", 0, 1, 0.01, "pct") : "") +
        C.h("Artwork color") +
        C.toggle("artTint", "Tint the glass with the artwork") +
        (s.artTint ? C.range("artStrength", "Tint strength", 0, 1, 0.01, "pct") : "") +
        C.toggle("hoverTint", "Shift color when you rest on a poster") +
        C.h("Wallpaper") +
        C.seg("wall", "", [["currents", "Currents"], ["still", "Still"], ["abyss", "Abyss"], ["image", "Image"], ["harbor", "Harbor"]]) +
        (s.wall === "image" ? `<input class="fx-text" type="url" data-k="wallImage" placeholder="Paste an image link (https://…)" value="${esc(s.wallImage)}" aria-label="Wallpaper image link">` + C.range("wallDim", "Darken", 0, 0.9, 0.01, "pct") : "") +
        (s.wall === "harbor" ? `<p class="fx-hint">Uses the background set in Harbor's own theme settings.</p>` : "") +
        C.toggle("wallMotion", "Moving light under the glass") + C.toggle("rays", "Light rays from above") +
        C.range("grain", "Grain", 0, 0.2, 0.005, "pct") +
        C.toggle("wallEverywhere", "Show the wallpaper behind every page") +
        C.h("Surfaces") +
        C.toggle("heroGlass", "Glass card on the featured banner") +
        C.toggle("surfaces", "Soft sheen on panels and menus") +
        C.seg("buttons", "Buttons", [["liquid", "Liquid"], ["flat", "Flat"]]);
    },
    Layout() {
      const s = state;
      return C.h("Navigation") +
        C.seg("chrome", "", [["dock", "Dock"], ["sidebar", "Sidebar"], ["island", "Island"], ["menubar", "Menu bar"]]) +
        (s.chrome === "dock" ? C.seg("dockPos", "Dock position", [["bottom", "Bottom"], ["left", "Left"]]) +
          C.range("dockSize", "Icon size", 36, 64, 1, "px") + C.toggle("magnify", "Magnify icons under the pointer") +
          (s.magnify ? C.range("magnifyAmt", "Magnify amount", 0.1, 1, 0.01, "pct") : "") +
          C.toggle("dockAutohide", "Hide the dock until you point at it") + C.toggle("dockLabels", "Show names on hover") : "") +
        (s.chrome === "sidebar" ? C.toggle("sidebarCompact", "Icons only") +
          (s.sidebarCompact ? "" : C.toggle("sidebarFit", "Fit to the page names", "Off lets you set the width") + (s.sidebarFit ? "" : C.range("sidebarW", "Width", 140, 300, 2, "px"))) : "") +
        (s.chrome === "island" ? `<p class="fx-hint">The island replaces the menu bar and floats at the top.</p>` : "") +
        C.h("Menu bar") +
        (s.chrome === "island" ? "" : s.chrome === "menubar" ? `<p class="fx-hint">Your pages live in the menu bar.</p>` : C.toggle("menubar", "Show the menu bar", "Holds search and the clock, and lets you drag the window")) +
        C.toggle("clock", "Clock") + (s.clock ? C.toggle("date", "Date") + C.toggle("clock24", "24-hour time") : "") +
        C.h("Pages") +
        C.seg("navSource", "", [["harbor", "Match Harbor"], ["fathom", "Fathom's own list"]]) +
        (s.navSource === "harbor"
          ? `<p class="fx-hint">${harborNav ? "Using the order, names and hidden pages from Harbor's Theme Studio, under Layout, Navigation items. Changes there show up here within a few seconds." : "Harbor has no custom navigation saved yet, so Fathom shows its default pages. Arrange them in Harbor's Theme Studio, under Layout, Navigation items, or switch to Fathom's own list."}</p>`
          : TAB_HTML.NavEditor()) +
        C.h("Poster corners") +
        C.toggle("posterRadiusOverride", "Use Fathom's corner size", "Off keeps the size from Harbor's own settings") +
        (s.posterRadiusOverride ? C.range("posterRadius", "Corner size", 0, 28, 1, "px") : "");
    },
    // Not a tab: the editor for Fathom's own page list, used inside Layout.
    NavEditor() {
      const s = state;
      return `<p class="fx-hint">Reorder, rename or hide what shows in your navigation.</p>` +
        `<div class="fx-nav-list">${s.nav.map((n, i) =>
          `<div class="fx-nav-row"${n.visible ? "" : " data-off"}>${icon(n.id)}` +
          `<input type="text" value="${esc(n.label)}" maxlength="24" data-nav-rename="${i}" aria-label="Name shown for ${esc(knownLabel(n.id))}">` +
          `<button type="button" class="fx-mini" data-nav-move="${i}" data-dir="-1" aria-label="Move ${esc(n.label)} up"${i === 0 ? " disabled" : ""}>${icon("up")}</button>` +
          `<button type="button" class="fx-mini" data-nav-move="${i}" data-dir="1" aria-label="Move ${esc(n.label)} down"${i === s.nav.length - 1 ? " disabled" : ""}>${icon("down")}</button>` +
          `<button type="button" class="fx-mini" data-nav-eye="${i}" aria-pressed="${!n.visible}" aria-label="${n.visible ? "Hide" : "Show"} ${esc(n.label)}">${icon(n.visible ? "eye" : "eyeoff")}</button></div>`).join("")}</div>` +
        `<div class="fx-btns"><button type="button" class="fx-btn" data-fx-do="reset-nav">Reset pages</button></div>`;
    },
    Motion() {
      const s = state, blocked = !motionOn() ? "Animations are off, so depth is paused." : perfLevel() === "lite" ? "Lite performance mode turns depth off." : "";
      return C.h("Depth", "How far the glass floats above the page. At 0 everything sits flat.") +
        (blocked ? `<p class="fx-hint">${blocked}</p>` : "") +
        C.range("depth", "Depth", 0, 2, 0.05, "x") +
        C.toggle("heroParallax", "Featured banner follows the pointer", "Only while the pointer is over it") +
        C.h("Posters on hover") +
        C.seg("hover", "", [["tilt", "Tilt"], ["lift", "Lift"], ["glow", "Glow"], ["none", "None"]]) +
        (s.hover === "tilt" ? C.range("tilt", "Tilt angle", 0, 24, 1, "deg") : "") +
        C.toggle("sheen", "Light sheen across the poster") +
        C.toggle("cardGlow", "Glow in the poster's own color") +
        C.h("Light") +
        C.toggle("light", "Pointer light", "A soft light in your accent color follows the pointer") +
        (s.light ? C.range("lightAmt", "Light strength", 0, 1, 0.01, "pct") : "") +
        C.toggle("focusRow", "Dim other rows while you browse one") +
        C.h("Animations") +
        C.seg("motion", "", [["system", "Follow system"], ["on", "On"], ["off", "Off"]]) +
        C.range("speed", "Animation speed", 0.5, 2, 0.05, "x");
    },
    Speed() {
      const s = state, lvl = perfLevel();
      const notes = { full: "Every effect, including refraction and light rays.", balanced: "The default. Lighter blur, no refraction or light rays.", lite: "No blur, tilt, refraction or moving light. Glass becomes solid tinted panels." };
      return C.h("Performance") +
        C.seg("perf", "", [["auto", "Auto"], ["full", "Full"], ["balanced", "Balanced"], ["lite", "Lite"]]) +
        `<p class="fx-hint">${s.perf === "auto" ? `Auto measures frames while you scroll and move the pointer. It starts at Balanced, moves up to Full after a run of smooth readings, and steps down if Harbor stutters. Right now: ${lvl}. ` : ""}${notes[lvl]}</p>` +
        `<div class="fx-stat"><span>While browsing</span><b data-fx-fps>${statText()}</b></div>` +
        (s.perf === "auto" && autoLevel !== "full" ? `<div class="fx-btns"><button type="button" class="fx-btn" data-fx-do="reset-auto">Try full quality again</button></div>` : "") +
        C.toggle("pauseOnScroll", "Pause effects while scrolling", "Keeps long rows smooth");
    },
    Backup() {
      return C.h("Settings code", "Copy your setup to move it to another computer or share it with someone.") +
        `<div class="fx-btns"><button type="button" class="fx-btn fx-primary" data-fx-do="copy">Copy settings code</button></div>` +
        `<input class="fx-text" type="text" data-fx-import placeholder="Paste a settings code" aria-label="Settings code to apply">` +
        `<div class="fx-btns"><button type="button" class="fx-btn" data-fx-do="import">Apply code</button></div>` +
        (backupMsg ? `<p class="fx-hint" role="status">${esc(backupMsg)}</p>` : "") +
        C.h("Reset") +
        `<div class="fx-btns"><button type="button" class="fx-btn fx-danger" data-fx-do="reset-all">Reset everything</button></div>` +
        C.h("About") +
        `<p class="fx-hint">Fathom ${VERSION}. Open these settings any time with Alt+T.</p>`;
    },
  };

  function setFill(input) {
    const min = +input.min, max = +input.max;
    input.style.setProperty("--fx-fill", (((+input.value - min) / (max - min)) * 100).toFixed(1) + "%");
  }
  function renderBody() {
    const y = body.scrollTop;
    body.innerHTML = TAB_HTML[panelTab]();
    body.querySelectorAll("input[type=range]").forEach(setFill);
    body.scrollTop = y;
  }
  function selectTab(t, focus) {
    panelTab = t;
    panel.querySelectorAll("[data-fx-tab]").forEach((b) => {
      const on = b.dataset.fxTab === t;
      b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    body.setAttribute("aria-labelledby", "fx-tab-" + t);
    body.scrollTop = 0;
    renderBody();
  }
  function openPanel(from) {
    if (prompt) closePrompt(false); // found it: the first-run card has done its job
    opener = from || doc.activeElement;
    panel.hidden = false;
    renderBody();
    const tab = panel.querySelector('[aria-selected="true"]');
    if (tab) tab.focus({ preventScroll: true });
  }
  function closePanel() {
    if (panel.hidden) return;
    panel.hidden = true;
    if (opener && opener.isConnected && opener.focus) opener.focus({ preventScroll: true });
  }
  const togglePanel = (from) => (panel.hidden ? openPanel(from) : closePanel());

  function set(k, v, opts) {
    if (state[k] === v) return;
    state[k] = v;
    if (LOOK_KEYS.includes(k)) state.look = "";
    if (k === "hue" || k === "chroma") state.water = "custom";
    if (k === "accent") state.accentFollow = false;
    apply(); save();
    if (!opts || !opts.quiet) renderBody();
  }
  function applyLook(id) {
    const p = LOOKS.find((x) => x.id === id);
    if (!p) return;
    for (const k of LOOK_KEYS) state[k] = DEFAULTS[k];
    Object.assign(state, p.v, { look: id });
    apply(); save(); renderBody();
  }
  function applyWater(id) {
    const w = WATERS.find((x) => x.id === id);
    if (!w) return;
    state.water = id;
    if (id === "art") { state.accentFollow = true; state.chroma = 1; }
    else { state.hue = w.h; state.chroma = w.c; state.accent = w.accent; state.accentFollow = false; }
    apply(); save(); renderBody();
  }
  function encode() { return "FATHOM1:" + btoa(unescape(encodeURIComponent(JSON.stringify(state)))); }
  function decode(code) {
    const raw = String(code).trim().replace(/^FATHOM1:/, "");
    return sanitize(JSON.parse(decodeURIComponent(escape(atob(raw)))));
  }

  listen(panel, "input", (e) => {
    const t = e.target, k = t.dataset.k;
    if (!k) return;
    if (t.type === "range") {
      const v = parseFloat(t.value);
      setFill(t);
      const out = body.querySelector(`[data-out="${k}"]`);
      if (out) out.textContent = FMT[t.dataset.fmt](v);
      set(k, v, { quiet: true });
    } else if (t.type === "color") {
      set(k, t.value.toLowerCase(), { quiet: true });
    }
  });
  listen(panel, "change", (e) => {
    const t = e.target;
    if (t.type === "range" || t.type === "color") { renderBody(); return; }
    if (t.dataset.k === "wallImage") { set("wallImage", t.value.trim()); return; }
    if (t.dataset.navRename) {
      const n = state.nav[+t.dataset.navRename];
      if (n) { n.label = t.value.trim().slice(0, 24) || knownLabel(n.id); chromeSig = ""; apply(); save(); }
    }
  });
  listen(panel, "click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-fx-close")) return closePanel();
    if (b.dataset.fxTab) return selectTab(b.dataset.fxTab);
    if (b.dataset.look) return applyLook(b.dataset.look);
    if (b.dataset.water) return applyWater(b.dataset.water);
    if (b.getAttribute("aria-disabled") === "true") return;
    const k = b.dataset.k;
    if (k && b.classList.contains("fx-tog")) return set(k, !state[k]);
    if (k && b.dataset.v !== undefined) return set(k, b.dataset.v);
    if (b.dataset.navMove) {
      const i = +b.dataset.navMove, j = i + +b.dataset.dir;
      if (j < 0 || j >= state.nav.length) return;
      const nav = state.nav.slice(); [nav[i], nav[j]] = [nav[j], nav[i]];
      state.nav = nav; apply(); save(); renderBody();
      const again = body.querySelector(`[data-nav-move="${j}"][data-dir="${b.dataset.dir}"]`) || body.querySelector(`[data-nav-move="${j}"]`);
      if (again) again.focus();
      return;
    }
    if (b.dataset.navEye) {
      const n = state.nav[+b.dataset.navEye];
      n.visible = !n.visible; state.nav = state.nav.slice(); apply(); save(); renderBody();
      const again = body.querySelector(`[data-nav-eye="${b.dataset.navEye}"]`);
      if (again) again.focus();
      return;
    }
    const act = b.dataset.fxDo;
    if (act === "reset-nav") { state.nav = defaultNav(); apply(); save(); renderBody(); }
    else if (act === "reset-auto") { autoLevel = "full"; fullFailed = false; perfStats.streak = 0; perfStats.smooth = 0; store.set(AUTO_KEY, "full"); store.set(FULL_FAILED_KEY, "0"); apply(); renderBody(); }
    else if (act === "copy") {
      const code = encode();
      const fallback = (msg) => { backupMsg = msg; renderBody(); const inp = body.querySelector("[data-fx-import]"); if (inp) { inp.value = code; inp.select(); } };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(() => { backupMsg = "Copied. Paste it into Fathom on the other computer."; renderBody(); }, () => fallback("Copying was blocked. The code is selected below; copy it with Ctrl+C."));
      else fallback("The code is selected below; copy it with Ctrl+C.");
    } else if (act === "import") {
      const input = body.querySelector("[data-fx-import]");
      try { state = decode(input.value); chromeSig = ""; apply(); save(); backupMsg = "Settings applied."; }
      catch (err) { backupMsg = "That isn't a Fathom settings code. Copy it again and paste the whole thing."; }
      renderBody();
    } else if (act === "reset-all") {
      state = sanitize(null); autoLevel = "balanced"; fullFailed = false; store.set(AUTO_KEY, "balanced"); store.set(FULL_FAILED_KEY, "0"); chromeSig = ""; apply(); save();
      backupMsg = "Everything is back to the defaults."; renderBody();
    }
  });
  listen(panel, "keydown", (e) => {
    if (e.key === "Escape") { e.stopPropagation(); closePanel(); return; }
    const tab = e.target.closest && e.target.closest("[role=tab]");
    if (tab && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      const i = TABS.indexOf(tab.dataset.fxTab), n = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
      e.preventDefault(); selectTab(n, true);
    }
  });
  listen(win, "keydown", (e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey || (e.key !== "t" && e.key !== "T")) return;
    const t = e.target;
    if (t && t.closest && !t.closest("#fathom-panel") && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    togglePanel();
  });

  /* ---------- first run: ask once whether to customize ----------
     A glass card next to the Customize button. It stays until answered (no timer), and is shown once per install:
     after either answer it never comes back. It hides with the chrome (Settings page, player). */
  const PROMPT_KEY = "fathom.prompted.v1";
  let prompt = null;
  const navCust = () => chrome.querySelector("#fx-dock .fx-cust, #fx-sidebar .fx-cust, #fx-island .fx-cust") || chrome.querySelector(".fx-cust");
  function placePrompt() {
    if (!prompt) return;
    // Point at the Customize button in the main navigation (dock, sidebar, island); the menu bar's is the fallback.
    const btn = navCust();
    const W = win.innerWidth, H = win.innerHeight, pw = prompt.offsetWidth, ph = prompt.offsetHeight, gap = 12, m = 16;
    let x = (W - pw) / 2, y = H - ph - 96;
    if (btn && btn.getClientRects().length) {
      const r = btn.getBoundingClientRect(), cx = r.left + r.width / 2;
      if (state.chrome === "dock" && state.dockPos === "left") { x = r.right + gap + 12; y = r.top + r.height / 2 - ph / 2; }
      else if (state.chrome === "sidebar") { x = r.right + gap + 8; y = r.bottom - ph; }
      else if (r.top > H / 2) { x = cx - pw / 2; y = r.top - ph - gap - 8; } // dock at the bottom: above it
      else { x = Math.min(cx - pw / 2, r.right - pw); y = r.bottom + gap; } // menu bar or island: below
    }
    prompt.style.left = Math.round(clamp(x, m, W - pw - m)) + "px";
    prompt.style.top = Math.round(clamp(y, m, H - ph - m)) + "px";
  }
  function closePrompt(open) {
    store.set(PROMPT_KEY, "1");
    store.set(SEEN_KEY, "1");
    if (prompt) { prompt.remove(); prompt = null; }
    if (open) openPanel(navCust());
  }
  function showPrompt() {
    if (prompt || store.get(PROMPT_KEY)) return;
    prompt = el("section", { id: "fathom-prompt", class: "fx-glass", role: "dialog", "aria-labelledby": "fx-prompt-title" });
    prompt.innerHTML = `<h2 id="fx-prompt-title">Fathom is on</h2>` +
      `<p>Choose a look, colors and how you get around. Customize is always in your ${state.chrome === "dock" ? "dock" : state.chrome === "sidebar" ? "sidebar" : state.chrome === "island" ? "island" : "menu bar"}, or press <kbd>Alt</kbd> <kbd>T</kbd>.</p>` +
      `<div class="fx-btns"><button type="button" class="fx-btn fx-primary" data-p="open">Customize Fathom</button><button type="button" class="fx-btn" data-p="later">Later</button></div>`;
    prompt.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) closePrompt(b.dataset.p === "open"); });
    doc.body.append(prompt);
    placePrompt();
  }
  listen(win, "resize", () => placePrompt());
  if (!store.get(PROMPT_KEY)) later(900, showPrompt);

  /* ---------- start ---------- */
  apply();
  scanArt();
  every(1500, scanArt);
  every(15000, tickClock);
  // Pick up nav edits made in Harbor's Theme Studio (same window, so no storage event fires).
  every(4000, () => {
    if (state.navSource !== "harbor" || doc.hidden) return;
    if (readHarborNav()) { apply(); if (!panel.hidden && panelTab === "Layout") renderBody(); }
  });
  let resizeTimer = 0;
  listen(win, "resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { heroSig = ""; syncHero(); scheduleLenses(); }, 200); });
  cleanups.push(() => clearTimeout(resizeTimer));
  listen(doc, "visibilitychange", () => { if (doc.hidden) { resetTilt(); resetHero(); } scheduleLenses(0); });
  // Harbor marks the chrome hidden for the player, the play picker and Settings. When the player opens, close the
  // panel (CSS already hides every Fathom layer so the video can show through) and stop pointer effects.
  const chromeObserver = new MutationObserver(() => {
    if (doc.querySelector("[data-harbor-player]")) { closePanel(); resetTilt(); resetHero(); setFocusRow(null); light.style.opacity = "0"; }
    scheduleLenses(0);
  });
  chromeObserver.observe(root, { attributes: true, attributeFilter: ["data-chrome-hidden"] });
  cleanups.push(() => chromeObserver.disconnect());

  /* ---------- cleanup ---------- */
  function dispose() {
    if (disposed) return;
    disposed = true;
    clearTimeout(saveTimer);
    store.set(KEY, JSON.stringify(state));
    cleanups.splice(0).forEach((f) => { try { f(); } catch (e) { /* keep going */ } });
    resetTilt(); resetHero(); clearHero();
    [wall, light, chrome, panel, prompt, varsStyle, fontLink, filters].forEach((n) => n && n.remove());
    ATTRS.forEach((k) => root.removeAttribute("data-" + k));
    root.removeAttribute("data-fx-reveal");
    root.removeAttribute("data-fx-scrolling");
    root.removeAttribute("data-fx-rowfocus");
    if (focusRow) focusRow.removeAttribute("data-fx-row");
    root.style.removeProperty("--fx-sidebar-w");
    root.style.removeProperty("--fx-art");
    doc.querySelectorAll(".harbor-poster").forEach((c) => ["--fx-card", "--fx-mx", "--fx-my", "transform"].forEach((p) => c.style.removeProperty(p)));
    doc.querySelectorAll('[data-scroll-anchor="hero"]').forEach((h) => h.style.removeProperty("transform"));
    doc.querySelectorAll('[data-scroll-anchor="hero"] img.object-cover').forEach((i) => i.style.removeProperty("transform"));
    doc.querySelectorAll('[data-scroll-anchor="hero"] .max-w-2xl').forEach((c) => { c.style.removeProperty("--fx-tx"); c.style.removeProperty("--fx-ty"); });
    if (win.__fathomDispose === dispose) delete win.__fathomDispose;
    if (win.__harborThemeCleanup === dispose) win.__harborThemeCleanup = undefined;
  }
  win.__fathomDispose = dispose;
  win.__harborThemeCleanup = dispose;
})();
