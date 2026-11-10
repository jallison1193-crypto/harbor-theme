  /* ===== js/25-icons.js: Projector icons for Harbor's sidebar =====
     Harbor still draws every nav button (chrome/nav-items.tsx, 0.9.113: a fixed list of views, no user-made entries).
     Projector only paints a different picture on each one: Harbor's svg is made invisible (it keeps its size, so the
     layout doesn't move) and a CSS mask in the same box draws the new line icon in the button's own color. Badges
     (downloads count, calendar reminders, the parental lock) are separate elements and stay on top. The style sheet
     is built once here, so the icons live in one readable list; html[data-pj-icons] switches them, set from the
     panel's "Projector icons". Drawn on a 24px grid, 1.6px round strokes, film and theater shapes. */
  {
    const S = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
    const P = (d) => `<path d="${d}"/>`, O = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
    const R = (x, y, w, h, rx) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/>`;
    const ICONS = {
      // A theater front: roof, a marquee board with bulbs, the doors.
      home: P("M3.5 9.5 12 4l8.5 5.5") + R(5, 9.5, 14, 3.5, 0.6) + P("M6 13v7.5h12V13M10.5 20.5V17h3v3.5") + P("M8 11.25h.01M10.67 11.25h.01M13.33 11.25h.01M16 11.25h.01"),
      // A spotlight throwing a cone onto the floor.
      discover: P("M4.2 6.6 7.1 3.7l3.4 3.4-2.9 2.9z") + P("M7.9 9.8 11.6 20.3M10.3 7.4l10 4.4") + P("M11.6 20.3c4.6.2 8.4-3.6 8.7-8.5") + P("M5.2 9 3.6 11.4"),
      // A film reel with a tail of film.
      catalogs: O(12, 11, 8) + O(12, 11, 1.3) + O(12, 6.6, 1.5) + O(16.2, 9.6, 1.5) + O(14.6, 14.6, 1.5) + O(9.4, 14.6, 1.5) + O(7.8, 9.6, 1.5) + P("M14 19h6.5"),
      // A film frame with sprocket holes.
      movies: R(3.5, 4.5, 17, 15, 1.6) + P("M7.5 4.5v15M16.5 4.5v15") + P("M5.5 8h.01M5.5 12h.01M5.5 16h.01M18.5 8h.01M18.5 12h.01M18.5 16h.01"),
      // An old television with an antenna.
      shows: R(3, 8, 18, 12.5, 2.5) + P("M8 3.5 12 8l4-4.5") + R(5.5, 10.5, 10, 7.5, 1.4) + P("M18.3 12.2h.01M18.3 15.2h.01"),
      // A striped popcorn box.
      kids: P("M6 10.5 7.6 20.5h8.8L18 10.5z") + P("M10 10.5l.5 10M14 10.5l-.5 10") + P("M6 10.5a2.3 2.3 0 0 1 1.6-4 2.6 2.6 0 0 1 4.4-1.8 2.6 2.6 0 0 1 4.4 1.8 2.3 2.3 0 0 1 1.6 4"),
      // A four-point sparkle and a small one.
      anime: P("M10.5 3.5c.7 4.3 2.2 5.8 6.5 6.5-4.3.7-5.8 2.2-6.5 6.5-.7-4.3-2.2-5.8-6.5-6.5 4.3-.7 5.8-2.2 6.5-6.5z") + P("M18 15v5M15.5 17.5h5"),
      // An open book with panels.
      manga: P("M3 5.5c3-.8 6-.5 9 1.5 3-2 6-2.3 9-1.5V19c-3-.8-6-.5-9 1.5-3-2-6-2.3-9-1.5z") + P("M12 7v13.5") + P("M5.8 9.5h3.4M14.8 9.5h3.4M5.8 13h3.4M14.8 13h3.4"),
      // An on-air lamp sending out waves.
      live: O(12, 12, 1.9) + P("M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.3 5.3a9.5 9.5 0 0 0 0 13.4M18.7 5.3a9.5 9.5 0 0 1 0 13.4"),
      // Two admit-one tickets.
      vod: P("M5.5 8.8V6h13v2.8") + P("M3.5 9h17v3a1.6 1.6 0 0 0 0 3.2v3.3h-17v-3.3a1.6 1.6 0 0 0 0-3.2z") + P("M15 10.6v.9M15 13.3v.9M15 16v.9"),
      // A calendar page with a showtime clock.
      calendar: R(3.5, 5, 17, 15.5, 2) + P("M8 3v4M16 3v4M3.5 9.5h17") + O(12, 15, 3) + P("M12 13.6v1.5l1 .8"),
      // A stack of film cans.
      library: R(4.5, 16, 15, 4.5, 1.2) + R(5.5, 11, 13, 4, 1.2) + R(6.5, 6, 11, 4, 1.2) + P("M12 18.25h.01M12 13h.01M12 8h.01"),
      // An arrow down into a strip of film.
      downloads: P("M12 3.5v9.5M8.5 9.5 12 13l3.5-3.5") + R(3.5, 16, 17, 4.5, 1) + P("M6.5 18.25h1.5M11.25 18.25h1.5M16 18.25h1.5"),
      // A film cartridge: something you plug in.
      addons: R(4, 7, 16, 11, 2) + P("M9 7V4.5h6V7") + O(9, 12.5, 1.8) + O(15, 12.5, 1.8) + P("M10.8 12.5h2.4"),
      // A projector's dial with ticks.
      settings: O(12, 12, 5.5) + P("M12 12l2.6-2.6") + P("M12 2.75v2M12 19.25v2M2.75 12h2M19.25 12h2M5.46 5.46l1.41 1.41M17.13 17.13l1.41 1.41M5.46 18.54l1.41-1.41M17.13 6.87l1.41-1.41"),
    };
    const url = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    const on = 'html[data-pj-icons="on"] aside[data-harbor-sidebar]';
    const views = Object.keys(ICONS);
    const all = views.map((v) => `[data-harbor-nav="${v}"]`).join(", ");
    let css =
      `${on} :is(${all}) > span:first-child { isolation: isolate; }\n` +
      `${on} :is(${all}) > span:first-child svg:not(.lucide-lock) { opacity: 0 !important; }\n` +
      `${on} :is(${all}) > span:first-child::before { content: ""; position: absolute; inset: 0; margin: auto; width: 24px; height: 24px; ` +
      `background: currentColor; -webkit-mask: var(--pj-icon) center / contain no-repeat; mask: var(--pj-icon) center / contain no-repeat; pointer-events: none; ` +
      `opacity: .82; transition: opacity .15s ease; }\n` +
      `${on} :is(${all}):hover > span:first-child::before { opacity: 1; }\n` +
      // The page you're on: the icon lights up in the accent with a soft lamp glow behind it.
      `${on} :is(${all})[data-active] > span:first-child::before { background: var(--color-accent); opacity: 1; }\n` +
      `${on} :is(${all})[data-active] > span:first-child::after { content: ""; position: absolute; inset: -9px; z-index: -1; border-radius: 50%; pointer-events: none; ` +
      `background: radial-gradient(closest-side, color-mix(in srgb, var(--color-accent) 26%, transparent), transparent); }\n`;
    for (const v of views) css += `${on} [data-harbor-nav="${v}"] > span:first-child { --pj-icon: ${url(S(ICONS[v]))}; }\n`;
    const iconStyle = el("style", { id: "projector-icons" });
    iconStyle.textContent = css;
    doc.head.append(iconStyle);
    hooks.apply.push(() => setAttr("pj-icons", state.icons ? "on" : "off"));
    hooks.dispose.push(() => iconStyle.remove());
  }
