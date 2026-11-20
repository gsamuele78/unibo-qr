# unibo-qr

[![CI](https://github.com/gsamuele78/unibo-qr/actions/workflows/ci.yml/badge.svg)](https://github.com/gsamuele78/unibo-qr/actions/workflows/ci.yml)
[![CodeQL](https://github.com/gsamuele78/unibo-qr/actions/workflows/codeql.yml/badge.svg)](https://github.com/gsamuele78/unibo-qr/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**IT** · Generatore di QR code **offline, bilingue (IT/EN), in un solo file HTML**, pensato per l'Università di Bologna.
**EN** · An **offline, bilingual (IT/EN), single-file** QR code generator, built for the University of Bologna.

> Progetto indipendente, non un servizio ufficiale dell'Ateneo. / Independent project, not an official University service.

---

## 🇮🇹 Italiano

### Uso
1. Scarica `unibo-qr.html` dalla pagina [Releases](https://github.com/gsamuele78/unibo-qr/releases) (oppure usa la versione su GitHub Pages).
2. Aprilo con un browser qualsiasi — anche senza connessione.
3. Inserisci un indirizzo o un testo, scegli colore, correzione d'errore ed eventuale logo.
4. Scarica in **PNG, JPEG, WebP** (256–4096 px), **SVG** o **PDF** vettoriali (20–200 mm).

Puoi copiare il file su uno spazio web di dipartimento, su Moodle o su un disco condiviso: non serve alcun server.

### Caratteristiche
- Nessuna richiesta di rete, nessun tracciamento; CSP restrittiva basata su hash.
- Interfaccia italiano/inglese: segue la lingua del browser e ricorda la scelta.
- SVG e PDF realmente vettoriali (adatti a striscioni e stampa tipografica).
- Protezioni di leggibilità: margine di 4 moduli, controllo del contrasto del colore, logo limitato e correzione H forzata.
- Accessibile (WCAG 2 AA verificato con axe-core), tema chiaro/scuro, layout per smartphone.

### Verifica integrità
```bash
sha256sum -c unibo-qr.html.sha256
```
```bash
gh attestation verify unibo-qr.html -R gsamuele78/unibo-qr
```

---

## 🇬🇧 English

### Usage
1. Download `unibo-qr.html` from [Releases](https://github.com/gsamuele78/unibo-qr/releases) (or use the GitHub Pages build).
2. Open it in any browser — no connection required.
3. Enter a URL or text; pick colour, error correction, optional logo.
4. Export **PNG, JPEG, WebP** (256–4096 px), or vector **SVG** / **PDF** (20–200 mm).

### Development

Requirements: Node ≥ 22.8.

```bash
npm ci
```
```bash
npx playwright install chromium
```
```bash
npm test
```

| Script | Purpose |
|---|---|
| `npm run build` | Inline everything into `dist/unibo-qr.html` (+ `.sha256`) |
| `npm run lint` | ESLint |
| `npm run test:unit` | `node:test` unit tests (incl. jsQR round-trip decoding) |
| `npm run test:coverage` | Unit tests with coverage gates (lines ≥ 95 %, branches ≥ 85 %) |
| `npm run test:e2e` | Build, then Playwright E2E against the built file |
| `npm run vendor` | Regenerate `vendor/qrcodegen.js` from the pinned TS source |

### Layout
```
src/qr-core.js     pure logic: normalise, classify, encode, layout, SVG, PDF, colour
src/i18n.js        IT/EN dictionaries + locale resolution
src/app.js         DOM wiring only
src/index.html     template (CSP/CSS/JS placeholders)
src/styles.css
vendor/            Nayuki QR encoder (MIT), pinned TS + generated JS
scripts/           build.mjs, vendor.mjs
tests/unit/        node:test
tests/e2e/         Playwright + jsQR + axe-core
docs/adr/          Architecture Decision Records
```

### CI/CD
- **CI** (`ci.yml`): lint, vendored-code integrity, `npm audit`, unit tests on Node 22 & 24 with coverage gates, E2E on Chromium, build artefact upload.
- **CodeQL** (`codeql.yml`): security analysis on push/PR and weekly.
- **Pages** (`pages.yml`): on `main`, tests then deploys the built file as `index.html`.
- **Release** (`release.yml`): on `vX.Y.Z` tags, tests, builds, attaches `unibo-qr.html` + SHA-256 and a build-provenance attestation.
- **Dependabot**: weekly npm and Actions updates.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and the [ADRs](docs/adr/README.md).

### Branding note
The "UniBo red" preset (`#BB2E29`) approximates the University's colour; check it against the official brand guidelines before institutional use. No University logo is bundled — users upload logos they are entitled to use.

## License
[MIT](LICENSE). Third-party components: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
