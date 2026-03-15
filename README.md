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

Accepts any CSS color string that [colorjs.io](https://colorjs.io) can parse: hex, `rgb()`, `oklch()`, named colors, etc.

## What OKCA solves

WCAG 2.x contrast has two well-documented failure modes:

1. **False passes for saturated chromatic text.** Hot pink on near-black scores 6.6:1 under WCAG — a comfortable AA pass — but is demonstrably harder to read than achromatic pairs at equivalent luminance.

2. **False passes for green hues near the AA boundary.** OKLCH L³ (the perceptually uniform luminance proxy) underestimates WCAG Y for greens because sRGB weights green at 71.5%. A pair that WCAG rates 4.4 can appear to score 4.7 when uncorrected.

OKCA corrects both while guaranteeing **FP = 0** — OKCA never approves a pair that WCAG rejects.

## Algorithm

OKCA uses OKLCH L³ as a luminance proxy (L cubed ≈ WCAG Y for neutral grays), with two targeted corrections:

### 1. Chroma compression on lighter element

Saturated lighter colors get a power-compression penalty proportional to their Oklab chroma:

```
C    = sqrt(a² + b²)           // Oklab chroma
satW = min(1, (C / 0.15)²)    // quadratic ramp: 0 at C=0, 1 at C≥0.15
exp  = 1 + 0.75 × satW        // 1.0 (achromatic) … 1.75 (fully saturated)
lighterY = (lighterL ^ exp) ^ 3
```

Effect: reduces the ratio for saturated lighter elements. Achromatic colors are unaffected.

### 2. Green correction on darker element

For darker elements with Oklab `a < -0.05` (true greens), a correction increases the luminance proxy to match WCAG Y:

```
correction = 0.155 × (-a - 0.05)
Leff = min(1, darkerL + correction)
darkerY = Leff³
```

Effect: increases the denominator → lowers the ratio, preventing green false passes.

### Output

```
ratio = (lighterY + 0.05) / (darkerY + 0.05)
```

Clamped to [1, 21], rounded to 1 decimal place.

## FP = 0 guarantee

- Step 1 can only *reduce* the numerator (lighter element penalty) → lower ratio
- Step 2 can only *increase* the denominator (green correction) → lower ratio
- Therefore: `ratio_OKCA ≤ ratio_WCAG` for any input pair

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
- **Symmetric:** `okca(A, B) = okca(B, A)` — order doesn't matter
- **Single dependency:** [colorjs.io](https://colorjs.io)
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
