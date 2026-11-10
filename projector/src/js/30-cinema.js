  /* ===== js/30-cinema.js: Cinema layer: light spill, focus pull, title reveal, house lights, accent from artwork, hover glow, rise-in, banner pointer tilt (milestone 2) =====
     Register work through hooks (see js/00-core.js). Remove everything you add in a hooks.dispose entry.

     How it stays cheap (plan section 5): everything costly is drawn once per banner slide into a small canvas and then
     only faded; only transform and opacity animate; the one rAF loop runs only while the pointer moves over the
     banner. A slide change is noticed by a MutationObserver on the banner's aria-hidden flags (fires once per change)
     plus the shared 1.5 s scan. Switches are html[data-pj-<key>] = on | off, written from hooks.apply, and already
     include the motion setting and Lite mode, so the CSS only has to check one attribute.
     Nodes Projector adds next to Harbor's own start with "projector-layer" (core CSS hides them while the player is
     mounted). Attributes put on React's elements (data-pj-reveal, data-pj-title, data-pj-pull, data-pj-tilt) are
     attributes React never sets, so it leaves them alone; they are all removed on unload. */
  {
    const LAYER = "projector-layer";
    const isOn = (k) => root.getAttribute("data-pj-" + k) === "on";
    // Set by the tools module (js/50-tools.js). Until it exists, treat it as Balanced.
    const perfMode = () => { const p = root.getAttribute("data-pj-perf"); return p === "full" || p === "lite" ? p : "balanced"; };
    const RISE_OK = !!(win.CSS && CSS.supports && CSS.supports("animation-timeline: view()"));
    const timers = new Set();
    const later = (ms, fn) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
    const cancel = (id) => { if (id) { clearTimeout(id); timers.delete(id); } };

    /* ---------- reading artwork (ported from Fathom: analyse, sampleImage) ---------- */
    // The dominant colorful tone of a 32x20 copy: saturated, mid-light pixels weigh most; flat art falls back to the average.
    const TW = 32, TH = 20;
    function dominant(data) {
      let r = 0, g = 0, b = 0, w = 0, ar = 0, ag = 0, ab = 0, n = 0;
      for (let i = 0; i < data.length; i += 4) {
        const R = data[i], G = data[i + 1], B = data[i + 2];
        const max = Math.max(R, G, B), min = Math.min(R, G, B), l = (max + min) / 510, s = (max - min) / 255;
        const wt = s * s * Math.max(0.05, 1 - Math.abs(l - 0.5) * 1.7);
        r += R * wt; g += G * wt; b += B * wt; w += wt; ar += R; ag += G; ab += B; n++;
      }
      return w > 0.5 ? [r / w, g / w, b / w] : [ar / n, ag / n, ab / n];
    }
    // Pixels can only be read when the image host allows it (CORS). Harbor's own <img> tags don't ask for that, so a
    // separate copy is loaded with crossOrigin. When the host refuses, the result is null and callers fall back.
    const colorCache = new Map();
    function sampleImage(src) {
      if (!src) return Promise.resolve(null);
      if (colorCache.has(src)) return colorCache.get(src);
      const p = new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.decoding = "async";
        img.onload = () => {
          let out = null;
          try {
            const c = el("canvas"); c.width = TW; c.height = TH;
            const x = c.getContext("2d", { willReadFrequently: true });
            x.drawImage(img, 0, 0, TW, TH);
            out = dominant(x.getImageData(0, 0, TW, TH).data);
          } catch (e) { out = null; } // tainted: the host did not allow reading pixels
          resolve(out);
        };
        img.onerror = () => resolve(null);
        img.src = src;
      });
      if (colorCache.size > 200) colorCache.clear();
      colorCache.set(src, p);
      return p;
    }
    const tone = (rgb, s0, s1, l) => { const [h, s] = rgbToHsl(rgb); return hslToHex(h, clamp(s, s0, s1), l); };

    // Soft copies. Canvas filters where available, otherwise a tiny copy scaled up (same idea as the mockup).
    const CAN_FILTER = (() => { try { const x = el("canvas").getContext("2d"); x.filter = "blur(2px)"; return x.filter === "blur(2px)"; } catch (e) { return false; } })();
    function softDraw(x, src, dx, dy, dw, dh, blur, extra) {
      if (CAN_FILTER) { x.filter = `blur(${blur}px)${extra ? " " + extra : ""}`; x.drawImage(src, dx, dy, dw, dh); x.filter = "none"; return; }
      const t = el("canvas"); t.width = Math.max(4, Math.round(dw / blur)); t.height = Math.max(4, Math.round(dh / blur));
      t.getContext("2d").drawImage(src, 0, 0, t.width, t.height);
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high"; x.drawImage(t, dx, dy, dw, dh);
    }
    // Harbor's banner image is already loaded and decoded. Drawing it is fine even when its pixels can't be read:
    // the canvas only gets displayed, never read back.
    const ready = (img) => !!(img && img.complete && img.naturalWidth > 0);

    /* ---------- the banner as the cinema layer sees it ----------
       Harbor 0.9.113 (home.tsx, hero-carousel.tsx, hero.tsx): [data-scroll-anchor="hero"] > carousel viewport >
       track > one div per slide (aria-hidden="false" on the active one) > <section> with img.object-cover and the
       text block .max-w-2xl. Harbor keeps hidden pages mounted, so only a banner that is actually shown counts. */
    const shown = (n) => (n.checkVisibility ? n.checkVisibility({ visibilityProperty: true }) : n.getClientRects().length > 0);
    function heroNow() {
      const hero = doc.querySelector('[data-scroll-anchor="hero"]');
      if (!hero || !shown(hero)) return null;
      const slide = hero.querySelector('[aria-hidden="false"]') || hero;
      const img = slide.querySelector("img.object-cover");
      const track = slide !== hero ? slide.parentElement : null;
      const viewport = track && track.parentElement && hero.contains(track.parentElement) && track.parentElement !== hero ? track.parentElement : null;
      return {
        hero, slide, img, viewport,
        section: img ? img.parentElement : null,
        card: slide.querySelector(".max-w-2xl"),
        src: (img && (img.currentSrc || img.src)) || "",
      };
    }

    /* ---------- watching the banner ---------- */
    let cur = null, lastSlide = null, artSrc = "", artRgb = null, spillSrc = "", watched = null;
    const slideObs = new MutationObserver(() => { if (!disposed) check(); });
    function watch(hero) {
      if (watched === hero) return;
      slideObs.disconnect();
      unbindTilt();
      watched = hero;
      slideObs.observe(hero, { subtree: true, attributes: true, attributeFilter: ["aria-hidden"] });
      bindTilt(hero);
    }
    function check() {
      if (disposed || doc.hidden || doc.querySelector("[data-harbor-player]")) return;
      const info = heroNow();
      if (!info) return;
      cur = info;
      watch(info.hero);
      placeSpill(info.hero);
      placeBars(info.viewport);
      if (info.slide !== lastSlide) {
        lastSlide = info.slide;
        resetTilt();
        if (isOn("reveal")) reveal(info.card);
        if (isOn("focus") && ready(info.img)) pull(info);
        if (isOn("wide") && isOn("motion")) openBars();
      }
      if (info.src && ready(info.img)) {
        if (info.src !== artSrc) readArt(info);
        else if (isOn("spill") && perfMode() !== "lite" && spillSrc !== artSrc) drawSpill(info.img, artRgb);
      }
    }
    // Color first, then the spill drawn with it. Once per slide; sampleImage caches by address.
    function readArt(info) {
      const src = info.src;
      artSrc = src;
      sampleImage(src).then((rgb) => {
        if (disposed || artSrc !== src) return;
        const changed = !!rgb !== !!artRgb || (rgb && artRgb && rgb.some((v, i) => Math.abs(v - artRgb[i]) > 1));
        artRgb = rgb;
        if (isOn("spill") && perfMode() !== "lite" && info.img.isConnected) drawSpill(info.img, rgb);
        if (rgb && changed) setArtColor(rgb); // core: accent follows the artwork when that setting is on
      });
    }

    /* ---------- 1 + 2. light spill ----------
       The artwork's strongest color pooling below the banner, with a blurred small copy of the picture mixed in at
       the top (a blurred copy alone was nearly invisible: the bottom of most artwork is dark). Drawn once per slide
       into one of two 200x140 canvases, scaled up by CSS, and crossfaded by opacity. It sits inside the banner's
       anchor at z-index -1, so it paints behind the page's own content and scrolls with the banner. */
    const spill = el("div", { id: LAYER + "-spill", "aria-hidden": "true" });
    const spillCv = [el("canvas"), el("canvas")];
    spillCv.forEach((c) => { c.width = 200; c.height = 140; spill.append(c); });
    let spillFront = 0;
    function placeSpill(hero) {
      if (!isOn("spill") || perfMode() === "lite") { if (spill.isConnected) spill.remove(); return; }
      if (spill.parentElement !== hero) hero.append(spill);
    }
    function drawSpill(img, rgb) {
      if (!ready(img)) return;
      const c = spillCv[1 - spillFront], x = c.getContext("2d");
      x.clearRect(0, 0, 200, 140);
      if (rgb) {
        const col = hexToRgb(tone(rgb, 0.5, 0.9, 0.5)).join(" ");
        const g = x.createRadialGradient(100, 70, 4, 100, 74, 92);
        g.addColorStop(0, `rgb(${col} / .95)`); g.addColorStop(1, `rgb(${col} / 0)`);
        x.fillStyle = g; x.fillRect(0, 0, 200, 140);
      }
      x.globalAlpha = rgb ? 0.85 : 1;
      softDraw(x, img, 30, 6, 140, 60, 12, rgb ? "saturate(1.5)" : "saturate(1.7) brightness(1.25)");
      x.globalAlpha = 1;
      // Fade the edges out so the light has no shape.
      x.globalCompositeOperation = "destination-in";
      const m = x.createRadialGradient(100, 56, 8, 100, 64, 98);
      m.addColorStop(0, "rgb(0 0 0 / 1)"); m.addColorStop(0.55, "rgb(0 0 0 / .8)"); m.addColorStop(1, "rgb(0 0 0 / 0)");
      x.fillStyle = m; x.fillRect(0, 0, 200, 140);
      x.globalCompositeOperation = "source-over";
      c.setAttribute("data-on", "");
      spillCv[spillFront].removeAttribute("data-on");
      spillFront = 1 - spillFront;
      spillSrc = artSrc;
    }

    /* ---------- 3. focus pull ----------
       A soft 192px copy of the new slide sits right above Harbor's picture (under its shades and text) and fades out
       while the picture settles from a slight zoom. Drawn once, removed when done. No live CSS blur. */
    let pullNode = null, pullSection = null, pullTimer = 0;
    function clearPull() {
      cancel(pullTimer); pullTimer = 0;
      if (pullNode) { pullNode.remove(); pullNode = null; }
      if (pullSection) { pullSection.removeAttribute("data-pj-pull"); pullSection = null; }
    }
    function pull(info) {
      clearPull();
      const { img, section } = info;
      if (!section) return;
      const w = 192, h = Math.max(2, Math.round((w * img.naturalHeight) / img.naturalWidth));
      const c = el("canvas", { id: LAYER + "-pull", "aria-hidden": "true" });
      c.width = w; c.height = h;
      softDraw(c.getContext("2d"), img, -6, -6, w + 12, h + 12, 5);
      // Same box as the picture (Harbor insets it 2px with rounded corners).
      const cs = getComputedStyle(img);
      c.style.cssText = `left:${img.offsetLeft}px;top:${img.offsetTop}px;width:${img.offsetWidth}px;height:${img.offsetHeight}px;border-radius:${cs.borderRadius}`;
      img.after(c);
      section.setAttribute("data-pj-pull", "");
      pullNode = c; pullSection = section;
      pullTimer = later(1400, clearPull);
    }

    /* ---------- 4. title reveal ----------
       React owns the title (an h1/h2 or a logo image) and its text, so nothing is rewritten. The text block's
       children rise in: the title first, then the rest. Two identical keyframe sets (a/b) restart the animation on
       each slide without forcing a layout. The title's wrapper is marked once so CSS can give it the bigger move. */
    function reveal(card) {
      if (!card) return;
      const title = card.querySelector("h1, h2") || card.querySelector('img[alt]:not([alt=""])');
      if (title) {
        let wrap = title;
        while (wrap.parentElement && wrap.parentElement !== card) wrap = wrap.parentElement;
        if (wrap.parentElement === card && !wrap.hasAttribute("data-pj-title")) wrap.setAttribute("data-pj-title", "");
      }
      card.setAttribute("data-pj-reveal", card.getAttribute("data-pj-reveal") === "a" ? "b" : "a");
    }

    /* ---------- 5. house lights ----------
       a) Dim behind Harbor's hover preview: pure CSS on the preview's own full-screen layer (css/30-cinema.css,
          Fragile), so it appears and goes exactly with the preview and costs nothing when it isn't there.
       b) A quick fade to black when a Play button is pressed. Its own fixed layer, removed the moment
          [data-harbor-player] mounts (hooks.player, and core CSS hides projector-layer* while the player is up),
          with a hard timeout so it can never stay up. Play buttons are found by Harbor's lucide play icon, which
          works in every language. The banner's Play opens the detail page, so it doesn't count. */
    const lights = el("div", { id: LAYER + "-lights", "aria-hidden": "true" });
    let lightsTimer = 0;
    const PLAY_ICON = "svg.lucide-play, svg.lucide-circle-play, svg.lucide-play-circle";
    function lightsOff(fade) {
      cancel(lightsTimer); lightsTimer = 0;
      if (!lights.isConnected) return;
      if (!fade) { lights.remove(); lights.removeAttribute("data-state"); return; }
      lights.setAttribute("data-state", "lift");
      lightsTimer = later(320, () => lightsOff(false));
    }
    function fadeToBlack() {
      cancel(lightsTimer);
      lights.setAttribute("data-state", "black");
      if (!lights.isConnected) doc.body.append(lights);
      // Harbor shows the play picker first when it has to ask, so the lights come back up if no player arrives.
      lightsTimer = later(1500, () => lightsOff(true));
    }
    listen(doc, "click", (e) => {
      if (!isOn("lights") || !isOn("motion") || e.button !== 0) return;
      const b = e.target && e.target.closest ? e.target.closest('button, [role="button"]') : null;
      if (!b || !b.querySelector(PLAY_ICON)) return;
      if (b.closest('[data-scroll-anchor="hero"], [data-harbor-player], [id^="projector"]')) return;
      if (doc.querySelector("[data-harbor-player]")) return;
      fadeToBlack();
    }, true);

    /* ---------- 6. hover glow ----------
       Harbor already lifts the poster on hover (pick-card.tsx: translate and scale on [data-preview-anchor]), so the
       lift stays Harbor's. Projector adds a glow layer behind the poster, painted once as a radial gradient in the
       poster's own color and only faded (CSS). The color is read once per poster, a moment after the pointer arrives,
       and Harbor's hover ring takes the same color. */
    /* Poster light (like YouTube's ambient mode): behind the poster you point at, a blurred, saturated copy of the
       poster itself spills past its edges, so each title lights the row in its own colors. Two small canvases are
       reused (the last one can still fade out while the next fades in); each is drawn once per poster at a quarter
       of its size and only faded by CSS. Drawing Harbor's decoded image works even when its pixels can't be read,
       because the canvas is never read back. The same light sits behind Harbor's hover preview card. */
    const AMB_T = 16, AMB_S = 22, AMB_B = 40, AMB_K = 0.25, PREV_PAD = 44;
    const ambPool = [0, 1].map(() => el("canvas", { class: "pj-amb", "aria-hidden": "true" }));
    const prevAmb = el("canvas", { class: "pj-amb-prev", "aria-hidden": "true" });
    let ambNext = 0, prevTimers = [];
    function paintAmb(c, img, w, h, ix, iy, iw, ih, blur) {
      const src = img.currentSrc || img.src;
      const key = `${src}|${w}x${h}`;
      if (c.dataset.key === key) return;
      c.width = Math.max(8, Math.round(w * AMB_K)); c.height = Math.max(8, Math.round(h * AMB_K));
      const x = c.getContext("2d");
      x.clearRect(0, 0, c.width, c.height);
      try { softDraw(x, img, ix * AMB_K, iy * AMB_K, iw * AMB_K, ih * AMB_K, blur, "saturate(1.9) brightness(1.2)"); }
      catch (e) { return; }
      c.dataset.key = key;
    }
    /* Which card the pointer or focus is on. Posters use Harbor's [data-preview-anchor]. The wide cards (Harbor 1.0.3
       continue-card.tsx, home/new-episodes-section.tsx, collection-card.tsx) have no anchor, so they are found by
       their own markup and get the same light, shaped to the wide card. The collection card clips its contents, so
       its light goes just before it in its parent (same offset parent) instead of inside it. Fragile selectors. */
    const WIDE = "[data-continue-card-trigger], div.group.relative.shrink-0 > button.overflow-hidden, button.group\\/card";
    function cardAt(t) {
      if (!t || !t.closest) return null;
      const host = t.closest("[data-preview-anchor]");
      if (host) return { host, card: host.parentElement, wide: false };
      let w = null;
      try { w = t.closest(WIDE); } catch (e) { return null; } // a bad selector must never take Harbor down
      if (!w || !w.parentElement) return null;
      return { host: w, card: w.parentElement, wide: true, sibling: w.tagName === "BUTTON" && w.classList.contains("group/card") };
    }
    let litCanvas = null;
    function lightPoster(t) {
      if (litCanvas) { litCanvas.removeAttribute("data-on"); litCanvas = null; }
      if (!t || !isOn("glow")) return;
      const { host, card, wide, sibling } = t;
      const img = host.querySelector(".harbor-poster img") || host.querySelector("img");
      if (!card || !ready(img) || !host.offsetWidth) return;
      let c = card.querySelector(":scope > canvas.pj-amb");
      if (c && sibling && c.nextElementSibling !== host) c = null;
      if (!c) { c = ambPool[ambNext]; ambNext ^= 1; if (sibling) card.insertBefore(c, host); else card.append(c); }
      if (wide) c.setAttribute("data-wide", sibling ? "sib" : "in"); else c.removeAttribute("data-wide");
      if (wide) { c.setAttribute("data-on", ""); litCanvas = c; }
      const pw = host.offsetWidth, ph = host.offsetHeight, w = pw + AMB_S * 2, h = ph + AMB_T + AMB_B;
      Object.assign(c.style, { left: host.offsetLeft - AMB_S + "px", top: host.offsetTop - AMB_T + "px", width: w + "px", height: h + "px" });
      // The copy is a little larger than the poster and dropped a few px, so the light pools underneath.
      paintAmb(c, img, w, h, AMB_S - pw * 0.04, AMB_T + 6 - ph * 0.03, pw * 1.08, ph * 1.06, 6);
    }
    // Harbor's hover preview opens a moment after the pointer settles. A few cheap checks find its card and put the
    // same light behind it (its frame is keyed per open, so a new frame gets the canvas again).
    function lightPreview(host) {
      const panel = doc.querySelector("div.pointer-events-none.fixed.inset-0 [role=presentation].group.relative.overflow-hidden");
      const frame = panel && panel.parentElement;
      if (!frame || !panel.offsetWidth) return false;
      const img = [panel.querySelector("img"), host && host.querySelector("img")].find(ready);
      if (!img) return false;
      const w = panel.offsetWidth + PREV_PAD * 2, h = panel.offsetHeight + PREV_PAD * 2;
      if (prevAmb.parentElement !== frame) frame.prepend(prevAmb);
      // The card's edge light and title rule take the poster's color too.
      const g = host && host.style.getPropertyValue("--pj-glow");
      if (g) frame.style.setProperty("--pj-glow", g);
      Object.assign(prevAmb.style, { left: -PREV_PAD + "px", top: -PREV_PAD + "px", width: w + "px", height: h + "px" });
      paintAmb(prevAmb, img, w, h, PREV_PAD, PREV_PAD + 10, panel.offsetWidth, panel.offsetHeight, 9);
      return true;
    }
    function watchPreview(host) {
      prevTimers.forEach(cancel);
      prevTimers = [500, 900, 1400, 2200].map((ms) => later(ms, () => { if (!disposed && isOn("glow")) lightPreview(host); }));
    }

    let glowHost = null, glowTimer = 0;
    const glowSrc = new WeakMap();
    function onPoster(t) {
      const host = t ? t.host : null;
      if (host === glowHost) return;
      glowHost = host;
      cancel(glowTimer); glowTimer = 0;
      if (!host || !isOn("glow")) { lightPoster(null); return; }
      lightPoster(t);
      if (t.wide) return;
      watchPreview(host);
      glowTimer = later(90, () => {
        const img = host.querySelector("img");
        const src = img && (img.currentSrc || img.src);
        if (!src || glowSrc.get(host) === src) return;
        sampleImage(src).then((rgb) => {
          if (!rgb || disposed || !host.isConnected) return;
          glowSrc.set(host, src);
          host.style.setProperty("--pj-glow", tone(rgb, 0.45, 0.9, 0.56));
        });
      });
    }
    // Hover grace: the pointer skimming a card's edge (or Harbor's own lift moving the card under it) must never
    // flash the light. Leaving waits 160 ms and moving to another card 70 ms; coming back inside that time cancels it.
    let hoverTimer = 0;
    function wantPoster(t) {
      cancel(hoverTimer); hoverTimer = 0;
      const host = t ? t.host : null;
      if (host === glowHost) return;
      hoverTimer = later(host ? (glowHost ? 70 : 0) : 160, () => { hoverTimer = 0; onPoster(t); });
    }
    listen(doc, "pointerover", (e) => {
      if (e.pointerType === "touch") return;
      wantPoster(cardAt(e.target));
    }, { passive: true });
    listen(doc, "mouseout", (e) => { if (!e.relatedTarget) wantPoster(null); }, { passive: true });
    listen(doc, "focusin", (e) => {
      const t = e.target;
      if (!t || !t.matches || !t.matches(":focus-visible")) return;
      const card = t.closest("button.group");
      const host = card && card.querySelector("[data-preview-anchor]");
      onPoster(host ? { host, card, wide: false } : cardAt(t));
    });

    /* ---------- 7. rise-in on scroll: CSS only (scroll-driven animations), see css/30-cinema.css ---------- */

    /* ---------- 8. banner pointer tilt (ported from Fathom's moveHero / resetHero) ----------
       The carousel frame tilts toward the pointer (up to 2.4 degrees), the picture shifts the other way (16px) and
       the text drifts a little with it. Transforms only, written at most once a frame and only while a mouse or pen
       moves over the banner; CSS transitions smooth it and ease it back on leave. Nothing runs while the pointer is
       still. The frame is tilted rather than the anchor, so the light spill (inside the anchor) stays put. */
    let tiltHero = null, tiltRaf = 0, tiltEv = null, tilted = null;
    function onTiltMove(e) {
      if (e.pointerType === "touch" || !isOn("parallax")) return;
      tiltEv = e;
      if (!tiltRaf) tiltRaf = requestAnimationFrame(tiltFrame);
    }
    function tiltFrame() {
      tiltRaf = 0;
      const e = tiltEv, info = cur;
      if (!e || disposed || !info || !info.viewport || info.hero !== tiltHero || !isOn("parallax")) return;
      const r = info.hero.getBoundingClientRect(); // the anchor itself is never transformed, so this is stable
      if (!r.width || !r.height) return;
      const px = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1), py = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      if (tilted && tilted.slide !== info.slide) resetTilt();
      const parts = tilted || { slide: info.slide, frame: info.viewport, img: info.img, card: info.card };
      const shift = `translate3d(${(-px * 16).toFixed(1)}px, ${(-py * 10).toFixed(1)}px, 0) scale(1.06)`;
      parts.frame.setAttribute("data-pj-tilt", "frame");
      parts.frame.style.transform = `perspective(1600px) rotateX(${(-py * 1.6).toFixed(2)}deg) rotateY(${(px * 2.4).toFixed(2)}deg)`;
      if (parts.img) { parts.img.setAttribute("data-pj-tilt", "art"); parts.img.style.transform = shift; }
      if (pullNode && pullSection && pullSection.contains(pullNode) && parts.img && pullSection === parts.img.parentElement) {
        pullNode.style.transform = shift; // the soft copy moves with the picture it covers
      }
      if (parts.card) { parts.card.setAttribute("data-pj-tilt", "copy"); parts.card.style.transform = `translate3d(${(px * 6).toFixed(1)}px, ${(py * 4).toFixed(1)}px, 0)`; }
      tilted = parts;
    }
    function resetTilt() {
      if (tiltRaf) { cancelAnimationFrame(tiltRaf); tiltRaf = 0; }
      tiltEv = null;
      if (!tilted) return;
      for (const n of [tilted.frame, tilted.img, tilted.card]) if (n) n.style.removeProperty("transform");
      tilted = null;
    }
    function bindTilt(hero) {
      tiltHero = hero;
      hero.addEventListener("pointermove", onTiltMove, { passive: true });
      hero.addEventListener("pointerleave", resetTilt);
    }
    function unbindTilt() {
      resetTilt();
      if (!tiltHero) return;
      tiltHero.removeEventListener("pointermove", onTiltMove, { passive: true });
      tiltHero.removeEventListener("pointerleave", resetTilt);
      tiltHero = null;
    }

    /* ---------- 9. widescreen bars and grain ---------- */
    // Bars: two black halves inside the carousel frame that open on each slide (CSS sets the 2.39:1 crop).
    const bars = el("div", { id: LAYER + "-bars", "aria-hidden": "true" });
    bars.innerHTML = "<i></i><i></i>";
    function placeBars(viewport) {
      if (!isOn("wide") || !viewport) { if (bars.isConnected) bars.remove(); return; }
      if (bars.parentElement !== viewport) viewport.append(bars);
    }
    function openBars() { bars.setAttribute("data-run", bars.getAttribute("data-run") === "a" ? "b" : "a"); }
    // Grain: one 160px noise tile drawn once, moved by a stepped transform about 10 times a second (CSS).
    let grain = null;
    function syncGrain() {
      if (state.grain && !grain) {
        const c = el("canvas"); c.width = c.height = 160;
        const x = c.getContext("2d"), d = x.createImageData(160, 160);
        for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
        x.putImageData(d, 0, 0);
        grain = el("div", { id: LAYER + "-grain", "aria-hidden": "true" });
        grain.style.backgroundImage = `url(${c.toDataURL()})`;
        doc.body.append(grain);
      } else if (!state.grain && grain) { grain.remove(); grain = null; }
    }

    /* ---------- switches ---------- */
    let pending = 0;
    hooks.apply.push(() => {
      const motion = motionOn(), lite = perfMode() === "lite";
      const flag = (k, v) => setAttr("pj-" + k, v ? "on" : "off");
      flag("spill", state.spill && !lite);
      flag("focus", state.focus && motion);
      flag("reveal", state.reveal && motion);
      flag("lights", state.lights);
      flag("glow", state.glow && !lite);
      flag("rise", state.rise && motion && !lite && RISE_OK);
      flag("parallax", state.parallax && motion);
      flag("wide", state.wide);
      flag("grain", state.grain);
      syncGrain();
      if (!isOn("parallax")) resetTilt();
      if (!isOn("focus")) clearPull();
      if (!isOn("lights")) lightsOff(false);
      // Layers that were switched on (or off) catch up right away instead of waiting for the next scan.
      if (!pending) pending = later(0, () => { pending = 0; check(); });
    });
    hooks.scan.push(check);
    hooks.player.push((on) => { if (on) { lightsOff(false); resetTilt(); clearPull(); } });
    listen(doc, "visibilitychange", () => { if (doc.hidden) resetTilt(); });

    /* ---------- cleanup ---------- */
    hooks.dispose.push(() => {
      slideObs.disconnect();
      unbindTilt();
      clearPull();
      timers.forEach((id) => clearTimeout(id)); timers.clear();
      [spill, bars, lights].forEach((n) => n.remove());
      if (grain) { grain.remove(); grain = null; }
      spillCv.forEach((c) => { c.width = c.height = 0; });
      doc.querySelectorAll("[data-pj-reveal]").forEach((n) => n.removeAttribute("data-pj-reveal"));
      doc.querySelectorAll("[data-pj-title]").forEach((n) => n.removeAttribute("data-pj-title"));
      doc.querySelectorAll("[data-pj-pull]").forEach((n) => n.removeAttribute("data-pj-pull"));
      doc.querySelectorAll("[data-pj-tilt]").forEach((n) => { n.removeAttribute("data-pj-tilt"); n.style.removeProperty("transform"); });
      doc.querySelectorAll("[data-preview-anchor]").forEach((n) => n.style.removeProperty("--pj-glow"));
      prevTimers.forEach(cancel);
      if (prevAmb.parentElement) prevAmb.parentElement.style.removeProperty("--pj-glow");
      [...ambPool, prevAmb].forEach((c) => { c.removeAttribute("data-on"); c.removeAttribute("data-wide"); c.remove(); c.width = c.height = 0; delete c.dataset.key; });
      colorCache.clear();
      cancel(hoverTimer);
      cur = lastSlide = watched = glowHost = null;
    });
  }
