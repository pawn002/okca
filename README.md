# okca — OK Contrast Algorithm

OKCA is a color contrast algorithm that improves on WCAG 2.x while staying a drop-in for it: same **1–21 scale**, same AA (4.5) and AAA (7.0) thresholds, and — every OKCA score lands **strictly at or below** the WCAG score for the same pair — **zero false passes relative to WCAG**: it never approves a pair that WCAG rejects. FP = 0 is **guaranteed by construction** across the full sRGB gamut (an exact identity plus interval-verified lemmas; see [`docs/FP0_PROOF.md`](https://github.com/pawn002/okca/blob/main/docs/FP0_PROOF.md)).

> **On the scale.** OKCA reports on WCAG's familiar 1–21 range against the same
> 4.5 / 7.0 thresholds, so it drops into existing WCAG-based tooling unchanged.
> The one deliberate difference at the very top: because OKCA is *strictly* ≤
> WCAG by construction, its maximum (white on black) is **20.9**, a hair under
> WCAG's 21 — the headroom that makes zero-false-pass a theorem rather than a
> calibration. Thresholds and interpretation are otherwise identical.

WCAG 2.x has two well-documented failure modes that OKCA closes:

1. **Saturated chromatic false passes.** WCAG passes hot pink on near-black at 6.6:1 — a comfortable AA score. Practitioners flag it as inadequate; OKCA scores it 3.6. The difference is that WCAG's luminance formula cannot distinguish saturated colour from grey at the same luminance, while OKCA can.

2. **Polarity blindness.** WCAG treats `contrast(A on B)` and `contrast(B on A)` as identical. Design systems and practitioners do not — dark mode and light mode are different decisions. OKCA scores them differently.

## Install

```bash
npm install @pawn002/okca
```

## Usage

`contrast(foreground, background)` — first argument is the element being evaluated (text, icon, or other visual element), second is the surface it sits on. Argument order matters: `okca(A, B) ≠ okca(B, A)`.

```ts
import { contrast } from '@pawn002/okca';

contrast('#ffffff', '#000000');  // 20.9 — white on black (strictly under WCAG's 21)
contrast('#000000', '#ffffff');  // 20.0 — black on white

// WCAG AA boundary grey — fails in both directions
contrast('#ffffff', '#767676');  // 3.9
contrast('#767676', '#ffffff');  // 3.7

// WCAG over-rates this chromatic pair (6.6:1); OKCA scores it below AA
contrast('#ff69b4', '#1a1a1a'); // 3.6
```

Also accepts CSS `oklab()` and `oklch()` alongside hex:

```ts
contrast('oklab(1 0 0)', 'oklab(0 0 0)');           // 20.9
contrast('oklch(70% 37.5% 180deg)', '#ffffff');      // mixed formats ok
```

CommonJS:

```js
const { contrast } = require('@pawn002/okca');
```

A class-based API is also available:

```ts
import { OkcaService } from '@pawn002/okca';
const okca = new OkcaService();
okca.contrast('#fff', '#000');  // 20.9
```

## Properties

- **Polarity-aware:** `okca(foreground, background) ≠ okca(background, foreground)` — scores differ by direction
- **Conservative:** every score is *strictly* at or below the WCAG equivalent — FP = 0 by construction (`docs/FP0_PROOF.md`); AA/AAA thresholds unchanged
- **Zero dependencies:** pure TypeScript, no runtime deps
- **Clean-room implementation:** no third-party contrast algorithm source code

## Validation

Tested against 1,249 color pairs across three batteries (light-on-dark, dark-on-light, design systems from Tailwind/GOV.UK/USWDS):

| Battery | Pairs | False Passes | WCAG Disagreements |
|---------|------:|:------------:|:-----------------:|
| Light-on-dark | 53 | 0 | — |
| Dark-on-light | 54 | 0 | — |
| Design systems | 1,142 | 0 | 97 |
| **Total** | **1,249** | **0** | **97** |

**False passes: zero.** OKCA never approves a pair that WCAG rejects.

**WCAG disagreements** are pairs where OKCA scores below 4.5 but WCAG scores ≥ 4.5. These are intentional. WCAG's 4.5:1 AA threshold is widely considered too permissive — white on `#767676` (WCAG's own AA boundary anchor) is not production-ready in most real-world designs. All 97 disagreements involve colors in that marginal zone.

**Found a false pass?** FP = 0 is proven by construction for sRGB (`docs/FP0_PROOF.md`). If you somehow find an sRGB pair OKCA scores **above** the WCAG ratio, that's a bug — [open an issue](https://github.com/pawn002/okca/issues) and I'll fix it.

## Further reading

Algorithm design, calibration rationale, the FP = 0 proof (exact identity + interval-verified lemmas, `docs/FP0_PROOF.md`), and extension guidelines: [`docs/OKCA_DESIGN.md`](https://github.com/pawn002/okca/blob/main/docs/OKCA_DESIGN.md).

## License

MIT
