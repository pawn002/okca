# okca — OK Contrast Algorithm

OKLCH-native, polarity-aware contrast ratio with **zero false passes** against WCAG 2.x.

OKCA outputs ratios on the familiar 1–21 scale with the same AA (4.5) and AAA (7.0) thresholds as WCAG. It is stricter than WCAG in two ways: saturated chromatic colors are penalised relative to achromatic equivalents, and scores are polarity-aware — the same color pair scores differently depending on which element is foreground and which is background.

**Argument order matters.** `calculateContrast(foreground, background)` — the first argument is the element being evaluated (text, icon, or other visual element); the second is the surface it sits on. For text this is unambiguous. For other visual elements the caller determines which role each color plays.

## Install

```bash
npm install @pawn002/okca
```

## Module formats

The package ships both ESM and CommonJS. Bundlers and Node with `"type": "module"` resolve ESM automatically via the `exports` field. CommonJS projects use `require`:

```js
// ESM (default for bundlers / Node ESM)
import { calculateContrast } from '@pawn002/okca';

// CommonJS
const { calculateContrast } = require('@pawn002/okca');
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

## What OKCA solves

WCAG 2.x contrast has two well-documented failure modes:

1. **False passes for saturated chromatic text.** Hot pink on near-black scores 6.6:1 under WCAG — a comfortable AA pass — but is one of the most commonly cited cases where WCAG's result does not match production experience or practitioner judgement.

2. **Polarity blindness.** WCAG treats `contrast(A, B)` and `contrast(B, A)` as identical. Designers and design systems treat the two directions as distinct — dark mode and light mode are different decisions. WCAG's formula discards that distinction entirely.

OKCA corrects both while guaranteeing **FP = 0** — OKCA never approves a pair that WCAG rejects.

## Properties

- **Polarity-aware:** `okca(foreground, background) ≠ okca(background, foreground)` — scores differ by direction
- **Conservative:** all scores at or below WCAG equivalent; AA/AAA thresholds unchanged
- **Zero dependencies:** pure TypeScript, no runtime deps
- **Clean-room implementation:** no third-party contrast algorithm source code

## Validation

Tested against 2,587 color pairs across three batteries (light-on-dark, dark-on-light, design systems from Tailwind/Material/Radix):

| Battery | Pairs | False Passes | WCAG Disagreements |
|---------|------:|:------------:|:-----------------:|
| Light-on-dark | 53 | 0 | — |
| Dark-on-light | 54 | 0 | — |
| Design systems | 2,480 | 0 | 225 |
| **Total** | **2,587** | **0** | **225** |

**False passes: zero.** OKCA never approves a pair that WCAG rejects.

**WCAG disagreements** are pairs where OKCA scores below 4.5 but WCAG scores ≥ 4.5. These are intentional. WCAG's 4.5:1 AA threshold is widely considered too permissive — white on `#767676` (WCAG's own AA boundary anchor) is not production-ready in most real-world designs. All 225 disagreements involve colors in that marginal zone where proximity to the boundary is not the same as being safely above it.

## License

MIT
