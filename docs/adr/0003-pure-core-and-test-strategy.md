# ADR 0003 — Pure core module + two-layer TDD strategy

**Status:** Accepted · **Date:** 2026-11-20

## Context
The original snippet mixed DOM, rendering and serialisation, making it untestable without a browser.

## Decision
- `src/qr-core.js` and `src/i18n.js` are DOM-free UMD modules: normalisation, classification, encoding, geometry, colour, SVG and PDF serialisation, translations.
- `src/app.js` only wires DOM events to the core.
- **Unit layer** — Node's built-in `node:test` (no framework dependency). Scannability is verified by rasterising the matrix and decoding it with an **independent decoder** (jsQR), including a worst-case logo-occlusion test across QR versions. Coverage gates: lines ≥ 95 %, branches ≥ 85 %, functions ≥ 95 %.
- **E2E layer** — Playwright drives the *built* file from `file://`: zero external requests, CSP present, IT/EN switching and persistence, validation messages, every download format decoded back to the payload, PNG pixel size, PDF page size, logo flow, a11y (axe-core, light + dark), phone-width layout.

## Consequences
- ✅ Tests exercise the shipped artefact, not a dev variant.
- ✅ "It decodes" is asserted, not assumed.
- ⚠️ jsQR is more forgiving than some phone scanners — keep the "test with two devices" advice before print runs.
- E2E originally ran on Chromium only; extended to Firefox and WebKit by ADR 0008.
