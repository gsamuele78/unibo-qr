"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../../src/qr-core.js");

/** Minimal stand-in for a fully capable browser `window`. */
function fakeWindow() {
  function Canvas() {}
  Canvas.prototype.getContext = () => ({});
  Canvas.prototype.toBlob = () => {};
  function Blob_() {}
  Blob_.prototype.arrayBuffer = () => {};
  function Element_() {}
  Element_.prototype.replaceChildren = () => {};
  return {
    HTMLCanvasElement: Canvas, Blob: Blob_, Element: Element_,
    FileReader: function FileReader() {},
    URL: { createObjectURL: () => "blob:x", revokeObjectURL: () => {} },
  };
}

test("missingFeatures is empty for a capable browser", () => {
  assert.deepEqual(core.missingFeatures(fakeWindow()), []);
});

test("missingFeatures names each missing capability", () => {
  const cases = [
    ["canvas", (w) => { delete w.HTMLCanvasElement.prototype.toBlob; }],
    ["canvas", (w) => { delete w.HTMLCanvasElement; }],
    ["blob", (w) => { delete w.Blob.prototype.arrayBuffer; }],
    ["objectUrl", (w) => { delete w.URL.createObjectURL; }],
    ["fileReader", (w) => { delete w.FileReader; }],
    ["dom", (w) => { delete w.Element.prototype.replaceChildren; }],
  ];
  for (const [name, breakIt] of cases) {
    const w = fakeWindow();
    breakIt(w);
    assert.deepEqual(core.missingFeatures(w), [name]);
  }
});

test("missingFeatures tolerates a missing environment", () => {
  assert.equal(core.missingFeatures(undefined).length, 5);
});

test("BROWSER_SUPPORT lists the four supported browsers with minimum versions", () => {
  assert.deepEqual(core.BROWSER_SUPPORT.map((b) => b.name), ["Chrome", "Edge", "Firefox", "Safari"]);
  for (const b of core.BROWSER_SUPPORT) assert.match(b.min, /^\d+(\.\d+)?$/);
});

test("browserSupportLabel renders a compact, human-readable list", () => {
  assert.equal(core.browserSupportLabel(), "Chrome 90+ · Edge 90+ · Firefox 90+ · Safari 15+");
});
