# Contributing

## Setup

```bash
nvm use            # Node 22 (see .nvmrc)
npm ci
npx playwright install chromium firefox webkit
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
- `src/boot-guard.js` must stay ES5 and must not depend on the app bundle.
- If you use a newer web-platform feature, update `BROWSER_SUPPORT` in `src/qr-core.js` (single source for the banner, the warning and the README table).
- Do not edit `vendor/qrcodegen.js`; update `vendor/qrcodegen.ts` from upstream and run `npm run vendor`.
- Significant design changes need an ADR in `docs/adr/`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/).

## Releasing

Releases are automatic (ADR 0009). In a pull request:

1. bump `version` in `package.json` (and `package-lock.json`);
2. add a `## [X.Y.Z] — YYYY-MM-DD` section at the top of `CHANGELOG.md`.

When that pull request is merged, the `Release` workflow tests the commit, creates the tag `vX.Y.Z` and publishes `unibo-qr.html` with its SHA-256, a provenance attestation and the changelog section as notes. Nothing to run locally. Pushing a tag by hand still works.
