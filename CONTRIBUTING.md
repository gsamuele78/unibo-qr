# Contributing

## Setup

```bash
nvm use            # Node 22 (see .nvmrc)
npm ci
npx playwright install chromium   # only if you have no local Chromium
```

## Workflow (TDD)

1. Write a failing test first — `tests/unit/` for pure logic in `src/qr-core.js`
   or `src/i18n.js`, `tests/e2e/` for anything touching the DOM.
2. Make it pass with the smallest change.
3. `npm test` (lint + unit + E2E) must be green before opening a PR.

Keep DOM-free logic in `src/qr-core.js` so it stays unit-testable; `src/app.js`
should only wire events to core functions.

## Rules

- **No runtime network access, ever.** No CDNs, fonts, analytics. The E2E suite fails on any external request.
- **No inline event handlers or `style=""` attributes** — the CSP is hash-based.
- New UI strings go into **both** dictionaries in `src/i18n.js`; the parity test enforces it.
- Do not edit `vendor/qrcodegen.js`; update `vendor/qrcodegen.ts` from upstream and run `npm run vendor`.
- Significant design changes need an ADR in `docs/adr/`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/).

## Releasing

Bump `version` in `package.json`, update `CHANGELOG.md`, then:

```bash
git tag v1.0.1 && git push origin v1.0.1
```

The `release` workflow tests, builds and publishes `unibo-qr.html` with its SHA-256 and a provenance attestation.
