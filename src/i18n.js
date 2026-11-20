/*
 * unibo-qr i18n — Italian (default) and English dictionaries.
 * SPDX-License-Identifier: MIT
 * To add a language: add a dictionary with the same keys and append its code
 * to SUPPORTED; tests/unit/i18n.test.js enforces key and placeholder parity.
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.UniboQrI18n = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const SUPPORTED = ["it", "en"];
  const DEFAULT_LOCALE = "it";

  const MESSAGES = {
    it: {
      institution: "Università di Bologna",
      appTitle: "Generatore di QR code",
      appSubtitle: "Funziona offline, in un solo file. Nessun dato lascia il tuo dispositivo.",
      langLabel: "Lingua",
      contentLabel: "Contenuto (indirizzo web o testo)",
      contentHint: "Gli indirizzi senza protocollo vengono completati con https://",
      contentPlaceholder: "https://www.unibo.it",
      styleLegend: "Aspetto",
      colourLabel: "Colore dei moduli",
      colourBlack: "Nero (consigliato)",
      colourUnibo: "Rosso UniBo",
      colourCustom: "Personalizzato",
      eccLabel: "Correzione d'errore",
      eccL: "L — 7% (codice più piccolo)",
      eccM: "M — 15% (standard)",
      eccQ: "Q — 25%",
      eccH: "H — 30% (stampa, superfici usurabili)",
      eccForcedByLogo: "Con un logo la correzione è impostata su H.",
      logoLabel: "Logo centrale (facoltativo)",
      logoHint: "PNG, JPEG, WebP o SVG, max 2 MB. Usa solo loghi che hai titolo a usare.",
      logoRemove: "Rimuovi logo",
      exportLegend: "Esporta",
      rasterSizeLabel: "Dimensione immagini raster",
      sizePx: "{n} px",
      pdfSizeLabel: "Dimensione PDF (lato)",
      sizeMm: "{n} mm",
      downloadPng: "PNG",
      downloadJpeg: "JPEG",
      downloadWebp: "WebP",
      downloadSvg: "SVG (vettoriale)",
      downloadPdf: "PDF (vettoriale)",
      copyPng: "Copia immagine",
      copied: "Immagine copiata negli appunti.",
      copyFailed: "Impossibile copiare negli appunti in questo browser.",
      previewLabel: "Anteprima",
      previewAlt: "Anteprima del QR code per: {text}",
      info: "Versione {version} · {size}×{size} moduli · correzione {ecc}",
      errEmpty: "Inserisci un indirizzo o un testo.",
      errTooLong: "Contenuto troppo lungo per un QR code con questo livello di correzione.",
      errColour: "Contrasto insufficiente: scegli un colore più scuro.",
      errLogoType: "Formato del logo non supportato.",
      errLogoSize: "Il logo supera i 2 MB.",
      errLogoRead: "Impossibile leggere il file del logo.",
      warnInsecureUrl: "L'indirizzo usa http:// e non https://: verifica che sia corretto.",
      warnExternalDomain: "Nota: l'indirizzo non appartiene al dominio unibo.it.",
      warnDangerousScheme: "Questo tipo di indirizzo non è consentito.",
      warnColour: "Contrasto basso: alcuni lettori potrebbero non riconoscere il codice.",
      scanAdvice: "Prima di stampare, verifica la lettura con almeno due dispositivi diversi.",
      footerOffline: "Funziona senza connessione: nessuna risorsa esterna, nessun tracciamento.",
      footerLicense: "Software libero con licenza MIT. QR Code è un marchio registrato di DENSO WAVE.",
    },
    en: {
      institution: "University of Bologna",
      appTitle: "QR code generator",
      appSubtitle: "Works offline, in a single file. No data leaves your device.",
      langLabel: "Language",
      contentLabel: "Content (web address or text)",
      contentHint: "Addresses without a protocol are completed with https://",
      contentPlaceholder: "https://www.unibo.it/en",
      styleLegend: "Appearance",
      colourLabel: "Module colour",
      colourBlack: "Black (recommended)",
      colourUnibo: "UniBo red",
      colourCustom: "Custom",
      eccLabel: "Error correction",
      eccL: "L — 7% (smallest code)",
      eccM: "M — 15% (standard)",
      eccQ: "Q — 25%",
      eccH: "H — 30% (print, worn surfaces)",
      eccForcedByLogo: "With a logo, error correction is set to H.",
      logoLabel: "Centre logo (optional)",
      logoHint: "PNG, JPEG, WebP or SVG, max 2 MB. Only use logos you are entitled to use.",
      logoRemove: "Remove logo",
      exportLegend: "Export",
      rasterSizeLabel: "Raster image size",
      sizePx: "{n} px",
      pdfSizeLabel: "PDF size (edge)",
      sizeMm: "{n} mm",
      downloadPng: "PNG",
      downloadJpeg: "JPEG",
      downloadWebp: "WebP",
      downloadSvg: "SVG (vector)",
      downloadPdf: "PDF (vector)",
      copyPng: "Copy image",
      copied: "Image copied to clipboard.",
      copyFailed: "Copying to the clipboard is not possible in this browser.",
      previewLabel: "Preview",
      previewAlt: "QR code preview for: {text}",
      info: "Version {version} · {size}×{size} modules · correction {ecc}",
      errEmpty: "Enter an address or some text.",
      errTooLong: "Content too long for a QR code at this error-correction level.",
      errColour: "Insufficient contrast: choose a darker colour.",
      errLogoType: "Unsupported logo format.",
      errLogoSize: "The logo exceeds 2 MB.",
      errLogoRead: "The logo file could not be read.",
      warnInsecureUrl: "The address uses http:// instead of https://: check that it is correct.",
      warnExternalDomain: "Note: the address is not on the unibo.it domain.",
      warnDangerousScheme: "This kind of address is not allowed.",
      warnColour: "Low contrast: some scanners may fail to read the code.",
      scanAdvice: "Before printing, test the scan with at least two different devices.",
      footerOffline: "Works without a connection: no external resources, no tracking.",
      footerLicense: "Free software under the MIT licence. QR Code is a registered trademark of DENSO WAVE.",
    },
  };

  function resolveLocale(stored, languages) {
    if (SUPPORTED.includes(stored)) return stored;
    for (const lang of languages || []) {
      const base = String(lang).toLowerCase().split("-")[0];
      if (SUPPORTED.includes(base)) return base;
    }
    return DEFAULT_LOCALE;
  }

  function translate(locale, key, params) {
    const dict = MESSAGES[locale] || MESSAGES[DEFAULT_LOCALE];
    const msg = dict[key];
    if (msg === undefined) return key;
    return msg.replace(/\{(\w+)\}/g, (m, p) => (params && p in params ? String(params[p]) : m));
  }

  return { SUPPORTED, DEFAULT_LOCALE, MESSAGES, resolveLocale, translate };
});
