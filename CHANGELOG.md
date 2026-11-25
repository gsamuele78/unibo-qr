# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/).

## [1.1.0] — 2026-11-25

### Added
- Compatibility banner in the app (IT/EN): supported browsers with minimum
  versions and software requirements.
- Unsupported-browser handling: feature detection plus an ES5 boot guard show a
  bilingual warning instead of a broken form; `<noscript>` message.
- E2E suite now runs on Chromium, Firefox and WebKit (Linux) and WebKit on
  macOS; `node scripts/e2e.mjs <browser>`, `npm run test:e2e:all` (cross-platform
  runner, works from Windows shells too).
- E2E coverage for the file served over HTTP (GitHub Pages scenario).

### Fixed
- Served over HTTP, Firefox requested `/favicon.ico`, which the CSP blocked with
  a console error. An embedded `data:` icon removes the request in every browser.

### Changed
- GitHub Pages deployment is now manual only; nothing is published on push.
- Releases are cut automatically when a new version lands on `main`; no tag
  has to be pushed by hand.
- Dependabot no longer proposes TypeScript major upgrades (TypeScript 7 drops
  the compiler API used by `npm run vendor`).

## [1.0.0] — 2026-11-20

### Added
- Single-file, offline QR code generator (`dist/unibo-qr.html`).
- Italian / English UI; follows browser language, remembers manual choice.
- Export: PNG, JPEG, WebP (raster, 256–4096 px), SVG and PDF (true vector).
- Optional centre logo (PNG/JPEG/WebP/SVG ≤ 2 MB), forces ECC level H.
- Colour presets (black, UniBo red) and custom colour with contrast gating.
- Hash-based Content-Security-Policy; zero network requests.
- Unit tests (node:test) with round-trip decoding via jsQR; E2E tests
  (Playwright) incl. download decoding and axe-core accessibility checks.
- CI (lint, unit + coverage gates, E2E, vendored-code integrity), CodeQL,
  GitHub Pages deploy, tagged releases with build-provenance attestation.

### Fixed (relative to the original snippet)
- SVG namespace `http://w3.org` → `http://www.w3.org/2000/svg`.
- Logo was never written into the SVG (empty template literal).
- Quiet zone 3 → 4 modules (ISO/IEC 18004), identical in every format.
- Non-integer module size produced blurry raster exports.
- Object URLs were never revoked (memory leak).
