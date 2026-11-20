/*
 * unibo-qr core — pure, DOM-free logic (encoding, layout, SVG, PDF, colour).
 * SPDX-License-Identifier: MIT
 *
 * UMD-style: in the browser it exposes `window.UniboQrCore`; in Node it is
 * `require()`-able so it can be unit-tested without a browser.
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.UniboQrCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /** Quiet zone width in modules (ISO/IEC 18004 requires 4). */
  const QUIET_ZONE = 4;
  /** Logo edge as a fraction of the symbol edge (verified decodable at ECC H). */
  const LOGO_RATIO = 0.22;
  const LOGO_PAD_RATIO = 0.03;
  const ECC_ORDER = ["L", "M", "Q", "H"];
  const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const LOGO_DATA_URL_RE = /^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/]+=*$/;
  const DANGEROUS_SCHEMES = new Set(["javascript:", "data:", "vbscript:", "file:"]);

  class QrInputError extends Error {
    constructor(code, message) {
      super(message || code);
      this.name = "QrInputError";
      this.code = code;
    }
  }

  // ---------- input ----------

  function normalizeInput(raw) {
    const text = String(raw ?? "").trim();
    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(text);
    const bareDomain = /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#]\S*)?$/i;
    if (!hasScheme && bareDomain.test(text)) return "https://" + text;
    return text;
  }

  function isUniboHost(host) {
    const h = host.toLowerCase();
    return h === "unibo.it" || h.endsWith(".unibo.it");
  }

  function classifyInput(text) {
    if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) return { kind: "text", warnings: [] };
    let url;
    try { url = new URL(text); } catch { return { kind: "text", warnings: [] }; }
    if (DANGEROUS_SCHEMES.has(url.protocol)) return { kind: "url", warnings: ["dangerousScheme"] };
    if (url.protocol !== "http:" && url.protocol !== "https:") return { kind: "uri", warnings: [] };
    const warnings = [];
    if (url.protocol === "http:") warnings.push("insecureUrl");
    if (!isUniboHost(url.hostname)) warnings.push("externalDomain");
    return { kind: "url", warnings };
  }

  // ---------- colour ----------

  function hexToRgb(hex) {
    if (typeof hex !== "string" || !HEX_RE.test(hex)) throw new TypeError(`Invalid colour: ${hex}`);
    let h = hex.slice(1);
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function normalizeHex(hex) {
    const { r, g, b } = hexToRgb(hex);
    return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  }

  function relativeLuminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }

  function contrastRatio(a, b) {
    const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  }

  /** "ok" | "warn" | "error" for dark modules on a white background. */
  function colourStatus(hex) {
    const c = contrastRatio(hex, "#ffffff");
    if (c >= 4.5) return "ok";
    if (c >= 3) return "warn";
    return "error";
  }

  // ---------- geometry ----------

  function layout(qrSize, pixelSize, quietZone = QUIET_ZONE) {
    const total = qrSize + quietZone * 2;
    const moduleSize = Math.floor(pixelSize / total);
    if (moduleSize < 1) throw new RangeError(`Output too small: ${pixelSize}px for ${total} modules`);
    const offset = Math.floor((pixelSize - qrSize * moduleSize) / 2);
    return { moduleSize, offset, total };
  }

  /** Logo safe box in module units, in a coordinate space that includes the quiet zone. */
  function logoBox(qrSize, quietZone = QUIET_ZONE) {
    const total = qrSize + quietZone * 2;
    const size = qrSize * LOGO_RATIO;
    const pad = qrSize * LOGO_PAD_RATIO;
    const x = (total - size) / 2;
    return { x, y: x, size, pad };
  }

  function fitContain(w, h, box) {
    const ratio = Math.min(box / w, box / h);
    return { w: w * ratio, h: h * ratio };
  }

  // ---------- encoding ----------

  function createCore(qrcodegen) {
    const ECC = {
      L: qrcodegen.QrCode.Ecc.LOW, M: qrcodegen.QrCode.Ecc.MEDIUM,
      Q: qrcodegen.QrCode.Ecc.QUARTILE, H: qrcodegen.QrCode.Ecc.HIGH,
    };

    function encode(text, { ecc = "M", hasLogo = false } = {}) {
      if (!ECC_ORDER.includes(ecc)) throw new RangeError(`Unknown ECC level: ${ecc}`);
      const payload = String(text ?? "").trim();
      if (!payload) throw new QrInputError("EMPTY", "Input is empty");
      const level = hasLogo ? "H" : ecc;
      let qr;
      try {
        qr = qrcodegen.QrCode.encodeText(payload, ECC[level]);
      } catch (e) {
        if (e instanceof RangeError) throw new QrInputError("TOO_LONG", e.message);
        throw e;
      }
      return {
        size: qr.size,
        version: qr.version,
        ecc: ECC_ORDER[qr.errorCorrectionLevel.ordinal],
        text: payload,
        getModule: (x, y) => qr.getModule(x, y),
      };
    }
    return Object.assign({}, api, { encode });
  }

  // ---------- serialisers ----------

  function escapeXml(s) {
    return String(s).replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]);
  }

  /** Horizontal runs of dark modules: [{x, y, len}] in symbol coordinates. */
  function darkRuns(qr) {
    const runs = [];
    for (let y = 0; y < qr.size; y++) {
      let x = 0;
      while (x < qr.size) {
        if (!qr.getModule(x, y)) { x++; continue; }
        const start = x;
        while (x < qr.size && qr.getModule(x, y)) x++;
        runs.push({ x: start, y, len: x - start });
      }
    }
    return runs;
  }

  function validateLogo(logo) {
    if (!logo) return null;
    if (!LOGO_DATA_URL_RE.test(logo.dataUrl || "")) throw new TypeError("Invalid logo data URL");
    if (!(logo.width > 0 && logo.height > 0)) throw new TypeError("Invalid logo dimensions");
    return logo;
  }

  function buildSvg(qr, { color = "#000000", title = "QR code", logo = null, quietZone = QUIET_ZONE } = {}) {
    const fill = normalizeHex(color);
    validateLogo(logo);
    const total = qr.size + quietZone * 2;
    const d = darkRuns(qr).map((r) => `M${r.x + quietZone},${r.y + quietZone}h${r.len}v1h-${r.len}z`).join("");
    let logoSvg = "";
    if (logo) {
      const b = logoBox(qr.size, quietZone);
      const f = (n) => +n.toFixed(4);
      logoSvg =
        `\n  <rect x="${f(b.x - b.pad)}" y="${f(b.y - b.pad)}" width="${f(b.size + b.pad * 2)}" height="${f(b.size + b.pad * 2)}" fill="#ffffff"/>` +
        `\n  <image x="${f(b.x)}" y="${f(b.y)}" width="${f(b.size)}" height="${f(b.size)}" preserveAspectRatio="xMidYMid meet" xlink:href="${escapeXml(logo.dataUrl)}"/>`;
    }
    const t = escapeXml(title);
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 ${total} ${total}" width="${total * 10}" height="${total * 10}" shape-rendering="crispEdges" role="img" aria-label="${t}">
  <title>${t}</title>
  <rect width="100%" height="100%" fill="#ffffff"/>
  <path d="${d}" fill="${fill}"/>${logoSvg}
</svg>
`;
  }

  function buildPdf(qr, { color = "#000000", sizeMm = 50, logo = null, quietZone = QUIET_ZONE } = {}) {
    if (!(sizeMm >= 10 && sizeMm <= 2000)) throw new RangeError("sizeMm must be between 10 and 2000");
    const { r, g, b } = hexToRgb(color);
    const num = (n) => String(Number(n.toFixed(3)));
    const page = (sizeMm / 25.4) * 72;
    const total = qr.size + quietZone * 2;
    const m = page / total;

    const ops = [`1 1 1 rg\n0 0 ${num(page)} ${num(page)} re\nf\n`, `${num(r / 255)} ${num(g / 255)} ${num(b / 255)} rg\n`];
    for (const run of darkRuns(qr)) {
      const x = (run.x + quietZone) * m;
      const y = page - (run.y + quietZone + 1) * m;
      ops.push(`${num(x)} ${num(y)} ${num(run.len * m)} ${num(m)} re\n`);
    }
    ops.push("f\n");
    if (logo) {
      if (!(logo.jpegBytes instanceof Uint8Array) || !(logo.width > 0 && logo.height > 0)) {
        throw new TypeError("Invalid PDF logo");
      }
      const bx = logoBox(qr.size, quietZone);
      const fit = fitContain(logo.width, logo.height, bx.size * m);
      const cx = (bx.x + bx.size / 2) * m;
      const cy = page - (bx.y + bx.size / 2) * m;
      const boxPt = (bx.size + bx.pad * 2) * m;
      ops.push(`1 1 1 rg\n${num(cx - boxPt / 2)} ${num(cy - boxPt / 2)} ${num(boxPt)} ${num(boxPt)} re\nf\n`);
      ops.push(`q\n${num(fit.w)} 0 0 ${num(fit.h)} ${num(cx - fit.w / 2)} ${num(cy - fit.h / 2)} cm\n/Im1 Do\nQ\n`);
    }
    const content = ops.join("");

    const enc = (s) => { const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 255; return a; };
    const resources = logo ? "/Resources << /XObject << /Im1 5 0 R >> >>" : "/Resources << >>";
    const objects = [
      [enc("<< /Type /Catalog /Pages 2 0 R >>")],
      [enc("<< /Type /Pages /Kids [3 0 R] /Count 1 >>")],
      [enc(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(page)} ${num(page)}] /Contents 4 0 R ${resources} >>`)],
      [enc(`<< /Length ${content.length} >>\nstream\n`), enc(content), enc("\nendstream")],
    ];
    if (logo) {
      objects.push([
        enc(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.jpegBytes.length} >>\nstream\n`),
        logo.jpegBytes, enc("\nendstream"),
      ]);
    }

    const chunks = [enc("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
    let pos = chunks[0].length;
    const offsets = [];
    objects.forEach((parts, i) => {
      offsets.push(pos);
      const all = [enc(`${i + 1} 0 obj\n`), ...parts, enc("\nendobj\n")];
      all.forEach((c) => { chunks.push(c); pos += c.length; });
    });
    const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
      offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("") +
      `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF\n`;
    chunks.push(enc(xref));

    const out = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
    let o = 0;
    chunks.forEach((c) => { out.set(c, o); o += c.length; });
    return out;
  }

  function slugForFilename(text) {
    const slug = String(text)
      .replace(/^[a-z][a-z0-9+.-]*:\/*/i, "")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      .slice(0, 40).replace(/-+$/, "");
    return slug || "qr";
  }

  const api = {
    QUIET_ZONE, LOGO_RATIO, ECC_ORDER, QrInputError,
    normalizeInput, classifyInput, hexToRgb, normalizeHex, contrastRatio, colourStatus,
    layout, logoBox, fitContain, escapeXml, darkRuns, buildSvg, buildPdf, slugForFilename,
  };
  api.createCore = createCore;
  return api;
});
