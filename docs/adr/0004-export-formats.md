# ADR 0004 — Export formats and hand-written SVG/PDF

**Status:** Accepted · **Date:** 2026-11-20

## Context
Users need: web/social (PNG, WebP), Office/legacy (JPEG), print shops and large banners (vector). A PDF library (jsPDF, pdf-lib) would add 100–300 KB.

## Decision
- **PNG / JPEG / WebP** via `canvas.toBlob`, 256–4096 px, integer module size (no anti-aliasing blur). WebP is hidden if unsupported.
- **SVG** hand-generated: one `<path>` with horizontal run-merging (smaller than one rect per module), `shape-rendering="crispEdges"`, `<title>`, logo as `xlink:href` data URL for compatibility with older print tools.
- **PDF 1.4** hand-generated (~120 lines): vector `re` fills, page size in mm (20–200), logo embedded as a DCT (JPEG) XObject. Byte-exact `xref` offsets are unit-tested.
- **Not provided:** EPS (legacy; PDF and SVG cover print workflows), CMYK/Pantone separations (RGB only — print shops convert).

## Consequences
- ✅ No extra dependencies; outputs are inspectable text.
- ⚠️ PDF is RGB, not PDF/X. If a printer demands PDF/X-1a or spot colours, convert in a prepress tool.
