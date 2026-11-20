# ADR 0001 — Single-file, offline HTML artefact

**Status:** Accepted · **Date:** 2026-11-20

## Context
The tool must be usable by any UniBo department: web spaces, Moodle course files, shared drives, a laptop with no connection. Requesting a server (PHP/Python/Node) from central IT costs time, and CDN-based tools break when the CDN changes or disappears.

## Decision
Ship exactly one file, `dist/unibo-qr.html`, with all CSS and JS inlined, produced by a zero-dependency Node build script (`scripts/build.mjs`). Sources stay split (`src/`, `vendor/`) for maintainability and testing.

## Consequences
- ✅ Works from `file://`, any static host, or GitHub Pages; no runtime dependencies.
- ✅ Nothing to patch on a server; integrity is verifiable via the published SHA-256.
- ⚠️ Updates do not propagate: every copy is a frozen version. Mitigation: version in the footer, releases page as the single source.
- ⚠️ A build step exists; contributors must not edit `dist/` (git-ignored).
