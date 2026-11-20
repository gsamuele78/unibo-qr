"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const qrcodegen = require("../../vendor/qrcodegen.js");
const { createCore } = require("../../src/qr-core.js");

const core = createCore(qrcodegen);
const qr = core.encode("https://www.unibo.it", { ecc: "M" });

test("buildSvg emits a valid SVG root with the correct namespace", () => {
  const svg = core.buildSvg(qr, { color: "#000000" });
  assert.match(svg, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(svg, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, new RegExp(`viewBox="0 0 ${qr.size + 8} ${qr.size + 8}"`));
  assert.match(svg, /shape-rendering="crispEdges"/);
  assert.match(svg, /<\/svg>\s*$/);
});

test("buildSvg path covers exactly the dark modules", () => {
  const svg = core.buildSvg(qr, { color: "#000000" });
  const d = svg.match(/<path d="([^"]+)"/)[1];
  // Each run is "M x,y h n v1 h-n z": sum of run lengths == dark module count.
  const runs = [...d.matchAll(/M(\d+),(\d+)h(\d+)v1h-\3z/g)];
  let dark = 0;
  for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) if (qr.getModule(x, y)) dark++;
  assert.equal(runs.reduce((s, m) => s + Number(m[3]), 0), dark);
  assert.equal(runs.map((m) => m[0]).join(""), d, "path contains only well-formed runs");
});

test("buildSvg escapes user-controlled values", () => {
  const svg = core.buildSvg(qr, { color: "#000000", title: `</title><script>alert(1)</script>` });
  assert.doesNotMatch(svg, /<script>/);
});

test("buildSvg rejects non-hex colours (attribute injection)", () => {
  assert.throws(() => core.buildSvg(qr, { color: `#000" onload="x` }), /colour/i);
});

test("buildSvg embeds the logo with a white safe box", () => {
  const svg = core.buildSvg(qr, { color: "#000000",
    logo: { dataUrl: "data:image/png;base64,iVBORw0KGgo=", width: 200, height: 100 } });
  assert.match(svg, /<rect [^>]*fill="#ffffff"[^>]*\/>\s*<image /);
  assert.match(svg, /href="data:image\/png;base64,iVBORw0KGgo="/);
  assert.match(svg, /preserveAspectRatio="xMidYMid meet"/);
});

test("buildSvg refuses non-image data URLs for the logo", () => {
  assert.throws(() => core.buildSvg(qr, { color: "#000000",
    logo: { dataUrl: "javascript:alert(1)", width: 1, height: 1 } }), /logo/i);
});
