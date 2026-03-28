# okca — OK Contrast Algorithm

OKLCH-native, polarity-aware contrast ratio with **zero false passes** against WCAG 2.x.

OKCA outputs ratios on the familiar 1–21 scale with the same AA (4.5) and AAA (7.0) thresholds as WCAG. It is stricter than WCAG in two ways: saturated chromatic colors are penalised relative to achromatic equivalents, and scores are polarity-aware — light-on-dark scores higher than dark-on-light for the same color pair.

## Install

```bash
npm install @pawn002/okca
```

## Usage

```ts
import { calculateContrast } from '@pawn002/okca';

// Achromatic — polarity-aware
calculateContrast('#ffffff', '#000000');  // 17.0 (white on black, light-on-dark)
calculateContrast('#000000', '#ffffff');  // 16.0 (black on white, dark-on-light)

// AA boundary anchor
calculateContrast('#ffffff', '#767676');  // 3.7 (light-on-dark, below AA)
calculateContrast('#767676', '#ffffff');  // 3.2 (dark-on-light, below AA)

// Chromatic — WCAG gives 6.6 (false pass); OKCA correctly fails
calculateContrast('#ff69b4', '#1a1a1a'); // 3.9
```

Or use the class:

```ts
import { OkcaService } from '@pawn002/okca';

const okca = new OkcaService();
okca.calculateContrast('#fff', '#000');  // 17.0
```

Accepts 3- and 6-digit hex strings (e.g. `#fff`, `#ff8000`).

## What OKCA solves

WCAG 2.x contrast has three well-documented failure modes:

1. **False passes for saturated chromatic text.** Hot pink on near-black scores 6.6:1 under WCAG — a comfortable AA pass — but is demonstrably harder to read than achromatic pairs at equivalent luminance.

2. **False passes for green hues near the AA boundary.** OKLCH $L^3$ (the perceptually uniform luminance proxy) underestimates WCAG Y for greens because sRGB weights green at 71.5%. A pair that WCAG rates 4.4 can appear to score 4.7 when uncorrected.

3. **Polarity blindness.** WCAG treats `contrast(A, B)` and `contrast(B, A)` as identical. Perceptual research indicates light text on a dark background (negative polarity) has higher effective contrast than the same colors reversed.

OKCA corrects all three while guaranteeing **FP = 0** — OKCA never approves a pair that WCAG rejects.

## Algorithm

OKCA uses OKLCH $L^3$ as a luminance proxy ($L^3 \approx Y_{\text{WCAG}}$ for neutral grays), with two targeted corrections and a final polarity step.

### 1. Chroma compression on lighter element

Saturated lighter colors get a power-compression penalty proportional to their Oklab chroma. A saturation weight ramps quadratically from 0 (achromatic) to 1 (vivid):

$$\text{satW} = \min\left(1, \left(\frac{C}{0.15}\right)^{2}\right)$$

This drives a variable exponent that compresses the lighter element's luminance:

$$\text{exp} = 1 + 0.50 \times \text{satW} \qquad Y_{\text{lighter}} = \left(L_{\text{lighter}}^{\text{exp}}\right)^3$$

Since $L \le 1$, a higher exponent always produces a smaller value — the ratio can only decrease. Achromatic colors (C = 0) pass through unchanged.

### 2. Green correction on darker element

For darker elements with Oklab `a < -0.05` (true greens), a correction boosts the luminance proxy to close the gap between $L^3$ and WCAG Y:

$$L_{\text{eff}} = L_{\text{darker}} + \max\left(0, \ 0.155 \times (-a - 0.05)\right)$$

$$Y_{\text{darker}} = L_{\text{eff}}^{3}$$

A larger denominator means a lower ratio — preventing green false passes.

### 3. Polarity scaling

The raw ratio is scaled based on which element is text and which is background:

$$\text{ratio} = \begin{cases} r \times 0.81 & \text{light-on-dark (text is lighter)} \\ r \times 0.78 - 0.36 & \text{dark-on-light (background is lighter)} \end{cases}$$

where $r = (Y_{\text{lighter}} + 0.05) / (Y_{\text{darker}} + 0.05)$.

The D-o-L linear model compresses the polarity gap at high contrast while preserving the grey anchor (#767676/white = 3.2). Both transforms keep every score below its WCAG equivalent.

Result clamped to [1, 21], rounded to 1 decimal place.

## FP = 0 guarantee

All three steps push the ratio downward or leave it unchanged:

- **Chroma compression** can only *reduce* the numerator (lighter element penalty)
- **Green correction** can only *increase* the denominator (darker element boost)
- **Polarity scaling** applies multipliers < 1 in both polarities

$$\text{ratio}_{\text{OKCA}} \le \text{ratio}_{\text{WCAG}} \quad \text{for any input}$$

A pair that fails WCAG will also fail OKCA. **Zero false passes by construction.**

## Key constants

| Constant | Value | Role |
|----------|------:|------|
| `C_THRESH` | 0.15 | Oklab chroma at which lighter-element penalty is fully active |
| `CHROMA_K` | 0.50 | Maximum additional power exponent at full saturation |
| `K_DARK` | 0.155 | Green correction coefficient on darker element |
| `A_THRESH` | 0.05 | Oklab `a` gate: green correction fires only when `a < -0.05` |
| `LOD_SCALE` | 0.81 | Light-on-dark polarity multiplier |
| `DOL_MULT` | 0.78 | Dark-on-light linear multiplier component |
| `DOL_OFFSET` | 0.36 | Dark-on-light additive offset |

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
| Design systems | 2,480 | 0 | 235 |
| **Total** | **2,587** | **0** | **235** |

**False passes: zero.** OKCA never approves a pair that WCAG rejects.

**WCAG disagreements** are pairs where OKCA scores below 4.5 but WCAG scores ≥ 4.5. These are intentional. WCAG's 4.5:1 AA threshold is widely considered too permissive — white on `#767676` (WCAG's own AA boundary anchor) is not production-ready in most real-world designs. All 235 disagreements involve colors in that same marginal zone, but their character varies by system:

- **Tailwind (48) and Material (54):** Mid-range chromatic shades (500–700) presented as general-purpose colors without pairing restrictions. These are the most meaningful disagreements — colors a designer might genuinely reach for as text or icon color.
- **Radix UI light (67) and dark (66):** Radix uses APCA, not WCAG, as its contrast standard and only guarantees steps 11–12 as text colors. Almost all Radix disagreements are step-9/10 solid-fill colors that Radix itself does not document as accessible text pairings.

## License

MIT
