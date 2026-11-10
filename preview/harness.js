// Test bench: emulates the parts of Harbor that Fathom talks to, then loads a built theme (dist/fathom.json, or ?theme=projector) like Harbor does.
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
        <img class="absolute object-cover transition-opacity duration-500 inset-[2px] rounded-[26px]" src="${img(s.seed, 1600, 900)}" alt="" crossorigin="anonymous" style="opacity: 0.9">
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

  /* ---------- rows: Harbor's real card markup (0.9.113) ----------
     Class names copied from Harbor's components so the theme can be tested against them. .hz-u marks markup whose
     Tailwind classes harness.css approximates (inside @scope (.hz-u)); .hz-* classes are bench-only. */
  const SVG = (d, size, cls, extra) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${cls ? ` class="${cls}"` : ""}${extra || ""}>${d}</svg>`;
  const IC = {
    play: '<path d="M7 4v16l13-8z" fill="currentColor" stroke="none"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4z" fill="currentColor"/>',
    bookmarkOff: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    clapper: '<path d="M4 9h16v11H4zM4 9l2-5 14 3-1 2"/>',
    arrowUpRight: '<path d="M7 17 17 7M8 7h9v9"/>',
    arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    thumb: '<path d="M7 10v11M7 10l4-7c2 0 3 1 3 3v3h5l-2 9H7"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z" fill="currentColor" stroke="none"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14-5L4 8M4 4v4h4M4 13a8 8 0 0 0 14 5l2-2M20 20v-4h-4"/>',
    mark: '<path d="M4 17c4-2 8-2 12 0s6 2 8 0M7 12V4h3v8M15 12V4h3v8M10 7h5"/>',
  };
  const IMDB = '<svg class="h-[11px] w-auto rounded-[2px]" viewBox="0 0 32 16" aria-hidden="true"><rect width="32" height="16" rx="2" fill="#f5c518"/><text x="16" y="12" text-anchor="middle" font-size="10" font-weight="800" font-family="Arial" fill="#000">IMDb</text></svg>';
  const TOMATO = '<svg class="h-[12px] w-auto" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="9" r="6" fill="#fa320a"/><path d="M6 3h4l-2 2z" fill="#00912d"/></svg>';
  const BADGE = {
    // pick-card.tsx Badge (default and accent tone), DUB, CinemaBadge, RerunBadge
    newly: '<span class="absolute start-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] border border-edge-soft bg-canvas/95 text-ink">New</span>',
    season: '<span class="absolute start-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] bg-accent/90 text-canvas">New season</span>',
    dub: '<span class="pointer-events-none absolute start-2 top-2 z-10 rounded-md bg-accent/90 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-canvas ring-1 ring-black/10">DUB</span>',
    cinema: `<span class="harbor-cinema-badge absolute start-2 top-2 flex items-center gap-1 rounded-md bg-canvas/95 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em]">${SVG(IC.clapper, 10)}<span>In Cinema</span></span>`,
    rerun: `<span class="absolute start-2 top-2 flex items-center gap-1 rounded-md border border-edge-soft bg-canvas/95 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink-muted">${SVG(IC.refresh, 9)}<span>Rerun · 2009</span></span>`,
    // ScoreStack (bottom placement)
    score: (v, rt) => `<div class="absolute end-1.5 flex items-center gap-1 whitespace-nowrap rounded-md bg-canvas/95 px-1.5 py-0.5 text-[10px] font-semibold text-ink bottom-1.5"><span class="flex items-center gap-1"><span class="flex items-center gap-1">${IMDB}<span>${v}</span></span></span>${rt ? `<span class="flex items-center gap-1"><span class="opacity-30">·</span><span class="flex items-center gap-0.5">${TOMATO}<span>${rt}%</span></span></span>` : ""}</div>`,
    watchlist: `<span class="pointer-events-none absolute flex h-6 w-6 items-center justify-center rounded-full bg-canvas/85 text-ink ring-1 ring-edge-soft/70 backdrop-blur-sm top-1.5 end-1.5" title="In your watchlist" aria-label="In watchlist">${SVG(IC.bookmark, 11)}</span>`,
    watched: (top) => `<span class="pointer-events-none absolute flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/90 text-white ring-1 ring-emerald-300/40 backdrop-blur-sm end-1.5 ${top}" title="Watched" aria-label="Watched">${SVG(IC.check, 12, "", ' stroke-width="3"')}</span>`,
  };
  const badgesFor = (i) => {
    switch (i % 9) {
      case 0: return BADGE.score("7.8", 91);
      case 1: return BADGE.newly + BADGE.score("8.1");
      case 2: return BADGE.watchlist + BADGE.score("6.9", 74);
      case 3: return BADGE.season;
      case 4: return BADGE.cinema + BADGE.watchlist + BADGE.watched("top-[34px]");
      case 5: return BADGE.dub + BADGE.score("7.2");
      case 6: return BADGE.rerun + BADGE.watched("top-1.5");
      default: return "";
    }
  };
  // poster.tsx: .harbor-poster is the same element as .harbor-card-ring (PickCard passes it as className).
  const poster = (src, extra) => `
          <div class="harbor-poster your-card relative w-full overflow-hidden rounded-[var(--poster-radius,12px)] harbor-card-ring ${extra || ""}">
            <div aria-hidden="true" style="padding-top: 150%"></div>
            <img class="absolute inset-0 h-full w-full object-cover" src="${src}" alt="" crossorigin="anonymous" decoding="async" loading="lazy">
          </div>`;
  const pick = (i) => `
    <button type="button" class="group relative flex w-full min-w-0 flex-col gap-2.5 text-start hover:z-[2] hz-pick hz-u" data-open="${i}">
      <div data-preview-anchor class="relative w-full transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0.24,1)] motion-safe:group-hover:[transform:translate3d(0,-0.5rem,0)_scale(1.03)] motion-safe:group-hover:will-change-transform">${poster(img("fx-p" + i, 342, 513), "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] transition-[box-shadow] duration-300")}
        <div class="">${badgesFor(i)}</div>
      </div>
      <p class="line-clamp-2 min-h-9 text-[13px] font-medium leading-snug text-ink">${TITLES[i % TITLES.length]}</p>
    </button>`;
  // continue-card.tsx (0.9.113). Episode label, new-episode count and Trakt watched mark vary per card.
  const CONT = [
    { ep: "S2 E4", left: "32 min left", fresh: 2 },
    { ep: "", left: "1h 4m left" },
    { ep: "S1 E8", upNext: true, watched: true },
    { ep: "S3 E1", left: "12 min left", fresh: 1 },
    { ep: "", left: "48 min left" },
  ];
  const cont = (i, p, n) => {
    const c = CONT[n % CONT.length];
    const tail = c.upNext ? `<span class="shrink-0 text-ink-subtle">·</span><span class="shrink-0 font-medium text-accent">Up Next</span>`
      : `${c.ep ? '<span class="shrink-0 text-ink-subtle">·</span>' : ""}<span class="shrink-0 text-ink-muted">${c.left}</span>`;
    return `
    <div class="group relative w-full min-w-0 hz-cont hz-u">
      <button type="button" class="flex w-full min-w-0 flex-col gap-2.5 text-start" data-open="${i}">
        <div class="harbor-poster relative aspect-[16/9] overflow-hidden rounded-xl bg-elevated shadow-[0_2px_8px_-2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] will-change-transform [transform:translate3d(0,0,0)] transition-transform duration-[220ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:scale-[1.02]">
          <div class="absolute inset-0 bg-gradient-to-br from-raised via-elevated to-surface"></div>
          <img src="${img("fx-c" + i, 640, 360)}" alt="" decoding="async" crossorigin="anonymous" loading="lazy" class="absolute inset-0 h-full w-full object-cover brightness-95">
          <div class="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.45)]"></div>
          ${c.watched ? `<span class="absolute start-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/22 text-emerald-200 ring-1 ring-emerald-400/40 backdrop-blur-sm" title="Watched on Trakt">${SVG(IC.check, 12, "", ' stroke-width="3"')}</span>` : ""}
          ${c.fresh ? `<span class="absolute top-2 ${c.watched ? "start-10" : "start-2"}"><span class="flex h-6 items-center rounded-full bg-accent/90 px-2 text-[10px] font-bold tracking-[0.1em] text-canvas">+${c.fresh}</span></span>` : ""}
          <div class="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-canvas/80 to-transparent"></div>
          <div class="absolute bottom-2 start-2 flex max-w-[calc(100%-16px)] items-center gap-1.5 rounded-md bg-canvas/95 px-2 py-1 text-[11px]">${SVG(IC.play, 11, "shrink-0 text-ink")}${c.ep ? `<span class="shrink-0 font-medium text-ink">${c.ep}</span>` : ""}${tail}</div>
          <div class="absolute inset-x-0 bottom-0 h-[3px] bg-canvas/40"><div class="h-full bg-accent" style="width: ${p}%"></div></div>
        </div>
        <p class="truncate text-[13px] font-medium text-ink">${TITLES[i % TITLES.length]}</p>
      </button>
      <div class="pointer-events-none absolute inset-x-0 top-0 z-10 flex aspect-[16/9] items-center justify-center opacity-0 transition-opacity duration-[220ms] group-hover:opacity-100 group-focus-within:opacity-100">
        <button type="button" aria-label="Play" title="Play" class="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-canvas ring-1 ring-white/15 shadow-[0_10px_28px_-8px_rgba(0,0,0,0.6)] transition-transform duration-150 hover:scale-[1.06]">${SVG(IC.play, 22, "ml-0.5 text-ink")}</button>
      </div>
      <button type="button" aria-label="Remove from Continue Watching" class="group/x absolute end-0.5 top-0.5 z-10 flex h-11 w-11 items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100"><span class="flex h-9 w-9 items-center justify-center rounded-full bg-canvas/85 text-ink-muted ring-1 ring-white/12 backdrop-blur-sm transition-colors group-hover/x:bg-canvas group-hover/x:text-ink">${SVG(IC.x, 20)}</span></button>
    </div>`;
  };
  // top-rank-card.tsx (0.9.113): the numeral is an outlined span behind a poster that takes the end 60% of the cell.
  const rankNum = (r) => r >= 10
    ? '<span style="-webkit-text-stroke: 2.6px var(--color-ink-muted)">1</span><span style="-webkit-text-stroke: 2.6px var(--color-ink-muted); color: var(--color-canvas); margin-inline-start: -0.2em">0</span>'
    : String(r);
  const rank = (i, r) => `
    <button class="group relative w-full min-w-0 hz-rank hz-u" data-no-card-ring data-open="${i}" style="aspect-ratio: 228 / 246; container-type: inline-size">
      <span aria-hidden="true" class="pointer-events-none absolute top-0 flex h-full items-center text-transparent" style="inset-inline-start: ${r === 1 ? "18%" : "-3%"}; font-family: var(--font-rank); font-weight: 600; font-size: calc(100cqw * 230 / 228); line-height: 1; letter-spacing: -0.01em; -webkit-text-stroke: 2.6px var(--color-ink-muted); -webkit-mask-image: linear-gradient(to right, transparent 0, #000 12%, #000 54%, transparent 82%); mask-image: linear-gradient(to right, transparent 0, #000 12%, #000 54%, transparent 82%)">${rankNum(r)}</span>
      <div data-preview-anchor class="group/card absolute end-0 top-0 z-10 w-[60%] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0.24,1)] motion-safe:group-hover/card:will-change-transform motion-safe:group-hover/card:[transform:translate3d(0,-0.6rem,0)_scale(1.04)]">${poster(img("fx-r" + i, 342, 513), "rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.4)] transition-shadow duration-300")}
        ${r === 3 ? BADGE.watchlist : ""}
      </div>
      <p class="absolute top-[93cqw] end-0 w-[63%] truncate text-[12px] leading-[1.35] text-ink-subtle">${TITLES[i % TITLES.length]}</p>
    </button>`;
  const row = (title, cards, anchor, railClass) => `
    <div${anchor ? ` data-scroll-anchor="${anchor}"` : ""}>
    <div class="flex min-w-0 flex-col gap-5 hz-rowwrap">
      <div class="flex items-baseline justify-between gap-4 pe-1"><div class="flex min-w-0 items-center gap-2"><h3 class="truncate font-medium tracking-tight" style="font-size: 17px">${title}</h3></div></div>
      <div class="group/row relative min-w-0 hz-row"><div class="grid grid-flow-col hz-rail ${railClass || ""}">${cards}</div></div>
    </div>
    </div>`;
  $("#hz-rows").innerHTML =
    row("Continue watching", [3, 7, 1, 10, 5].map((i, n) => cont(i, 20 + n * 15, n)).join("")) +
    row("Top 10 Movies today", Array.from({ length: 10 }, (_, i) => rank(i + 40, i + 1)).join(""), "top10", "hz-rail-rank") +
    row("Trending this week", Array.from({ length: 14 }, (_, i) => pick(i)).join("")) +
    row("Because you watched Low Tide", Array.from({ length: 14 }, (_, i) => pick(i + 14)).join("")) +
    row("Award winners", Array.from({ length: 14 }, (_, i) => pick(i + 28)).join(""));
  $("#hz-grid").innerHTML = Array.from({ length: 24 }, (_, i) => pick(i + 3)).join("");

  /* ---------- hover preview (components/hover-preview.tsx, hover-preview/{crown,block,marquee}.tsx, 0.9.113) ----------
     Harbor mounts one fixed layer at z-[110] inside #root while a preview is open, places the 368px panel over the
     card (placement "over"), staggers [data-stagger] children with WAAPI and closes with a short fade and scale. */
  const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const GENRES = ["Drama", "Thriller", "Mystery", "Sci-Fi", "Comedy", "Romance", "Crime"];
  let pvStyle = "default"; // Harbor's cardHoverStyle setting: default | marquee (the bench button switches)
  let pv = null, pvTimer = 0, pvCloseTimer = 0, pvInside = false;
  function pvPayload(card) {
    const i = +card.dataset.open;
    return {
      i, title: TITLES[i % TITLES.length], year: 1994 + (i * 7) % 31, rating: (6 + (i % 30) / 10).toFixed(1),
      length: i % 3 ? `${1 + (i % 2)}h ${10 + (i * 13) % 50}m` : "3 Seasons", genre: GENRES[i % GENRES.length],
      chip: i % 9 === 4 ? "In Cinema" : i % 9 === 1 ? "New" : "",
      resume: i % 5 === 2 ? { ep: i % 3 ? "S2 E4" : "", status: i % 2 ? "32m left" : "Up Next", fraction: 0.35 + (i % 4) / 10 } : null,
      synopsis: "A harbor town goes quiet the night the sea pulls back further than anyone remembers, and something is left on the sand for the town to argue over.",
      art: img("fx-p" + i + "-bd", 736, 414),
    };
  }
  const pvBodyDefault = (d, crownH) => `
            <div class="relative w-full overflow-hidden" style="height: ${crownH}px">
              <div data-stagger="0" class="absolute inset-0"><div class="absolute inset-0"><img src="${d.art}" alt="" draggable="false" crossorigin="anonymous" class="absolute inset-0 h-full w-full object-cover brightness-95"></div></div>
              <div class="pointer-events-none absolute inset-x-0 bottom-0 h-[52%]" style="background: linear-gradient(to top, color-mix(in oklab, var(--color-canvas) 92%, transparent) 0%, color-mix(in oklab, var(--color-canvas) 40%, transparent) 50%, transparent 100%)"></div>
              ${d.chip ? `<span data-stagger="0" class="absolute start-3 top-3 rounded-md border border-edge-soft bg-canvas/85 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink backdrop-blur-sm">${d.chip}</span>` : ""}
              <div class="absolute inset-x-5 bottom-0 flex flex-col">
                <h3 data-stagger="0" class="-ms-px line-clamp-2 font-display text-[20px] font-semibold leading-[1.18] tracking-[-0.01em] text-ink ${d.resume ? "pb-[6px]" : "pb-[14px]"}">${d.title}</h3>
                ${d.resume ? `<div data-stagger="1" class="flex items-baseline pb-3 text-[13px] font-semibold leading-[1.3] tabular-nums">${d.resume.ep ? `<span class="text-ink">${d.resume.ep}</span><span class="text-ink-subtle"> · </span>` : ""}<span class="text-accent">${d.resume.status}</span></div>` : ""}
              </div>
              ${d.resume ? `<div data-stagger="1" class="absolute inset-x-0 bottom-0 h-[3px] bg-canvas/40"><div class="h-full bg-accent" style="width: ${d.resume.fraction * 100}%"></div></div>` : ""}
            </div>
            <div class="flex flex-col gap-3 px-5 pb-4 pt-4">
              <div data-stagger="1" class="truncate text-[12.5px] font-medium tabular-nums text-ink-muted"><span class="inline-flex items-center gap-1 align-middle">${IMDB}<span class="font-semibold text-ink">${d.rating}</span></span><span class="text-ink-subtle"> · </span><span>${d.year}</span><span class="text-ink-subtle"> · </span><span>${d.length}</span><span class="text-ink-subtle"> · </span><span>${d.genre}</span></div>
              <p data-stagger="2" class="line-clamp-3 text-[13.5px] leading-[1.5] text-ink-muted">${d.synopsis}</p>
              <div data-stagger="2" class="flex h-6 items-center justify-between">
                <span class="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-subtle transition-colors duration-150 group-hover:text-ink"><span class="transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-[2px]">${d.resume ? SVG(IC.play, 12) : SVG(IC.arrowUpRight, 12, "dir-icon")}</span>${d.resume ? (d.resume.ep ? "Resume " + d.resume.ep : "Resume") : "Details"}</span>
                ${d.resume ? '<button type="button" tabindex="-1" data-pv="details" class="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-subtle transition-colors duration-150 hover:text-ink">Details</button>'
                  : `<button type="button" tabindex="-1" title="Add to watchlist" aria-label="Add to watchlist" class="flex h-7 w-7 items-center justify-center rounded-md text-ink-subtle transition-colors duration-150 hover:bg-raised hover:text-ink">${SVG(IC.bookmarkOff, 14)}</button>`}
              </div>
            </div>`;
  const circle = (label, icon) => `<button type="button" tabindex="-1" aria-label="${label}" title="${label}" class="flex h-11 w-11 items-center justify-center rounded-full border transition-[transform,background-color,border-color,color] duration-150 hover:scale-105 active:scale-95 border-edge text-ink-muted hover:border-ink hover:text-ink">${icon}</button>`;
  const pvBodyMarquee = (d, crownH) => `
            <div class="relative w-full overflow-hidden" style="height: ${crownH}px">
              <div data-stagger="0" class="absolute inset-0"><div class="absolute inset-0"><img src="${d.art}" alt="" draggable="false" crossorigin="anonymous" class="absolute inset-0 h-full w-full object-cover brightness-95"></div></div>
              <div class="pointer-events-none absolute inset-0" style="background: linear-gradient(to top, color-mix(in oklab, var(--color-canvas) 80%, transparent) 0%, color-mix(in oklab, var(--color-canvas) 22%, transparent) 44%, transparent 70%)"></div>
              <div data-stagger="0" class="absolute inset-x-5 bottom-4 flex max-w-[72%] items-end"><h3 class="line-clamp-2 font-display text-[21px] font-semibold leading-[1.12] tracking-[-0.01em] text-ink drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]">${d.title}</h3></div>
            </div>
            <div class="flex flex-col gap-3.5 px-5 pb-5 pt-3.5">
              <div data-stagger="1" class="flex items-center gap-2.5">
                <button type="button" tabindex="-1" aria-label="Play" title="Play" class="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-canvas transition-transform duration-150 hover:scale-105 active:scale-95">${SVG(IC.play, 20, "translate-x-[1px]")}</button>
                ${circle("Add to watchlist", SVG(IC.plus, 18))}${circle("Mark watched", SVG(IC.thumb, 17))}
                <div class="ms-auto">${circle("More info", SVG(IC.chevron, 20))}</div>
              </div>
              <div data-stagger="2" class="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] font-medium text-ink-muted"><span class="rounded-[4px] border border-edge px-1.5 py-px text-[11px] font-semibold tracking-[0.03em] text-ink-muted">PG-13</span><span class="inline-flex items-center gap-1 text-ink">${SVG(IC.star, 11, "fill-amber-400 text-amber-400")}${d.rating}</span><span class="tabular-nums">${d.length}</span></div>
              <div data-stagger="2" class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-ink"><span>${d.genre}</span><span class="text-[7px] text-accent/70">●</span><span>${GENRES[(d.i + 2) % GENRES.length]}</span></div>
            </div>`;
  function pvOpen(anchor) {
    pvClose("hard", true);
    const card = anchor.closest("[data-open]");
    if (!card || root.hasAttribute("data-chrome-hidden")) return;
    const d = pvPayload(card), width = 368, crownH = Math.round(width * 9 / 16), marquee = pvStyle === "marquee";
    const layer = document.createElement("div");
    layer.className = "pointer-events-none fixed inset-0 z-[110] hz-u";
    layer.innerHTML = `
      <div class="absolute left-0 top-0 pointer-events-auto" style="width: ${width}px; transform: translate3d(0px, 0px, 0); visibility: hidden">
        <div role="presentation" aria-hidden="true" class="group relative cursor-pointer overflow-hidden ${marquee ? "rounded-md" : "rounded-xl"} bg-elevated shadow-[0_24px_60px_-20px_rgba(0,0,0,0.78)] ring-1 ring-edge-soft">
          <div>${marquee ? pvBodyMarquee(d, crownH) : pvBodyDefault(d, crownH)}</div>
        </div>
      </div>`;
    $("#root").appendChild(layer);
    const frame = layer.firstElementChild, panel = frame.firstElementChild;
    // use-preview-position.ts placePanel(), mode "over"
    const r = anchor.getBoundingClientRect(), h = Math.round(panel.firstElementChild.offsetHeight);
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2, edge = 64, gutter = 20;
    const left = Math.round(Math.max(edge, Math.min(cx - width / 2, innerWidth - width - edge)));
    const maxTop = innerHeight - h - gutter;
    const top = Math.round(maxTop < gutter ? Math.max(gutter, maxTop) : Math.max(gutter, Math.min(cy - h / 2, maxTop)));
    frame.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    frame.style.visibility = "visible";
    panel.style.height = h + "px";
    panel.style.transformOrigin = `${Math.round(cx - left)}px ${Math.round(cy - top)}px`;
    if (reduceMotion()) frame.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, easing: "linear", fill: "backwards" });
    else {
      panel.classList.add("animate-preview-in");
      panel.querySelectorAll("[data-stagger]").forEach((el) => el.animate(
        [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }],
        { duration: 240, delay: (+el.dataset.stagger || 0) * 45, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" }));
    }
    panel.addEventListener("pointerenter", () => { pvInside = true; clearTimeout(pvCloseTimer); });
    panel.addEventListener("pointerleave", () => { pvInside = false; pvCloseSoon(); });
    panel.addEventListener("click", () => { const i = d.i; pvClose("hard"); openDetail(i); });
    pv = { layer, frame, panel, anchor };
  }
  function pvClose(mode, instant) {
    clearTimeout(pvCloseTimer);
    if (!pv) return;
    const { layer, frame, panel } = pv;
    pv = null; pvInside = false;
    frame.classList.replace("pointer-events-auto", "pointer-events-none");
    if (instant) { layer.remove(); return; }
    setTimeout(() => layer.remove(), 400); // backstop: a hidden pane can stall the animation clock, so onfinish never fires
    if (reduceMotion() || mode === "hard") { frame.animate([{ opacity: 1 }, { opacity: 0 }], { duration: mode === "hard" ? 90 : 120, fill: "forwards" }).onfinish = () => layer.remove(); return; }
    panel.animate([{ transform: "scale(1)" }, { transform: "scale(0.975)" }], { duration: 140, easing: "cubic-bezier(0.55, 0, 1, 0.45)", fill: "forwards" });
    frame.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: "cubic-bezier(0.55, 0, 1, 0.45)", fill: "forwards" }).onfinish = () => layer.remove();
  }
  function pvCloseSoon() { clearTimeout(pvCloseTimer); pvCloseTimer = setTimeout(() => { if (!pvInside) pvClose("soft"); }, 100); }
  // hoverPreviewEnter / Leave on [data-preview-anchor]; hoverPreviewFocus for keyboard focus (focus-visible only)
  document.addEventListener("pointerover", (e) => {
    const a = e.target.closest("[data-preview-anchor]");
    if (!a || (e.relatedTarget && a.contains(e.relatedTarget)) || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    clearTimeout(pvTimer); clearTimeout(pvCloseTimer);
    if (pv && pv.anchor === a) return;
    pvTimer = setTimeout(() => pvOpen(a), 450);
  });
  document.addEventListener("pointerout", (e) => {
    const a = e.target.closest("[data-preview-anchor]");
    if (!a || (e.relatedTarget && a.contains(e.relatedTarget))) return;
    clearTimeout(pvTimer);
    if (pv) pvCloseSoon();
  });
  document.addEventListener("focusin", (e) => {
    const card = e.target.closest && e.target.closest("button[data-open]");
    const a = card && card.querySelector("[data-preview-anchor]");
    if (!a || !card.matches(":focus-visible")) return;
    clearTimeout(pvTimer); pvTimer = setTimeout(() => pvOpen(a), 450);
  });
  document.addEventListener("focusout", (e) => { if (e.target.closest && e.target.closest("button[data-open]")) { clearTimeout(pvTimer); if (pv) pvClose("soft"); } });
  addEventListener("scroll", () => { clearTimeout(pvTimer); if (pv) pvClose("hard"); }, { capture: true, passive: true });

  /* ---------- screensaver (components/screensaver/{screensaver-root,ambient-overlay}.tsx, 0.9.113) ----------
     Fixed at z-[200], black, slides crossfade every 13 s (1.6 s fade, slow 16 s zoom), clock updates every 15 s.
     After 6 minutes it goes "deep": slides removed, a dark radial gradient, clock only. Any pointer down dismisses. */
  const SAVER = [0, 2, 4, 9, 6].map((n, k) => ({ bg: img("fx-hero-" + n, 1600, 900), title: TITLES[n], sub: k < 3 ? `#${k + 1} in Movies today` : "" }));
  let saver = null;
  function saverClock() {
    if (!saver) return;
    const now = new Date();
    saver.el.querySelector("[data-hz-time]").textContent = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    saver.el.querySelector("[data-hz-date]").textContent = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  }
  function saverSlide(item) {
    const reduce = reduceMotion();
    const im = document.createElement("img");
    im.src = item.bg; im.alt = ""; im.draggable = false; im.decoding = "async"; im.crossOrigin = "anonymous";
    im.className = "absolute inset-0 h-full w-full object-cover";
    Object.assign(im.style, { opacity: "0", transform: reduce ? "" : "scale(1.03)", transformOrigin: "50% 42%", transition: reduce ? "opacity 1600ms ease-out" : "opacity 1600ms ease-out, transform 16000ms linear" });
    const imgs = saver.el.querySelectorAll(":scope > img");
    imgs.forEach((o) => { o.style.opacity = "0"; setTimeout(() => o.remove(), 2100); });
    saver.el.insertBefore(im, imgs.length ? imgs[imgs.length - 1].nextSibling : saver.el.firstChild);
    requestAnimationFrame(() => requestAnimationFrame(() => { im.style.opacity = "1"; if (!reduce) im.style.transform = "scale(1.1)"; }));
    const info = saver.el.querySelector("[data-hz-info]");
    if (info) info.innerHTML = `${item.sub ? `<span class="text-[13px] font-semibold uppercase tracking-[0.2em] text-white/65 drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]">${item.sub}</span>` : ""}<span class="mt-1 truncate text-[30px] font-semibold tracking-tight text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.75)]">${item.title}</span>`;
  }
  function saverShow(deep) {
    if (saver) saverHide(true);
    const el = document.createElement("div");
    el.setAttribute("role", "presentation"); el.setAttribute("aria-hidden", "true");
    el.className = "fixed inset-0 z-[200] cursor-none select-none bg-black hz-u";
    el.style.cssText = "opacity: 0; transition: opacity 900ms ease-out; will-change: opacity";
    const shade = deep
      ? '<div class="pointer-events-none absolute inset-0" style="background: radial-gradient(125% 90% at 50% 26%, oklch(0.22 0.03 262 / 0.6), oklch(0.06 0.01 260) 72%)"></div>'
      : '<div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/45"></div><div class="pointer-events-none absolute inset-x-0 bottom-0 h-1/2" style="background: linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.5) 26%, rgba(0,0,0,0.22) 52%, rgba(0,0,0,0) 78%)"></div>';
    el.innerHTML = `${shade}
      <div class="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-10"><div class="flex items-center gap-2">${SVG(IC.mark, 28, "h-7 w-7 shrink-0 text-white/85 drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]")}<span class="font-display text-[26px] font-semibold tracking-tight text-white/85 drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]">Harbor</span></div></div>
      <div class="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-8 p-12">
        <div class="flex flex-col"><span data-hz-date class="text-[15px] font-medium uppercase tracking-[0.22em] text-white/60 drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]"></span><span data-hz-time class="mt-1 text-[92px] font-light leading-none tabular-nums text-white drop-shadow-[0_6px_28px_rgba(0,0,0,0.75)]"></span></div>
        ${deep ? "" : '<div data-hz-info class="mb-2 flex max-w-[46%] flex-col items-end text-end"></div>'}
      </div>`;
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); saverHide(); });
    $("#root").appendChild(el);
    saver = { el, idx: 0, timers: [] };
    saverClock();
    saver.timers.push(setInterval(saverClock, 15000));
    if (!deep) {
      saverSlide(SAVER[0]);
      saver.timers.push(setInterval(() => saverNext(), 13000));
    }
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = "1"; }));
    status(deep ? "Screensaver, deep idle (clock only). Click anywhere to dismiss." : "Screensaver: slides change every 13 s (__hzSaver.next() to skip). Click anywhere to dismiss.");
  }
  function saverNext() { if (!saver || !saver.el.querySelector("[data-hz-info]")) return; saver.idx = (saver.idx + 1) % SAVER.length; saverSlide(SAVER[saver.idx]); }
  function saverHide(instant) {
    if (!saver) return;
    const { el, timers } = saver;
    saver = null;
    timers.forEach(clearInterval);
    if (instant) { el.remove(); return; }
    el.style.transition = "opacity 420ms ease-out"; el.style.opacity = "0";
    setTimeout(() => el.remove(), 460);
  }
  window.__hzSaver = { show: () => saverShow(false), deep: () => saverShow(true), next: saverNext, hide: () => saverHide() };

  /* ---------- episodes with spoiler hiding (views/detail/series-episode-row.tsx, lib/spoilers.ts, detail/badges.tsx) ---------- */
  const SPOILER_THUMB = "blur-[14px] scale-[1.04] transition-[filter,transform] duration-200 group-hover:blur-[0px] group-hover:scale-100";
  const SPOILER_TEXT = "blur-[5px] select-none transition-[filter] duration-200 group-hover:blur-[0px]";
  let spoilers = true;
  const EPS = [
    { n: 1, name: "The Long Ebb", watched: true, ratio: 1, rating: "8.4" },
    { n: 2, name: "What the Sand Kept", ratio: 0.42, rating: "8.1", newEp: false },
    { n: 3, name: "Harbor Lights", ratio: 0, rating: "8.7", newEp: true },
    { n: 4, name: "Low Water Mark", ratio: 0, upcoming: true },
  ];
  function renderEpisodes() {
    $("#hz-eps").innerHTML = `<h2 class="font-display hz-eps-title">Season 1</h2>` + EPS.map((ep) => {
      const hide = spoilers && !ep.watched && !ep.upcoming;
      return `
      <div data-ep="${ep.n}" data-no-card-ring class="group flex gap-6 rounded-2xl px-4 py-5 transition-colors hover:bg-elevated/30">
        <button class="flex min-w-0 flex-1 gap-6 text-start">
          <div class="relative w-[200px] shrink-0 overflow-hidden rounded-lg">
            <div${hide ? ` class="${SPOILER_THUMB}"` : ""}><div class="harbor-poster your-card relative w-full overflow-hidden rounded-[var(--poster-radius,12px)]"><div aria-hidden="true" style="padding-top: 56.25%"></div><img class="absolute inset-0 h-full w-full object-cover" src="${img("fx-ep" + ep.n, 400, 225)}" alt="" crossorigin="anonymous" loading="lazy"></div></div>
            <div class="absolute inset-0 flex items-center justify-center bg-canvas/40 opacity-0 transition-opacity group-hover:opacity-100"><div class="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-canvas">${SVG(IC.play, 18)}</div></div>
            <span class="absolute start-2 top-2 rounded-md bg-canvas/95 px-1.5 py-0.5 text-[11px] font-semibold text-ink">${ep.n}</span>
            ${ep.watched ? `<span class="absolute end-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/22 text-emerald-200 ring-1 ring-emerald-400/40 backdrop-blur-sm">${SVG(IC.check, 12, "", ' stroke-width="3"')}</span>` : ""}
            ${ep.rating ? `<div class="pointer-events-none absolute bottom-2 start-2 z-[5] flex items-center gap-1.5 rounded-md bg-black/55 px-1.5 py-0.5 drop-shadow-md backdrop-blur-sm"><span class="flex items-center gap-1 text-[11px] font-semibold text-white">${IMDB}${ep.rating}</span></div>` : ""}
            ${ep.ratio > 0.01 ? `<div class="absolute inset-x-0 bottom-0 h-[3px] bg-black/55"><div class="h-full bg-accent" style="width: ${Math.max(2, ep.ratio * 100)}%"></div></div>` : ""}
          </div>
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <h4 class="flex items-center gap-2 truncate text-[16px] font-semibold text-ink"><span class="truncate${hide ? " " + SPOILER_TEXT : ""}">${ep.name}</span>${ep.upcoming
              ? '<span class="inline-flex shrink-0 items-center rounded-[5px] border border-edge-soft bg-elevated/40 px-1.5 py-[1px] text-[9px] font-medium uppercase tracking-[0.14em] text-ink-subtle">Upcoming</span>'
              : ep.newEp ? '<span class="relative inline-flex shrink-0 items-center overflow-hidden rounded-[5px] border border-accent/30 bg-accent/12 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-[0.14em] text-accent"><span class="relative z-10">New</span><span class="animate-shimmer pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-accent/22 to-transparent"></span></span>' : ""}</h4>
            <p class="flex flex-wrap items-center gap-x-2 text-[12px] text-ink-subtle"><span>S1 E${ep.n}  ·  ${44 + ep.n} min  ·  Mar ${ep.n * 7}, 2025</span>${ep.watched ? '<span class="text-emerald-300/85">· Watched 3 days ago</span>' : ep.ratio > 0.01 ? `<span class="text-accent/85">· ${Math.round(ep.ratio * 100)}% watched · yesterday</span>` : ""}</p>
            <p class="line-clamp-2 text-[13.5px] leading-relaxed text-ink-muted${hide ? " " + SPOILER_TEXT : ""}">The tide comes back wrong and the lighthouse keeper finds a second set of footprints that end at the water.</p>
          </div>
        </button>
        <button aria-label="Episode details" class="flex h-10 w-10 shrink-0 self-center items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-elevated hover:text-ink">${SVG(IC.chevron, 18)}</button>
      </div>`;
    }).join("");
  }
  renderEpisodes();

  /* ---------- back to top (components/back-to-top.tsx: detail, discover, grid pages; shows past 600px) ---------- */
  const btt = $("#hz-btt");
  function syncBtt() {
    const m = document.querySelector(".contents > main");
    const show = !!m && (view === "meta" || view === "movies") && m.scrollTop > 600 && !playerOn;
    btt.classList.toggle("translate-y-0", show); btt.classList.toggle("opacity-100", show);
    btt.classList.toggle("pointer-events-none", !show); btt.classList.toggle("translate-y-2", !show); btt.classList.toggle("opacity-0", !show);
  }
  document.querySelectorAll("main").forEach((m) => m.addEventListener("scroll", syncBtt, { passive: true }));
  btt.addEventListener("click", () => { const m = document.querySelector(".contents > main"); if (m) m.scrollTo({ top: 0, behavior: reduceMotion() ? "auto" : "smooth" }); });

  /* ---------- keyboard and gamepad focus (lib/keyboard-navigation.ts, 0.9.113) ----------
     Harbor's arrow-key navigation (gamepads feed the same keys through dispatchTvNav) marks the focused element
     with data-tv-focused="true", sets html[data-input-modality="keys"] and injects this exact style tag. Pointer
     movement switches back to "pointer" and clears the mark. The bench uses a simple nearest-in-direction pick. */
  function ensureTvStyles() {
    if (document.querySelector("style[data-tv-focus-styles]")) return;
    const s = document.createElement("style");
    s.setAttribute("data-tv-focus-styles", "true");
    s.textContent = `
    html:not([data-input-modality="pointer"]) [data-tv-focused="true"] {
      outline: none !important;
      box-shadow: 0 0 0 2px var(--color-canvas), 0 0 0 5px var(--tv-focus-ring, var(--color-accent)), 0 0 0 7px rgba(0,0,0,0.45) !important;
      transition: box-shadow 120ms ease;
      z-index: 20;
      position: relative;
    }`;
    document.head.appendChild(s);
  }
  let tvEl = null, lastPt = null;
  const visible = (n) => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && !n.closest(".hidden, [hidden], .hz-bench, [aria-hidden='true']"); };
  function tvFocus(n) {
    ensureTvStyles();
    if (tvEl && tvEl !== n) tvEl.removeAttribute("data-tv-focused");
    n.setAttribute("data-tv-focused", "true"); tvEl = n;
    n.focus({ preventScroll: true });
    n.scrollIntoView({ block: "center", inline: "center", behavior: reduceMotion() ? "auto" : "smooth" });
  }
  window.addEventListener("keydown", (e) => {
    const dir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
    const t = e.target;
    if (!dir || (t && t.nodeType === 1 && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) || saver) return;
    root.setAttribute("data-input-modality", "keys");
    const all = [...document.querySelectorAll("main button, [data-harbor-sidebar] button")].filter(visible);
    const cur = tvEl && tvEl.isConnected && visible(tvEl) ? tvEl : null;
    e.preventDefault();
    if (!cur) { const first = all.find((n) => n.closest("main")); if (first) tvFocus(first); return; }
    const c = cur.getBoundingClientRect(), cx = c.left + c.width / 2, cy = c.top + c.height / 2;
    let best = null, score = Infinity;
    for (const n of all) {
      if (n === cur || cur.contains(n) || n.contains(cur)) continue;
      const r = n.getBoundingClientRect(), dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
      const along = dx * dir[0] + dy * dir[1], across = Math.abs(dx * dir[1] + dy * dir[0]);
      if (along <= 4) continue;
      const s = along + across * 2.5;
      if (s < score) { score = s; best = n; }
    }
    if (best) tvFocus(best);
  });
  window.addEventListener("pointermove", (e) => {
    const moved = lastPt && (e.clientX !== lastPt[0] || e.clientY !== lastPt[1]);
    lastPt = [e.clientX, e.clientY];
    if (!moved || root.getAttribute("data-input-modality") === "pointer") return;
    root.setAttribute("data-input-modality", "pointer");
    if (tvEl) { tvEl.removeAttribute("data-tv-focused"); tvEl = null; }
  }, { passive: true });

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
    if (typeof syncSidebar === "function") syncSidebar();
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
  function openDetail(i) {
    $("#hz-detail-img").src = img("fx-p" + i + "-bd", 1600, 900);
    $("#hz-detail-title").textContent = TITLES[i % TITLES.length];
    showView("meta");
  }
  document.addEventListener("click", (e) => {
    const o = e.target.closest("[data-open]");
    if (o) openDetail(+o.dataset.open);
  });

  // search hotkey (components/search/search-hotkey.tsx, default "/")
  window.addEventListener("keydown", (e) => {
    const t = e.target;
    const typing = t && t.nodeType === 1 && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    if (e.key === "/" && !typing) { e.preventDefault(); $("#hz-search").hidden = false; $("#hz-search input").focus(); }
    if (e.key === "Escape") { $("#hz-search").hidden = true; $("#hz-modal").hidden = true; if (playerOn) { playerOn = false; syncChromeHidden(); } }
  });
  $("#hz-search").addEventListener("click", (e) => { if (e.target.classList.contains("harbor-search-backdrop")) e.currentTarget.hidden = true; });

  /* ---------- load the theme like CustomCodeMount ---------- */
  // ?build=.baseline/fathom.json loads another build (same origin only) for before/after comparisons.
  // ?theme=projector loads ../dist/projector.json (default fathom).
  const BUILD = (() => {
    const q = new URLSearchParams(location.search), b = q.get("build"), t = q.get("theme");
    if (b && /^[\w./-]+\.json$/.test(b) && !b.includes("..")) return b;
    return `../dist/${t && /^[a-z0-9-]+$/.test(t) ? t : "fathom"}.json`;
  })();
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
    status(`Loaded ${theme.name}. ${document.querySelectorAll("[data-fx],[data-pj]").length ? "Running." : ""}`);
  }
  function unmountTheme() {
    runCleanup();
    const style = document.getElementById("harbor-theme-css");
    if (style) style.textContent = "";
    $("#harbor-custom-overlay").innerHTML = "";
  }
  /* ---------- Harbor's built-in sidebar (chrome/sidebar.tsx, 1.0.3-beta) for themes with layout "sidebar" ----------
     Same structure, data attributes and class names the theme can target. Harbor unmounts it on Settings, while
     the player or play picker is up and for immersive Live TV, so the bench removes and re-adds it the same way. */
  const ICON = (d) => `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="opacity-70">${d}</svg>`;
  const NAV = {
    primary: [["home", "Home", '<path d="M4 11 12 4l8 7v9H4z"/>'], ["discover", "Discover", '<circle cx="12" cy="12" r="8"/><path d="m15 9-2 4-4 2 2-4z"/>'], ["movies", "Movies", '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 5v14M16 5v14"/>'], ["shows", "Shows", '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="m9 3 3 3 3-3"/>'], ["anime", "Anime", '<path d="M12 4l2.5 5 5.5.8-4 3.9.9 5.5L12 16.6 7.1 19.2l.9-5.5-4-3.9 5.5-.8z"/>'], ["live", "Live TV", '<rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="12" cy="13" r="2"/>']],
    collections: [["calendar", "Calendar", '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'], ["library", "Library", '<path d="M5 4v16M10 4v16M15 5l4 15"/>'], ["downloads", "Downloads", '<path d="M12 4v11m-4-4 4 4 4-4M5 20h14"/>'], ["addons", "Add-ons", '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/><path d="M16.5 4v6M13.5 7h6"/>'], ["settings", "Settings", '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>']],
  };
  const navButton = ([v, label, d]) => `
          <button data-harbor-nav="${v}" aria-label="${label}" title="${label}" class="relative flex items-center justify-center gap-4 transition-colors duration-150 h-14 rounded-xl text-[16px] lg:justify-start lg:px-4 text-ink-muted hover:bg-elevated/50 hover:text-ink hz-nav"><span data-harbor-sidebar-icon class="relative">${ICON(d)}</span><span data-harbor-sidebar-label class="lg:inline hz-lbl">${label}</span></button>`;
  let sidebar = null;
  let collapsed = (() => { try { return localStorage.getItem("bench.sidebarCollapsed") === "true"; } catch (_) { return false; } })();
  const markActive = () => sidebar.querySelectorAll("[data-harbor-nav]").forEach((n) => n.toggleAttribute("data-active", n.dataset.harborNav === (view === "meta" ? "meta" : view)));
  function buildSidebar() {
    const tpl = document.createElement("template");
    tpl.innerHTML = `
      <aside data-harbor-sidebar data-collapsed="${collapsed}" class="relative z-[60] flex w-[72px] shrink-0 flex-col border-e border-edge-soft bg-canvas${collapsed ? "" : " lg:w-60"} hz-side">
        <div data-tauri-drag-region data-harbor-sidebar-brand class="flex h-20 shrink-0 items-center justify-center gap-0.5 px-3 text-ink hz-side-logo"><span data-harbor-sidebar-mark class="inline-flex"><svg class="h-9 w-9 shrink-0 lg:h-10 lg:w-10" viewBox="0 0 40 40" aria-hidden="true"><path d="M6 26c5-2 9-2 14 0s9 2 14 0M10 20V8h4v12M26 20V8h4v12M14 12h12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></span><span class="hz-lbl hz-wordmark">Harbor</span></div>
        <div class="relative flex min-h-0 flex-1 flex-col">
          <div class="flex flex-1 flex-col overflow-y-auto px-4 pt-3 pb-6 [scrollbar-width:none] [&amp;::-webkit-scrollbar]:hidden hz-side-scroll">
            <div class="flex flex-col gap-1.5">${NAV.primary.map(navButton).join("")}
            </div>
            <div data-tauri-drag-region aria-hidden="true" class="h-5 shrink-0"></div>
            <div class="flex flex-col gap-1.5">${NAV.collections.map(navButton).join("")}
            </div>
            <div data-tauri-drag-region class="flex-1 min-h-2"></div>
          </div>
        </div>
        <div data-harbor-sidebar-footer class="relative p-2${collapsed ? "" : " lg:p-4"} hz-side-foot">
          <div aria-hidden="true" class="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-edge-soft/55 to-transparent hz-side-rule"></div>
          <div class="mb-1 px-1"></div>
          <div class="flex flex-col gap-1 pb-1"><button type="button" data-harbor-sidebar-toggle aria-label="Collapse sidebar" class="flex h-9 items-center justify-center gap-2.5 rounded-lg text-ink-subtle hz-collapse"><span data-harbor-sidebar-icon class="inline-flex shrink-0"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg></span><span data-harbor-sidebar-label class="hz-lbl">Collapse</span></button></div>
          <div class="flex w-full items-center gap-3 rounded-xl py-2.5 hz-profile"><div class="h-12 w-12 shrink-0 rounded-full bg-elevated hz-avatar"></div><div class="hz-lbl"><div class="text-[13.5px] font-medium">Josh</div><div class="text-[12px] text-ink-subtle">Online</div></div></div>
        </div>
      </aside>`;
    const aside = tpl.content.firstElementChild;
    aside.addEventListener("click", (e) => {
      // Harbor 1.0.3: the collapse button flips the sidebarCollapsed setting and React re-renders the aside.
      if (e.target.closest("[data-harbor-sidebar-toggle]")) {
        collapsed = !collapsed;
        try { localStorage.setItem("bench.sidebarCollapsed", String(collapsed)); } catch (_) {}
        const was = sidebar; sidebar = buildSidebar();
        if (was.isConnected) { was.replaceWith(sidebar); markActive(); }
        return;
      }
      const b = e.target.closest("[data-harbor-nav]"); if (b) window.harbor.navigate(b.dataset.harborNav);
    });
    return aside;
  }
  function syncSidebar() {
    if (!theme || theme.layout !== "sidebar") { if (sidebar) sidebar.remove(); return; }
    root.dataset.themeLayout = "sidebar";
    if (!sidebar) sidebar = buildSidebar();
    const show = !playerOn && view !== "settings";
    if (show && !sidebar.isConnected) {
      $(".hz-shell").insertBefore(sidebar, $(".hz-shell").firstChild);
      markActive();
    }
    if (!show && sidebar.isConnected) sidebar.remove();
  }

  async function load() {
    const r = await fetch(BUILD + "?" + Date.now());
    theme = await r.json();
    syncSidebar();
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
    else if (a === "unload") { unmountTheme(); const left = [...root.attributes].filter((x) => /^data-(fx|pj)/.test(x.name)).length + document.querySelectorAll("#fathom-wall,#fathom-chrome,#fathom-panel,#fathom-light,#fathom-vars,[id^='projector']").length + (window.__projector ? 1 : 0); status(left ? `Unload left ${left} leftovers` : "Unloaded cleanly: nothing left behind."); }
    else if (a === "saver") saverShow(false);
    else if (a === "saver-deep") saverShow(true);
    else if (a === "spoilers") { spoilers = !spoilers; renderEpisodes(); status("Spoiler hiding " + (spoilers ? "on" : "off") + " (Detail page, Season 1)."); }
    else if (a === "preview-style") { pvStyle = pvStyle === "marquee" ? "default" : "marquee"; status("Hover preview style: " + pvStyle); }
    else if (a === "forget") { Object.keys(localStorage).filter((k) => /^(fathom|projector)\./.test(k)).forEach((k) => localStorage.removeItem(k)); status("Saved settings cleared. Reload theme to start fresh."); }
  });
  $("#hz-modal").addEventListener("click", (e) => { if (e.target.closest("[data-hz='close-modal']") || e.target.id === "hz-modal") $("#hz-modal").hidden = true; });

  load().catch((err) => status(`Could not load ${BUILD}. Run npm run build first. ` + err.message));
})();
