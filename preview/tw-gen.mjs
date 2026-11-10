// Bench helper: generates the Tailwind-like utilities the Harbor-faithful bench markup needs, scoped to .hz-u,
// into the block between the markers in harness.css. Run: node preview/tw-gen.mjs (after changing bench markup).
import { readFileSync, writeFileSync } from "node:fs";
const here = new URL(".", import.meta.url);
const src = ["harness.js", "index.html"].map((f) => readFileSync(new URL(f, here), "utf8")).join("\n");
const tokens = [...new Set(src.split(/[\s"'`<>{}]+|\$\{/).filter((t) => /^[a-z!\-\[]/.test(t) && t.length < 120))].sort();

const COLORS = { canvas: "var(--color-canvas)", surface: "var(--color-surface)", elevated: "var(--color-elevated)", raised: "var(--color-raised, var(--color-elevated))",
  ink: "var(--color-ink)", "ink-muted": "var(--color-ink-muted)", "ink-subtle": "var(--color-ink-subtle)", accent: "var(--color-accent)",
  edge: "var(--color-edge)", "edge-soft": "var(--color-edge-soft)", black: "#000", white: "#fff", transparent: "transparent", current: "currentColor",
  "emerald-200": "#a7f3d0", "emerald-300": "#6ee7b7", "emerald-400": "#34d399", "emerald-500": "#10b981", "amber-400": "#fbbf24" };
const color = (v) => { const [c, a] = v.split("/"); const base = COLORS[c]; if (!base) return null; return a ? `color-mix(in srgb, ${base} ${a}%, transparent)` : base; };
const arb = (v) => v.slice(1, -1).replace(/_/g, " ");
const size = (v, neg) => {
  let r = null;
  if (/^\[.*\]$/.test(v)) r = arb(v);
  else if (v === "px") r = "1px";
  else if (v === "full") r = "100%";
  else if (v === "auto") r = "auto";
  else if (/^\d+\/\d+$/.test(v)) { const [a, b] = v.split("/"); r = +(a / b * 100).toFixed(4) + "%"; }
  else if (/^\d+(\.\d+)?$/.test(v)) r = v === "0" ? "0px" : +v * 0.25 + "rem";
  return r && neg ? `calc(${r} * -1)` : r;
};
const SP = { p: ["padding"], px: ["padding-inline"], py: ["padding-block"], pt: ["padding-top"], pb: ["padding-bottom"], ps: ["padding-inline-start"], pe: ["padding-inline-end"],
  m: ["margin"], mx: ["margin-inline"], my: ["margin-block"], mt: ["margin-top"], mb: ["margin-bottom"], ms: ["margin-inline-start"], me: ["margin-inline-end"],
  gap: ["gap"], "gap-x": ["column-gap"], "gap-y": ["row-gap"], inset: ["inset"], "inset-x": ["left", "right"], "inset-y": ["top", "bottom"],
  top: ["top"], bottom: ["bottom"], left: ["left"], right: ["right"], start: ["inset-inline-start"], end: ["inset-inline-end"],
  w: ["width"], h: ["height"], "min-h": ["min-height"], "min-w": ["min-width"], "max-w": ["max-width"] };
const FIXED = {
  absolute: "position:absolute", relative: "position:relative", fixed: "position:fixed", flex: "display:flex", "inline-flex": "display:inline-flex", grid: "display:grid", block: "display:block",
  "flex-col": "flex-direction:column", "flex-wrap": "flex-wrap:wrap", "flex-1": "flex:1 1 0%", "shrink-0": "flex-shrink:0", "grid-flow-col": "grid-auto-flow:column",
  "items-center": "align-items:center", "items-end": "align-items:flex-end", "items-start": "align-items:flex-start", "items-baseline": "align-items:baseline",
  "justify-between": "justify-content:space-between", "justify-center": "justify-content:center", "self-center": "align-self:center",
  "overflow-hidden": "overflow:hidden", "overflow-y-auto": "overflow-y:auto", "pointer-events-none": "pointer-events:none", "pointer-events-auto": "pointer-events:auto",
  "cursor-pointer": "cursor:pointer", "cursor-default": "cursor:default", "cursor-none": "cursor:none", "select-none": "user-select:none",
  truncate: "overflow:hidden;text-overflow:ellipsis;white-space:nowrap", uppercase: "text-transform:uppercase", "tabular-nums": "font-variant-numeric:tabular-nums",
  "whitespace-nowrap": "white-space:nowrap", "align-middle": "vertical-align:middle", "text-start": "text-align:start", "text-end": "text-align:end", "text-center": "text-align:center",
  "font-light": "font-weight:300", "font-medium": "font-weight:500", "font-semibold": "font-weight:600", "font-bold": "font-weight:700", "font-extrabold": "font-weight:800",
  "leading-none": "line-height:1", "leading-snug": "line-height:1.375", "leading-relaxed": "line-height:1.625", "tracking-tight": "letter-spacing:-0.025em",
  rounded: "border-radius:.25rem", "rounded-md": "border-radius:.375rem", "rounded-lg": "border-radius:.5rem", "rounded-xl": "border-radius:.75rem", "rounded-2xl": "border-radius:1rem", "rounded-full": "border-radius:9999px",
  border: "border-width:1px;border-style:solid", "border-b": "border-bottom-width:1px;border-bottom-style:solid", "border-e": "border-inline-end-width:1px;border-inline-end-style:solid",
  "ring-1": "--tw-ring:0 0 0 1px var(--tw-ring-c, currentColor);box-shadow:var(--tw-ring),var(--tw-shadow, 0 0 #0000)",
  "drop-shadow-md": "filter:drop-shadow(0 4px 3px rgb(0 0 0 / .07)) drop-shadow(0 2px 2px rgb(0 0 0 / .06))", "brightness-95": "filter:brightness(.95)",
  "backdrop-blur-sm": "-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)", "backdrop-blur-xl": "-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px)",
  "transition-colors": "transition-property:color,background-color,border-color;transition-duration:150ms", "transition-opacity": "transition-property:opacity;transition-duration:150ms",
  "transition-transform": "transition-property:transform,translate,scale;transition-duration:150ms", "will-change-transform": "will-change:transform",
  "bg-gradient-to-t": "background-image:linear-gradient(to top,var(--g-from,transparent),var(--g-via,color-mix(in srgb,var(--g-from,transparent),var(--g-to,transparent))),var(--g-to,transparent))",
  "bg-gradient-to-r": "background-image:linear-gradient(to right,var(--g-from,transparent),var(--g-via,color-mix(in srgb,var(--g-from,transparent),var(--g-to,transparent))),var(--g-to,transparent))",
  "bg-gradient-to-br": "background-image:linear-gradient(to bottom right,var(--g-from,transparent),var(--g-via,color-mix(in srgb,var(--g-from,transparent),var(--g-to,transparent))),var(--g-to,transparent))",
  "font-display": "font-family:var(--font-display, Georgia, serif)", "object-cover": "object-fit:cover", "ms-auto": "margin-inline-start:auto",
  "translate-y-0": "translate:0 0", "translate-y-2": "translate:0 .5rem", "scale-100": "scale:1", "w-auto": "width:auto",
  "animate-preview-in": "animation:hz-preview-in 260ms cubic-bezier(.22,1,.36,1) both", "animate-shimmer": "animation:hz-shimmer 5.4s ease-in-out infinite",
};
function decl(u) {
  if (FIXED[u]) return FIXED[u];
  let m;
  const neg = u.startsWith("-"); const v = neg ? u.slice(1) : u;
  if ((m = /^(p|px|py|pt|pb|ps|pe|m|mx|my|mt|mb|ms|me|gap-x|gap-y|gap|inset-x|inset-y|inset|top|bottom|left|right|start|end|w|h|min-h|min-w|max-w)-(.+)$/.exec(v))) {
    const s = size(m[2], neg); if (s) return SP[m[1]].map((p) => `${p}:${s}`).join(";");
  }
  if ((m = /^z-(\[?)(\d+)\]?$/.exec(u))) return `z-index:${m[2]}`;
  if ((m = /^opacity-(\d+)$/.exec(u))) return `opacity:${m[1] / 100}`;
  if ((m = /^grid-cols-(\d+)$/.exec(u))) return `grid-template-columns:repeat(${m[1]},minmax(0,1fr))`;
  if ((m = /^line-clamp-(\d+)$/.exec(u))) return `overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${m[1]}`;
  if ((m = /^text-(\[\d.*px\])$/.exec(u))) return `font-size:${arb(m[1])}`;
  if ((m = /^leading-(\[.+\])$/.exec(u))) return `line-height:${arb(m[1])}`;
  if ((m = /^tracking-(\[.+\])$/.exec(u))) return `letter-spacing:${arb(m[1])}`;
  if ((m = /^rounded-(\[.+\])$/.exec(u))) return `border-radius:${arb(m[1])}`;
  if ((m = /^aspect-(\[.+\])$/.exec(u))) return `aspect-ratio:${arb(m[1])}`;
  if ((m = /^shadow-(\[.+\])$/.exec(u))) return `--tw-shadow:${arb(m[1]).replace(/,(?![^(]*\))/g, ", ")};box-shadow:var(--tw-ring, 0 0 #0000),var(--tw-shadow)`;
  if ((m = /^drop-shadow-(\[.+\])$/.exec(u))) return `filter:drop-shadow(${arb(m[1])})`;
  if ((m = /^blur-(\[.+\])$/.exec(u))) return `filter:blur(${arb(m[1])})`;
  if ((m = /^scale-(\[.+\]|\d+)$/.exec(u))) return `scale:${m[1][0] === "[" ? arb(m[1]) : m[1] / 100}`;
  if ((m = /^translate-x-(\[.+\])$/.exec(u))) return `translate:${arb(m[1])} 0`;
  if ((m = /^transition-(\[.+\])$/.exec(u))) return `transition-property:${arb(m[1]).replace(/transform/, "transform,translate,scale")};transition-duration:150ms`;
  if ((m = /^duration-(\[(\d+)ms\]|(\d+))$/.exec(u))) return `transition-duration:${m[2] || m[3]}ms`;
  if ((m = /^ease-(\[.+\])$/.exec(u))) return `transition-timing-function:${arb(m[1])}`;
  if ((m = /^(bg|text|border|ring|from|via|to|fill)-(.+)$/.exec(u))) {
    const c = color(m[2]); if (!c) return null;
    return { bg: `background-color:${c}`, text: `color:${c}`, border: `border-color:${c}`, ring: `--tw-ring-c:${c}`, from: `--g-from:${c}`, via: `--g-via:${c}`, to: `--g-to:${c}`, fill: `fill:${c}` }[m[1]];
  }
  return null;
}
const esc = (t) => t.replace(/[^a-zA-Z0-9_-]/g, (c) => "\\" + c);
const out = [], media = { lg: [], sm: [] };
for (const t of tokens) {
  const parts = t.split(":"), u = parts.pop(), vs = parts;
  if (vs.some((x) => !/^(hover|group-hover|group-hover\/\w+|focus-visible|active|lg|sm|group-focus-within)$/.test(x))) continue;
  const d = decl(u); if (!d) continue;
  let sel = "." + esc(t);
  let mq = null;
  for (const x of vs) {
    if (x === "hover") sel += ":hover"; else if (x === "focus-visible") sel += ":focus-visible"; else if (x === "active") sel += ":active";
    else if (x === "group-hover") sel = ".group:hover " + sel; else if (x === "group-focus-within") sel = ".group:focus-within " + sel;
    else if (x.startsWith("group-hover/")) sel = `.group\\/${x.split("/")[1]}:hover ` + sel; else mq = x;
  }
  (mq ? media[mq] : out).push(`  ${sel} { ${d} }`);
}
const css = [
  "/* @generated by preview/tw-gen.mjs: Tailwind-like utilities for the Harbor-faithful bench markup (.hz-u). Do not edit by hand. */",
  "@scope (.hz-u) {", ...out,
  "  @media (min-width: 640px) {", ...media.sm.map((l) => "  " + l), "  }",
  "  @media (min-width: 1024px) {", ...media.lg.map((l) => "  " + l), "  }",
  "}",
  "@keyframes hz-preview-in { from { opacity: 0; transform: translateY(6px) scale(.96); } }",
  "@keyframes hz-shimmer { 0%, 60% { translate: 0 0; } 100% { translate: 300% 0; } }",
  "@media (prefers-reduced-motion: reduce) { .hz-u .animate-preview-in, .hz-u .animate-shimmer { animation: none; } }",
].join("\n");
const file = new URL("harness.css", here), cur = readFileSync(file, "utf8");
const A = "/* >>> tw-gen */", B = "/* <<< tw-gen */";
const next = cur.includes(A) ? cur.replace(new RegExp(A.replace(/[*/]/g, "\\$&") + "[\\s\\S]*" + B.replace(/[*/]/g, "\\$&")), `${A}\n${css}\n${B}`) : `${cur.trimEnd()}\n\n${A}\n${css}\n${B}\n`;
writeFileSync(file, next);
console.log(`tw-gen: ${out.length + media.sm.length + media.lg.length} rules from ${tokens.length} tokens`);
