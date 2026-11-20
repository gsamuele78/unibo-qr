# ADR 0006 — Scannability guards: quiet zone, colour, logo

**Status:** Accepted · **Date:** 2026-11-20

## Context
The most common real-world failure of institutional QR codes is not encoding but presentation: thin margins, light brand colours, oversized logos.

## Decision
- Quiet zone fixed at **4 modules** (ISO/IEC 18004) in every format.
- Background fixed to **white**; dark modules only (no inverted codes).
- Colour contrast vs. white (WCAG formula): ≥ 4.5 OK, 3–4.5 warning, < 3 **blocks export**.
- Logo edge = **22 %** of the symbol edge plus a 3 % white pad; presence forces **ECC H**. Unit tests prove decodability with the logo area fully occluded at versions 4, 5, 8, 13, 22 and 34.
- ECC is otherwise user-selectable; the encoder may boost it when it costs no extra size.
- `javascript:`, `data:`, `vbscript:`, `file:` payloads are refused; `http://` and non-`unibo.it` hosts produce informational warnings.

## Consequences
- ✅ Hard to produce an unscannable code by accident.
- ⚠️ No transparent background option (deliberate). Revisit only with evidence of need.
