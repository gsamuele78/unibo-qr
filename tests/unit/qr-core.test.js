"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const qrcodegen = require("../../vendor/qrcodegen.js");
const { createCore, QrInputError } = require("../../src/qr-core.js");
const { rasterize, decode } = require("./helpers.js");

const core = createCore(qrcodegen);

test("normalizeInput", async (t) => {
  await t.test("trims whitespace", () => {
    assert.equal(core.normalizeInput("  https://www.unibo.it  "), "https://www.unibo.it");
  });
  await t.test("adds https:// to bare domains", () => {
    assert.equal(core.normalizeInput("www.unibo.it/it/ateneo"), "https://www.unibo.it/it/ateneo");
    assert.equal(core.normalizeInput("biome.unibo.it"), "https://biome.unibo.it");
  });
  await t.test("leaves plain text and other schemes untouched", () => {
    assert.equal(core.normalizeInput("Aula Magna, ore 10"), "Aula Magna, ore 10");
    assert.equal(core.normalizeInput("mailto:info@unibo.it"), "mailto:info@unibo.it");
    assert.equal(core.normalizeInput("http://example.org"), "http://example.org");
  });
});

test("classifyInput", async (t) => {
  await t.test("https URL on unibo.it has no warnings", () => {
    assert.deepEqual(core.classifyInput("https://www.unibo.it/it"), { kind: "url", warnings: [] });
  });
  await t.test("http URL warns about missing TLS", () => {
    assert.deepEqual(core.classifyInput("http://www.unibo.it").warnings, ["insecureUrl"]);
  });
  await t.test("external domain is flagged (informational)", () => {
    assert.deepEqual(core.classifyInput("https://example.org").warnings, ["externalDomain"]);
  });
  await t.test("lookalike domain is not treated as unibo", () => {
    assert.deepEqual(core.classifyInput("https://unibo.it.evil.com").warnings, ["externalDomain"]);
    assert.deepEqual(core.classifyInput("https://notunibo.it").warnings, ["externalDomain"]);
  });
  await t.test("plain text", () => {
    assert.deepEqual(core.classifyInput("hello"), { kind: "text", warnings: [] });
  });
  await t.test("javascript: URLs are rejected", () => {
    assert.deepEqual(core.classifyInput("javascript:alert(1)").warnings, ["dangerousScheme"]);
  });
});

test("encode", async (t) => {
  await t.test("throws EMPTY on blank input", () => {
    assert.throws(() => core.encode("   "), (e) => e instanceof QrInputError && e.code === "EMPTY");
  });
  await t.test("throws TOO_LONG when data exceeds capacity", () => {
    assert.throws(() => core.encode("x".repeat(3000), { ecc: "H" }),
      (e) => e instanceof QrInputError && e.code === "TOO_LONG");
  });
  await t.test("forces ECC H when a logo is present", () => {
    assert.equal(core.encode("https://www.unibo.it", { ecc: "L", hasLogo: true }).ecc, "H");
  });
  await t.test("never reports an ECC level below the requested one (boost is free)", () => {
    const order = ["L", "M", "Q", "H"];
    for (const ecc of order) {
      const got = core.encode("https://www.unibo.it/" + "a".repeat(80), { ecc }).ecc;
      assert.ok(order.indexOf(got) >= order.indexOf(ecc), `${ecc} -> ${got}`);
    }
  });
  await t.test("rejects unknown ECC levels", () => {
    assert.throws(() => core.encode("a", { ecc: "Z" }), /ECC/);
  });
  for (const payload of ["https://www.unibo.it", "https://biome.unibo.it/it/ricerca?x=1&y=2",
    "Università di Bologna — Alma Mater Studiorum 🎓", "x".repeat(600)]) {
    await t.test(`round-trips through an independent decoder: ${payload.slice(0, 30)}`, () => {
      const qr = core.encode(payload, { ecc: "M" });
      assert.equal(decode(rasterize(qr)), payload);
    });
  }
});

test("logo occlusion stays decodable at ECC H for every version used", () => {
  // Payload lengths chosen to span small to large symbol versions.
  for (const len of [5, 20, 60, 150, 400, 900]) {
    const payload = "https://www.unibo.it/" + "a".repeat(len);
    const qr = core.encode(payload, { hasLogo: true });
    const box = core.logoBox(qr.size, core.QUIET_ZONE);
    assert.equal(decode(rasterize(qr, { logo: box })), payload, `version ${qr.version}`);
  }
});

test("layout uses integer module size (crisp pixels) and centres the code", () => {
  const l = core.layout(29, 512, 4); // 37 modules total
  assert.equal(l.moduleSize, 13);
  assert.equal(Number.isInteger(l.offset), true);
  assert.equal(l.offset * 2 + 29 * 13 >= 512 - 1, true);
  assert.throws(() => core.layout(177, 100, 4), /too small/i);
});

test("logoBox is centred and proportional, in module units incl. quiet zone", () => {
  const b = core.logoBox(29, 4);
  assert.equal(b.x + b.size / 2, (29 + 8) / 2);
  assert.equal(b.y, b.x);
  assert.ok(b.size / 29 > 0.15 && b.size / 29 <= 0.25);
  assert.ok(b.pad > 0);
});

test("fitContain preserves aspect ratio", () => {
  assert.deepEqual(core.fitContain(200, 100, 10), { w: 10, h: 5 });
  assert.deepEqual(core.fitContain(50, 100, 10), { w: 5, h: 10 });
});

test("colour utilities", async (t) => {
  await t.test("parses hex", () => {
    assert.deepEqual(core.hexToRgb("#BB2E29"), { r: 187, g: 46, b: 41 });
    assert.deepEqual(core.hexToRgb("#fff"), { r: 255, g: 255, b: 255 });
    assert.throws(() => core.hexToRgb("red"), /colour/i);
  });
  await t.test("contrast ratio matches WCAG reference values", () => {
    assert.equal(core.contrastRatio("#000000", "#ffffff").toFixed(1), "21.0");
    assert.equal(core.contrastRatio("#777777", "#ffffff").toFixed(2), "4.48");
  });
  await t.test("colourStatus grades scannability", () => {
    assert.equal(core.colourStatus("#000000"), "ok");
    assert.equal(core.colourStatus("#BB2E29"), "ok");
    assert.equal(core.colourStatus("#888888"), "warn");
    assert.equal(core.colourStatus("#dddddd"), "error");
  });
});

test("escapeXml neutralises markup", () => {
  assert.equal(core.escapeXml(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;");
});

test("slugForFilename", () => {
  assert.equal(core.slugForFilename("https://www.unibo.it/it/ateneo?x=1"), "www-unibo-it-it-ateneo-x-1");
  assert.equal(core.slugForFilename("Università di Bologna!"), "universita-di-bologna");
  assert.equal(core.slugForFilename("🎓🎓"), "qr");
  assert.ok(core.slugForFilename("a".repeat(200)).length <= 40);
});
