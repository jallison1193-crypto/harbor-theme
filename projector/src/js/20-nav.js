  /* ===== js/20-nav.js: Marquee navigation (styles Harbor's own sidebar) ===== */

  /* ---------- Marquee: "Now showing" in Harbor's sidebar ---------- */
  const now = el("div", { id: "projector-now", "aria-hidden": "true", hidden: "" });
  now.innerHTML = '<div class="pj-now-art"><img alt="" decoding="async"></div><p class="pj-now-kicker">Now showing</p><p class="pj-now-title"></p>';
  const nowImg = now.querySelector("img"), nowTitle = now.querySelector(".pj-now-title");
  let nowSrc = "";
  // Harbor owns the sidebar and unmounts it on Settings and during playback, so the block is put back whenever
  // the sidebar returns. It goes right under Harbor's logo, never between React's own nav items.
  function placeNow() {
    const aside = doc.querySelector("aside[data-harbor-sidebar]");
    if (!aside) return;
    const logo = [...aside.children].find((c) => c !== now);
    if (logo && now.previousElementSibling !== logo) aside.insertBefore(now, logo.nextSibling);
  }
  function scanNow() {
    placeNow();
    const b = bannerNow();
    if (!b || b.src === nowSrc) return;
    nowSrc = b.src;
    nowImg.src = b.src;
    nowTitle.textContent = b.title;
    now.hidden = false;
    now.classList.remove("pj-swap");
    void now.offsetWidth; // restart the fade
    now.classList.add("pj-swap");
  }

  hooks.scan.push(scanNow);
  hooks.dispose.push(() => now.remove());

  /* ---------- navigation style and position ----------
     Style (Marquee with names, or Icons only) is Harbor's own sidebarCollapsed setting: the panel reads it from
     aside[data-collapsed] and changes it by pressing Harbor's collapse button, so Harbor stays the owner and its
     own button keeps working. Position (left, top or bottom) is the theme's: data-pj-nav lays Harbor's sidebar
     out as a bar (css/20-nav.css). Below 1024px Harbor always shows icons only. */
  const navAside = () => doc.querySelector("aside[data-harbor-sidebar]");
  const navStyleNow = () => { const a = navAside(); return a && a.getAttribute("data-collapsed") === "false" ? "marquee" : "icons"; };
  function setNavStyle(v) {
    const a = navAside(), t = a && a.querySelector("[data-harbor-sidebar-toggle]");
    if (t && navStyleNow() !== v) t.click();
  }
  hooks.apply.push(() => setAttr("pj-nav", state.navPos));

