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

## Algorithm

OKCA uses OKLCH $L^3$ as a luminance proxy ($L^3 \approx Y_{\text{WCAG}}$ for neutral grays), with one chromatic correction and a final polarity step.

### 1. Chroma compression on lighter element

Saturated lighter colors get a power-compression penalty proportional to their Oklab chroma. A saturation weight ramps quadratically from 0 (achromatic) to 1 (vivid):

$$\text{satW} = \min\left(1, \left(\frac{C}{0.15}\right)^{2}\right)$$

This drives a variable exponent that compresses the lighter element's luminance:

$$\text{exp} = 1 + 0.50 \times \text{satW} \qquad Y_{\text{lighter}} = \left(L_{\text{lighter}}^{\text{exp}}\right)^3$$

Since $L \le 1$, a higher exponent always produces a smaller value — the ratio can only decrease. Achromatic colors (C = 0) pass through unchanged.

### 2. Darker element

Pure $L^3$ — no hue-specific corrections:

$$Y_{\text{darker}} = L_{\text{darker}}^{3}$$

### 3. Polarity power curve

The raw ratio is scaled by a power curve that encodes polarity asymmetry:

$$\text{ratio} = \text{CAP} \times \left(\frac{r}{21}\right)^{k}$$

where $r = (Y_{\text{lighter}} + 0.05) / (Y_{\text{darker}} + 0.05)$, $k = 1.175$, and:

$$\text{CAP} = \begin{cases} 21 & \text{light-on-dark (text is lighter)} \\ 20 & \text{dark-on-light (background is lighter)} \end{cases}$$

Both curves share the same exponent $k$; the lower cap for D-o-L applies a proportional polarity penalty at every contrast level. Result clamped to [1, 21], rounded to 1 decimal place.

## FP = 0 guarantee

Both steps push the ratio downward or leave it unchanged:

- **Chroma compression** can only *reduce* the numerator (lighter element penalty, $\text{exp} \ge 1$, $L \le 1$)
- **Polarity power curve** satisfies $\text{CAP} \times (r/21)^k = r \times (r/21)^{k-1} \times (\text{CAP}/21) \le r$ for $k \ge 1$, $r \le 21$, $\text{CAP} \le 21$

$$\text{ratio}_{\text{OKCA}} \le r_{\text{raw}} \le \text{ratio}_{\text{WCAG}} \quad \text{for any input}$$

A pair that fails WCAG will also fail OKCA. **Zero false passes by construction.**

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
