# ADR 0002 — Vendor Nayuki's QR encoder from pinned source

**Status:** Accepted · **Date:** 2026-11-20

## Context
Writing a QR encoder (Reed–Solomon, masking, version selection) is error-prone. Options considered: `qrcode` (npm, MIT, large, Node-oriented), `qrcode-generator` (MIT), Nayuki's *QR Code generator library* (MIT, ~1k lines, widely audited, used by the original snippet).

## Decision
Vendor Nayuki's upstream `qrcodegen.ts` verbatim in `vendor/`, transpile it with TypeScript via `npm run vendor`, and commit both. CI regenerates the JS and fails on any diff.

## Consequences
- ✅ API continuity with the original snippet; small, well-tested, permissive licence.
- ✅ Reproducible: the JS header records the SHA-256 of the TS source.
- ⚠️ Upstream fixes are not automatic (Dependabot cannot track it). Review upstream at each release.
