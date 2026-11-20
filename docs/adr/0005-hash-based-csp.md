# ADR 0005 — Hash-based Content-Security-Policy

**Status:** Accepted · **Date:** 2026-11-20

## Context
The file is opened from arbitrary hosts where we control no HTTP headers. Inline code normally implies `'unsafe-inline'`.

## Decision
The build computes SHA-256 of the inlined script and stylesheet and emits a `<meta http-equiv="Content-Security-Policy">`:
`default-src 'none'; script-src 'sha256-…'; style-src 'sha256-…'; img-src data: blob:; base-uri 'none'; form-action 'none'`.
No `style=""` attributes or inline handlers are allowed in the template.

## Consequences
- ✅ Even if injection occurred, no foreign script could run and no data could be exfiltrated (`connect-src` falls back to `'none'`).
- ⚠️ `frame-ancestors` cannot be set via `<meta>`; hosts wanting clickjacking protection must add the HTTP header.
