"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const qrcodegen = require("../../vendor/qrcodegen.js");
const { createCore } = require("../../src/qr-core.js");

const core = createCore(qrcodegen);
const qr = core.encode("https://www.unibo.it", { ecc: "M" });
const latin1 = (u8) => Buffer.from(u8).toString("latin1");

test("buildPdf produces a structurally valid PDF 1.4", () => {
  const bytes = core.buildPdf(qr, { color: "#BB2E29", sizeMm: 50 });
  assert.ok(bytes instanceof Uint8Array);
  const s = latin1(bytes);
  assert.match(s, /^%PDF-1\.4\n/);
  assert.match(s, /%%EOF\n?$/);
  // startxref must point at the "xref" keyword
  const startxref = Number(s.match(/startxref\n(\d+)\n%%EOF/)[1]);
  assert.equal(s.slice(startxref, startxref + 4), "xref");
  // every xref entry must point at "N 0 obj"
  const entries = [...s.slice(startxref).matchAll(/^(\d{10}) 00000 n ?$/gm)].map((m) => Number(m[1]));
  assert.ok(entries.length >= 4);
  entries.forEach((off, i) => assert.equal(s.slice(off, off + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`));
});

test("buildPdf page size matches requested millimetres", () => {
  const s = latin1(core.buildPdf(qr, { color: "#000000", sizeMm: 50 }));
  const pt = (50 / 25.4) * 72;
  const [, w, h] = s.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
  assert.equal(Number(w).toFixed(2), pt.toFixed(2));
  assert.equal(Number(h).toFixed(2), pt.toFixed(2));
});

test("buildPdf uses vector rectangles in the chosen colour", () => {
  const s = latin1(core.buildPdf(qr, { color: "#BB2E29", sizeMm: 50 }));
  assert.match(s, /0\.733 0\.18 0\.161 rg/);
  assert.ok((s.match(/ re\n/g) || []).length > 50);
});

test("buildPdf embeds a JPEG logo as a DCT image XObject", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const s = latin1(core.buildPdf(qr, { color: "#000000", sizeMm: 50,
    logo: { jpegBytes: jpeg, width: 10, height: 5 } }));
  assert.match(s, /\/Subtype \/Image/);
  assert.match(s, /\/Filter \/DCTDecode/);
  assert.match(s, /\/Length 4\b/);
  assert.match(s, /\/Im1 Do/);
});
