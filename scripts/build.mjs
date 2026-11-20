// Inlines CSS + JS into a single, self-contained HTML file with a hash-based CSP.
// Output: dist/unibo-qr.html (+ .sha256). Run: npm run build
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("base64");
const { version } = JSON.parse(read("package.json"));

const css = read("src/styles.css");
const js = ["vendor/qrcodegen.js", "src/qr-core.js", "src/i18n.js", "src/app.js"]
  .map((f) => `/* ---- ${f} ---- */\n${read(f)}`).join("\n");

// The placeholders sit between the tags, so the hashed text equals the element content.
if (js.includes("</script") || css.includes("</style")) throw new Error("Closing tag inside inline asset");

const csp = [
  "default-src 'none'",
  `script-src 'sha256-${sha256(js)}'`,
  `style-src 'sha256-${sha256(css)}'`,
  "img-src data: blob:",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

let html = read("src/index.html");
for (const ph of ["/*@CSS@*/", "/*@JS@*/", "@CSP@"]) {
  if (html.split(ph).length !== 2) throw new Error(`Placeholder ${ph} must appear exactly once`);
}
html = html
  .replace("@CSP@", csp)
  .replaceAll("@VERSION@", version)
  .replace("/*@CSS@*/", () => css)
  .replace("/*@JS@*/", () => js);

mkdirSync(new URL("dist/", root), { recursive: true });
writeFileSync(new URL("dist/unibo-qr.html", root), html);
const digest = createHash("sha256").update(html).digest("hex");
writeFileSync(new URL("dist/unibo-qr.html.sha256", root), `${digest}  unibo-qr.html\n`);
console.log(`dist/unibo-qr.html  ${(html.length / 1024).toFixed(1)} KiB  sha256 ${digest}`);
