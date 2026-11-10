  /* ===== js/70-signature.js: signature switches and the light leak between pages =====
     The beam, sprockets, flicker, title cards, playbill and showtimes are CSS only (css/70-signature.css). This file
     sets their switches and runs the light leak: when Harbor marks a different sidebar button active (the page
     changed, whichever way it was reached), one warm band sweeps across the window. Noticed by a MutationObserver on
     the sidebar's data-active flags, which fires only on page changes; the layer exists only for the 0.8 s sweep. */
  {
    const leak = el("div", { id: "projector-layer-leak", "aria-hidden": "true" });
    const curtain = el("div", { id: "projector-layer-curtain", "aria-hidden": "true" });
    let curtainTimer = 0;
    let leakTimer = 0, lastView = null, watchedAside = null;
    const activeView = () => {
      const b = doc.querySelector("aside[data-harbor-sidebar] [data-harbor-nav][data-active]");
      return b ? b.getAttribute("data-harbor-nav") : null;
    };
    function part() {
      if (root.getAttribute("data-pj-curtain") !== "on" || doc.hidden || doc.querySelector("[data-harbor-player]")) return;
      if (!curtain.isConnected) doc.body.append(curtain);
      curtain.setAttribute("data-run", curtain.getAttribute("data-run") === "a" ? "b" : "a");
      clearTimeout(curtainTimer);
      curtainTimer = setTimeout(() => { curtain.remove(); curtain.removeAttribute("data-run"); }, 560);
    }
    function sweep() {
      if (root.getAttribute("data-pj-leak") !== "on" || doc.hidden || doc.querySelector("[data-harbor-player]")) return;
      if (!leak.isConnected) doc.body.append(leak);
      leak.setAttribute("data-run", leak.getAttribute("data-run") === "a" ? "b" : "a");
      clearTimeout(leakTimer);
      leakTimer = setTimeout(() => { leak.remove(); leak.removeAttribute("data-run"); }, 1200);
    }
    function onNav() {
      const v = activeView();
      if (!v || v === lastView) return;
      const first = lastView === null;
      lastView = v;
      if (!first) { part(); sweep(); }
    }
    const navObs = new MutationObserver(onNav);
    // Harbor unmounts the sidebar on Settings and during playback, so the observer follows it back on each scan.
    function watchAside() {
      const a = doc.querySelector("aside[data-harbor-sidebar]");
      if (a === watchedAside) return;
      navObs.disconnect();
      watchedAside = a;
      if (!a) return;
      navObs.observe(a, { subtree: true, attributes: true, attributeFilter: ["data-active"] });
      onNav();
    }

    hooks.apply.push(() => {
      // data-pj-perf is written first (js/50-tools.js puts its hook at the front).
      const lite = root.getAttribute("data-pj-perf") === "lite";
      setAttr("pj-beam", state.beam ? "on" : "off");
      setAttr("pj-curtain", state.curtain && motionOn() ? "on" : "off");
      setAttr("pj-brand", state.brand ? "on" : "off");
      setAttr("pj-bulbs", state.bulbs ? "on" : "off");
      setAttr("pj-leak", state.leak && motionOn() && !lite ? "on" : "off");
    });
    hooks.scan.push(watchAside);
    hooks.player.push((on) => { if (on) { clearTimeout(leakTimer); leak.remove(); clearTimeout(curtainTimer); curtain.remove(); } });
    hooks.dispose.push(() => { navObs.disconnect(); clearTimeout(leakTimer); leak.remove(); clearTimeout(curtainTimer); curtain.remove(); watchedAside = null; });
  }
