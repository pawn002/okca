# okca — OK Contrast Algorithm

**A stricter drop-in for WCAG 2.x contrast.** Same 1–21 scale, same AA (4.5) and AAA (7.0) thresholds — use it exactly where you use a WCAG contrast check today. The one difference that matters: **OKCA is never more permissive than WCAG.** If a pair clears OKCA it clears WCAG; OKCA just also declines to rubber-stamp the cases WCAG over-rates.

> **Scope.** OKCA is a stricter WCAG 2.x checker for sRGB. It isn't a new perceptual model and doesn't try to reinvent how contrast is predicted — it makes the WCAG check you already run harder to turn into a false pass.

It closes the two WCAG 2.x gaps practitioners hit most:

1. **Saturated colours.** WCAG scores hot pink on near-black 6.6:1 — a comfortable pass. OKCA scores it **3.6**: it tells saturated colour from grey at the same luminance, and WCAG can't.

2. **Polarity.** WCAG rates `contrast(A on B)` and `contrast(B on A)` identically. OKCA doesn't — light-on-dark and dark-on-light are different decisions and score differently.

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

- **Never more permissive than WCAG:** every score is at or below the WCAG equivalent for the same pair; AA/AAA thresholds unchanged
- **Polarity-aware:** `okca(foreground, background) ≠ okca(background, foreground)` — scores differ by direction
- **Zero dependencies:** pure TypeScript, no runtime deps
- **Clean-room implementation:** no third-party contrast algorithm source code

*Never-more-permissive is verified, not hoped for:* `OKCA ≤ WCAG` holds for every sRGB pair — checked across the full gamut and re-run in CI on every change (`npm run fp0`; the argument is in [`docs/FP0_PROOF.md`](docs/FP0_PROOF.md)). OKCA's ceiling is 20.9, not 21 — the sliver of headroom that keeps the guarantee airtight.

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

**Found a false pass?** `OKCA ≤ WCAG` is verified across sRGB (`docs/FP0_PROOF.md`). If you somehow find an sRGB pair OKCA scores **above** the WCAG ratio, that's a bug — [open an issue](https://github.com/pawn002/okca/issues) and I'll fix it.

## Further reading

Algorithm design, calibration rationale, the FP = 0 proof (exact identity + interval-verified lemmas, `docs/FP0_PROOF.md`), and extension guidelines: [`docs/OKCA_DESIGN.md`](https://github.com/pawn002/okca/blob/main/docs/OKCA_DESIGN.md).

## License

MIT
