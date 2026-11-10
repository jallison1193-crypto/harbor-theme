  /* ===== js/90-start.js: start-up, test hook, cleanup ===== */

  /* ---------- start ---------- */
  apply();
  runScan();
  // One cheap DOM check every 1.5 s (skipped while hidden or during playback): banner slide changes and the
  // sidebar coming back. No animation runs from it.
  every(1500, runScan);
  listen(win, "harbor:scroll-top", () => setTimeout(runScan, 60));
  // Harbor sets data-chrome-hidden for the player, the play picker and Settings. The player itself is
  // [data-harbor-player]; on Windows the video can be a native layer behind the page, so modules hide their layers.
  let playerOn = false;
  const chromeObserver = new MutationObserver(() => {
    const on = !!doc.querySelector("[data-harbor-player]");
    if (on !== playerOn) { playerOn = on; runHooks(hooks.player, on); }
    setTimeout(runScan, 60);
  });
  chromeObserver.observe(root, { attributes: true, attributeFilter: ["data-chrome-hidden"] });
  cleanups.push(() => chromeObserver.disconnect());
  onMQ(lightMQ, () => { if (state.appearance === "windows") apply(); });
  onMQ(reduceMQ, apply);
  // "Follow time of day" re-checks every 15 minutes. apply() skips the write when nothing changed.
  every(15 * 60 * 1000, () => { if (state.appearance === "time" && !doc.hidden) apply(); });
  listen(doc, "visibilitychange", () => { if (!doc.hidden && state.appearance === "time") apply(); });

  // Test hook for the bench and the console. Not a public API.
  win.__projector = {
    version: VERSION,
    get settings() { return Object.assign({}, state); },
    set,
    fakeHour(h) { hourOverride = h == null ? null : clamp(Number(h), 0, 23.99); apply(); },
    setArtColor,
    stocks: Object.keys(STOCKS), types: Object.keys(TYPES),
  };

  /* ---------- cleanup ---------- */
  function dispose() {
    if (disposed) return;
    disposed = true;
    clearTimeout(saveTimer);
    store.set(KEY, JSON.stringify(state));
    cleanups.splice(0).forEach((f) => { try { f(); } catch (e) { /* keep going */ } });
    runHooks(hooks.dispose);
    [varsStyle, fontLink].forEach((n) => n.remove());
    ATTRS.forEach((k) => root.removeAttribute("data-" + k));
    delete win.__projector;
    if (win.__projectorDispose === dispose) delete win.__projectorDispose;
    if (win.__harborThemeCleanup === dispose) win.__harborThemeCleanup = undefined;
  }
  win.__projectorDispose = dispose;
  win.__harborThemeCleanup = dispose;
})();
