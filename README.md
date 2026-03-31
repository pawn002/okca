# okca — OK Contrast Algorithm

OKCA is a color contrast algorithm that improves on WCAG 2.x while staying fully compatible with it: same 1–21 scale, same AA (4.5) and AAA (7.0) thresholds, and a mathematical guarantee of **zero false passes** — OKCA never approves a pair that WCAG rejects.

WCAG 2.x has two well-documented failure modes that OKCA closes:

1. **Saturated chromatic false passes.** WCAG passes hot pink on near-black at 6.6:1 — a comfortable AA score. Practitioners flag it as inadequate; OKCA scores it 3.7. The difference is that WCAG's luminance formula cannot distinguish saturated colour from grey at the same luminance, while OKCA can.

2. **Polarity blindness.** WCAG treats `contrast(A on B)` and `contrast(B on A)` as identical. Design systems and practitioners do not — dark mode and light mode are different decisions. OKCA scores them differently.

## Install

```bash
npm install @pawn002/okca
```

## Usage

`calculateContrast(foreground, background)` — first argument is the element being evaluated (text, icon, or other visual element), second is the surface it sits on. Argument order matters: `okca(A, B) ≠ okca(B, A)`.

```ts
import { calculateContrast } from '@pawn002/okca';

calculateContrast('#ffffff', '#000000');  // 21.0 — white on black
calculateContrast('#000000', '#ffffff');  // 20.0 — black on white

// WCAG AA boundary grey — fails in both directions
calculateContrast('#ffffff', '#767676');  // 3.5
calculateContrast('#767676', '#ffffff');  // 3.3

// Chromatic false pass in WCAG — OKCA correctly fails
calculateContrast('#ff69b4', '#1a1a1a'); // 3.7
```

Also accepts CSS `oklab()` and `oklch()` alongside hex:

```ts
calculateContrast('oklab(1 0 0)', 'oklab(0 0 0)');           // 21.0
calculateContrast('oklch(70% 37.5% 180deg)', '#ffffff');      // mixed formats ok
```

CommonJS:

```js
const { calculateContrast } = require('@pawn002/okca');
```

A class-based API is also available:

```ts
import { OkcaService } from '@pawn002/okca';
const okca = new OkcaService();
okca.calculateContrast('#fff', '#000');  // 21.0
```

## Properties

- **Polarity-aware:** `okca(foreground, background) ≠ okca(background, foreground)` — scores differ by direction
- **Conservative:** all scores at or below WCAG equivalent; AA/AAA thresholds unchanged
- **Zero dependencies:** pure TypeScript, no runtime deps
- **Clean-room implementation:** no third-party contrast algorithm source code

## Validation

Tested against 1,249 color pairs across three batteries (light-on-dark, dark-on-light, design systems from Tailwind/GOV.UK/USWDS):

| Battery | Pairs | False Passes | WCAG Disagreements |
|---------|------:|:------------:|:-----------------:|
| Light-on-dark | 53 | 0 | — |
| Dark-on-light | 54 | 0 | — |
| Design systems | 1,142 | 0 | 111 |
| **Total** | **1,249** | **0** | **111** |

**False passes: zero.** OKCA never approves a pair that WCAG rejects.

**WCAG disagreements** are pairs where OKCA scores below 4.5 but WCAG scores ≥ 4.5. These are intentional. WCAG's 4.5:1 AA threshold is widely considered too permissive — white on `#767676` (WCAG's own AA boundary anchor) is not production-ready in most real-world designs. All 111 disagreements involve colors in that marginal zone.

## Further reading

Algorithm design, calibration rationale, FP = 0 proof, and extension guidelines: [`docs/OKCA_DESIGN.md`](docs/OKCA_DESIGN.md).

## License

MIT
