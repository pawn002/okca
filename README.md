# okca — OK Contrast Algorithm

**A stricter drop-in for WCAG 2.x contrast.** Same 1–21 scale, same AA (4.5) and AAA (7.0) thresholds — use it exactly where you use a WCAG contrast check today. The one difference that matters: **OKCA is never more permissive than WCAG.** If a pair clears OKCA it clears WCAG; OKCA just also declines to rubber-stamp the cases WCAG over-rates.

> **Scope.** OKCA is a stricter WCAG 2.x checker for sRGB. It isn't a new perceptual model and doesn't try to reinvent how contrast is predicted — it makes the WCAG check you already run harder to turn into a false pass.

It closes four WCAG 2.x gaps:

1. **Saturated colours.** WCAG scores hot pink on near-black 6.6:1 — a comfortable pass. OKCA scores it **3.0**: it tells saturated colour from grey at the same luminance, and WCAG can't. The penalty follows how colour-vision deficiency actually loses contrast: full strength for reds, oranges and magentas, much lighter for blues and greens. Saturated blue `#3b82f6` on black scores 3.6 (2.4 before).

2. **Polarity.** WCAG rates `contrast(A on B)` and `contrast(B on A)` identically. OKCA doesn't — light-on-dark and dark-on-light are different decisions and score differently.

3. **Background.** WCAG treats a colour's lightness as fixed, whatever it sits on. In the CAM16 colour appearance model (the basis of the CIE's CIECAM16), a darker background flattens the lightness scale, so the same pair carries less lightness difference on dark than on light. OKCA applies that correction to the darker colour on any background darker than `#767676`: light grey `#cccccc` on `#333333` scores **5.7** where WCAG gives 7.9. Lighter backgrounds are unaffected, and no score rises.

4. **Fragile dark-mode passes.** On a near-black background, WCAG's ratio comes mostly from the background being nearly black — the first thing stray light takes away. A grey that just passes AA on black keeps a ratio of 3.1 when the flare allowance doubles; one that just passes on white keeps 4.5. OKCA caps each score at what the pair keeps under that doubled flare, so `#888888` on black scores **3.7** where WCAG gives 5.9. Light-mode greys are unaffected, and like the background correction it never raises a score.

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
contrast('#ff69b4', '#1a1a1a'); // 3.0

// Mid-grey on black: WCAG 5.9, but most of it rides on the background staying black
contrast('#888888', '#000000'); // 3.7
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
- **CVD-informed:** chroma is weighted along Oklab's opponent axes, in the directions colour-vision deficiency loses contrast, so hues colourblind viewers see well are penalised less — no hue branch (`docs/OPPONENT_AXIS_FINDINGS.md`)
- **Background-aware:** on backgrounds darker than `#767676`, the darker colour's lightness is corrected for the background, following CAM16 (`docs/CAM16_FINDINGS.md`)
- **Flare-robust:** two pairs with the same score carry comparable margin against stray light, on dark backgrounds and light ones alike (`docs/MIDTONE_SURVEY_FINDINGS.md`)
- **Zero dependencies:** pure TypeScript, no runtime deps
- **Clean-room implementation:** no third-party contrast algorithm source code

*Never-more-permissive is verified, not hoped for:* `OKCA ≤ WCAG` holds for every sRGB pair — checked across the full gamut and re-run in CI on every change (`npm run fp0`; the argument is in [`docs/FP0_PROOF.md`](docs/FP0_PROOF.md)). OKCA's ceiling is 20.9, not 21 — the sliver of headroom that keeps the guarantee airtight.

## Validation

Tested against 1,249 color pairs across three batteries (light-on-dark, dark-on-light, design systems from Tailwind/GOV.UK/USWDS):

| Battery | Pairs | False Passes | WCAG Disagreements |
|---------|------:|:------------:|:-----------------:|
| Light-on-dark | 53 | 0 | — |
| Dark-on-light | 54 | 0 | — |
| Design systems | 1,142 | 0 | 109 |
| **Total** | **1,249** | **0** | **109** |

**False passes: zero.** OKCA never approves a pair that WCAG rejects.

**WCAG disagreements** are pairs where OKCA scores below 4.5 but WCAG scores ≥ 4.5. These are intentional. WCAG's 4.5:1 AA threshold is widely considered too permissive: white on `#767676` — WCAG's own AA boundary anchor — sits exactly on the line, where the verdict turns on the display and the room rather than on the colors. The same pair can read acceptably on a bright screen and not on a dimmer one ([#22](https://github.com/pawn002/okca/issues/22#issuecomment-5282357292)). A threshold with no margin against viewing conditions is the problem, and all 109 disagreements sit in that zone.

**Found a false pass?** `OKCA ≤ WCAG` is verified across sRGB (`docs/FP0_PROOF.md`). If you somehow find an sRGB pair OKCA scores **above** the WCAG ratio, that's a bug — [open an issue](https://github.com/pawn002/okca/issues) and I'll fix it.

## Further reading

Algorithm design, calibration rationale, the FP = 0 proof (exact identity + interval-verified lemmas, `docs/FP0_PROOF.md`), and extension guidelines: [`docs/OKCA_DESIGN.md`](https://github.com/pawn002/okca/blob/main/docs/OKCA_DESIGN.md).

## License

MIT
