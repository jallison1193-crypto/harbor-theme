// Bundles src/ into importable Harbor theme files in dist/.
// Usage: node build/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");

const manifest = JSON.parse(read("src/manifest.json"));
const css = read("src/theme.css").trim();
const js = read("src/theme.js").replaceAll("__FATHOM_VERSION__", manifest.version).trim();
const html = read("src/theme.html").trim();

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
writeFileSync(join(root, "dist/fathom.json"), JSON.stringify(theme, null, 2) + "\n");
writeFileSync(join(root, "dist/fathom.harborstyle"), style);
const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1) + " KB";
console.log(`Built Fathom ${manifest.version}: css ${kb(css)}, js ${kb(js)} -> dist/fathom.json, dist/fathom.harborstyle`);
