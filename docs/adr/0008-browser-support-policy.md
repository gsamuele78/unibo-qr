# ADR 0008 — Browser support policy and unsupported-browser handling

**Status:** Accepted · **Date:** 2026-11-25

## Context
The tool is handed to staff and students on unmanaged devices. "Works in my Chrome" is not enough, and a silently broken page on an old browser is worse than a clear message. Tests originally ran on Chromium only (ADR 0003).

## Decision
- **Declared support:** Chrome 90+, Edge 90+, Firefox 90+, Safari 15+ — defined once in `BROWSER_SUPPORT` (`src/qr-core.js`) and reused by the in-app banner, the static warning (injected at build time) and the README.
- **How the minimums were chosen:** from the newest platform features in use (CSS `aspect-ratio`, `Element.replaceChildren`, `Blob.arrayBuffer`), rounded up. They are not validated on those old releases.
- **Automated verification:** the E2E suite runs on Playwright's current Chromium, Firefox and WebKit on Linux, plus WebKit on macOS. Both `file://` and HTTP delivery are exercised.
- **Detection:** capability checks (`missingFeatures`), never user-agent sniffing.
- **Failure mode:** the form stays hidden until the app has started. A separate ES5 script (`src/boot-guard.js`, own CSP hash) reveals a static bilingual warning when the app did not start for any reason: syntax too new, missing API, runtime error. `<noscript>` covers disabled JavaScript.
- **Optional features** (WebP export, copy to clipboard) are hidden when unavailable rather than raising the minimum versions.

## Consequences
- ✅ Every user sees either a working tool or an explanation.
- ✅ Raising a minimum is a one-line change with tests guarding the banner text.
- ⚠️ Playwright WebKit is not Safari: Safari-specific bugs (especially iOS) can escape CI. Manual check on a real iPhone before large print runs is still advised.
- ⚠️ Old-version support is by analysis only; no BrowserStack-style matrix (would need a paid service).
- ⚠️ CI time roughly triples for E2E; macOS runners are slower. Acceptable on a public repository (free minutes).
