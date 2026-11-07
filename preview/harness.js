// Test bench: emulates the parts of Harbor that Fathom talks to, then loads dist/fathom.json like Harbor does.
(() => {
  const $ = (s) => document.querySelector(s);
  const root = document.documentElement;
  const status = (t) => { $("#hz-status").textContent = t; };
  const img = (seed, w, h) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

  /* ---------- fake catalogue ---------- */
  const TITLES = ["Low Tide", "The Salt Line", "Halcyon", "Iron Meridian", "Paper Moons", "Northbound", "Glasshouse", "Ember County", "The Quiet Signal", "Vesper", "Driftwood Kings", "Neon Orchard", "Undertow", "Lighthouse Keepers"];
  const heroSlides = [0, 2, 4, 9].map((i) => ({ title: TITLES[i], seed: "fx-hero-" + i }));

  // hero carousel
  let active = 0;
  $("#hz-track").innerHTML = heroSlides.map((s, i) => `
    <div class="w-full shrink-0 hz-slide" aria-hidden="${i !== 0}" style="opacity:${i === 0 ? 1 : 0.42}">
      <section class="group relative cursor-pointer overflow-hidden bg-canvas h-[560px] rounded-[28px] hz-hero" style="isolation: isolate">
        <img class="absolute object-cover transition-opacity duration-500" src="${img(s.seed, 1600, 900)}" alt="" crossorigin="anonymous" style="opacity: 0.9">
        <div class="pointer-events-none absolute overflow-hidden transition-opacity duration-500 hz-trailer" style="opacity: 0"><div class="hz-video"></div></div>
        <div class="absolute inset-0 bg-gradient-to-r" style="opacity: 1"></div>
        <div class="absolute bg-gradient-to-t"></div>
        <div class="relative flex h-full flex-col justify-center p-14 hz-hero-copy">
          <div class="max-w-2xl">
            <div class="hz-badge">#${i + 1} in Movies today</div>
            <h1 class="font-display">${s.title}</h1>
            <p>A harbor town goes quiet the night the sea pulls back further than anyone remembers, and something is left on the sand.</p>
            <div class="mt-9 flex gap-3">
              <button type="button" class="flex bg-ink hz-btn">Play</button>
              <button type="button" class="flex hz-btn hz-btn-ghost">Add to watchlist</button>
            </div>
          </div>
        </div>
      </section>
    </div>`).join("");
  $("#hz-dots").innerHTML = heroSlides.map((_, i) => `<button type="button" class="h-1.5 ${i === 0 ? "on bg-ink" : ""}" aria-label="Slide ${i + 1}" data-slide="${i}"></button>`).join("");
  function setSlide(i) {
    active = i;
    $("#hz-track").style.transform = `translate3d(calc(${-i * 100}% - ${i * 24}px), 0, 0)`;
    document.querySelectorAll(".hz-slide").forEach((s, j) => { s.setAttribute("aria-hidden", String(j !== i)); s.style.opacity = j === i ? 1 : 0.42; });
    document.querySelectorAll("#hz-dots button").forEach((b, j) => { b.classList.toggle("on", j === i); b.classList.toggle("bg-ink", j === i); });
  }
  $("#hz-dots").addEventListener("click", (e) => { const b = e.target.closest("[data-slide]"); if (b) setSlide(+b.dataset.slide); });
  // window.__hzHold (set by perf.js) stops the auto-advance so a slide change never lands inside a measurement.
  setInterval(() => { if (!document.hidden && !window.__hzHold) setSlide((active + 1) % heroSlides.length); }, 9000);

  // rows
  const pick = (i) => `
    <button type="button" class="group flex w-full min-w-0 flex-col gap-2.5 text-start hz-pick" data-open="${i}">
      <div data-preview-anchor class="relative">
        <div class="harbor-card-ring">
          <div class="harbor-poster your-card relative overflow-hidden">
            <img class="absolute inset-0 h-full w-full object-cover" src="${img("fx-p" + i, 342, 513)}" alt="" crossorigin="anonymous" loading="lazy">
          </div>
        </div>
      </div>
      <p>${TITLES[i % TITLES.length]}</p>
    </button>`;
  const cont = (i, p) => `
    <div class="group relative w-full min-w-0 hz-cont">
      <button type="button" data-open="${i}">
        <div class="harbor-poster relative aspect-[16/9] overflow-hidden rounded-xl bg-elevated">
          <img class="absolute inset-0 h-full w-full object-cover" src="${img("fx-c" + i, 640, 360)}" alt="" crossorigin="anonymous" loading="lazy">
          <div class="hz-prog"><i style="width:${p}%"></i></div>
        </div>
        <p style="margin:0;font-size:13px;font-weight:500">${TITLES[i % TITLES.length]}</p>
      </button>
    </div>`;
  const row = (title, cards) => `
    <div class="flex min-w-0 flex-col gap-5 hz-rowwrap">
      <div class="flex items-center justify-between"><h2>${title}</h2></div>
      <div class="group/row relative min-w-0 hz-row"><div class="grid grid-flow-col hz-rail">${cards}</div></div>
    </div>`;
  $("#hz-rows").innerHTML =
    row("Continue watching", [3, 7, 1, 10, 5].map((i, n) => cont(i, 20 + n * 15)).join("")) +
    row("Trending this week", Array.from({ length: 14 }, (_, i) => pick(i)).join("")) +
    row("Because you watched Low Tide", Array.from({ length: 14 }, (_, i) => pick(i + 14)).join("")) +
    row("Award winners", Array.from({ length: 14 }, (_, i) => pick(i + 28)).join(""));
  $("#hz-grid").innerHTML = Array.from({ length: 24 }, (_, i) => pick(i + 3)).join("");

  /* ---------- window.harbor + views (lib/view.tsx, App.tsx) ---------- */
  let view = "home";
  const stack = [];
  function showView(v, opts) {
    const deep = v === "meta";
    const pane = ["home", "movies", "meta", "settings"].includes(v) ? v : "generic";
    document.querySelectorAll("[data-hz-view]").forEach((n) => { n.className = n.dataset.hzView === pane ? "contents" : "hidden"; });
    if (pane === "generic") $("#hz-generic-title").textContent = v.charAt(0).toUpperCase() + v.slice(1);
    if (!opts || !opts.back) stack.push(view);
    view = v;
    $("#hz-back").hidden = !deep;
    // App.tsx: chrome hidden on settings, player, picker
    syncChromeHidden();
    // App.tsx line 538: toggle data-active on every [data-harbor-nav]
    document.querySelectorAll("[data-harbor-nav]").forEach((n) => n.toggleAttribute("data-active", n.getAttribute("data-harbor-nav") === (deep ? "meta" : v)));
    if (v !== "settings" && !deep) window.dispatchEvent(new CustomEvent("harbor:scroll-top", { detail: { view: v } }));
  }
  // Player (App.tsx 0.9.113): ThemeBackdrop returns null, the views column turns invisible, and on Windows with mpv
  // embedded the player stage has no background, so the native mpv window behind the transparent webview shows through.
  // #hz-native stands in for that native video layer. Anything Fathom paints over it is what the user would see instead.
  let playerOn = false;
  function syncChromeHidden() {
    if (playerOn || view === "settings") root.dataset.chromeHidden = "true"; else delete root.dataset.chromeHidden;
    const mounted = $("#hz-player");
    if (playerOn && !mounted) document.body.insertBefore($("#hz-player-tpl").content.firstElementChild.cloneNode(true), $("#harbor-custom-overlay"));
    if (!playerOn && mounted) mounted.remove();
    $("#hz-native").hidden = !playerOn;
    $(".hz-backdrop").hidden = playerOn;
    $(".hz-col").classList.toggle("invisible", playerOn);
    $("#hz-back").hidden = playerOn || view !== "meta";
  }
  window.harbor = {
    navigate: (v) => showView(v),
    back: () => showView(stack.pop() || "home", { back: true }),
  };
  $("#hz-back").addEventListener("click", () => window.harbor.back());
  document.addEventListener("click", (e) => {
    const o = e.target.closest("[data-open]");
    if (!o) return;
    $("#hz-detail-img").src = img("fx-p" + o.dataset.open + "-bd", 1600, 900);
    $("#hz-detail-title").textContent = TITLES[o.dataset.open % TITLES.length];
    showView("meta");
  });

  // search hotkey (components/search/search-hotkey.tsx, default "/")
  window.addEventListener("keydown", (e) => {
    const t = e.target;
    const typing = t && t.nodeType === 1 && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    if (e.key === "/" && !typing) { e.preventDefault(); $("#hz-search").hidden = false; $("#hz-search input").focus(); }
    if (e.key === "Escape") { $("#hz-search").hidden = true; $("#hz-modal").hidden = true; if (playerOn) { playerOn = false; syncChromeHidden(); } }
  });
  $("#hz-search").addEventListener("click", (e) => { if (e.target.id === "hz-search") e.currentTarget.hidden = true; });

  /* ---------- load the theme like CustomCodeMount ---------- */
  // ?build=.baseline/fathom.json loads another build (same origin only) for before/after comparisons.
  const BUILD = (() => { const b = new URLSearchParams(location.search).get("build"); return b && /^[\w./-]+\.json$/.test(b) && !b.includes("..") ? b : "../dist/fathom.json"; })();
  let theme = null;
  function runCleanup() {
    const fn = window.__harborThemeCleanup;
    if (typeof fn === "function") { try { fn(); } catch (e) { console.warn(e); } }
    window.__harborThemeCleanup = undefined;
  }
  function applyTokens(tokens) { for (const [k, v] of Object.entries(tokens)) root.style.setProperty(k, v); }
  function mountTheme() {
    let style = document.getElementById("harbor-theme-css");
    if (!style) { style = document.createElement("style"); style.id = "harbor-theme-css"; document.head.appendChild(style); }
    style.textContent = theme.css || "";
    $("#harbor-custom-overlay").innerHTML = theme.html || "";
    try { new Function(theme.js)(); } catch (err) { console.warn("[harbor-theme-js] error:", err); status("Theme JS threw: " + err.message); return; }
    status(`Loaded ${theme.name}. ${document.querySelectorAll("[data-fx]").length ? "Running." : ""}`);
  }
  function unmountTheme() {
    runCleanup();
    const style = document.getElementById("harbor-theme-css");
    if (style) style.textContent = "";
    $("#harbor-custom-overlay").innerHTML = "";
  }
  async function load() {
    const r = await fetch(BUILD + "?" + Date.now());
    theme = await r.json();
    applyTokens(theme.tokens);
    root.style.setProperty("--font-display", '"Sentient", "Iowan Old Style", Georgia, serif');
    root.style.setProperty("--font-sans", '"Switzer", "Inter", system-ui, sans-serif');
    mountTheme();
  }

  /* ---------- bench buttons ---------- */
  document.querySelector(".hz-bench").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-hz]");
    if (!b) return;
    const a = b.dataset.hz;
    if (a === "home" || a === "movies" || a === "settings" || a === "calendar") showView(a);
    else if (a === "detail") { $("#hz-detail-img").src = img("fx-detail", 1600, 900); $("#hz-detail-title").textContent = "Undertow"; showView("meta"); }
    else if (a === "player") { playerOn = !playerOn; syncChromeHidden(); }
    else if (a === "trailer") {
      // hero.tsx (0.9.113): while a trailer plays the image fades to opacity 0 and the video layer to 1
      const slide = document.querySelector('.hz-slide[aria-hidden="false"]');
      const im = slide.querySelector("img.object-cover"), tr = slide.querySelector(".hz-trailer");
      const on = im.style.opacity !== "0";
      im.style.opacity = on ? "0" : "0.9"; tr.style.opacity = on ? "1" : "0";
      status(on ? "Trailer playing on the active slide." : "Trailer stopped.");
    }
    else if (a === "modal") $("#hz-modal").hidden = false;
    else if (a === "close-modal") $("#hz-modal").hidden = true;
    else if (a === "reload") { unmountTheme(); const r = await fetch(BUILD + "?" + Date.now()); theme = await r.json(); applyTokens(theme.tokens); mountTheme(); status("Reloaded theme from " + BUILD); }
    else if (a === "unload") { unmountTheme(); const left = [...root.attributes].filter((x) => x.name.startsWith("data-fx")).length + document.querySelectorAll("#fathom-wall,#fathom-chrome,#fathom-panel,#fathom-light,#fathom-vars").length; status(left ? `Unload left ${left} leftovers` : "Unloaded cleanly: nothing left behind."); }
    else if (a === "forget") { Object.keys(localStorage).filter((k) => k.startsWith("fathom.")).forEach((k) => localStorage.removeItem(k)); status("Saved settings cleared. Reload theme to start fresh."); }
  });
  $("#hz-modal").addEventListener("click", (e) => { if (e.target.closest("[data-hz='close-modal']") || e.target.id === "hz-modal") $("#hz-modal").hidden = true; });

  load().catch((err) => status("Could not load dist/fathom.json. Run npm run build first. " + err.message));
})();
