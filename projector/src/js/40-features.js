  /* ===== js/40-features.js: Harbor features: hover preview, Intermission (screensaver), spoilers, numerals, badges, focus ring (milestone 3) =====
     Register work through hooks (see js/00-core.js). Remove everything you add in a hooks.dispose entry.
     Most of milestone 3 is CSS only (css/40-features.css): a restyle of Harbor's own markup. The one script piece is
     below: Harbor's hover preview grows out of the card it belongs to. */
  {
    /* ---------- hover preview grows from its card ----------
       Harbor mounts its preview as a fixed z-[110] layer straight inside #root, centred over the card. When one
       appears, the panel starts at the card's size and place (same centre, scaled to the card's width, tipped back
       a few degrees, transparent) and grows into its own size and place: one WAAPI transform/opacity animation,
       above Harbor's own CSS scale-in. Harbor still owns opening, placement, content, its staggered rows and closing.
       Watched with a childList-only observer on #root, so it costs nothing while no preview opens. */
    let lastAnchor = null, rootObs = null, watchedRoot = null;
    const PANEL = '[role="presentation"]';
    const isLayer = (n) => n.nodeType === 1 && n.classList.contains("fixed") && n.classList.contains("inset-0") && n.classList.contains("z-[110]");

    listen(doc, "pointerover", (e) => {
      const a = e.target && e.target.closest && e.target.closest("[data-preview-anchor]");
      if (a) lastAnchor = a;
    }, { passive: true });
    listen(doc, "focusin", (e) => {
      const a = e.target && e.target.querySelector && e.target.querySelector("[data-preview-anchor]");
      if (a) lastAnchor = a;
    });

    function grow(layer) {
      if (root.getAttribute("data-pj-grow") !== "on" || !lastAnchor || !lastAnchor.isConnected) return;
      const panel = layer.querySelector(PANEL);
      if (!panel || !panel.animate) return;
      const p = panel.getBoundingClientRect(), c = lastAnchor.getBoundingClientRect();
      if (!p.width || !c.width || c.bottom < 0 || c.top > innerHeight) return;
      const dx = (c.left + c.width / 2) - (p.left + p.width / 2);
      const dy = (c.top + c.height / 2) - (p.top + p.height / 2);
      // Start just covering the card, so the window reads as coming out of it.
      const s = Math.max(0.3, Math.min(1, Math.max(c.width / p.width, c.height / p.height)));
      panel.setAttribute("data-pj-grown", "");
      panel.animate([
        { transformOrigin: "50% 50%", transform: `perspective(1000px) translate3d(${dx}px, ${dy}px, 0) scale(${s}) rotateX(12deg)`, opacity: 0 },
        { transformOrigin: "50% 50%", opacity: 1, offset: 0.3 },
        { transformOrigin: "50% 50%", transform: "perspective(1000px) translate3d(0, 0, 0) scale(1) rotateX(0deg)", opacity: 1 },
      ], { duration: 560, easing: "cubic-bezier(.4, .1, .2, 1.04)" });
    }
    function onRoot(muts) {
      for (const m of muts) for (const n of m.addedNodes) {
        // Read the size and place a frame later, once Harbor has positioned the panel, still before it is painted.
        if (isLayer(n)) requestAnimationFrame(() => { if (!disposed && n.isConnected) grow(n); });
      }
    }
    function watchRoot() {
      const r = doc.getElementById("root");
      if (r === watchedRoot) return;
      if (rootObs) rootObs.disconnect();
      watchedRoot = r;
      if (!r) return;
      rootObs = rootObs || new MutationObserver(onRoot);
      rootObs.observe(r, { childList: true });
    }

    hooks.apply.push(() => setAttr("pj-grow", state.grow && motionOn() ? "on" : "off"));
    hooks.scan.push(watchRoot);
    hooks.dispose.push(() => { if (rootObs) rootObs.disconnect(); rootObs = watchedRoot = lastAnchor = null; });
  }
