/*
 * unibo-qr boot guard — deliberately ES5, separate from the app bundle.
 * If the app bundle failed to parse or start (outdated browser, missing
 * feature, runtime error), reveal the static bilingual warning.
 * SPDX-License-Identifier: MIT
 */
(function () {
  "use strict";
  if (window.__uniboQrReady) return;
  var warning = document.getElementById("compat-warning");
  if (warning) warning.hidden = false;
})();
