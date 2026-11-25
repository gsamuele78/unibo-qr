"use strict";
// End-to-end tests against the built single-file artefact (dist/unibo-qr.html),
// opened from file:// exactly as end users will. Requires a Playwright Chromium.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const playwright = require("playwright");

// Browser under test: BROWSER=chromium|firefox|webkit (default chromium).
const BROWSER = process.env.BROWSER || "chromium";
const browserType = playwright[BROWSER];
if (!browserType) throw new Error(`Unknown BROWSER "${BROWSER}"`);

const DIST = path.resolve(__dirname, "../../dist/unibo-qr.html");
const URL_ = "file://" + DIST;
const JSQR = require.resolve("jsqr/dist/jsQR.js");
const AXE = require.resolve("axe-core/axe.min.js");

let browser, server, httpUrl;
test.before(async () => {
  browser = await browserType.launch();
  // The same file served over HTTP, as on GitHub Pages or a department web space.
  server = http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(DIST));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  httpUrl = `http://127.0.0.1:${server.address().port}/`;
});
test.after(async () => { await browser?.close(); server?.close(); });

// bypassCSP lets tests inject jsQR/axe; the CSP test itself runs with it off.
async function openApp({ locale = "it-IT", bypassCSP = true, url = URL_, init = null, wait = true, ...ctx } = {}) {
  const context = await browser.newContext({ locale, acceptDownloads: true, bypassCSP, ...ctx });
  const page = await context.newPage();
  const external = [];
  const errors = [];
  page.on("request", (r) => { if (!/^(file|data|blob):/.test(r.url()) && r.url() !== url) external.push(r.url()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  if (init) await page.addInitScript(init);
  await page.goto(url);
  if (wait) await page.waitForSelector("#preview[data-ready='true']");
  return { context, page, external, errors };
}

/** Decode an image file (as bytes) inside the page with jsQR. */
async function decodeInPage(page, bytes, mime) {
  await page.addScriptTag({ path: JSQR });
  return page.evaluate(async ({ b64, mime }) => {
    const img = new Image();
    img.src = `data:${mime};base64,${b64}`;
    await img.decode();
    const w = img.naturalWidth || 800;
    const c = document.createElement("canvas");
    c.width = w; c.height = img.naturalHeight || w;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    const r = window.jsQR(d.data, c.width, c.height);
    return r ? r.data : null;
  }, { b64: Buffer.from(bytes).toString("base64"), mime });
}

async function download(page, selector) {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click(selector)]);
  const file = await dl.path();
  return { name: dl.suggestedFilename(), bytes: fs.readFileSync(file) };
}

test("loads offline with zero external requests and no console errors", async () => {
  const { context, page, external, errors } = await openApp({ bypassCSP: false });
  await page.fill("#content", "https://www.unibo.it");
  await page.waitForTimeout(300);
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  await context.close();
});

test("ships a strict Content-Security-Policy", async () => {
  const { context, page } = await openApp();
  const csp = await page.getAttribute('meta[http-equiv="Content-Security-Policy"]', "content");
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'sha256-/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
  await context.close();
});

test("bilingual: follows browser language and toggles IT/EN", async () => {
  const en = await openApp({ locale: "en-GB" });
  assert.equal(await en.page.getAttribute("html", "lang"), "en");
  assert.equal(await en.page.textContent("h1"), "QR code generator");
  await en.page.click("#lang-it");
  assert.equal(await en.page.getAttribute("html", "lang"), "it");
  assert.equal(await en.page.textContent("h1"), "Generatore di QR code");
  assert.equal(await en.page.getAttribute("#lang-it", "aria-pressed"), "true");
  await en.context.close();
});

test("language choice is remembered across reloads", async () => {
  const { context, page } = await openApp({ locale: "it-IT" });
  await page.click("#lang-en");
  await page.reload();
  await page.waitForSelector("#preview[data-ready='true']");
  assert.equal(await page.getAttribute("html", "lang"), "en");
  await context.close();
});

test("shows localized validation messages", async () => {
  const { context, page } = await openApp({ locale: "en-US" });
  await page.fill("#content", "");
  await page.waitForSelector("#messages .error");
  assert.match(await page.textContent("#messages"), /Enter an address/);
  assert.equal(await page.isDisabled("#dl-png"), true);
  await page.fill("#content", "http://example.org");
  await page.waitForFunction(() => /http:\/\//.test(document.querySelector("#messages").textContent));
  assert.match(await page.textContent("#messages"), /unibo\.it/);
  assert.equal(await page.isDisabled("#dl-png"), false);
  await page.fill("#content", "javascript:alert(1)");
  await page.waitForSelector("#messages .error");
  assert.equal(await page.isDisabled("#dl-svg"), true);
  await context.close();
});

const FORMATS = [
  ["#dl-png", "image/png", /\.png$/],
  ["#dl-jpeg", "image/jpeg", /\.jpg$/],
  ["#dl-webp", "image/webp", /\.webp$/],
  ["#dl-svg", "image/svg+xml", /\.svg$/],
];
for (const [sel, mime, ext] of FORMATS) {
  test(`downloads a scannable ${mime}`, async (t) => {
    const { context, page } = await openApp();
    if (mime === "image/webp" && BROWSER === "webkit") {
      // WebKit/Safari cannot encode WebP from a canvas: the button must be hidden, not broken.
      assert.equal(await page.isHidden(sel), true);
      await context.close();
      return t.skip("WebP encoding is not available in WebKit");
    }
    assert.equal(await page.isVisible(sel), true);
    const payload = "https://www.unibo.it/it/ateneo";
    await page.fill("#content", payload);
    await page.waitForTimeout(250);
    const { name, bytes } = await download(page, sel);
    assert.match(name, ext);
    assert.match(name, /^unibo-qr-www-unibo-it-it-ateneo/);
    assert.equal(await decodeInPage(page, bytes, mime), payload);
    await context.close();
  });
}

test("raster export honours the selected pixel size", async () => {
  const { context, page } = await openApp();
  await page.selectOption("#raster-size", "1024");
  const { bytes } = await download(page, "#dl-png");
  // PNG IHDR width/height at byte offsets 16..23
  assert.equal(bytes.readUInt32BE(16), 1024);
  assert.equal(bytes.readUInt32BE(20), 1024);
  await context.close();
});

test("PDF export is a valid vector PDF of the chosen size", async () => {
  const { context, page } = await openApp();
  await page.selectOption("#pdf-size", "100");
  const { name, bytes } = await download(page, "#dl-pdf");
  assert.match(name, /-100mm\.pdf$/);
  const s = bytes.toString("latin1");
  assert.match(s, /^%PDF-1\.4/);
  assert.match(s, /\/MediaBox \[0 0 283\.46\d* 283\.46\d*\]/);
  await context.close();
});

test("logo upload forces ECC H, stays scannable in PNG/SVG, embeds in PDF", async () => {
  const { context, page } = await openApp({ locale: "en-US" });
  // Build a 120x60 red PNG logo in the page, then upload it.
  const logoB64 = await page.evaluate(() => {
    const c = document.createElement("canvas"); c.width = 120; c.height = 60;
    const x = c.getContext("2d"); x.fillStyle = "#bb2e29"; x.fillRect(0, 0, 120, 60);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.setInputFiles("#logo", { name: "logo.png", mimeType: "image/png", buffer: Buffer.from(logoB64, "base64") });
  await page.waitForSelector("#logo-remove:not([hidden])");
  assert.equal(await page.inputValue("#ecc"), "H");
  assert.equal(await page.isDisabled("#ecc"), true);
  const payload = "https://biome.unibo.it";
  await page.fill("#content", payload);
  await page.waitForTimeout(250);
  for (const [sel, mime] of [["#dl-png", "image/png"], ["#dl-svg", "image/svg+xml"]]) {
    const { bytes } = await download(page, sel);
    assert.equal(await decodeInPage(page, bytes, mime), payload, mime);
  }
  const pdf = (await download(page, "#dl-pdf")).bytes.toString("latin1");
  assert.match(pdf, /\/Filter \/DCTDecode/);
  await page.click("#logo-remove");
  assert.equal(await page.isDisabled("#ecc"), false);
  await context.close();
});

test("rejects unsupported logo types", async () => {
  const { context, page } = await openApp({ locale: "en-US" });
  await page.setInputFiles("#logo", { name: "x.txt", mimeType: "text/plain", buffer: Buffer.from("hi") });
  await page.waitForSelector("#messages .error");
  assert.match(await page.textContent("#messages"), /Unsupported logo format/);
  await context.close();
});

test("low-contrast colours are blocked", async () => {
  const { context, page } = await openApp({ locale: "en-US" });
  await page.check("#colour-custom");
  await page.fill("#colour-picker", "#dddddd");
  await page.dispatchEvent("#colour-picker", "input");
  await page.waitForSelector("#messages .error");
  assert.equal(await page.isDisabled("#dl-png"), true);
  await page.check("#colour-unibo");
  await page.waitForFunction(() => !document.querySelector("#messages .error"));
  assert.equal(await page.isDisabled("#dl-png"), false);
  await context.close();
});

test("has no serious or critical accessibility violations (axe-core)", async () => {
  for (const scheme of ["light", "dark"]) {
    const { context, page } = await openApp();
    await page.emulateMedia({ colorScheme: scheme });
    await page.addScriptTag({ path: AXE });
    const res = await page.evaluate(() => window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "best-practice"] }));
    const bad = res.violations.filter((v) => ["serious", "critical"].includes(v.impact));
    assert.deepEqual(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" ")}`), [], scheme);
    await context.close();
  }
});

test("works at phone width without horizontal scroll", async () => {
  const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await context.newPage();
  await page.goto(URL_);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(overflow, false);
  await context.close();
});

test("served over HTTP: loads cleanly and remembers the language", async () => {
  const { context, page, external, errors } = await openApp({ url: httpUrl, bypassCSP: false, locale: "it-IT" });
  await page.click("#lang-en");
  await page.reload();
  await page.waitForSelector("#preview[data-ready='true']");
  assert.equal(await page.getAttribute("html", "lang"), "en");
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  await context.close();
});

test("compatibility banner lists supported browsers and software requirements, in both languages", async () => {
  const { context, page } = await openApp({ locale: "it-IT" });
  const banner = page.locator("#compat");
  assert.equal(await banner.isVisible(), true);
  const it = await banner.innerText();
  assert.match(it, /Chrome 90\+ · Edge 90\+ · Firefox 90\+ · Safari 15\+/);
  assert.match(it, /Nessuna installazione/);
  await page.click("#compat summary");
  assert.match(await page.locator("#compat-details").innerText(), /Windows, macOS, Linux, Android/);
  await page.click("#lang-en");
  const en = await banner.innerText();
  assert.match(en, /Firefox 90\+/);
  assert.match(en, /No installation/);
  assert.equal(await page.isHidden("#compat-warning"), true);
  await context.close();
});

test("unsupported browser: shows a bilingual warning instead of a broken form", async () => {
  const { context, page, errors } = await openApp({
    wait: false,
    init: () => { delete Element.prototype.replaceChildren; },
  });
  await page.waitForSelector("#compat-warning:not([hidden])");
  const text = await page.locator("#compat-warning").innerText();
  assert.match(text, /non è supportato/);
  assert.match(text, /not supported/);
  assert.match(text, /Firefox 90\+/);
  assert.equal(await page.isHidden("main"), true);
  assert.deepEqual(errors, []);
  await context.close();
});

test("JavaScript disabled: explains the requirement and hides the form", async () => {
  const { context, page } = await openApp({ wait: false, javaScriptEnabled: false });
  const text = await page.locator("noscript").innerText();
  assert.match(text, /JavaScript/);
  assert.equal(await page.isHidden("main"), true);
  await context.close();
});
