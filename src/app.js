/*
 * unibo-qr app — DOM wiring only; all logic lives in qr-core.js / i18n.js.
 * SPDX-License-Identifier: MIT
 */
(function () {
  "use strict";
  /* global qrcodegen, UniboQrCore, UniboQrI18n */
  // Unsupported browser: stop here; boot-guard.js then reveals the static warning.
  if (UniboQrCore.missingFeatures(window).length) return;

  const core = UniboQrCore.createCore(qrcodegen);
  const I = UniboQrI18n;
  const $ = (sel) => document.querySelector(sel);

  const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
  const LOGO_MAX_BYTES = 2 * 1024 * 1024;
  const STORAGE_KEY = "unibo-qr.locale";
  const PREVIEW_PX = 600;

  const el = {
    content: $("#content"), messages: $("#messages"), ecc: $("#ecc"), eccNote: $("#ecc-note"),
    logo: $("#logo"), logoRemove: $("#logo-remove"), picker: $("#colour-picker"),
    raster: $("#raster-size"), pdfSize: $("#pdf-size"), preview: $("#preview"), info: $("#info"),
    exportButtons: ["#dl-png", "#dl-jpeg", "#dl-webp", "#dl-svg", "#dl-pdf", "#copy-png"].map($),
  };

  const state = {
    locale: I.resolveLocale(storageGet(STORAGE_KEY), navigator.languages || [navigator.language]),
    logo: null,           // { img, dataUrl, width, height }
    qr: null,             // encoded symbol or null when invalid
    color: "#000000",
    messages: [],         // [{ level: "error"|"warn", key }]
  };

  // ---------- storage (best-effort, never required) ----------
  function storageGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
  function storageSet(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }

  // ---------- i18n ----------
  const t = (key, params) => I.translate(state.locale, key, params);

  function applyLocale() {
    document.documentElement.lang = state.locale;
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = t(node.dataset.i18n, { n: node.dataset.n });
    });
    document.querySelectorAll("[data-i18n-attr]").forEach((node) => {
      node.dataset.i18nAttr.split(";").forEach((pair) => {
        const [attr, key] = pair.split(":");
        node.setAttribute(attr, t(key));
      });
    });
    const browsers = core.browserSupportLabel();
    $("#compat-summary").textContent = t("compatSummary", { browsers });
    $("#req-browsers").textContent = t("reqBrowsers", { browsers });
    el.content.placeholder = t("contentPlaceholder");
    document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === state.locale)));
    document.title = `${t("appTitle")} · ${t("institution")}`;
    renderMessages();
    renderInfo();
  }

  function setLocale(loc) {
    state.locale = I.resolveLocale(loc, []);
    storageSet(STORAGE_KEY, state.locale);
    applyLocale();
  }

  // ---------- state -> view ----------
  function currentText() { return core.normalizeInput(el.content.value); }

  function update() {
    state.messages = [];
    state.qr = null;
    const text = currentText();
    const cls = core.classifyInput(text);
    cls.warnings.forEach((w) => state.messages.push({
      level: w === "dangerousScheme" ? "error" : "warn",
      key: "warn" + w[0].toUpperCase() + w.slice(1),
    }));
    const cStatus = core.colourStatus(state.color);
    if (cStatus === "error") state.messages.push({ level: "error", key: "errColour" });
    if (cStatus === "warn") state.messages.push({ level: "warn", key: "warnColour" });

    const hasLogo = Boolean(state.logo);
    el.ecc.disabled = hasLogo;
    el.eccNote.hidden = !hasLogo;
    if (hasLogo) el.ecc.value = "H";

    if (!state.messages.some((m) => m.level === "error")) {
      try {
        state.qr = core.encode(text, { ecc: el.ecc.value, hasLogo });
      } catch (e) {
        if (!(e instanceof core.QrInputError)) throw e;
        state.messages.unshift({ level: "error", key: e.code === "EMPTY" ? "errEmpty" : "errTooLong" });
      }
    }
    el.exportButtons.forEach((b) => { if (b) b.disabled = !state.qr; });
    renderMessages();
    renderInfo();
    renderToCanvas(el.preview, PREVIEW_PX);
    el.preview.dataset.ready = "true";
  }

  function pushTransient(level, key) {
    state.messages.push({ level, key });
    renderMessages();
  }

  function renderMessages() {
    el.messages.replaceChildren(...state.messages.map((m) => {
      const p = document.createElement("p");
      p.className = m.level;
      p.textContent = t(m.key);
      return p;
    }));
  }

  function renderInfo() {
    if (!state.qr) { el.info.textContent = ""; el.preview.setAttribute("aria-label", t("errEmpty")); return; }
    el.info.textContent = t("info", { version: state.qr.version, size: state.qr.size, ecc: state.qr.ecc });
    el.preview.setAttribute("aria-label", t("previewAlt", { text: state.qr.text }));
  }

  /** Draw the current symbol onto `canvas` at exactly `pixelSize` px, module-aligned. */
  function renderToCanvas(canvas, pixelSize, { background = "#ffffff" } = {}) {
    canvas.width = canvas.height = pixelSize;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, pixelSize, pixelSize);
    const qr = state.qr;
    if (!qr) return canvas;
    const { moduleSize: m, offset } = core.layout(qr.size, pixelSize);
    ctx.fillStyle = state.color;
    for (const r of core.darkRuns(qr)) ctx.fillRect(offset + r.x * m, offset + r.y * m, r.len * m, m);
    if (state.logo) {
      const b = core.logoBox(qr.size, 0); // symbol-relative coordinates
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(offset + (b.x - b.pad) * m, offset + (b.y - b.pad) * m, (b.size + 2 * b.pad) * m, (b.size + 2 * b.pad) * m);
      const fit = core.fitContain(state.logo.width, state.logo.height, b.size * m);
      const cx = offset + (b.x + b.size / 2) * m;
      const cy = offset + (b.y + b.size / 2) * m;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(state.logo.img, cx - fit.w / 2, cy - fit.h / 2, fit.w, fit.h);
    }
    return canvas;
  }

  // ---------- export ----------
  function baseName() { return `unibo-qr-${core.slugForFilename(state.qr.text)}`; }

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  function canvasBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(`toBlob ${type} failed`))), type, quality));
  }

  async function exportRaster(type, ext) {
    if (!state.qr) return;
    const size = parseInt(el.raster.value, 10);
    const canvas = renderToCanvas(document.createElement("canvas"), size);
    saveBlob(await canvasBlob(canvas, type, 0.95), `${baseName()}-${size}px.${ext}`);
  }

  function exportSvg() {
    if (!state.qr) return;
    const logo = state.logo && { dataUrl: state.logo.dataUrl, width: state.logo.width, height: state.logo.height };
    const svg = core.buildSvg(state.qr, { color: state.color, title: state.qr.text, logo });
    saveBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${baseName()}.svg`);
  }

  async function logoAsJpeg() {
    // PDF embeds JPEG natively (DCTDecode); flatten the logo onto white.
    const max = 600;
    const fit = core.fitContain(state.logo.width, state.logo.height, max);
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(fit.w)); c.height = Math.max(1, Math.round(fit.h));
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(state.logo.img, 0, 0, c.width, c.height);
    const blob = await canvasBlob(c, "image/jpeg", 0.92);
    return { jpegBytes: new Uint8Array(await blob.arrayBuffer()), width: c.width, height: c.height };
  }

  async function exportPdf() {
    if (!state.qr) return;
    const sizeMm = parseInt(el.pdfSize.value, 10);
    const logo = state.logo ? await logoAsJpeg() : null;
    const bytes = core.buildPdf(state.qr, { color: state.color, sizeMm, logo });
    saveBlob(new Blob([bytes], { type: "application/pdf" }), `${baseName()}-${sizeMm}mm.pdf`);
  }

  async function copyPng() {
    if (!state.qr) return;
    try {
      const canvas = renderToCanvas(document.createElement("canvas"), parseInt(el.raster.value, 10));
      const blob = await canvasBlob(canvas, "image/png");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      pushTransient("warn", "copied");
    } catch {
      pushTransient("error", "copyFailed");
    }
  }

  // ---------- logo ----------
  function loadLogo(file) {
    el.logo.value = "";
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) return pushTransient("error", "errLogoType");
    if (file.size > LOGO_MAX_BYTES) return pushTransient("error", "errLogoSize");
    const reader = new FileReader();
    reader.onerror = () => pushTransient("error", "errLogoRead");
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // SVGs without intrinsic size report 0: fall back to a square.
        const width = img.naturalWidth || 300;
        const height = img.naturalHeight || 300;
        state.logo = { img, dataUrl: reader.result, width, height };
        el.logoRemove.hidden = false;
        update();
      };
      img.onerror = () => pushTransient("error", "errLogoRead");
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    state.logo = null;
    el.logoRemove.hidden = true;
    update();
    el.logo.focus();
  }

  // ---------- wiring ----------
  function selectedColour() {
    const choice = document.querySelector('input[name="colour"]:checked').value;
    return choice === "custom" ? el.picker.value : choice;
  }

  let timer = 0;
  const debounced = () => { clearTimeout(timer); timer = setTimeout(update, 120); };

  el.content.addEventListener("input", debounced);
  el.ecc.addEventListener("change", update);
  document.querySelectorAll('input[name="colour"]').forEach((r) => r.addEventListener("change", () => { state.color = selectedColour(); update(); }));
  el.picker.addEventListener("input", () => {
    $("#colour-custom").checked = true;
    state.color = selectedColour();
    update();
  });
  el.logo.addEventListener("change", () => loadLogo(el.logo.files[0]));
  el.logoRemove.addEventListener("click", removeLogo);
  document.querySelectorAll("[data-lang]").forEach((b) => b.addEventListener("click", () => setLocale(b.dataset.lang)));
  $("#form").addEventListener("submit", (e) => e.preventDefault());

  $("#dl-png").addEventListener("click", () => exportRaster("image/png", "png"));
  $("#dl-jpeg").addEventListener("click", () => exportRaster("image/jpeg", "jpg"));
  $("#dl-webp").addEventListener("click", () => exportRaster("image/webp", "webp"));
  $("#dl-svg").addEventListener("click", exportSvg);
  $("#dl-pdf").addEventListener("click", exportPdf);
  $("#copy-png").addEventListener("click", copyPng);

  // Feature detection: hide what this browser cannot do.
  const probe = document.createElement("canvas");
  probe.width = probe.height = 1;
  if (!probe.toDataURL("image/webp").startsWith("data:image/webp")) $("#dl-webp").hidden = true;
  if (!(navigator.clipboard && window.ClipboardItem)) $("#copy-png").hidden = true;

  state.color = selectedColour();
  applyLocale();
  $("main").hidden = false;
  $("#compat").hidden = false;
  $("footer").hidden = false;
  update();
  window.__uniboQrReady = true; // read by boot-guard.js
})();
