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

```ts
import { calculateContrast } from '@pawn002/okca';

// calculateContrast(foreground, background)
calculateContrast('#ffffff', '#000000');  // 21.0 — white fg on black bg
calculateContrast('#000000', '#ffffff');  // 20.0 — black fg on white bg (different score)

// WCAG AA boundary grey — fails AA in both directions
calculateContrast('#ffffff', '#767676');  // 3.5
calculateContrast('#767676', '#ffffff');  // 3.3

// Chromatic — WCAG gives 6.6 (false pass); OKCA correctly fails
calculateContrast('#ff69b4', '#1a1a1a'); // 3.7
```

**Argument order matters.** The first argument is the foreground element (text, icon, or other visual element); the second is the background surface it sits on. `okca(A, B) ≠ okca(B, A)`.

Or use the class:

```ts
import { OkcaService } from '@pawn002/okca';

const okca = new OkcaService();
okca.calculateContrast('#fff', '#000');  // 21.0 — foreground, background
```

Accepts 3- and 6-digit hex strings (`#fff`, `#ff8000`), CSS `oklab()`, and CSS `oklch()`:

```ts
// CSS oklab — values direct or as percentages (100% L = 1, 100% a/b = 0.4)
calculateContrast('oklab(1 0 0)', 'oklab(0 0 0)');           // 21.0

// CSS oklch — hue in deg (default), rad, turn, or grad
calculateContrast('oklch(1 0 0)', 'oklch(0 0 0)');           // 21.0
calculateContrast('oklch(70% 37.5% 180deg)', '#ffffff');      // mixed formats ok
```

## Module formats

The package ships both ESM and CommonJS. Bundlers and Node with `"type": "module"` resolve ESM automatically via the `exports` field. CommonJS projects use `require`:

```js
// ESM (default for bundlers / Node ESM)
import { calculateContrast } from '@pawn002/okca';

// CommonJS
const { calculateContrast } = require('@pawn002/okca');
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
