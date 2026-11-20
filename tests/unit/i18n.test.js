"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { MESSAGES, SUPPORTED, resolveLocale, translate } = require("../../src/i18n.js");

test("supports Italian and English", () => {
  assert.deepEqual(SUPPORTED, ["it", "en"]);
});

test("every locale has exactly the same keys (no missing translations)", () => {
  const ref = Object.keys(MESSAGES.it).sort();
  for (const loc of SUPPORTED) assert.deepEqual(Object.keys(MESSAGES[loc]).sort(), ref, loc);
});

test("no empty strings, placeholders consistent across locales", () => {
  const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
  for (const key of Object.keys(MESSAGES.it)) {
    for (const loc of SUPPORTED) assert.ok(MESSAGES[loc][key].trim(), `${loc}.${key}`);
    assert.equal(ph(MESSAGES.en[key]), ph(MESSAGES.it[key]), key);
  }
});

test("resolveLocale: stored > browser preference > Italian default", () => {
  assert.equal(resolveLocale("en", ["it-IT"]), "en");
  assert.equal(resolveLocale(null, ["en-GB", "it"]), "en");
  assert.equal(resolveLocale(null, ["de-DE", "it-IT"]), "it");
  assert.equal(resolveLocale(null, ["fr"]), "it");
  assert.equal(resolveLocale("xx", []), "it");
});

test("translate interpolates and falls back to the key", () => {
  assert.equal(translate("en", "sizePx", { n: 512 }), "512 px");
  assert.equal(translate("it", "__missing__"), "__missing__");
});
