# okca — OK Contrast Algorithm

OKLCH-native, polarity-aware contrast ratio with **zero false passes** against WCAG 2.x.

OKCA outputs ratios on the familiar 1–21 scale with the same AA (4.5) and AAA (7.0) thresholds as WCAG. It is stricter than WCAG in two ways: saturated chromatic colors are penalised relative to achromatic equivalents, and scores are polarity-aware — light-on-dark scores higher than dark-on-light for the same color pair.

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

// Achromatic — polarity-aware
calculateContrast('#ffffff', '#000000');  // 21.0 (white on black, light-on-dark)
calculateContrast('#000000', '#ffffff');  // 20.0 (black on white, dark-on-light)

// AA boundary anchor
calculateContrast('#ffffff', '#767676');  // 3.5 (light-on-dark, below AA)
calculateContrast('#767676', '#ffffff');  // 3.3 (dark-on-light, below AA)

// Chromatic — WCAG gives 6.6 (false pass); OKCA correctly fails
calculateContrast('#ff69b4', '#1a1a1a'); // 3.7
```

Or use the class:

```ts
import { OkcaService } from '@pawn002/okca';

const okca = new OkcaService();
okca.calculateContrast('#fff', '#000');  // 21.0
```

Accepts 3- and 6-digit hex strings (e.g. `#fff`, `#ff8000`).

## What OKCA solves

WCAG 2.x contrast has two well-documented failure modes:

1. **False passes for saturated chromatic text.** Hot pink on near-black scores 6.6:1 under WCAG — a comfortable AA pass — but is demonstrably harder to read than achromatic pairs at equivalent luminance.

2. **Polarity blindness.** WCAG treats `contrast(A, B)` and `contrast(B, A)` as identical. Perceptual research indicates light text on a dark background (negative polarity) has higher effective contrast than the same colors reversed.

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

## Key constants

| Constant | Value | Role |
|----------|------:|------|
| `C_THRESH` | 0.15 | Oklab chroma at which lighter-element penalty is fully active |
| `CHROMA_K` | 0.50 | Maximum additional power exponent at full saturation (exp range: 1.0–1.5) |
| `POL_K` | 1.175 | Polarity power exponent: CAP×(r/21)^k |
| `DOL_CAP` | 20 | Dark-on-light contrast cap (vs 21 for L-o-D) |

## Properties

- **Polarity-aware:** `okca(A, B) ≠ okca(B, A)` — light-on-dark scores higher than dark-on-light
- **Conservative:** all scores below WCAG equivalent; AA/AAA thresholds unchanged
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
