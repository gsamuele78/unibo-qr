# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/).

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
