# Security policy

## Reporting

Please report vulnerabilities privately via GitHub **Security → Report a vulnerability**
(private vulnerability reporting) rather than a public issue.

## Threat model (summary)

- The app runs entirely client-side from a static file; it has no server, no storage of user data beyond the UI language in `localStorage`.
- A hash-based CSP (`default-src 'none'`) blocks any script or style that is not part of the build, and any network connection.
- User-supplied text is only placed into the DOM via `textContent` and into SVG via XML escaping; colours are validated as hex; logos must be `data:image/*;base64` URLs of an allow-listed type.
- `javascript:`, `data:`, `vbscript:` and `file:` payloads are refused, so the tool cannot be used to mint QR codes for those schemes.
- Integrity: each release publishes `unibo-qr.html.sha256` and a GitHub build-provenance attestation (`gh attestation verify unibo-qr.html -R <owner>/unibo-qr`).
