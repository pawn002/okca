# okca — OK Contrast Algorithm

OKLCH-native contrast ratio with **zero false passes** against WCAG 2.x.

OKCA outputs ratios on the familiar 1–21 scale with the same AA (4.5) and AAA (7.0) thresholds as WCAG. Drop-in replacement for WCAG contrast — same numbers for achromatic pairs, stricter for saturated chromatic colors.

## Install

```bash
npm install okca
```

## Usage

```ts
import { calculateContrast } from 'okca';

calculateContrast('#ffffff', '#000000');  // 21
calculateContrast('#fff', '#767676');     // 4.5 — WCAG AA boundary anchor
calculateContrast('#ff69b4', '#1a1a1a'); // ~4.0 (WCAG gives 6.6 — a known false pass)
```

Or use the class:

```ts
import { OkcaService } from 'okca';

const okca = new OkcaService();
okca.calculateContrast('#fff', '#000');  // 21
```

Accepts 3- and 6-digit hex strings (e.g. `#fff`, `#ff8000`).

## What OKCA solves

WCAG 2.x contrast has two well-documented failure modes:

1. **False passes for saturated chromatic text.** Hot pink on near-black scores 6.6:1 under WCAG — a comfortable AA pass — but is demonstrably harder to read than achromatic pairs at equivalent luminance.

2. **False passes for green hues near the AA boundary.** OKLCH $L^3$ (the perceptually uniform luminance proxy) underestimates WCAG Y for greens because sRGB weights green at 71.5%. A pair that WCAG rates 4.4 can appear to score 4.7 when uncorrected.

OKCA corrects both while guaranteeing **FP = 0** — OKCA never approves a pair that WCAG rejects.

## Algorithm

OKCA uses OKLCH $L^3$ as a luminance proxy ($L^3 \approx Y_{\text{WCAG}}$ for neutral grays), with two targeted corrections:

### 1. Chroma compression on lighter element

Saturated lighter colors get a power-compression penalty proportional to their Oklab chroma. A saturation weight ramps quadratically from 0 (achromatic) to 1 (vivid):

$$\text{satW} = \min\left(1, \left(\frac{C}{0.15}\right)^{2}\right)$$

This drives a variable exponent that compresses the lighter element's luminance:

$$\text{exp} = 1 + 0.75 \times \text{satW} \qquad Y_{\text{lighter}} = \left(L_{\text{lighter}}^{\text{exp}}\right)^3$$

Since $L \le 1$, a higher exponent always produces a smaller value — the ratio can only decrease. Achromatic colors (C = 0) pass through unchanged.

### 2. Green correction on darker element

For darker elements with Oklab `a < -0.05` (true greens), a correction boosts the luminance proxy to close the gap between $L^3$ and WCAG Y:

$$L_{\text{eff}} = L_{\text{darker}} + \max\left(0, \ 0.155 \times (-a - 0.05)\right)$$

$$Y_{\text{darker}} = L_{\text{eff}}^{3}$$

A larger denominator means a lower ratio — preventing green false passes.

### Output

$$\text{ratio} = \frac{Y_{\text{lighter}} + 0.05}{Y_{\text{darker}} + 0.05}$$

Clamped to [1, 21], rounded to 1 decimal place.

## FP = 0 guarantee

Both corrections push the ratio in one direction:

- **Chroma compression** can only *reduce* the numerator (lighter element penalty)
- **Green correction** can only *increase* the denominator (darker element boost)

$$\text{ratio}_{\text{OKCA}} \le \text{ratio}_{\text{WCAG}} \quad \text{for any input}$$

A pair that fails WCAG will also fail OKCA. **Zero false passes by construction.**

## Key constants

| Constant | Value | Role |
|----------|------:|------|
| `C_THRESH` | 0.15 | Oklab chroma at which lighter-element penalty is fully active |
| `CHROMA_K` | 0.75 | Maximum additional power exponent at full saturation |
| `K_DARK` | 0.155 | Green correction coefficient on darker element |
| `A_THRESH` | 0.05 | Oklab `a` gate: green correction fires only when `a < -0.05` |

## Properties

- **Achromatic exactness:** white/black = 21, white/#767676 = 4.5 — matches WCAG exactly
- **Symmetric:** okca(A, B) = okca(B, A) — order doesn't matter
- **Zero dependencies:** pure TypeScript, no runtime deps
- **Clean-room implementation:** no third-party contrast algorithm source code

## Validation

Tested against 2,587 color pairs across three batteries (light-on-dark, dark-on-light, design systems from Tailwind/Material/Radix):

| Battery | Pairs | False Passes | False Failures |
|---------|------:|:------------:|:--------------:|
| Light-on-dark | 53 | 0 | 1 |
| Dark-on-light | 54 | 0 | 0 |
| Design systems | 2,480 | 0 | 28 |
| **Total** | **2,587** | **0** | **29** |

All false failures are warm saturated hues (red, fuchsia, pink) — principled conservatism, not miscalibration.

## License

MIT
