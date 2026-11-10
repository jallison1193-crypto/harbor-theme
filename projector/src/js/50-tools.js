  /* ===== js/50-tools.js: Tools: command palette, shortcut sheet, settings panel, first-run welcome, settings code, performance mode (milestone 4) =====
     Everything here sits in one block so its names stay local; it uses core's state, set(), STOCKS, TYPES, DEFAULTS,
     hooks, el(), listen(), store and setAttr(). Keys (none collide with Harbor 0.9.113 lib/hotkeys.ts, whose global
     keys are "/", Ctrl+=, Ctrl+- and Ctrl+0, and whose player keys only apply while the player is up, when these are off):
       Ctrl+K  command palette        Alt+T  settings panel        ?  shortcut sheet        Esc  close the top one
     All of it steps aside while Harbor's player is mounted or html[data-chrome-hidden] is set. */
  {
    const SEEN_KEY = "projector.seen.v1";   // first-run welcome shown
    const AUTO_KEY = "projector.auto.v1";   // Auto performance: the level it settled on, and whether Full ever failed
    const CODE_PREFIX = "PROJECTOR1:";
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const svg = (d) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
    const ICON = {
      customize: svg('<path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9"/><circle cx="15" cy="7.5" r="2"/><circle cx="9" cy="16.5" r="2"/>'),
      close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    };
    const PAGES = [["home", "Home"], ["discover", "Discover"], ["movies", "Movies"], ["shows", "Shows"], ["anime", "Anime"], ["live", "Live TV"], ["calendar", "Calendar"], ["library", "Library"], ["settings", "Harbor settings"]];
    const APPEARANCE = [["dark", "Dark"], ["light", "Light"], ["time", "Time of day"], ["windows", "Windows"]];
    const APPEARANCE_LONG = { dark: "Dark", light: "Light", time: "Follow time of day", windows: "Follow Windows" };
    const MOTION = [["on", "On"], ["off", "Off"], ["system", "Follow Windows"]];
    const PERF = [["auto", "Auto"], ["balanced", "Balanced"], ["lite", "Lite"]];
    const STOCK_NOTES = {
      neutral: "True grays. Artwork as it is.",
      warm: "Brown-black and paper-white ink, a touch of amber.",
      cool: "Blue-gray shadows and slightly cooler artwork.",
      mono: "Grayscale chrome. Only the artwork has color.",
      faded: "Lifted blacks and soft contrast, like an old print.",
    };
    const TYPE_NOTES = {
      premiere: "Bodoni Moda with Schibsted Grotesk. A high-contrast serif, like a festival poster.",
      paperback: "Brygada 1918 with Albert Sans. A warmer book serif, easy on long reads.",
      titlecard: "Archivo throughout: condensed and heavy for titles, normal width for text.",
      harbor: "The fonts chosen in Harbor's own settings.",
    };
    // [setting, name, what it does, paused in Lite]
    const CINEMA = [
      ["icons", "Projector icons", "Film-themed icons in the sidebar. Off brings back Harbor's own.", false],
      ["spill", "Light spill", "The banner's colors glow onto the page around it.", true],
      ["parallax", "Banner follows the pointer", "The banner tilts toward the pointer and the picture shifts the other way. Only while the pointer is over it.", false],
      ["focus", "Focus pull", "Each new banner starts soft and sharpens.", false],
      ["reveal", "Title reveal", "Banner titles rise in word by word.", false],
      ["lights", "House lights", "The page dims behind the hover preview and fades to black before playback.", false],
      ["leak", "Light leak", "A warm sweep of light when you change pages, like film running through a gate.", true],
      ["grow", "Preview grows from the card", "Harbor's hover preview, with the summary and details, grows out of the card you point at instead of popping up on its own.", true],
      ["glow", "Poster light", "The poster you point at lights the row in its own colors, and Harbor's hover preview card too.", true],
      ["curtain", "Scene fade", "Each new page clears in from a soft dim, like a gentle cut between scenes.", false],
      ["brand", "Streaming tile glow", "Your Streaming tiles light up in each service's own color when you point at them.", false],
      ["bulbs", "Marquee bulbs", "Continue Watching progress shows as a row of lit marquee bulbs.", false],
      ["beam", "Projector beam", "A soft cone of light falls across the poster you point at.", false],
      ["rise", "Rise in on scroll", "Rows rise and fade in as they scroll into view.", true],
      ["wide", "Widescreen banner", "A wide cinema crop with bars that open on each slide.", false],
      ["grain", "Film grain", "A fine moving grain over everything.", false],
    ];
    const PERF_NOTES = {
      full: "Every effect, including the ones that only run in Full.",
      balanced: "Every everyday effect. The default.",
      lite: "Light spill, hover glow, rise-in and the light leak are off.",
    };
    const hourText = (h) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
    const isEditable = (t) => !!t && t.nodeType === 1 && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || /^(textbox|searchbox|combobox)$/.test(t.getAttribute("role") || ""));
    const visible = (n) => !!n && n.getClientRects().length > 0;
    const focusables = (box) => [...box.querySelectorAll('button, input, [tabindex]')].filter((n) => !n.disabled && n.tabIndex >= 0 && visible(n));
    const focusSoft = (n) => { if (n && n.isConnected && n.focus) n.focus({ preventScroll: true }); };
    let playerUp = false;
    const blocked = () => playerUp || root.hasAttribute("data-chrome-hidden");
    const timers = new Set();
    const later = (ms, fn) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
    const cancel = (id) => { clearTimeout(id); timers.delete(id); };

    /* ---------- performance mode ----------
       html[data-pj-perf] = full | balanced | lite. Balanced and Lite are fixed choices; Auto starts at Balanced and moves
       by measuring frames, but only while you scroll or move the pointer (a requestAnimationFrame loop that stops 1.2 s
       after the last input). Ported from Fathom with its safeguards: readings right after a change are ignored, stepping
       down takes two slow readings in a row, stepping up takes four smooth ones and two quiet minutes after any step
       down, and once Full has failed Auto doesn't try it again until you ask. Nothing is decided while Harbor hides its
       chrome (player, Settings). */
    let auto = { level: "balanced", fullFailed: false };
    try {
      const a = JSON.parse(store.get(AUTO_KEY) || "null");
      if (a && ["full", "balanced", "lite"].includes(a.level)) auto = { level: a.level, fullFailed: !!a.fullFailed };
    } catch (e) { /* keep the defaults */ }
    const saveAuto = () => store.set(AUTO_KEY, JSON.stringify(auto));
    const perfLevel = () => (state.perf === "auto" ? auto.level : state.perf);
    const perf = { frames: [], slow: 0, smooth: 0, fps: 0, drop: -1, readings: 0 };
    let sampRaf = 0, sampLast = 0, sampUntil = 0, autoChangedAt = -1e9, autoDroppedAt = -1e9;
    const measuring = () => !disposed && !doc.hidden && !blocked() && (state.perf === "auto" || (panelOpen() && panelTab === "speed"));
    function sampleTick(t) {
      if (sampLast) { const d = t - sampLast; if (d < 250) perf.frames.push(d); } // longer gaps are a hidden tab or a pause, not a frame
      sampLast = t;
      if (perf.frames.length >= 240) evaluatePerf();
      if (t < sampUntil && measuring()) sampRaf = requestAnimationFrame(sampleTick);
      else { sampRaf = 0; sampLast = 0; }
    }
    function noteActivity() {
      if (sampRaf) { sampUntil = performance.now() + 1200; return; }
      if (!measuring()) return;
      sampUntil = performance.now() + 1200;
      sampRaf = requestAnimationFrame(sampleTick);
    }
    function evaluatePerf() {
      const d = perf.frames.splice(0).sort((p, q) => p - q);
      if (!d.length) return;
      // The fastest typical frame is the display's refresh interval. Capped at 17.5 ms (57 Hz) so a page that is slow on
      // every frame still counts as slow; Fathom's version read a steady 30 fps as smooth.
      const vsync = Math.min(d[Math.floor(d.length * 0.1)] || 16.7, 17.5);
      const median = d[Math.floor(d.length / 2)] || vsync;
      perf.fps = Math.round(1000 / median);
      perf.drop = d.filter((v) => v > vsync * 1.9).length / d.length;
      perf.readings++;
      const now = performance.now();
      if (state.perf === "auto" && !blocked() && now - autoChangedAt > 3000) {
        const before = auto.level;
        perf.slow = perf.drop > 0.12 ? perf.slow + 1 : 0;
        perf.smooth = perf.drop < 0.02 ? perf.smooth + 1 : 0;
        if (perf.slow >= 2 && auto.level !== "lite") {
          if (auto.level === "full") auto.fullFailed = true;
          auto.level = auto.level === "full" ? "balanced" : "lite";
          autoDroppedAt = now;
        } else if (now - autoDroppedAt > 120000 && perf.smooth >= 4 && (auto.level === "lite" || (auto.level === "balanced" && !auto.fullFailed))) {
          auto.level = auto.level === "lite" ? "balanced" : "full";
        }
        if (auto.level !== before) {
          autoChangedAt = now;
          perf.slow = 0; perf.smooth = 0;
          saveAuto();
          apply();
          if (auto.level === "lite") toast("Projector switched to Lite to keep Harbor smooth.");
        }
      }
      refreshStat();
    }
    const statText = () => (perf.drop < 0 ? "Scroll or move the pointer to measure" : `${perf.fps} fps, ${Math.round(perf.drop * 100)}% slow frames`);
    listen(win, "pointermove", noteActivity, { passive: true });
    listen(win, "wheel", noteActivity, { passive: true });
    listen(win, "scroll", noteActivity, { capture: true, passive: true });
    // First in line: the cinema layer (js/30-cinema.js, which registers earlier) reads data-pj-perf in its own apply hook.
    hooks.apply.unshift(() => setAttr("pj-perf", perfLevel()));

    /* ---------- toast ---------- */
    const toastEl = el("p", { id: "projector-toast", role: "status", "aria-live": "polite" });
    let toastTimer = 0;
    function toast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add("pjt-show");
      cancel(toastTimer);
      toastTimer = later(2800, () => toastEl.classList.remove("pjt-show"));
    }

    /* ---------- settings code ---------- */
    const b64 = (s) => btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
    const unb64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
    function encode() {
      const o = {};
      for (const k in DEFAULTS) o[k] = state[k];
      return CODE_PREFIX + b64(JSON.stringify(o));
    }
    // Returns a full settings object (unknown keys dropped, missing ones at their defaults); set() validates each value.
    function decode(code) {
      const raw = String(code).replace(/\s+/g, "");
      const body = raw.startsWith(CODE_PREFIX) ? raw.slice(CODE_PREFIX.length) : raw;
      const obj = JSON.parse(unb64(body));
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw new Error("not a settings object");
      const out = Object.assign({}, DEFAULTS);
      for (const k in DEFAULTS) if (k !== "schema" && Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
      return out;
    }
    function copyCode(done) {
      const code = encode();
      const ok = () => done(true, code), fail = () => done(false, code);
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(ok, fail);
      else fail();
    }

    /* ---------- Customize button in Harbor's sidebar footer ----------
       Harbor (chrome/sidebar.tsx, 0.9.113) unmounts the sidebar on Settings and during playback, so the button is put
       back on every scan. It goes in the footer (the aside's last div) above the profile chip, never between React's
       own nav items. In the 72px icon column only its icon shows (css/50-tools.css). */
    const cust = el("button", { type: "button", id: "projector-customize", "aria-label": "Customize Projector", title: "Customize theme (Alt T)", "aria-haspopup": "dialog", "aria-expanded": "false", "aria-keyshortcuts": "Alt+T" });
    cust.innerHTML = `${ICON.customize}<span class="pjt-cust-label">Customize theme</span><kbd aria-hidden="true">Alt T</kbd>`;
    cust.addEventListener("click", () => togglePanel(cust));
    function placeCustomize() {
      const aside = doc.querySelector("aside[data-harbor-sidebar]");
      const foot = aside && (aside.querySelector(":scope > [data-harbor-sidebar-footer]") || aside.lastElementChild);
      if (!foot || foot.tagName !== "DIV" || foot.id) return;
      const anchor = [...foot.children].filter((c) => c !== cust).pop() || null;
      if (cust.parentNode !== foot || cust.nextElementSibling !== anchor) foot.insertBefore(cust, anchor);
    }

    /* ---------- command palette ---------- */
    const pal = el("div", { id: "projector-palette", class: "pjt-scrim", hidden: "" });
    pal.innerHTML =
      `<div class="pjt-pal" role="dialog" aria-modal="true" aria-label="Projector commands">` +
      `<input class="pjt-pal-input" type="text" role="combobox" aria-expanded="true" aria-controls="projector-palette-list" aria-autocomplete="list" aria-label="Type a command or page" placeholder="Type a command or page" autocomplete="off" spellcheck="false">` +
      `<div class="pjt-pal-list" id="projector-palette-list" role="listbox" aria-label="Commands"></div>` +
      `<p class="pjt-pal-empty" role="status" hidden></p>` +
      `<p class="pjt-pal-foot" aria-hidden="true"><span><kbd>Up</kbd> <kbd>Down</kbd> choose</span><span><kbd>Enter</kbd> run</span><span><kbd>Esc</kbd> close</span></p></div>`;
    const palInput = pal.querySelector(".pjt-pal-input"), palList = pal.querySelector(".pjt-pal-list"), palEmpty = pal.querySelector(".pjt-pal-empty");
    let palItems = [], palActive = 0, palOpener = null;

    function go(id) {
      const h = win.harbor;
      if (h && typeof h.navigate === "function") h.navigate(id);
      else { const b = doc.querySelector(`[data-harbor-nav="${id}"]`); if (b) b.click(); }
    }
    // Harbor's own search. window.harbor.search() opens it (App.tsx, 0.9.113); older builds only have the "/" key, so
    // the fallback sends that key the way Harbor's SearchHotkey listens for it (keydown on window, not from a text field).
    function openSearch() {
      const h = win.harbor;
      if (h && typeof h.search === "function") { h.search(); return; }
      win.dispatchEvent(new KeyboardEvent("keydown", { key: "/", code: "Slash", bubbles: true, cancelable: true }));
    }
    /* Harbor's hover preview card is Harbor's own setting (Settings, Library & metadata, Cards, Hover preview) and a
       theme can't change Harbor's settings. Harbor 1.0.3's window.harbor.openSettings() takes no section, so this
       opens Settings and types "Hover preview" into Harbor's settings search, then presses Enter to jump to it. If
       any step isn't there (another Harbor version), Settings still opens and the toast gives the path. */
    function openHoverSetting() {
      const h = win.harbor || {};
      if (typeof h.openSettings === "function") h.openSettings();
      else if (typeof h.navigate === "function") h.navigate("settings");
      toast("Settings: Library & metadata, Cards, Hover preview. Pick Default or Marquee.");
      let tries = 0;
      const find = () => {
        const input = doc.querySelector("[data-settings-search-field] input");
        if (!input) { if (++tries < 15) later(100, find); return; }
        const setter = Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, "value").set;
        setter.call(input, "Hover preview");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
        later(120, () => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true })));
      };
      later(150, find);
    }
    function change(patch, msg) { set(patch); if (msg) toast(msg); }
    function commands() {
      const cur = doc.querySelector("[data-harbor-nav][data-active]");
      const curId = cur && cur.getAttribute("data-harbor-nav");
      const list = [];
      const add = (group, label, run, opt) => list.push(Object.assign({ group, label, run, words: "" }, opt));
      PAGES.forEach(([id, name]) => add("Go to", name, () => go(id), { state: curId === id ? "Current" : "", words: "page open" }));
      add("Go to", "Search Harbor", openSearch, { key: "/", words: "find title movie show" });
      add("Projector", "Customize Projector", () => openPanel(), { key: "Alt T", words: "settings panel options" });
      add("Projector", "Keyboard shortcuts", () => openKeys(), { key: "?", words: "keys help hotkeys" });
      add("Projector", "Turn on Harbor's hover preview", openHoverSetting, { words: "pop up popup card peek pip hover preview settings" });
      add("Projector", "Copy settings code", () => copyCode((ok) => (ok ? toast("Settings code copied.") : openPanel(null, "speed", true))), { words: "backup export share" });
      APPEARANCE.forEach(([v]) => add("Appearance", APPEARANCE_LONG[v], () => change({ appearance: v }, "Appearance: " + APPEARANCE_LONG[v]), { state: state.appearance === v ? "Current" : "", words: "theme mode scheme" }));
      Object.keys(STOCKS).forEach((k) => add("Film stock", STOCKS[k].name, () => change({ stock: k }, "Film stock: " + STOCKS[k].name), { state: state.stock === k ? "Current" : "", words: "colors palette" }));
      Object.keys(TYPES).forEach((k) => add("Type", TYPES[k].name, () => change({ type: k }, "Type: " + TYPES[k].name), { state: state.type === k ? "Current" : "", words: "font fonts typeface" }));
      add("Accent", "Accent from the artwork", () => change({ accent: "artwork" }, "Accent from the artwork"), { state: state.accent === "artwork" ? "Current" : "", words: "color" });
      add("Accent", "Film stock's own accent", () => change({ accent: "stock" }, "Accent from the film stock"), { state: state.accent === "stock" ? "Current" : "", words: "color fixed" });
      MOTION.forEach(([v, name]) => add("Motion", "Animations: " + name, () => change({ motion: v }, "Animations: " + name), { state: state.motion === v ? "Current" : "", words: "motion animation reduce" }));
      CINEMA.forEach(([k, name]) => add("Cinema", name, () => change({ [k]: !state[k] }, `${name} ${state[k] ? "off" : "on"}`), { state: state[k] ? "On" : "Off", words: "turn toggle effect on off" }));
      PERF.forEach(([v, name]) => add("Speed", "Performance: " + name, () => change({ perf: v }, "Performance: " + name), { state: state.perf === v ? "Current" : "", words: "performance speed mode" }));
      return list;
    }
    function renderPalette() {
      const q = palInput.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const all = commands().map((c, i) => Object.assign(c, { order: i }));
      let items = all.filter((c) => { const hay = `${c.group} ${c.label} ${c.words}`.toLowerCase(); return q.every((w) => hay.includes(w)); });
      if (q.length) {
        // Groups whose labels start with what you typed come first; order inside a group stays as listed.
        const score = (c) => { const l = c.label.toLowerCase(); return l.startsWith(q[0]) ? 0 : l.includes(q[0]) ? 1 : 2; };
        const best = {};
        items.forEach((c) => { best[c.group] = Math.min(best[c.group] == null ? 9 : best[c.group], score(c)); });
        items = items.sort((a, b) => best[a.group] - best[b.group] || a.order - b.order);
      }
      palItems = items;
      palActive = Math.min(palActive, Math.max(0, items.length - 1));
      palEmpty.hidden = items.length > 0;
      palEmpty.textContent = items.length ? "" : `Nothing matches "${palInput.value.trim()}". Try a page, a film stock or "dark".`;
      let html = "", last = null, g = 0;
      items.forEach((c, i) => {
        if (c.group !== last) {
          if (last !== null) html += "</div>";
          html += `<div role="group" aria-labelledby="projector-pg-${g}"><div class="pjt-pal-group" id="projector-pg-${g}" role="presentation">${esc(c.group)}</div>`;
          last = c.group; g++;
        }
        const tail = c.state ? `<span class="pjt-pal-state${c.state === "On" || c.state === "Current" ? " pjt-on" : ""}">${c.state}</span>` : c.key ? `<kbd>${esc(c.key)}</kbd>` : "";
        html += `<div class="pjt-pal-item" role="option" id="projector-po-${i}" data-i="${i}" aria-selected="${i === palActive}"><span class="pjt-pal-label">${esc(c.label)}</span>${tail}</div>`;
      });
      if (last !== null) html += "</div>";
      palList.innerHTML = html;
      palList.hidden = !items.length;
      setPalActive(palActive);
    }
    function setPalActive(i) {
      const prev = palList.querySelector('[aria-selected="true"]');
      if (prev) prev.setAttribute("aria-selected", "false");
      palActive = i;
      const n = palList.querySelector(`#projector-po-${i}`);
      if (!n) { palInput.removeAttribute("aria-activedescendant"); return; }
      n.setAttribute("aria-selected", "true");
      palInput.setAttribute("aria-activedescendant", n.id);
      n.scrollIntoView({ block: "nearest" });
    }
    const palOpen = () => !pal.hidden;
    function openPalette() {
      if (palOpen() || blocked()) return;
      palOpener = keysOpen() ? keysOpener : doc.activeElement;
      if (keysOpen()) closeKeys(false);
      pal.hidden = false;
      palInput.value = "";
      palActive = 0;
      renderPalette();
      palList.scrollTop = 0;
      palInput.focus({ preventScroll: true });
    }
    function closePalette(restore) {
      if (!palOpen()) return;
      pal.hidden = true;
      if (restore !== false) focusSoft(palOpener);
    }
    function runCommand(i) {
      const c = palItems[i];
      if (!c) return;
      closePalette(true); // focus goes back first, so whatever the command opens takes it from there
      try { c.run(); } catch (e) { console.warn("[projector]", e); }
    }
    palInput.addEventListener("input", () => { palActive = 0; renderPalette(); });
    palInput.addEventListener("keydown", (e) => {
      const n = palItems.length;
      if (e.key === "ArrowDown" && n) { e.preventDefault(); setPalActive((palActive + 1) % n); }
      else if (e.key === "ArrowUp" && n) { e.preventDefault(); setPalActive((palActive - 1 + n) % n); }
      else if ((e.key === "PageDown" || e.key === "PageUp") && n) { e.preventDefault(); setPalActive(Math.max(0, Math.min(n - 1, palActive + (e.key === "PageDown" ? 6 : -6)))); }
      else if (e.key === "Enter") { e.preventDefault(); runCommand(palActive); }
    });
    // Only a real pointer move changes the highlight, so the list scrolling under a still pointer doesn't.
    palList.addEventListener("pointermove", (e) => { const o = e.target.closest("[data-i]"); if (o && +o.dataset.i !== palActive) setPalActive(+o.dataset.i); });
    palList.addEventListener("click", (e) => { const o = e.target.closest("[data-i]"); if (o) runCommand(+o.dataset.i); });
    pal.addEventListener("pointerdown", (e) => { if (e.target === pal) { e.preventDefault(); closePalette(true); } });

    /* ---------- shortcut sheet ---------- */
    const keys = el("div", { id: "projector-keys", class: "pjt-scrim", hidden: "" });
    keys.innerHTML =
      `<div class="pjt-sheet" role="dialog" aria-modal="true" aria-labelledby="projector-keys-title">` +
      `<div class="pjt-sheet-head"><h2 id="projector-keys-title">Projector's keys</h2><button type="button" class="pjt-x" data-close aria-label="Close the shortcut list">${ICON.close}</button></div>` +
      `<dl class="pjt-keylist">` +
      `<dt><kbd>Ctrl</kbd> <kbd>K</kbd></dt><dd>Open or close the command palette</dd>` +
      `<dt><kbd>Alt</kbd> <kbd>T</kbd></dt><dd>Open or close Projector's settings</dd>` +
      `<dt><kbd>?</kbd></dt><dd>Show this list</dd>` +
      `<dt><kbd>Esc</kbd></dt><dd>Close what Projector opened</dd>` +
      `<dt><kbd>Up</kbd> <kbd>Down</kbd> <kbd>Enter</kbd></dt><dd>Choose and run a command in the palette</dd>` +
      `<dt><kbd>Left</kbd> <kbd>Right</kbd></dt><dd>Move between tabs and options in the settings</dd>` +
      `</dl><p class="pjt-hint">Harbor's own keys, like <kbd>/</kbd> for search, are listed in Harbor's settings.</p></div>`;
    let keysOpener = null;
    const keysOpen = () => !keys.hidden;
    function openKeys() {
      if (keysOpen() || blocked()) return;
      keysOpener = palOpen() ? palOpener : doc.activeElement;
      if (palOpen()) closePalette(false);
      keys.hidden = false;
      focusSoft(keys.querySelector("[data-close]"));
    }
    function closeKeys(restore) {
      if (!keysOpen()) return;
      keys.hidden = true;
      if (restore !== false) focusSoft(keysOpener);
    }
    keys.addEventListener("click", (e) => { if (e.target === keys || e.target.closest("[data-close]")) closeKeys(true); });

    /* ---------- settings panel ----------
       A solid side sheet (no blur) with four tabs. Each tab is built once when shown; after that refresh() only updates
       states in place, so focus stays where it is while settings change the page live. */
    const TABS = [["look", "Look"], ["cinema", "Cinema"], ["motion", "Motion"], ["speed", "Speed and backup"]];
    const panel = el("div", { id: "projector-panel", role: "dialog", "aria-modal": "true", "aria-labelledby": "projector-panel-title", hidden: "" });
    panel.innerHTML =
      `<header class="pjt-ph"><h2 id="projector-panel-title">Projector</h2><button type="button" class="pjt-x" data-close aria-label="Close Projector settings">${ICON.close}</button></header>` +
      `<div class="pjt-tabs" role="tablist" aria-label="Settings sections">${TABS.map(([id, name]) =>
        `<button type="button" role="tab" id="projector-tab-${id}" data-tab="${id}" aria-controls="projector-panel-body" aria-selected="false" tabindex="-1">${name}</button>`).join("")}</div>` +
      `<div class="pjt-pbody" id="projector-panel-body" role="tabpanel"></div>` +
      `<p class="pjt-pfoot"><span><kbd>Alt</kbd> <kbd>T</kbd> settings</span><span><kbd>Ctrl</kbd> <kbd>K</kbd> commands</span><span><kbd>?</kbd> all keys</span></p>`;
    const pbody = panel.querySelector(".pjt-pbody");
    let panelTab = "look", panelOpener = null, closeTimer = 0, codeMsg = "", resetUndo = null, sampleFonts = null;
    const panelOpen = () => !panel.hidden;

    const C = {
      label: (id, text) => `<div class="pjt-label" id="projector-l-${id}">${text}</div>`,
      seg: (k, label, opts) => `<div class="pjt-field">${C.label(k, label)}<div class="pjt-seg" role="radiogroup" aria-labelledby="projector-l-${k}">${opts.map(([v, l]) =>
        `<button type="button" role="radio" data-k="${k}" data-v="${v}">${l}</button>`).join("")}</div>`,
      hint: (text, attrs) => `<p class="pjt-hint"${attrs || ""}>${text}</p>`,
      range: (k, label, min, max) => `<label class="pjt-range"><span>${label}</span><output data-out="${k}"></output>` +
        `<input type="range" data-range="${k}" min="${min}" max="${max}" step="0.25"></label>`,
    };
    const TAB_HTML = {
      look() {
        const harborFont = root.style.getPropertyValue("--font-display").trim() || "system-ui, sans-serif";
        return C.seg("appearance", "Appearance", APPEARANCE) + `</div>` +
          `<div class="pjt-timeset" data-show="time">` +
          C.range("dawn", "Light from", 3, 11) + C.range("dusk", "Dark from", 15, 23) +
          C.hint("", ' data-out="time-now"') + `</div>` +
          C.hint("", ' data-out="windows-now" data-show="windows"') +
          `<div class="pjt-field">${C.label("stock", "Film stock")}<div class="pjt-cards" role="radiogroup" aria-labelledby="projector-l-stock">${Object.keys(STOCKS).map((k) =>
            `<button type="button" role="radio" class="pjt-card pjt-stock" data-k="stock" data-v="${k}" aria-describedby="projector-sd-${k}">` +
            `<span class="pjt-chips" aria-hidden="true"><i></i><i></i><i></i><i></i></span>` +
            `<span><b>${esc(STOCKS[k].name)}</b><small id="projector-sd-${k}">${STOCK_NOTES[k] || ""}</small></span></button>`).join("")}</div></div>` +
          C.seg("accent", "Accent", [["artwork", "From the artwork"], ["stock", "Film stock's own"]]) +
          C.hint("Mono keeps its own accent, so the artwork doesn't tint it.", ' data-show="mono"') + `</div>` +
          `<div class="pjt-field">${C.label("type", "Type")}<div class="pjt-cards" role="radiogroup" aria-labelledby="projector-l-type">${Object.keys(TYPES).map((k) => {
            const t = TYPES[k], fam = t.display || harborFont;
            return `<button type="button" role="radio" class="pjt-card pjt-type" data-k="type" data-v="${k}" aria-describedby="projector-td-${k}">` +
              `<span class="pjt-type-sample" aria-hidden="true" style="font-family:${esc(fam)};font-weight:${t.weight};font-stretch:${t.stretch};letter-spacing:${t.track}">Tonight's feature</span>` +
              `<b>${esc(t.name)}</b><small id="projector-td-${k}">${TYPE_NOTES[k] || ""}</small></button>`;
          }).join("")}</div></div>` +
          C.seg("navStyle", "Navigation", [["marquee", "Marquee"], ["icons", "Icons"]]) + `</div>` +
          C.seg("navPos", "Navigation sits", [["left", "Left"], ["top", "Top"], ["bottom", "Bottom"]]) + `</div>` +
          C.hint("Marquee shows page names, Icons shows only icons. It is Harbor's own sidebar setting, so Harbor's collapse button changes it too. In a window narrower than 1024px Harbor always shows icons.");
      },
      cinema() {
        return C.hint("Lite performance mode is on, so light spill, poster light, rise-in and the light leak are paused.", ' data-show="lite"') +
          C.hint("Animations are off, so the moving effects are paused. Change it under Motion.", ' data-show="still"') +
          `<div class="pjt-field pjt-harbor">${C.label("hoverprev", "Hover preview card")}` +
          C.hint("The pop-up card that opens when you rest on a poster is Harbor's own, and it is off until you turn it on: Settings, Library &amp; metadata, Cards, Hover preview (style Default or Marquee). Projector styles it and lights it in the poster's colors.") +
          `<div class="pjt-btns"><button type="button" class="pjt-btn" data-do="hover-setting">Open Harbor's hover preview setting</button></div></div>` +
          `<div class="pjt-toggles">${CINEMA.map(([k, name, desc]) =>
            `<button type="button" role="switch" class="pjt-tog" data-k="${k}" aria-labelledby="projector-t-${k}" aria-describedby="projector-td2-${k}">` +
            `<span class="pjt-tog-text"><b id="projector-t-${k}">${name}</b><small id="projector-td2-${k}">${desc}</small></span><i class="pjt-switch" aria-hidden="true"></i></button>`).join("")}</div>`;
      },
      motion() {
        return C.seg("motion", "Animations", MOTION) + `</div>` +
          C.hint("", ' data-out="motion-now"') +
          C.hint("Projector only moves things when you act or scroll. Nothing runs while the page is still.");
      },
      speed() {
        return C.seg("perf", "Performance", PERF) + `</div>` +
          C.hint("", ' data-out="perf-now"') +
          `<div class="pjt-stat"><span>While browsing</span><b data-out="stat"></b></div>` +
          `<div class="pjt-btns" data-show="retry"><button type="button" class="pjt-btn" data-do="retry-full">Try Full again</button></div>` +
          `<div class="pjt-field">${C.label("code", "Settings code")}` +
          C.hint("Copy your setup to move it to another computer or share it.") +
          `<div class="pjt-btns"><button type="button" class="pjt-btn pjt-primary" data-do="copy">Copy settings code</button></div>` +
          `<input class="pjt-text" type="text" data-code aria-labelledby="projector-l-code" placeholder="Paste a settings code" spellcheck="false" autocomplete="off">` +
          `<div class="pjt-btns"><button type="button" class="pjt-btn" data-do="import">Apply code</button></div></div>` +
          `<div class="pjt-field">${C.label("reset", "Reset")}` +
          `<div class="pjt-btns"><button type="button" class="pjt-btn pjt-danger" data-do="reset">Reset everything</button></div></div>` +
          `<div class="pjt-status" role="status" data-out="code-msg"></div>` +
          C.hint(`Projector ${esc(VERSION)}.`);
      },
    };

    function renderTab() {
      pbody.innerHTML = TAB_HTML[panelTab]();
      pbody.setAttribute("aria-labelledby", "projector-tab-" + panelTab);
      if (panelTab === "look" && !sampleFonts) {
        // The type samples need every pairing's fonts. Loaded the first time the Look tab is shown, never before.
        const fams = Object.keys(TYPES).map((k) => TYPES[k].family).filter(Boolean).join("&family=");
        sampleFonts = el("link", { rel: "stylesheet", id: "projector-fonts-samples", href: `https://fonts.googleapis.com/css2?family=${fams}&display=swap` });
        doc.head.append(sampleFonts);
      }
      refresh();
    }
    function selectTab(id, focus) {
      panelTab = id;
      panel.querySelectorAll("[role=tab]").forEach((b) => {
        const on = b.dataset.tab === id;
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
        if (on && focus) b.focus();
      });
      pbody.scrollTop = 0;
      renderTab();
      if (id === "speed") noteActivity();
    }
    const showIf = (key, on) => pbody.querySelectorAll(`[data-show="${key}"]`).forEach((n) => { n.hidden = !on; });
    const out = (key, text) => { const n = pbody.querySelector(`[data-out="${key}"]`); if (n && n.textContent !== text) n.textContent = text; };
    function refreshStat() { if (panelOpen() && panelTab === "speed") out("stat", statText()); }
    function refresh() {
      if (!panelOpen()) return;
      cust.setAttribute("aria-expanded", "true");
      const light = root.getAttribute("data-pj-scheme") === "light";
      state.navStyle = navStyleNow(); // read live from Harbor's sidebar; dropped again by normalize() on save
      pbody.querySelectorAll("[role=radiogroup]").forEach((g) => {
        const radios = [...g.querySelectorAll("[role=radio]")];
        let any = false;
        radios.forEach((b) => { const on = String(state[b.dataset.k]) === b.dataset.v; any = any || on; b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1; });
        if (!any && radios[0]) radios[0].tabIndex = 0;
      });
      pbody.querySelectorAll("[role=switch]").forEach((b) => b.setAttribute("aria-checked", String(!!state[b.dataset.k])));
      pbody.querySelectorAll("[data-range]").forEach((r) => {
        const k = r.dataset.range;
        if (+r.value !== state[k]) r.value = state[k];
        r.setAttribute("aria-valuetext", hourText(state[k]));
        out(k, hourText(state[k]));
      });
      pbody.querySelectorAll(".pjt-stock").forEach((b) => {
        const t = STOCKS[b.dataset.v][light ? "light" : "dark"];
        [t.canvas, t.raised, t.ink, t.accent].forEach((c, i) => { b.querySelectorAll("i")[i].style.background = c; });
      });
      const lvl = perfLevel();
      showIf("time", state.appearance === "time");
      showIf("windows", state.appearance === "windows");
      showIf("mono", !!STOCKS[state.stock].fixedAccent && state.accent === "artwork");
      showIf("lite", lvl === "lite");
      showIf("still", root.getAttribute("data-pj-motion") === "off");
      showIf("retry", state.perf === "auto" && (auto.level !== "full" || auto.fullFailed));
      out("time-now", `Right now: ${light ? "light" : "dark"}. Light from ${hourText(state.dawn)}, dark from ${hourText(state.dusk)}, warmer toward each change.`);
      out("windows-now", `Windows is set to ${light ? "light" : "dark"} right now.`);
      const sys = state.motion === "system";
      out("motion-now", `Right now: ${root.getAttribute("data-pj-motion") === "off" ? "off" : "on"}${sys ? (root.getAttribute("data-pj-motion") === "off" ? ", because Windows asks for less motion." : ", following Windows.") : "."}`);
      out("perf-now", state.perf === "auto"
        ? `Auto measures frames only while you scroll or move the pointer. It starts at Balanced, moves up to Full after a run of smooth readings, and steps down if Harbor stutters. Right now: ${lvl[0].toUpperCase() + lvl.slice(1)}. ${PERF_NOTES[lvl]}`
        : PERF_NOTES[lvl]);
      out("stat", statText());
      const msg = pbody.querySelector('[data-out="code-msg"]');
      if (msg && msg.dataset.msg !== codeMsg + (resetUndo ? "|u" : "")) {
        msg.dataset.msg = codeMsg + (resetUndo ? "|u" : "");
        msg.innerHTML = codeMsg ? `<span>${esc(codeMsg)}</span>${resetUndo ? ' <button type="button" class="pjt-link" data-do="undo">Undo</button>' : ""}` : "";
      }
    }
    hooks.apply.push(refresh);

    function openPanel(from, tab, selectCode) {
      if (blocked()) return;
      cancel(closeTimer);
      if (!store.get(SEEN_KEY)) store.set(SEEN_KEY, "1");
      const wasOpen = panel.classList.contains("pjt-open");
      if (!wasOpen) panelOpener = palOpen() ? palOpener : keysOpen() ? keysOpener : from || doc.activeElement;
      closePalette(false);
      closeKeys(false);
      if (tab) panelTab = tab;
      if (!wasOpen) {
        panel.hidden = false;
        void panel.offsetWidth; // start the slide from off screen
        panel.classList.add("pjt-open");
      }
      selectTab(panelTab, true);
      if (selectCode) {
        codeMsg = "Copying was blocked. The code is in the box above and selected; copy it with Ctrl+C.";
        refresh();
        const inp = pbody.querySelector("[data-code]");
        if (inp) { inp.value = encode(); inp.focus(); inp.select(); }
      }
    }
    function closePanel(restore) {
      if (!panelOpen() || !panel.classList.contains("pjt-open")) return;
      panel.classList.remove("pjt-open");
      cust.setAttribute("aria-expanded", "false");
      codeMsg = ""; resetUndo = null;
      const done = () => { panel.hidden = true; pbody.innerHTML = ""; welcome.remove(); };
      if (root.getAttribute("data-pj-motion") === "off") done(); else closeTimer = later(280, done);
      if (restore !== false) focusSoft(panelOpener && panelOpener.isConnected ? panelOpener : cust);
    }
    const togglePanel = (from) => (panelOpen() && panel.classList.contains("pjt-open") ? closePanel(true) : openPanel(from));

    panel.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.hasAttribute("data-close")) return closePanel(true);
      if (b.dataset.tab) return selectTab(b.dataset.tab);
      const k = b.dataset.k;
      if (k === "navStyle") { setNavStyle(b.dataset.v); later(60, refresh); return; }
      if (k && b.getAttribute("role") === "radio") { if (String(state[k]) !== b.dataset.v) set({ [k]: b.dataset.v }); return; }
      if (k && b.getAttribute("role") === "switch") { set({ [k]: !state[k] }); return; }
      const act = b.dataset.do;
      if (act === "hover-setting") {
        closePanel(false);
        openHoverSetting();
      } else if (act === "retry-full") {
        auto = { level: "full", fullFailed: false }; saveAuto();
        perf.slow = 0; perf.smooth = 0; autoChangedAt = performance.now();
        apply();
        toast("Trying Full. Auto steps down again if Harbor stutters.");
      } else if (act === "copy") {
        copyCode((ok, code) => {
          resetUndo = null;
          if (ok) { codeMsg = "Copied. Paste it into Projector on the other computer."; refresh(); return; }
          codeMsg = "Copying was blocked. The code is in the box above and selected; copy it with Ctrl+C.";
          refresh();
          const inp = pbody.querySelector("[data-code]");
          if (inp) { inp.value = code; inp.focus(); inp.select(); }
        });
      } else if (act === "import") {
        const inp = pbody.querySelector("[data-code]");
        resetUndo = null;
        try {
          if (!inp.value.trim()) throw new Error("empty");
          set(decode(inp.value));
          codeMsg = "Settings applied.";
          inp.value = "";
        } catch (err) { codeMsg = "That isn't a Projector settings code. Copy it again and paste the whole thing."; }
        refresh();
      } else if (act === "reset") {
        resetUndo = Object.assign({}, state);
        auto = { level: "balanced", fullFailed: false }; saveAuto();
        perf.slow = 0; perf.smooth = 0;
        codeMsg = "Everything is back to the defaults.";
        set(Object.assign({}, DEFAULTS));
      } else if (act === "undo" && resetUndo) {
        const prev = resetUndo;
        resetUndo = null;
        codeMsg = "Your settings are back.";
        set(prev);
        focusSoft(pbody.querySelector('[data-do="reset"]'));
      }
    });
    panel.addEventListener("input", (e) => {
      const r = e.target.closest("[data-range]");
      if (r) set({ [r.dataset.range]: +r.value });
    });
    panel.addEventListener("keydown", (e) => {
      const t = e.target;
      const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      const tab = t.closest && t.closest("[role=tab]");
      if (tab && (dir || e.key === "Home" || e.key === "End")) {
        e.preventDefault();
        const i = TABS.findIndex(([id]) => id === tab.dataset.tab);
        const n = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : (i + dir + TABS.length) % TABS.length;
        selectTab(TABS[n][0], true);
        return;
      }
      const radio = t.closest && t.closest("[role=radio]");
      if (radio && dir) {
        e.preventDefault();
        const radios = [...radio.closest("[role=radiogroup]").querySelectorAll("[role=radio]")];
        const next = radios[(radios.indexOf(radio) + dir + radios.length) % radios.length];
        next.click();
        next.focus();
      }
    });

    /* ---------- first run ----------
       The first time Projector is applied, the settings panel opens by itself on Look once the page has settled, with
       a short welcome line at the top. It counts as seen as soon as it opens (or the panel is opened any other way),
       so it never comes back; after that the panel is behind Customize theme in the sidebar and Alt T. */
    const startedAt = performance.now();
    const welcome = el("div", { class: "pjt-welcome", id: "projector-welcome" });
    welcome.innerHTML = `<p><b>Projector is on.</b> Make it yours: pick a film stock, type and how much moves. Every change shows live. ` +
      `You can come back any time with <b>Customize theme</b> at the bottom of the sidebar, or <kbd>Alt</kbd> <kbd>T</kbd>.</p>`;
    // Applying the theme happens in Harbor's Settings (its search field is on screen then). Each time, the panel
    // opens once you are back on a page with the sidebar. A plain app launch only does this the very first time.
    let armed = !store.get(SEEN_KEY) || !!doc.querySelector("[data-settings-search-field]");
    function firstRun() {
      if (disposed || !armed || blocked() || !cust.isConnected || panelOpen()) return;
      armed = false;
      panel.querySelector(".pjt-ph").after(welcome);
      openPanel(cust, "look");
    }

    /* ---------- keys ---------- */
    const topLayer = () => (palOpen() ? pal : keysOpen() ? keys : panelOpen() && panel.classList.contains("pjt-open") ? panel : null);
    function trapTab(e, box) {
      if (box === pal) { e.preventDefault(); palInput.focus(); return; }
      const f = focusables(box);
      if (!f.length) return;
      const i = f.indexOf(doc.activeElement);
      if (i === -1) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); }
      else if (e.shiftKey && i === 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
    // Capture phase on window: runs before Harbor's own window and document listeners, so a key Projector uses
    // (Esc closing the palette, say) doesn't also go back a page in Harbor.
    listen(win, "keydown", (e) => {
      if (disposed || e.isComposing || e.key === "Process") return;
      const top = topLayer();
      if (e.key === "Escape") {
        if (!top) return;
        e.preventDefault(); e.stopPropagation();
        if (top === pal) closePalette(true); else if (top === keys) closeKeys(true); else closePanel(true);
        return;
      }
      if (blocked()) return;
      const t = e.target, mod = e.ctrlKey || e.metaKey;
      const inText = t && t.nodeType === 1 && (t.tagName === "TEXTAREA" || t.isContentEditable);
      if (mod && !e.altKey && !e.shiftKey && (e.code === "KeyK" || e.key === "k" || e.key === "K")) {
        if (inText || e.repeat) return;
        e.preventDefault(); e.stopPropagation();
        if (palOpen()) closePalette(true); else openPalette();
        return;
      }
      if (e.altKey && !mod && !e.shiftKey && (e.code === "KeyT" || e.key === "t" || e.key === "T")) {
        if (inText || e.repeat) return;
        e.preventDefault(); e.stopPropagation();
        togglePanel();
        return;
      }
      if (e.key === "?" && !mod && !e.altKey) {
        if (isEditable(t) || e.repeat) return;
        e.preventDefault(); e.stopPropagation();
        if (keysOpen()) closeKeys(true); else openKeys();
        return;
      }
      if (e.key === "Tab" && top) trapTab(e, top);
    }, true);
    // Keys typed inside Projector's own layers stay there: Harbor's arrow-key navigation and modal handlers listen on
    // window and document, and would otherwise move focus out of the palette or panel.
    [pal, keys, panel].forEach((n) => n.addEventListener("keydown", (e) => e.stopPropagation()));

    /* ---------- Harbor's player and hidden chrome ---------- */
    function stepAside() {
      closePalette(false);
      closeKeys(false);
      closePanel(false);
      cancelAnimationFrame(sampRaf); sampRaf = 0; sampLast = 0; perf.frames.length = 0;
    }
    hooks.player.push((on) => { playerUp = on; if (on) stepAside(); });
    const hideObserver = new MutationObserver(() => { if (root.hasAttribute("data-chrome-hidden")) stepAside(); });
    hideObserver.observe(root, { attributes: true, attributeFilter: ["data-chrome-hidden"] });

    /* ---------- start, scan, cleanup ---------- */
    doc.body.append(pal, keys, panel, toastEl);
    hooks.scan.push(() => {
      placeCustomize();
      if (armed && performance.now() - startedAt > 900) firstRun();
    });
    if (armed) later(1000, () => { placeCustomize(); firstRun(); });
    hooks.dispose.push(() => {
      hideObserver.disconnect();
      cancelAnimationFrame(sampRaf);
      timers.forEach((id) => clearTimeout(id)); timers.clear();
      [pal, keys, panel, toastEl, cust, welcome, sampleFonts].forEach((n) => n && n.remove());
    });

    // Test hook for the bench: __projector.tools. Attached after start-up (js/90-start.js creates __projector), and
    // removed with it on unload.
    Promise.resolve().then(() => {
      if (disposed || !win.__projector) return;
      win.__projector.tools = {
        openPalette, closePalette, openKeys, closeKeys, openPanel, closePanel, encode, decode,
        get perf() { return { level: perfLevel(), auto: Object.assign({}, auto), fps: perf.fps, drop: perf.drop, slow: perf.slow, smooth: perf.smooth, readings: perf.readings, sampling: !!sampRaf }; },
        // Feeds frame durations (ms) straight into the evaluator, as if measured while scrolling.
        feedFrames(list) { perf.frames.push(...list); evaluatePerf(); return this.perf; },
        // Skips Auto's waiting times (3 s after a change, 2 min after a step down) for testing.
        skipWaits() { autoChangedAt = -1e9; autoDroppedAt = -1e9; },
        resetFirstRun() { armed = true; try { localStorage.removeItem(SEEN_KEY); } catch (e) { /* blocked */ } },
        firstRun,
      };
    });
  }
