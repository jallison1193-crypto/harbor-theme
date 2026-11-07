// Bench frame timing. In the console: await __perf.run("off" | "lite" | "balanced" | "full")
// Returns rAF frame-interval stats (ms) for a scripted scroll, a pointer sweep over the page and a sweep along the dock.
// Only trust it while the page is visible and its window focused (valid: false means rAF stalled).
window.__hzHold = true;
window.__perf = (() => {
  const raf = () => new Promise((r) => requestAnimationFrame(r));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let vsync = 16.7;
  // The display's refresh interval, measured while idle. A frame counts as slow when it takes 1.5x that or more.
  async function measureVsync() {
    const d = []; let l = await raf();
    for (let i = 0; i < 40; i++) { const t = await raf(); d.push(t - l); l = t; }
    d.sort((a, b) => a - b); vsync = d[20];
  }
  const stats = (d) => {
    const s = d.slice().sort((a, b) => a - b), q = (p) => s[Math.min(s.length - 1, Math.floor(s.length * p))];
    const vs = vsync;
    return { n: s.length, p50: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), max: +s[s.length - 1].toFixed(1), slow: +(s.filter((v) => v > vs * 1.5).length / s.length * 100).toFixed(1), vsync: +vs.toFixed(1) };
  };
  async function record(ms, step) {
    const d = []; let last = await raf(); const t0 = last; let i = 0;
    while (last - t0 < ms) { step(i++, last - t0); const t = await raf(); d.push(t - last); last = t; }
    return d;
  }
  async function scrollSweep() {
    const m = [...document.querySelectorAll("main")].find((x) => x.getClientRects().length && x.scrollHeight > x.clientHeight + 200);
    m.scrollTop = 0; await wait(300);
    const max = m.scrollHeight - m.clientHeight;
    return record(4000, (i, t) => { m.scrollTop = max * (0.5 - 0.5 * Math.cos((t / 2000) * Math.PI)); m.dispatchEvent(new Event("scroll")); });
  }
  async function pointerSweep() {
    const m = [...document.querySelectorAll("main")].find((x) => x.getClientRects().length);
    m.scrollTop = 0; await wait(300);
    const W = innerWidth, H = innerHeight;
    return record(4000, (i, t) => {
      const x = W * (0.1 + 0.8 * (0.5 - 0.5 * Math.cos(t / 700))), y = H * (0.2 + 0.75 * (0.5 - 0.5 * Math.cos(t / 1300)));
      const el = document.elementFromPoint(x, y) || document.body;
      el.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y, bubbles: true }));
    });
  }
  async function dockSweep() {
    const dock = document.querySelector("#fx-dock");
    if (!dock) return [];
    const r = dock.getBoundingClientRect();
    return record(3000, (i, t) => {
      const x = r.left + r.width * (0.5 - 0.5 * Math.cos(t / 400)), y = r.top + r.height / 2;
      const el = document.elementFromPoint(x, y) || dock;
      el.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y, bubbles: true }));
    });
  }
  async function setMode(mode, extra) {
    const btn = (k) => document.querySelector(`[data-hz="${k}"]`);
    // Unload first: the theme saves its settings on cleanup, which would overwrite the ones written below.
    btn("unload").click(); await wait(300);
    if (mode === "off") { await wait(500); return; }
    const s = extra ? {} : JSON.parse(localStorage.getItem("fathom.settings.v1") || "{}");
    Object.assign(s, { perf: mode, refraction: true, rays: true, light: true, focusRow: true, sheen: true, motion: "on" }, extra || {});
    localStorage.setItem("fathom.settings.v1", JSON.stringify(s));
    localStorage.setItem("fathom.seen.v1", "1"); localStorage.setItem("fathom.prompted.v1", "1");
    btn("reload").click(); await wait(2500);
  }
  async function run(mode, extra) {
    document.querySelector('[data-hz="home"]').click();
    await setMode(mode, extra);
    await measureVsync();
    const sc = await scrollSweep(); await wait(400);
    const pt = await pointerSweep(); await wait(400);
    const dk = await dockSweep();
    const all = sc.concat(pt);
    const bad = all.filter((v) => v > 500).length;
    return { mode, perfAttr: document.documentElement.getAttribute("data-fx-perf"), valid: bad < 2, scroll: stats(sc), pointer: stats(pt), dock: dk.length ? stats(dk) : null };
  }
  // Pointer-only run with setting overrides, for finding which effect costs the most.
  async function ablate(mode, extra) { document.querySelector('[data-hz="home"]').click(); await setMode(mode, extra); await measureVsync(); return { extra, pointer: stats(await pointerSweep()), dock: stats(await dockSweep()) }; }
  return { run, ablate, stats };
})();

