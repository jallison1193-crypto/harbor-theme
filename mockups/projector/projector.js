// Projector mockup. Fake Harbor screens styled the way the Projector theme would style them.
// All artwork is painted here in a canvas from a seed: no real posters, and it works offline and inside an Artifact.
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Local preview has no skeleton; give it the viewport meta the Artifact wrapper adds.
  if (!document.querySelector('meta[name="viewport"]')) {
    const m = document.createElement("meta");
    m.name = "viewport"; m.content = "width=device-width, initial-scale=1, viewport-fit=cover";
    document.head.appendChild(m);
  }

  /* ---------------- settings ---------------- */
  const KEY = "projector.mockup.v1";
  const DEFAULTS = {
    appearance: "dark", hour: 20, stock: "neutral", type: "premiere", accent: "artwork",
    spill: true, focus: true, reveal: true, lights: true, glow: true, rise: true, parallax: true, wide: false, grain: false, nav: "marquee",
    motion: "system",
  };
  let S = { ...DEFAULTS };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { /* storage blocked */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* storage blocked */ } };
  const reducedMQ = matchMedia("(prefers-reduced-motion: reduce)");
  const lightMQ = matchMedia("(prefers-color-scheme: light)");
  const motionOn = () => (S.motion === "system" ? !reducedMQ.matches : S.motion === "on");
  const dur = (ms) => (motionOn() ? ms : 0);

  /* ---------------- color helpers ---------------- */
  const hexToRgb = (h) => { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
  const rgbToHex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
  const mixHex = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * t)); };
  const mixTokens = (a, b, t) => Object.fromEntries(Object.keys(a).map((k) => [k, mixHex(a[k], b[k], t)]));
  const lum = (hex) => { const [r, g, b] = hexToRgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  function rgbToHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hslToHex(h, s, l) {
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return rgbToHex([f(0) * 255, f(8) * 255, f(4) * 255]);
  }

  /* ---------------- film stocks ---------------- */
  const STOCKS = {
    neutral: {
      name: "Neutral", desc: "True grays. Artwork as it is.", grade: "none",
      dark: { canvas: "#131314", surface: "#19191b", elevated: "#212124", raised: "#2a2a2e", ink: "#efeee9", muted: "#a8a7a1", subtle: "#8a8983", accent: "#e9c37f" },
      light: { canvas: "#f2f2f0", surface: "#e9e9e6", elevated: "#ffffff", raised: "#dfdfdb", ink: "#17171a", muted: "#53534f", subtle: "#6e6e69", accent: "#8a5a12" },
    },
    warm: {
      name: "Warm print", desc: "Brown-black and paper-white ink, a touch of amber.", grade: "sepia(.16) saturate(1.06)",
      dark: { canvas: "#17120f", surface: "#1f1915", elevated: "#28201b", raised: "#332922", ink: "#f4e9dc", muted: "#bba996", subtle: "#9a8775", accent: "#f0a85a" },
      light: { canvas: "#f3ece2", surface: "#eae1d4", elevated: "#fbf7f0", raised: "#e0d4c4", ink: "#241a12", muted: "#62503f", subtle: "#7a6654", accent: "#9a4f16" },
    },
    cool: {
      name: "Cool", desc: "Blue-gray shadows and slightly cooler artwork.", grade: "saturate(.88) hue-rotate(8deg)",
      dark: { canvas: "#0f1216", surface: "#151a20", elevated: "#1d232b", raised: "#262d37", ink: "#e8eef5", muted: "#9eaab8", subtle: "#7d8998", accent: "#86b9ea" },
      light: { canvas: "#eef1f5", surface: "#e4e9ef", elevated: "#fbfcfe", raised: "#d8dfe8", ink: "#111821", muted: "#4b5766", subtle: "#66727f", accent: "#245a92" },
    },
    mono: {
      name: "Mono", desc: "Grayscale chrome. Only the artwork has color.", grade: "none", fixedAccent: true,
      dark: { canvas: "#111111", surface: "#181818", elevated: "#202020", raised: "#2b2b2b", ink: "#f2f2f2", muted: "#a8a8a8", subtle: "#8a8a8a", accent: "#f2f2f2" },
      light: { canvas: "#f3f3f3", surface: "#e9e9e9", elevated: "#ffffff", raised: "#dddddd", ink: "#111111", muted: "#545454", subtle: "#6c6c6c", accent: "#111111" },
    },
    faded: {
      name: "Faded", desc: "Lifted blacks and soft contrast, like an old print.", grade: "contrast(.86) saturate(.8) brightness(1.05)",
      dark: { canvas: "#1d1c1f", surface: "#242327", elevated: "#2d2c31", raised: "#38363c", ink: "#e7e3dc", muted: "#aaa59e", subtle: "#8f8a84", accent: "#dba9a2" },
      light: { canvas: "#e9e6e1", surface: "#e0dcd5", elevated: "#f5f3ef", raised: "#d6d0c7", ink: "#2b2a2d", muted: "#5f5b57", subtle: "#76716c", accent: "#8d4f4a" },
    },
  };
  // Evening and early-morning targets for "Follow time of day"
  const WARM_DARK = { canvas: "#211a15", surface: "#29211b", elevated: "#322822", raised: "#3c3029", ink: "#f4e9dc", muted: "#bba996", subtle: "#9f8c79", accent: "#f0a85a" };
  const WARM_LIGHT = { canvas: "#ebe2d4", surface: "#e1d6c6", elevated: "#f6f0e6", raised: "#d6c8b5", ink: "#241a12", muted: "#5f4d3c", subtle: "#766250", accent: "#9a4f16" };

  const TYPES = {
    premiere: { name: "Premiere", desc: "Bodoni Moda with Schibsted Grotesk. A high-contrast serif, like a festival poster.", display: '"Bodoni Moda", Georgia, "Times New Roman", serif', sans: '"Schibsted Grotesk", system-ui, "Segoe UI", sans-serif', weight: 500, stretch: "100%", track: "-0.015em" },
    paperback: { name: "Paperback", desc: "Brygada 1918 with Albert Sans. A warmer book serif, easy on long reads.", display: '"Brygada 1918", Georgia, serif', sans: '"Albert Sans", system-ui, "Segoe UI", sans-serif', weight: 600, stretch: "100%", track: "-0.01em" },
    titlecard: { name: "Title card", desc: "Archivo throughout: condensed and heavy for titles, normal width for text.", display: '"Archivo", "Arial Narrow", sans-serif', sans: '"Archivo", system-ui, "Segoe UI", sans-serif', weight: 760, stretch: "68%", track: "-0.005em" },
  };

  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function palette() {
    const st = STOCKS[S.stock];
    let light, t;
    if (S.appearance === "light") { light = true; t = st.light; }
    else if (S.appearance === "windows") {
      const forced = root.getAttribute("data-theme");
      light = forced ? forced === "light" : lightMQ.matches;
      t = light ? st.light : st.dark;
    } else if (S.appearance === "time") {
      // Readable at every moment: the page flips family once at 7:00 and once at 18:00, and drifts within each family.
      const h = S.hour;
      if (h >= 7 && h < 18) {
        light = true;
        const warm = h < 9 ? (1 - smooth(7, 9, h)) * 0.6 : smooth(14.5, 18, h) * 0.85;
        t = mixTokens(st.light, WARM_LIGHT, warm);
      } else {
        light = false;
        const warm = h >= 18 ? 1 - smooth(18, 22.5, h) : smooth(4.5, 7, h) * 0.6;
        t = mixTokens(st.dark, WARM_DARK, warm);
      }
    } else { light = false; t = st.dark; }
    return { t, light };
  }

  let artColor = null; // rgb of the artwork on screen
  function accentFor(light, fallback) {
    if (STOCKS[S.stock].fixedAccent || S.accent !== "artwork" || !artColor) return fallback;
    const [h, s0] = rgbToHsl(artColor);
    if (s0 < 0.12) return fallback;
    return hslToHex(h, Math.max(0.42, Math.min(0.78, s0)), light ? 0.36 : 0.7);
  }

  /* ---------------- navigation styles ---------------- */
  const NAV_STYLES = {
    house: { name: "House", hint: "The baseline: quiet text links, a raised pill and one accent lamp on the current page." },
    marquee: { name: "Marquee", hint: "What is showing sits at the top, pages are grouped, and the current page is lit by a lamp in the artwork's color." },
    programme: { name: "Programme", hint: "Numbered pages in the display type, like a printed programme. An accent rule slides to the current page." },
    rail: { name: "Rail", hint: "A slim strip of icons that opens out to full labels on hover or keyboard focus, leaving more room for the artwork." },
  };
  // Line icons for the Rail style, used as CSS masks. A theme would ship these in its stylesheet.
  const ICONS = {
    home: '<path d="M4 11l8-6.5 8 6.5V20h-5v-5.5H9V20H4z"/>',
    discover: '<circle cx="12" cy="12" r="8.5"/><path d="M15.2 8.8l-1.9 4.5-4.5 1.9 1.9-4.5z"/>',
    movies: '<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><path d="M7.5 4.5v15M16.5 4.5v15M3.5 9.5h4M3.5 14.5h4M16.5 9.5h4M16.5 14.5h4"/>',
    shows: '<rect x="3.5" y="6.5" width="17" height="12" rx="1.5"/><path d="M8.5 3l3.5 3.5L15.5 3M8 21h8"/>',
    anime: '<path d="M12 3.5l2.2 6.3 6.3 2.2-6.3 2.2L12 20.5l-2.2-6.3L3.5 12l6.3-2.2z"/>',
    live: '<circle cx="12" cy="12" r="1.8"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>',
    calendar: '<rect x="3.5" y="5.5" width="17" height="15" rx="1.5"/><path d="M3.5 10h17M8 3v5M16 3v5"/>',
    library: '<path d="M5 4.5v15M9.5 4.5v15M14 5l4.5 14.5"/>',
    settings: '<path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9"/><circle cx="15" cy="7.5" r="2"/><circle cx="9" cy="16.5" r="2"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
    "open-palette": '<rect x="3.5" y="6.5" width="17" height="11" rx="1.5"/><path d="M7 10.5h1.5M11.25 10.5h1.5M15.5 10.5H17M8 14h8"/>',
    "open-intermission": '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
    "open-settings": '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M6 6l1.8 1.8M16.2 16.2L18 18M6 18l1.8-1.8M16.2 7.8L18 6"/>',
  };
  const icoUrl = (paths) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`)}")`;
  document.querySelectorAll("[data-harbor-nav]").forEach((b) => { const i = ICONS[b.dataset.harborNav]; if (i) b.style.setProperty("--ico", icoUrl(i)); });
  [["open-search", "search"], ["open-palette", "open-palette"], ["open-intermission", "open-intermission"], ["open-settings", "open-settings"]].forEach(([id, k]) => {
    const el = document.getElementById(id); if (el) el.style.setProperty("--ico", icoUrl(ICONS[k]));
  });

  function applyTheme() {
    const { t, light } = palette();
    const accent = accentFor(light, t.accent);
    const ink = hexToRgb(t.ink).join(" ");
    const v = {
      "--canvas": t.canvas, "--surface": t.surface, "--elevated": t.elevated, "--raised": t.raised,
      "--ink": t.ink, "--muted": t.muted, "--subtle": t.subtle,
      "--edge": `rgb(${ink} / ${light ? 0.13 : 0.1})`, "--edge-soft": `rgb(${ink} / ${light ? 0.08 : 0.06})`,
      "--accent": accent, "--accent-ink": lum(accent) > 0.36 ? "#16130e" : "#ffffff",
      "--spill": light ? 0.4 : 0.62, "--grade": STOCKS[S.stock].grade,
    };
    const ty = TYPES[S.type];
    Object.assign(v, { "--font-display": ty.display, "--font-sans": ty.sans, "--d-weight": ty.weight, "--d-stretch": ty.stretch, "--d-track": ty.track });
    for (const k in v) root.style.setProperty(k, v[k]);
    root.style.colorScheme = light ? "light" : "dark";
    root.dataset.spill = S.spill ? "on" : "off";
    root.dataset.lights = S.lights ? "on" : "off";
    root.dataset.glow = S.glow ? "on" : "off";
    root.dataset.parallax = S.parallax && motionOn() ? "on" : "off";
    root.dataset.rise = S.rise ? "on" : "off";
    root.dataset.wide = S.wide ? "on" : "off";
    root.dataset.motion = motionOn() ? "on" : "off";
    root.dataset.nav = NAV_STYLES[S.nav] ? S.nav : "house";
    setGrain(S.grain);
  }

  /* ---------------- painted artwork ---------------- */
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = hashStr(String(seed)); return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const artCache = new Map();

  function sampleColor(src) {
    const c = document.createElement("canvas"); c.width = 24; c.height = 24;
    const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(src, 0, 0, 24, 24);
    const d = x.getImageData(0, 0, 24, 24).data;
    let r = 0, g = 0, b = 0, w = 0;
    for (let i = 0; i < d.length; i += 4) {
      const [, s, l] = rgbToHsl([d[i], d[i + 1], d[i + 2]]);
      const wt = s * s * (l > 0.18 && l < 0.88 ? 1 : 0.05) + 0.001;
      r += d[i] * wt; g += d[i + 1] * wt; b += d[i + 2] * wt; w += wt;
    }
    return [r / w, g / w, b / w];
  }

  // Paint one scene. Same seed = same scene at any size, so a poster and its backdrop match.
  function art(seed, w, h) {
    const key = `${seed}|${w}x${h}`;
    if (artCache.has(key)) return artCache.get(key);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d");
    const r = rng(seed);
    const hue = r() * 360, hue2 = (hue + 150 + r() * 90) % 360, kind = Math.floor(r() * 4);
    const hz = h * (0.5 + r() * 0.18), m = Math.min(w, h);
    let g = x.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, `hsl(${hue2} 45% 7%)`); g.addColorStop(0.55, `hsl(${hue} 48% 24%)`); g.addColorStop(1, `hsl(${(hue + 28) % 360} 78% 58%)`);
    x.fillStyle = g; x.fillRect(0, 0, w, hz + 2);
    if (r() < 0.55) {
      x.fillStyle = "#fff";
      for (let i = 0; i < 80; i++) { const s = r() * 1.3 * (w / 500) + 0.4; x.globalAlpha = r() * 0.7 + 0.1; x.fillRect(r() * w, r() * hz * 0.6, s, s); }
      x.globalAlpha = 1;
    }
    const sx = w * (0.22 + r() * 0.56), sy = hz - h * (0.04 + r() * 0.2), sr = m * (0.05 + r() * 0.09);
    g = x.createRadialGradient(sx, sy, sr * 0.4, sx, sy, sr * 6.5);
    g.addColorStop(0, `hsl(${(hue + 35) % 360} 95% 72% / .62)`); g.addColorStop(1, `hsl(${(hue + 35) % 360} 95% 72% / 0)`);
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = `hsl(${(hue + 40) % 360} 95% 88%)`; x.beginPath(); x.arc(sx, sy, sr, 0, Math.PI * 2); x.fill();
    if (kind === 3) {
      x.strokeStyle = `hsl(${(hue + 40) % 360} 95% 82%)`; x.lineWidth = Math.max(1, w / 420);
      for (let i = 1; i < 8; i++) { x.globalAlpha = 0.36 - i * 0.042; x.beginPath(); x.arc(sx, sy, sr * (1 + i * 0.85), 0, Math.PI * 2); x.stroke(); }
      x.globalAlpha = 1;
    }
    const ridge = (base, amp, col) => {
      const f1 = r() * 3 + 1, f2 = r() * 7 + 3, p1 = r() * 6, p2 = r() * 6;
      x.fillStyle = col; x.beginPath(); x.moveTo(0, h);
      for (let px = 0; px <= w + 1; px += w / 90) { const t = px / w; x.lineTo(px, base - amp * (Math.sin(t * f1 * Math.PI + p1) * 0.6 + Math.sin(t * f2 * Math.PI + p2) * 0.25 + 0.4)); }
      x.lineTo(w, h); x.closePath(); x.fill();
    };
    if (kind === 1) { // sea with a reflection and a small boat
      ridge(hz + 1, h * 0.035, `hsl(${hue2} 30% 10%)`);
      g = x.createLinearGradient(0, hz, 0, h); g.addColorStop(0, `hsl(${hue} 42% 20%)`); g.addColorStop(1, `hsl(${hue2} 40% 4%)`);
      x.fillStyle = g; x.fillRect(0, hz, w, h - hz);
      for (let i = 0; i < 28; i++) {
        const y = hz + (h - hz) * (i / 28) ** 1.35, bw = sr * (2.6 - i * 0.05) * (0.5 + r() * 0.9);
        x.fillStyle = `hsl(${(hue + 40) % 360} 95% 82% / ${0.55 * (1 - i / 28)})`; x.fillRect(sx - bw / 2, y, bw, Math.max(1, h / 320));
      }
      if (r() < 0.7) {
        const bx = w * (0.15 + r() * 0.7), by = hz + (h - hz) * 0.32, s = m * 0.05;
        x.fillStyle = `hsl(${hue2} 30% 5%)`; x.beginPath();
        x.moveTo(bx - s, by); x.lineTo(bx + s, by); x.lineTo(bx + s * 0.7, by + s * 0.3); x.lineTo(bx - s * 0.7, by + s * 0.3); x.closePath(); x.fill();
        x.beginPath(); x.moveTo(bx, by - s * 1.6); x.lineTo(bx, by); x.lineTo(bx + s * 0.8, by); x.closePath(); x.fill();
      }
    } else {
      const n = kind === 2 ? 2 : 4;
      for (let i = 0; i < n; i++) ridge(hz + (h - hz) * (i / n) * 0.75 + h * 0.02, h * (0.12 - i * 0.022), `hsl(${(hue2 + i * 6) % 360} ${30 - i * 4}% ${16 - i * 3.4}%)`);
      if (kind === 2) { // a town at the shoreline
        const ground = h - (h - hz) * 0.22;
        let bx = -w * 0.01;
        while (bx < w) {
          const bw = w * (0.035 + r() * 0.06), bh = h * (0.06 + r() * 0.22) * (r() < 0.15 ? 1.6 : 1);
          x.fillStyle = `hsl(${hue2} 25% 6%)`; x.fillRect(bx, ground - bh, bw, bh + 2);
          const ws = Math.max(2, bw * 0.16);
          for (let wy = ground - bh + ws; wy < ground - ws; wy += ws * 1.8) for (let wx = bx + ws * 0.7; wx < bx + bw - ws; wx += ws * 1.7) {
            if (r() < 0.24) { x.fillStyle = `hsl(${38 + r() * 18} 90% 70% / .9)`; x.fillRect(wx, wy, ws, ws * 0.9); }
          }
          bx += bw + w * 0.004;
        }
        x.fillStyle = `hsl(${hue2} 25% 5%)`; x.fillRect(0, ground, w, h - ground);
      }
    }
    g = x.createRadialGradient(w / 2, h * 0.45, m * 0.25, w / 2, h * 0.5, Math.max(w, h) * 0.78);
    g.addColorStop(0, "rgb(0 0 0 / 0)"); g.addColorStop(1, "rgb(0 0 0 / .55)");
    x.fillStyle = g; x.fillRect(0, 0, w, h);

    const small = document.createElement("canvas");
    small.width = 192; small.height = Math.round((192 * h) / w);
    small.getContext("2d").drawImage(c, 0, 0, small.width, small.height);
    const out = { url: c.toDataURL("image/jpeg", 0.86), color: sampleColor(c), small };
    artCache.set(key, out);
    return out;
  }

  const CAN_FILTER = "filter" in CanvasRenderingContext2D.prototype;
  function softDraw(x, src, dx, dy, dw, dh, blur, extra = "") {
    if (CAN_FILTER) { x.filter = `blur(${blur}px) ${extra}`; x.drawImage(src, dx, dy, dw, dh); x.filter = "none"; return; }
    const t = document.createElement("canvas"); t.width = Math.max(4, Math.round(dw / blur)); t.height = Math.max(4, Math.round(dh / blur));
    t.getContext("2d").drawImage(src, 0, 0, t.width, t.height);
    x.imageSmoothingQuality = "high"; x.drawImage(t, dx, dy, dw, dh);
  }
  // Focus pull: a soft copy at 160px, drawn once, scaled up by CSS.
  function focusCanvas(a) {
    const c = document.createElement("canvas"); c.width = 160; c.height = Math.round(160 * a.small.height / a.small.width);
    softDraw(c.getContext("2d"), a.small, -4, -4, c.width + 8, c.height + 8, 4);
    c.setAttribute("aria-hidden", "true");
    return c;
  }
  // Light spill: the artwork blurred with its fade baked in, drawn once per slide.
  function drawSpill(canvas, a) {
    canvas.width = 200; canvas.height = 140;
    const x = canvas.getContext("2d");
    x.clearRect(0, 0, 200, 140);
    // The picture's own colors at the top, and its strongest color pooling below it, the way a screen lights a floor.
    const [r, gg, b] = a.color.map(Math.round);
    let g = x.createRadialGradient(100, 70, 4, 100, 74, 92);
    g.addColorStop(0, `rgb(${r} ${gg} ${b} / .95)`); g.addColorStop(1, `rgb(${r} ${gg} ${b} / 0)`);
    x.fillStyle = g; x.fillRect(0, 0, 200, 140);
    x.globalAlpha = 0.85;
    softDraw(x, a.small, 30, 6, 140, 60, 12, "saturate(1.5)");
    x.globalAlpha = 1;
    x.globalCompositeOperation = "destination-in";
    g = x.createRadialGradient(100, 56, 8, 100, 64, 98);
    g.addColorStop(0, "rgb(0 0 0 / 1)"); g.addColorStop(0.55, "rgb(0 0 0 / .8)"); g.addColorStop(1, "rgb(0 0 0 / 0)");
    x.fillStyle = g; x.fillRect(0, 0, 200, 140);
    x.globalCompositeOperation = "source-over";
  }

  /* ---------------- catalogue (all invented) ---------------- */
  const NAMES = ["Paper Moons", "Northbound Freight", "Glasshouse Summer", "Ember County", "The Quiet Signal", "Vesper Street", "Driftwood Kings", "Neon Orchard", "Salt and Static", "The Long Exposure", "Harbor of Lanterns", "Ninefold", "After the Ferry", "Cinder Coast", "The Lamplighter's Son", "Small Hours", "Copper Weather", "Field Notes from Orbit", "The Last Projectionist", "Kestrel Point", "Low Season", "Understory", "Seven Bridges Down", "The Weight of Rivers"];
  const SYNOPSES = [
    "A night-shift radio host starts getting calls from a listener who describes tomorrow's news, word for word.",
    "Two estranged sisters drive their father's freight route one last time, from the coast to the border.",
    "A botanist inherits a greenhouse that keeps flowering out of season, and a neighbour who wants it gone.",
    "When the county's only fire lookout goes silent, a teenage volunteer climbs up to find out why.",
    "A cryptographer is pulled out of retirement to decode a signal that repeats every nine minutes.",
    "On one street in a rain-soaked city, five strangers spend the same evening trying to leave town.",
    "Three brothers rebuild their late mother's boatyard while a developer circles the waterfront.",
    "A neon sign maker falls for the night guard at the orchard museum across the road.",
    "A sound engineer hears a voice buried in an old tape and follows it to a seaside town.",
    "A photographer leaves the shutter open on a single night and finds someone in the frame who was never there.",
    "A lantern festival brings a lost fisherman's son home for the first time in twenty years.",
    "Nine contestants, one locked theatre, and a game show that has not aired since 1987.",
  ];
  const FIRST = ["Mara", "Tomas", "Ines", "Callum", "Noor", "Ezra", "Priya", "Lev", "Sunniva", "Abel", "Dalia", "Ruben", "Hana", "Otis", "Ilse", "Joaquin", "Wren", "Kofi"];
  const LAST = ["Ellison", "Vaughn", "Okafor", "Lindqvist", "Marchetti", "Haddad", "Brandt", "Soriano", "Achterberg", "Nakamura", "Quill", "Delacroix", "Fenwick", "Arslan", "Moreau", "Kowalczyk"];
  const GENRES = ["Drama", "Mystery", "Thriller", "Science fiction", "Romance", "Comedy", "Adventure", "Crime", "Fantasy"];

  const TITLES = NAMES.map((name, id) => {
    const r = rng("meta" + id);
    const person = () => `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`;
    const show = id % 3 === 1;
    const g1 = GENRES[Math.floor(r() * GENRES.length)];
    let g2 = GENRES[Math.floor(r() * GENRES.length)]; if (g2 === g1) g2 = GENRES[(GENRES.indexOf(g1) + 2) % GENRES.length];
    return {
      id, name, show,
      year: 2014 + Math.floor(r() * 12),
      runtime: show ? `${2 + Math.floor(r() * 3)} seasons` : `${1 + Math.floor(r() * 2)} h ${10 + Math.floor(r() * 48)} min`,
      rating: (6.4 + r() * 2.4).toFixed(1),
      genres: [g1, g2],
      res: r() < 0.55 ? "4K" : "HD",
      synopsis: SYNOPSES[id % SYNOPSES.length],
      director: person(), writer: person(), music: person(), dop: person(), producer: person(),
      cast: [person(), person(), person()],
    };
  });
  const T = (id) => TITLES[id];
  const poster = (id) => art("t" + id, 300, 450);
  const still = (id) => art("t" + id, 480, 270);
  const backdrop = (id) => art("t" + id, 1280, 720);

  const FEATURED = [
    { id: 2, kicker: "Number 1 in Movies today" },
    { id: 10, kicker: "New season out now" },
    { id: 17, kicker: "Because you watched Paper Moons" },
    { id: 18, kicker: "Award winner" },
  ];

  /* ---------------- markup helpers ---------------- */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const words = (s) => s.split(" ").map((w, i) => `<span class="w" style="--wi:${i}">${esc(w)}</span>`).join(" ");
  const badges = (t, opts = {}) => [
    opts.newEp ? `<span class="badge badge-new">New episode</span>` : "",
    `<span class="badge" title="Rating">${t.rating}</span>`,
    `<span class="badge">${t.res}</span>`,
  ].join("");
  const metaLine = (t, opts) => `<span>${t.year}</span><span>${esc(t.runtime)}</span><span>${t.genres.join(", ")}</span>${badges(t, opts)}`;
  const glow = (a) => `rgb(${a.color.map(Math.round).join(" ")} / .9)`;

  function card(id, i, opts = {}) {
    const t = T(id), a = opts.wide ? still(id) : poster(id);
    const sub = opts.progress != null
      ? `<span class="badge">${opts.ep}</span><span>${opts.left}</span>`
      : `<span>${t.year}</span>${opts.newEp ? '<span class="badge badge-new">New episode</span>' : `<span class="badge">${t.rating}</span>`}`;
    return `<button type="button" class="card${opts.wide ? " card-wide" : ""}" data-id="${id}" style="--i:${Math.min(i, 8)};--glow:${glow(a)}" aria-label="${esc(t.name)}">
      <span class="card-glow" aria-hidden="true"></span>
      <span class="card-poster-wrap">
        <span class="card-poster"><img src="${a.url}" alt="" decoding="async">${opts.progress != null ? `<span class="card-progress"><i style="--p:${opts.progress}"></i></span>` : ""}</span>
        <span class="card-name">${esc(t.name)}</span>
        <span class="card-sub">${sub}</span>
      </span>
    </button>`;
  }
  const row = (title, inner, cls = "") => `<section class="row"><div class="row-head" style="--i:0"><h2 class="row-title">${esc(title)}</h2><button type="button" class="row-more" data-more>See all</button></div><div class="rail ${cls}">${inner}</div></section>`;

  function renderHome() {
    const cw = [[3, 0.62, "S2 E4", "18 min left"], [7, 0.3, "Film", "1 h 12 min left"], [1, 0.84, "S1 E8", "6 min left"], [13, 0.45, "S3 E1", "31 min left"], [5, 0.15, "Film", "1 h 40 min left"]];
    const top = [4, 11, 2, 8, 15, 0, 19, 6, 12, 21];
    const fresh = TITLES.filter((t) => t.show).map((t) => t.id);
    $("#home-rows").innerHTML =
      row("Continue watching", cw.map(([id, p, ep, left], i) => card(id, i, { wide: true, progress: p, ep, left })).join(""), "rail-wide") +
      row("Top 10 in Movies today", top.map((id, i) => `<div class="rank" aria-label="Number ${i + 1}"><span class="rank-num" aria-hidden="true">${i + 1}</span>${card(id, i)}</div>`).join(""), "rail-rank") +
      row("New episodes this week", fresh.map((id, i) => card(id, i, { newEp: true })).join("")) +
      row("Because you watched Paper Moons", [9, 14, 20, 3, 22, 16, 5, 23, 11, 7, 1, 18].map((id, i) => card(id, i)).join("")) +
      row("Award winners", [18, 6, 21, 0, 12, 15, 2, 9, 19, 4, 23, 13].map((id, i) => card(id, i)).join(""));
  }

  /* ---------------- banner ---------------- */
  const banner = $("#banner");
  let slide = 0, bannerHold = false;
  function buildBanner() {
    $("#banner-art").innerHTML = "";
    FEATURED.forEach((f, i) => {
      const a = backdrop(f.id);
      const el = document.createElement("div");
      el.className = "slide"; el.dataset.slide = i;
      el.innerHTML = `<img src="${a.url}" alt="">`;
      el.appendChild(focusCanvas(a));
      $("#banner-art").appendChild(el);
    });
    $("#banner-dots").innerHTML = FEATURED.map((f, i) => `<button type="button" role="tab" aria-label="${esc(T(f.id).name)}" aria-selected="false" data-dot="${i}"></button>`).join("");
  }
  function restart(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function setSlide(i) {
    slide = (i + FEATURED.length) % FEATURED.length;
    const f = FEATURED[slide], t = T(f.id), a = backdrop(f.id);
    $$(".slide", banner).forEach((el, j) => {
      el.classList.toggle("on", j === slide);
      if (j === slide) { if (S.focus && motionOn()) restart(el, "pull"); else el.classList.remove("pull"); }
    });
    $$("[data-dot]").forEach((d, j) => d.setAttribute("aria-selected", String(j === slide)));
    $("#banner-kicker").textContent = f.kicker;
    const title = $("#banner-title");
    title.innerHTML = words(t.name);
    if (S.reveal && motionOn()) restart(title, "reveal"); else title.classList.remove("reveal");
    $("#banner-meta").innerHTML = metaLine(t, { newEp: t.show });
    $("#banner-text").textContent = t.synopsis;
    for (const el of [$("#banner-meta"), $("#banner-text"), $("#banner-kicker")]) { if (S.reveal && motionOn()) restart(el, "reveal-soft"); else el.classList.remove("reveal-soft"); }
    if (S.wide && motionOn()) restart($(".banner-bars"), "open");
    artColor = a.color; applyTheme();
    spillTo(a);
    const now = $(".side-now");
    $("#side-now-img").src = a.url; $("#side-now-title").textContent = t.name;
    if (motionOn()) restart(now, "swap"); else now.classList.remove("swap");
  }
  setInterval(() => {
    if (document.hidden || bannerHold || view !== "home" || anyOverlay()) return;
    setSlide(slide + 1);
  }, 9000);
  banner.addEventListener("pointerenter", () => { bannerHold = true; });
  banner.addEventListener("pointerleave", () => { bannerHold = false; resetParallax(); });

  /* Pointer parallax, ported from Fathom's hero: the banner tilts toward the pointer, the picture shifts
     away from it and the copy drifts a little with it, so the three read as layers. Transforms only, written
     at most once a frame, and only while a mouse is over the banner. Nothing runs when the pointer is still. */
  const bannerArt = $("#banner-art"), bannerCopy = $(".banner-copy", banner);
  let pxRaf = 0, pxEv = null, pxMoved = false;
  banner.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || !S.parallax || !motionOn()) return;
    pxEv = e;
    if (!pxRaf) pxRaf = requestAnimationFrame(parallaxFrame);
  });
  function parallaxFrame() {
    pxRaf = 0;
    if (!pxEv || view !== "home") return;
    const r = banner.getBoundingClientRect();
    const px = Math.max(-1, Math.min(1, ((pxEv.clientX - r.left) / r.width) * 2 - 1));
    const py = Math.max(-1, Math.min(1, ((pxEv.clientY - r.top) / r.height) * 2 - 1));
    banner.style.transform = `perspective(1600px) rotateX(${(-py * 1.6).toFixed(2)}deg) rotateY(${(px * 2.4).toFixed(2)}deg)`;
    bannerArt.style.transform = `translate3d(${(-px * 16).toFixed(1)}px, ${(-py * 10).toFixed(1)}px, 0) scale(1.06)`;
    bannerCopy.style.transform = `translate3d(${(px * 6).toFixed(1)}px, ${(py * 4).toFixed(1)}px, 0)`;
    pxMoved = true;
  }
  function resetParallax() {
    if (pxRaf) { cancelAnimationFrame(pxRaf); pxRaf = 0; }
    pxEv = null;
    if (!pxMoved) return;
    for (const el of [banner, bannerArt, bannerCopy]) el.style.removeProperty("transform");
    pxMoved = false;
  }
  banner.addEventListener("focusin", () => { bannerHold = true; });
  banner.addEventListener("focusout", () => { bannerHold = false; });
  $("#banner-dots").addEventListener("click", (e) => { const d = e.target.closest("[data-dot]"); if (d) setSlide(+d.dataset.dot); });
  $("#banner-play").addEventListener("click", () => play(FEATURED[slide].id));
  $("#banner-details").addEventListener("click", () => openDetail(FEATURED[slide].id));

  /* ---------------- light spill ---------------- */
  const spills = [$("#spill-a"), $("#spill-b")];
  let spillFront = 0;
  function spillTo(a) {
    if (!a) { spills.forEach((s) => s.classList.remove("on")); return; }
    const next = spills[1 - spillFront];
    drawSpill(next, a);
    next.classList.add("on"); spills[spillFront].classList.remove("on");
    spillFront = 1 - spillFront;
  }

  /* ---------------- views ---------------- */
  let view = "home", page = "home", detailId = null;
  const history = [];
  const PAGES = {
    discover: ["Discover", "Popular this week across your add-ons."],
    movies: ["Movies", "Films from your add-ons, newest first."],
    shows: ["Shows", "Series from your add-ons, newest first."],
    anime: ["Anime", "Series and films from your anime sources."],
    live: ["Live", "Placeholder page. Projector styles Harbor's own Live layout here."],
    calendar: ["Calendar", "Placeholder page. Projector styles Harbor's own calendar here."],
    library: ["Library", "Everything you have saved."],
  };
  function showView(name) {
    hidePreview();
    view = name;
    $$(".view").forEach((v) => { v.hidden = v.dataset.view !== name; });
    const cur = $(`.view[data-view="${name}"]`);
    if (motionOn()) restart(cur, "enter");
    window.scrollTo(0, 0);
    if (name === "home") spillTo(backdrop(FEATURED[slide].id));
    else if (name === "detail") spillTo(backdrop(detailId));
    else spillTo(null);
  }
  function setNav(p) {
    page = p;
    $$("[data-harbor-nav]").forEach((b) => b.toggleAttribute("data-active", b.dataset.harborNav === p));
    const act = $(`[data-harbor-nav="${p}"]`), pill = $(".side-pill");
    if (act && pill) pill.style.transform = `translateY(${act.offsetTop}px)`;
  }
  function go(p, opts = {}) {
    if (!opts.back && view !== "detail") history.length = 0;
    setNav(p);
    if (p === "home") { showView("home"); return; }
    if (p === "settings") { showView("settings"); return; }
    const [title, sub] = PAGES[p];
    $("#grid-title").textContent = title; $("#grid-sub").textContent = sub;
    const shift = Object.keys(PAGES).indexOf(p) * 5;
    let ids = TITLES.map((t) => t.id);
    if (p === "movies") ids = ids.filter((id) => !T(id).show);
    if (p === "shows") ids = ids.filter((id) => T(id).show);
    ids = ids.map((_, i) => ids[(i + shift) % ids.length]);
    $("#grid").innerHTML = ids.map((id, i) => card(id, i, { newEp: p === "shows" && i < 3 })).join("");
    showView("grid");
  }
  $("#side-nav").addEventListener("click", (e) => { const b = e.target.closest("[data-harbor-nav]"); if (b) go(b.dataset.harborNav); });

  function openDetail(id) {
    if (view !== "detail") history.push(page);
    detailId = id;
    const t = T(id), a = backdrop(id);
    const holder = $("#detail-art");
    holder.innerHTML = `<img src="${a.url}" alt="">`; holder.appendChild(focusCanvas(a));
    if (S.focus && motionOn()) restart(holder, "pull"); else holder.classList.remove("pull");
    const title = $("#detail-title");
    title.innerHTML = words(t.name);
    if (S.reveal && motionOn()) restart(title, "reveal"); else title.classList.remove("reveal");
    $("#detail-meta").innerHTML = metaLine(t, { newEp: t.show });
    $("#detail-synopsis").textContent = t.synopsis;
    const credit = (role, names, wide) => `<div class="credit${wide ? " credit-wide" : ""}"><span class="credit-role">${role}</span>${names.map((n) => `<span class="credit-name">${esc(n)}</span>`).join("")}</div>`;
    $("#detail-credits").innerHTML =
      credit(t.show ? "Created by" : "Directed by", [t.director], true) +
      credit("Written by", [t.writer]) + credit("Cinematography by", [t.dop]) + credit("Music by", [t.music]).replace('class="credit"', 'class="credit credit-span"') +
      credit("Starring", t.cast, true) + credit("Produced by", [t.producer], true);
    const more = TITLES.filter((x) => x.id !== id && x.genres.some((g) => t.genres.includes(g))).slice(0, 12).map((x) => x.id);
    $("#detail-rows").innerHTML = row("More like this", more.map((mid, i) => card(mid, i)).join(""));
    artColor = a.color; applyTheme();
    showView("detail");
    title.setAttribute("tabindex", "-1"); title.focus({ preventScroll: true });
  }
  function back() {
    const p = history.pop() || "home";
    go(p, { back: true });
    if (p === "home") { artColor = backdrop(FEATURED[slide].id).color; applyTheme(); }
  }
  $("#detail-back").addEventListener("click", back);
  $("#detail-play").addEventListener("click", () => play(detailId));
  $("#settings-open-panel").addEventListener("click", () => openPanel());

  document.addEventListener("click", (e) => {
    const c = e.target.closest(".card");
    if (c) { openDetail(+c.dataset.id); return; }
    if (e.target.closest("[data-more]")) toast("In Harbor this opens the full list for the row.");
  });

  /* ---------------- hover preview + house lights ---------------- */
  const preview = $("#preview"), lights = $("#lights");
  let hoverTimer = 0, hideTimer = 0, hoverCard = null, previewId = null;
  document.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    if (e.target.closest("#preview")) { clearTimeout(hideTimer); return; }
    const c = e.target.closest(".card");
    if (!c || c === hoverCard || anyOverlay()) return;
    hoverCard = c; clearTimeout(hoverTimer); clearTimeout(hideTimer);
    hoverTimer = setTimeout(() => showPreview(c), 600);
  });
  document.addEventListener("pointerout", (e) => {
    if (e.pointerType !== "mouse") return;
    const to = e.relatedTarget;
    const fromCard = e.target.closest(".card"), fromPreview = e.target.closest("#preview");
    if ((fromCard && fromCard === hoverCard && !(to && (fromCard.contains(to) || preview.contains(to)))) ||
        (fromPreview && !(to && (preview.contains(to) || (hoverCard && hoverCard.contains(to)))))) {
      clearTimeout(hoverTimer);
      hideTimer = setTimeout(hidePreview, 140);
    }
  });
  function showPreview(c) {
    const id = +c.dataset.id, t = T(id), a = art("t" + id, 640, 360);
    previewId = id;
    $("#preview-art").innerHTML = `<img src="${a.url}" alt="">`;
    $("#preview-title").textContent = t.name;
    $("#preview-meta").innerHTML = metaLine(t, { newEp: t.show });
    $("#preview-text").textContent = t.synopsis;
    preview.hidden = false; restart(preview, "preview");
    const r = c.querySelector(".card-poster").getBoundingClientRect();
    const pw = preview.offsetWidth, ph = preview.offsetHeight;
    const left = Math.max(12, Math.min(innerWidth - pw - 12, r.left + r.width / 2 - pw / 2));
    const top = Math.max(12, Math.min(innerHeight - ph - 12, r.top + r.height / 2 - ph / 2));
    preview.style.left = left + "px"; preview.style.top = top + "px";
    lights.classList.add("dim");
  }
  function hidePreview() {
    clearTimeout(hoverTimer); clearTimeout(hideTimer);
    hoverCard = null; previewId = null;
    if (!preview.hidden) { preview.hidden = true; lights.classList.remove("dim"); }
  }
  addEventListener("scroll", () => { if (!preview.hidden || hoverCard) hidePreview(); }, { passive: true, capture: true });
  $("#preview-play").addEventListener("click", () => { const id = previewId; hidePreview(); play(id); });
  $("#preview-details").addEventListener("click", () => { const id = previewId; hidePreview(); openDetail(id); });

  /* ---------------- player ---------------- */
  const player = $("#player");
  let playerFocus = null;
  async function play(id) {
    hidePreview();
    playerFocus = document.activeElement;
    if (S.lights && motionOn()) { lights.classList.add("black"); await wait(780); }
    $("#player-art").innerHTML = `<img src="${backdrop(id).url}" alt="">`;
    $("#player-title").textContent = T(id).name;
    player.hidden = false;
    $("#player-close").focus();
  }
  function closePlayer() {
    player.hidden = true;
    lights.classList.remove("black");
    if (playerFocus && playerFocus.focus) playerFocus.focus({ preventScroll: true });
  }
  $("#player-close").addEventListener("click", closePlayer);

  /* ---------------- Intermission ---------------- */
  const im = $("#intermission");
  let imTimer = 0, imClock = 0, imIdx = 0, imFront = 0, imOpenedAt = 0, imStart = null, imFocus = null;
  const imLayers = [$("#im-a"), $("#im-b")];
  const imList = [2, 10, 17, 18, 9, 14, 4, 21];
  function imShow(i) {
    const id = imList[i % imList.length], t = T(id), next = imLayers[1 - imFront];
    next.innerHTML = `<img src="${backdrop(id).url}" alt="">`;
    void next.offsetWidth;
    next.classList.add("on"); imLayers[imFront].classList.remove("on");
    imFront = 1 - imFront;
    const title = $("#im-title"); title.innerHTML = words(t.name);
    if (motionOn()) restart(title, "reveal");
    $("#im-meta").textContent = `${t.year}. ${t.genres.join(", ")}. ${t.synopsis}`;
  }
  function imTick() { $("#im-clock").textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
  function openIntermission() {
    closeAllOverlays();
    imFocus = document.activeElement;
    im.hidden = false; imOpenedAt = performance.now(); imStart = null;
    imIdx = 0; imShow(imIdx); imTick();
    imTimer = setInterval(() => imShow(++imIdx), 9000);
    imClock = setInterval(imTick, 15000);
  }
  function closeIntermission() {
    if (im.hidden) return;
    clearInterval(imTimer); clearInterval(imClock);
    im.hidden = true; imLayers.forEach((l) => { l.classList.remove("on"); l.innerHTML = ""; });
    if (imFocus && imFocus.focus) imFocus.focus({ preventScroll: true });
  }
  const imReady = () => !im.hidden && performance.now() - imOpenedAt > 700;
  im.addEventListener("pointerdown", () => { if (imReady()) closeIntermission(); });
  im.addEventListener("pointermove", (e) => {
    if (!imReady()) return;
    if (!imStart) { imStart = [e.clientX, e.clientY]; return; }
    if (Math.hypot(e.clientX - imStart[0], e.clientY - imStart[1]) > 40) closeIntermission();
  });
  $("#open-intermission").addEventListener("click", openIntermission);

  /* ---------------- settings panel ---------------- */
  const panel = $("#panel");
  let panelFocus = null;
  function openPanel(tab) {
    closePalette(); hidePreview();
    if (tab) selectTab(tab);
    if (!panel.hidden) return;
    panelFocus = document.activeElement;
    panel.hidden = false; void panel.offsetWidth; panel.classList.add("open");
    $('.tabs [aria-selected="true"]').focus();
  }
  async function closePanel() {
    if (panel.hidden) return;
    panel.classList.remove("open");
    await wait(dur(380));
    panel.hidden = true;
    if (panelFocus && panelFocus.focus) panelFocus.focus({ preventScroll: true });
  }
  function selectTab(name) {
    $$(".tabs [data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
    $$("[data-pane]").forEach((p) => { p.hidden = p.dataset.pane !== name; });
  }
  $(".tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) selectTab(b.dataset.tab); });
  $("#panel-close").addEventListener("click", closePanel);
  $("#open-settings").addEventListener("click", () => (panel.hidden ? openPanel() : closePanel()));

  $("#stocks").innerHTML = Object.entries(STOCKS).map(([k, s]) => `<button type="button" class="stock" data-stock="${k}">
    <span class="stock-chip" aria-hidden="true">${[s.dark.canvas, s.dark.raised, s.dark.ink, s.dark.accent].map((c) => `<i style="background:${c}"></i>`).join("")}</span>
    <span><span class="stock-name">${s.name}</span><br><span class="stock-desc">${s.desc}</span></span></button>`).join("");
  $("#types").innerHTML = Object.entries(TYPES).map(([k, t]) => `<button type="button" class="type" data-type="${k}">
    <span class="type-sample" style="font-family:${esc(t.display)};font-weight:${t.weight};font-stretch:${t.stretch};letter-spacing:${t.track}">The Quiet Signal</span>
    <span class="type-name" style="font-family:${esc(t.sans)}">${t.name}</span><span class="type-desc" style="font-family:${esc(t.sans)}">${t.desc}</span></button>`).join("");
  const TOGGLES = [
    ["spill", "Light spill", "The banner's colors glow onto the page around it."],
    ["parallax", "Banner follows the pointer", "The banner tilts toward the pointer and the picture shifts the other way. Only while the pointer is over it."],
    ["focus", "Focus pull", "Each new banner starts soft and sharpens."],
    ["reveal", "Title reveal", "Banner titles rise in word by word."],
    ["lights", "House lights", "The page dims behind the hover preview and fades to black before playback."],
    ["glow", "Hover glow", "A poster glows in its own color when you point at it."],
    ["rise", "Rise in on scroll", "Rows rise and fade in as they scroll into view."],
    ["wide", "Widescreen banner", "A wide cinema crop with bars that open on each slide.", "1.1"],
    ["grain", "Film grain", "A fine moving grain over everything.", "1.1"],
  ];
  $("#toggles-cinema").innerHTML = TOGGLES.map(([k, name, desc, tag]) => `<button type="button" class="toggle" role="switch" data-toggle="${k}" aria-checked="false">
    <span class="toggle-name">${name}${tag ? `<span class="toggle-tag">Planned for ${tag}</span>` : ""}</span><span class="switch" aria-hidden="true"></span><span class="toggle-desc">${desc}</span></button>`).join("");

  const fmtHour = (h) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
  function refreshPanel() {
    $$("#seg-appearance [data-v]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === S.appearance)));
    $$("#seg-accent [data-v]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === S.accent)));
    $$("#seg-nav [data-v]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === S.nav)));
    $("#nav-hint").textContent = (NAV_STYLES[S.nav] || NAV_STYLES.house).hint;
    $$("#seg-motion [data-v]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === S.motion)));
    $$("[data-stock]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.stock === S.stock)));
    $$("[data-type]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.type === S.type)));
    $$("[data-toggle]").forEach((b) => b.setAttribute("aria-checked", String(!!S[b.dataset.toggle])));
    $("#timesim").hidden = S.appearance !== "time";
    $("#time-slider").value = S.hour; $("#time-out").textContent = fmtHour(S.hour);
  }
  function set(patch, note) {
    Object.assign(S, patch); save(); applyTheme(); refreshPanel();
    if ("wide" in patch || "focus" in patch || "reveal" in patch) { if (view === "home") setSlide(slide); }
    if ("nav" in patch) setNav(page);
    if (note) toast(note);
  }
  $("#seg-appearance").addEventListener("click", (e) => { const b = e.target.closest("[data-v]"); if (b) set({ appearance: b.dataset.v }); });
  $("#seg-accent").addEventListener("click", (e) => { const b = e.target.closest("[data-v]"); if (b) set({ accent: b.dataset.v }); });
  $("#seg-nav").addEventListener("click", (e) => { const b = e.target.closest("[data-v]"); if (b) set({ nav: b.dataset.v }); });
  $("#seg-motion").addEventListener("click", (e) => { const b = e.target.closest("[data-v]"); if (b) set({ motion: b.dataset.v }); });
  $("#stocks").addEventListener("click", (e) => { const b = e.target.closest("[data-stock]"); if (b) set({ stock: b.dataset.stock }); });
  $("#types").addEventListener("click", (e) => { const b = e.target.closest("[data-type]"); if (b) set({ type: b.dataset.type }); });
  $("#toggles-cinema").addEventListener("click", (e) => { const b = e.target.closest("[data-toggle]"); if (b) set({ [b.dataset.toggle]: !S[b.dataset.toggle] }); });
  $("#time-slider").addEventListener("input", (e) => set({ hour: +e.target.value }));
  lightMQ.addEventListener("change", () => { if (S.appearance === "windows") applyTheme(); });
  reducedMQ.addEventListener("change", applyTheme);
  new MutationObserver(() => { if (S.appearance === "windows") applyTheme(); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  /* ---------------- grain ---------------- */
  let grainEl = null;
  function setGrain(on) {
    if (on && !grainEl) {
      const c = document.createElement("canvas"); c.width = c.height = 160;
      const x = c.getContext("2d"), d = x.createImageData(160, 160);
      for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
      x.putImageData(d, 0, 0);
      grainEl = document.createElement("div"); grainEl.className = "grain"; grainEl.setAttribute("aria-hidden", "true");
      grainEl.style.backgroundImage = `url(${c.toDataURL()})`;
      document.body.appendChild(grainEl);
    } else if (!on && grainEl) { grainEl.remove(); grainEl = null; }
  }

  /* ---------------- command palette ---------------- */
  const pWrap = $("#palette-wrap"), pInput = $("#palette-input"), pList = $("#palette-list");
  let pItems = [], pActive = 0, pFocus = null;
  const NAV = [["home", "Home"], ["discover", "Discover"], ["movies", "Movies"], ["shows", "Shows"], ["anime", "Anime"], ["live", "Live"], ["calendar", "Calendar"], ["library", "Library"], ["settings", "Settings"]];
  function commands() {
    const on = (k) => (S[k] ? "off" : "on");
    return [
      ...NAV.map(([k, n]) => ({ group: "Go to", label: n, state: page === k && view !== "detail" ? "Current" : "", run: () => go(k) })),
      { group: "Projector", label: "Open Projector settings", key: "Alt T", run: () => openPanel() },
      { group: "Projector", label: "Start Intermission", run: openIntermission },
      { group: "Projector", label: "Play the featured title", run: () => play(FEATURED[slide].id) },
      { group: "Projector", label: "Show keyboard shortcuts", key: "?", run: openKeys },
      { group: "Projector", label: "Search Harbor", key: "/", run: searchToast },
      { group: "Projector", label: `Turn light spill ${on("spill")}`, run: () => set({ spill: !S.spill }, `Light spill ${S.spill ? "off" : "on"}`) },
      { group: "Projector", label: `Turn house lights ${on("lights")}`, run: () => set({ lights: !S.lights }, `House lights ${S.lights ? "off" : "on"}`) },
      { group: "Projector", label: `Turn widescreen banner ${on("wide")}`, run: () => set({ wide: !S.wide }, `Widescreen banner ${S.wide ? "off" : "on"}`) },
      ...[["dark", "Dark"], ["light", "Light"], ["time", "Follow time of day"], ["windows", "Follow Windows"]].map(([k, n]) => ({ group: "Appearance", label: n, state: S.appearance === k ? "Current" : "", run: () => set({ appearance: k }, `Appearance: ${n}`) })),
      ...Object.entries(NAV_STYLES).map(([k, n]) => ({ group: "Navigation", label: `${n.name} navigation`, state: S.nav === k ? "Current" : "", run: () => set({ nav: k }, `Navigation: ${n.name}`) })),
      ...Object.entries(STOCKS).map(([k, s]) => ({ group: "Film stock", label: s.name, state: S.stock === k ? "Current" : "", run: () => set({ stock: k }, `Film stock: ${s.name}`) })),
      ...Object.entries(TYPES).map(([k, t]) => ({ group: "Type", label: t.name, state: S.type === k ? "Current" : "", run: () => set({ type: k }, `Type: ${t.name}`) })),
    ];
  }
  function renderPalette() {
    const q = pInput.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    pItems = commands().filter((c) => { const hay = `${c.group} ${c.label}`.toLowerCase(); return q.every((w) => hay.includes(w)); });
    pActive = Math.min(pActive, Math.max(0, pItems.length - 1));
    if (!pItems.length) { pList.innerHTML = `<li class="palette-empty">No command matches "${esc(pInput.value)}". Try a page name, a film stock or "dark".</li>`; return; }
    let html = "", last = "";
    pItems.forEach((c, i) => {
      if (c.group !== last) { html += `<li class="palette-group" role="presentation">${c.group}</li>`; last = c.group; }
      html += `<li class="palette-item" role="option" id="pi-${i}" data-i="${i}" aria-selected="${i === pActive}"><span class="pi-label">${esc(c.label)}</span>${c.state ? `<span class="pi-state">${c.state}</span>` : c.key ? `<kbd>${c.key}</kbd>` : ""}</li>`;
    });
    pList.innerHTML = html;
    pInput.setAttribute("aria-activedescendant", "pi-" + pActive);
    const a = $(`#pi-${pActive}`); if (a) a.scrollIntoView({ block: "nearest" });
  }
  function openPalette() {
    hidePreview();
    if (!pWrap.hidden) return;
    pFocus = document.activeElement;
    pWrap.hidden = false; pInput.value = ""; pActive = 0; renderPalette(); pInput.focus();
  }
  function closePalette(restoreFocus = true) {
    if (pWrap.hidden) return;
    pWrap.hidden = true;
    if (restoreFocus && pFocus && pFocus.focus) pFocus.focus({ preventScroll: true });
  }
  function runPalette(i) { const c = pItems[i]; if (!c) return; closePalette(false); c.run(); }
  pInput.addEventListener("input", () => { pActive = 0; renderPalette(); });
  pInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); pActive = (pActive + 1) % Math.max(1, pItems.length); renderPalette(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); pActive = (pActive - 1 + pItems.length) % Math.max(1, pItems.length); renderPalette(); }
    else if (e.key === "Enter") { e.preventDefault(); runPalette(pActive); }
  });
  pList.addEventListener("pointermove", (e) => { const li = e.target.closest("[data-i]"); if (li && +li.dataset.i !== pActive) { pActive = +li.dataset.i; renderPalette(); } });
  pList.addEventListener("click", (e) => { const li = e.target.closest("[data-i]"); if (li) runPalette(+li.dataset.i); });
  pWrap.addEventListener("pointerdown", (e) => { if (e.target === pWrap) closePalette(); });
  $("#open-palette").addEventListener("click", openPalette);

  /* ---------------- shortcut sheet, search, toast ---------------- */
  const kWrap = $("#keys-wrap");
  let kFocus = null;
  function openKeys() { if (!kWrap.hidden) return; kFocus = document.activeElement; kWrap.hidden = false; $("[data-close]", kWrap).focus(); }
  function closeKeys() { if (kWrap.hidden) return; kWrap.hidden = true; if (kFocus && kFocus.focus) kFocus.focus({ preventScroll: true }); }
  kWrap.addEventListener("click", (e) => { if (e.target === kWrap || e.target.closest("[data-close]")) closeKeys(); });
  function searchToast() { toast("Harbor's own search opens here. Projector only restyles it."); }
  $("#open-search").addEventListener("click", searchToast);

  let toastTimer = 0;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  /* ---------------- keyboard ---------------- */
  const anyOverlay = () => !pWrap.hidden || !kWrap.hidden || !player.hidden || !im.hidden;
  function closeAllOverlays() { closePalette(false); closeKeys(); hidePreview(); }
  const typing = (e) => e.target.closest && e.target.closest("input, textarea, [contenteditable]");
  document.addEventListener("keydown", (e) => {
    if (!im.hidden) { if (imReady()) { e.preventDefault(); closeIntermission(); } return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pWrap.hidden ? openPalette() : closePalette(); return; }
    if (e.altKey && e.code === "KeyT") { e.preventDefault(); panel.hidden ? openPanel() : closePanel(); return; }
    if (e.key === "Escape") {
      if (!pWrap.hidden) return closePalette();
      if (!kWrap.hidden) return closeKeys();
      if (!preview.hidden) return hidePreview();
      if (!player.hidden) return closePlayer();
      if (!panel.hidden) return closePanel();
      if (view === "detail") return back();
      return;
    }
    if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "?") { e.preventDefault(); kWrap.hidden ? openKeys() : closeKeys(); return; }
    if (e.key === "/") { e.preventDefault(); searchToast(); return; }
    if (banner.contains(document.activeElement) && view === "home") {
      if (e.key === "ArrowRight") { e.preventDefault(); setSlide(slide + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); setSlide(slide - 1); }
    }
  });
  addEventListener("resize", () => setNav(page));

  /* ---------------- start ---------------- */
  applyTheme();
  buildBanner();
  setSlide(0);
  renderHome();
  setNav("home");
  refreshPanel();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setNav(page));
})();
