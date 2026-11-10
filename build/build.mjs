// Bundles a theme's src/ into importable Harbor theme files in dist/.
// Usage: node build/build.mjs <theme>   (theme folder: fathom or projector; default fathom)
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const id = (process.argv[2] || "fathom").replace(/[\\/]+$/, "");
if (!/^[a-z0-9-]+$/.test(id)) { console.error(`Unknown theme folder: ${id}`); process.exit(1); }
const read = (p) => readFileSync(join(root, id, "src", p), "utf8").replace(/\r\n/g, "\n");
// A theme's CSS or JS can be one file (theme.css / theme.js) or a folder of parts (css/ / js/) joined in name order.
const joined = (dir, single) => {
  const d = join(root, id, "src", dir);
  if (!existsSync(d)) return read(single);
  return readdirSync(d).filter((f) => f.endsWith("." + dir)).sort().map((f) => read(join(dir, f)).trimEnd() + "\n").join("\n");
};

const manifest = JSON.parse(read("manifest.json"));
const css = joined("css", "theme.css").trim();
const js = joined("js", "theme.js").replace(/__(FATHOM|THEME)_VERSION__/g, manifest.version).trim();
const html = read("theme.html").trim();

// Same checks Harbor's importer runs (src/lib/custom-themes.ts), so a bad build fails here, not in the app.
const TOKEN_KEYS = [
  "--color-canvas", "--color-surface", "--color-elevated", "--color-raised",
  "--color-ink", "--color-ink-muted", "--color-ink-subtle", "--color-edge",
  "--color-edge-soft", "--color-accent", "--color-accent-soft", "--color-danger",
];
const HEX = /^#[0-9a-f]{6,8}$/i;
const errors = [];
for (const k of TOKEN_KEYS) if (!HEX.test(manifest.tokens?.[k] ?? "")) errors.push(`token ${k} missing or not hex`);
if (manifest.swatch?.length !== 3 || !manifest.swatch.every((s) => HEX.test(s))) errors.push("swatch must be 3 hex colors");
// The .harborstyle parser treats a line that is exactly @css/@js/@html/@tokens as a new block.
for (const [name, text] of [["css", css], ["js", js], ["html", html]]) {
  if (/^\s*@(css|js|html|tokens)\s*$/im.test(text)) errors.push(`${name} contains a line that looks like a block marker`);
}
try { new Function(js); } catch (e) { errors.push(`theme.js does not parse: ${e.message}`); }
if (errors.length) {
  console.error("Build failed:\n - " + errors.join("\n - "));
  process.exit(1);
}

const theme = {
  name: manifest.name,
  blurb: manifest.blurb,
  swatch: manifest.swatch,
  tokens: manifest.tokens,
  layout: manifest.layout,
  cardStyle: manifest.cardStyle,
  buttonStyle: manifest.buttonStyle,
  fontPair: manifest.fontPair,
  bokeh: manifest.bokeh,
  css,
  js,
  html,
};

const style = [
  "# Harbor Style",
  `name: ${manifest.name}`,
  `blurb: ${manifest.blurb}`,
  `layout: ${manifest.layout}`,
  `card: ${manifest.cardStyle}`,
  `button: ${manifest.buttonStyle}`,
  `font: ${manifest.fontPair}`,
  `bokeh: ${manifest.bokeh}`,
  `swatch: ${manifest.swatch.join(", ")}`,
  "",
  "@tokens",
  ...TOKEN_KEYS.map((k) => `${k}: ${manifest.tokens[k]}`),
  "",
  "@css",
  css,
  "",
  "@html",
  html,
  "",
  "@js",
  js,
  "",
].join("\n");

mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, `dist/${id}.json`), JSON.stringify(theme, null, 2) + "\n");
writeFileSync(join(root, `dist/${id}.harborstyle`), style);
const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1) + " KB";
console.log(`Built ${manifest.name} ${manifest.version}: css ${kb(css)}, js ${kb(js)} -> dist/${id}.json, dist/${id}.harborstyle`);
