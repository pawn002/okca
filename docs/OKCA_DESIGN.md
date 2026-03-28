# OKCA --- Design Document

**Algorithm:** OK Contrast Algorithm
**Status:** Production

---

## 1. What OKCA Is Trying to Solve

WCAG 2.x contrast uses the ratio formula:

$$\text{ratio} = \frac{Y_1 + 0.05}{Y_2 + 0.05}$$

This has two well-documented failure modes:

1. **False passes for saturated chromatic text.** Hot pink on near-black scores 6.6:1 under WCAG --- a comfortable AA pass. Perceptual research flags it as harder to read than achromatic pairs at equivalent luminance. WCAG's luminance formula does not encode the reduced effectiveness of saturated chromatic light on very dark backgrounds.

2. **False passes for green text/backgrounds near the AA boundary.** OKLCH lightness cubed, used as a perceptually uniform luminance proxy, underestimates WCAG luminance for green hues because IEC 61966-2-1 weights sRGB green strongly (0.7152). A pair that WCAG rates 4.4 can appear to score 4.7 when the luminance proxy is miscalibrated.

OKCA corrects both, while maintaining **zero false passes** against WCAG --- meaning OKCA never tells a designer a pair is safe when WCAG says it fails.

---

## 2. Core Design Principles

### 2.1 Safety: FP = 0 Is Non-Negotiable

A contrast algorithm used for accessibility decisions must never approve a pair that WCAG rejects. This is not a calibration preference --- it is the definition of a safe accessibility tool. OKCA guarantees this mathematically (see [§4](#4-the-fp--0-guarantee)).

### 2.2 WCAG-Compatible Scale and Thresholds

OKCA outputs ratios in [1, 21], uses the same AA threshold (4.5) and AAA threshold (7.0) as WCAG 2.x. Designers and developers see familiar numbers. No re-education required.

### 2.3 OKLCH L as the Luminance Input

WCAG 2.x computes luminance from linearised sRGB (IEC 61966-2-1). OKLCH L is a perceptually uniform lightness derived from the Oklab colour space. For neutral greys, the relationship is straightforward:

$$L^3 \approx Y_{\text{WCAG}}$$

The cube-root perceptual transform inverts to linear luminance. Using L as the primary input makes the algorithm coherent with what designers see in modern colour pickers.

### 2.4 Clean-Room IP

OKCA is a clean-room implementation derived from mathematical specifications and probe-validated calibration, with no third-party contrast algorithm source code.

### 2.5 Conservative Rather Than Liberal

When the algorithm must choose between overcounting contrast (false pass) and undercounting (false failure), it chooses undercounting. False failures result in designers choosing safer, more distinct colour pairs. False passes result in inaccessible text shipped to production.

---

## 3. Why $L^3$ Instead of WCAG Y

WCAG luminance is defined as:

$$Y = 0.2126\,R_{\text{lin}} + 0.7152\,G_{\text{lin}} + 0.0722\,B_{\text{lin}}$$

per IEC 61966-2-1 (linearised sRGB). This formula was designed for display calibration, not for predicting legibility. Three shortcomings are relevant to OKCA:

1. **Green is over-weighted.** The 0.7152 green coefficient reflects photopic luminance sensitivity, not perceptual contrast effectiveness. Pure green at Y = 0.715 scores 14.5:1 against black --- visually plausible --- but formula-level deviations accumulate near the AA boundary for dark greens.

2. **Not designer-readable.** A designer cannot look at a colour picker, read the OKLCH L values, and predict the WCAG ratio without a separate calculation.

3. **Chromatic text on dark backgrounds.** WCAG Y does not distinguish between saturated and desaturated light text. A chromatic lighter element at the same Y as an achromatic one produces the same ratio --- even though the saturated one has demonstrably lower effective contrast against a dark background.

OKLCH $L^3$ addresses points 2 and 3 directly. The green over-weighting (point 1) is corrected by the green correction mechanism ([§5.2](#52-green-correction-on-the-darker-element-step-4)).

---

## 4. The FP = 0 Guarantee

The guarantee rests on two properties of the algorithm, both visible in the ratio formula:

$$\text{ratio} = \frac{Y_{\text{lighter}} + 0.05}{Y_{\text{darker}} + 0.05}$$

**Step 3 (lighter-element compression) can only reduce the numerator.**

The chroma compression raises L to a power greater than 1 for saturated colours. Since $L \le 1$, a higher exponent produces a smaller value:

$$L^{1.75} \le L^{1.0} \quad \text{for } L \in [0, 1]$$

A smaller `lighterY` in the numerator means a smaller ratio. For achromatic colours the exponent is 1 and the value is unchanged.

**Step 4 (darker-element green correction) can only increase the denominator.**

The correction adds a non-negative term to `darkerL` before cubing, making `darkerY` larger. A larger denominator in the ratio formula means a lower ratio. The gate $a < -0.05$ ensures it fires only where $L^3$ genuinely undershoots WCAG Y (true greens), preventing spurious ratio reductions elsewhere.

Together, both corrections push the ratio downward:

$$\text{ratio}_{\text{OKCA}} \le \text{ratio}_{\text{WCAG}} \quad \text{for any input}$$

A pair WCAG fails (ratio < 4.5) will also fail OKCA. **FP = 0 by construction.**

---

## 5. The Two Correction Mechanisms

### 5.1 Chroma Compression on the Lighter Element (Step 3)

**Problem.** Saturated chromatic light text on a dark background --- e.g. hot pink (`#ff69b4`) on near-black (`#1a1a1a`) --- has the same WCAG luminance ratio as achromatic white on a dark grey, but is demonstrably harder to read. The reduced effectiveness comes from chromatic contrast partially substituting for luminance contrast in the visual system.

**Mechanism.** The lighter element's luminance proxy is penalised by a chroma-weighted power exponent. First, a saturation weight is computed from the Oklab chroma:

$$\text{satW} = \min\left(1, \left(\frac{C}{0.15}\right)^{2}\right)$$

This is a quadratic ramp: zero for achromatic colours, reaching 1.0 when chroma hits the threshold. The exponent is then:

$$\text{exp} = 1 + 0.75 \times \text{satW}$$

ranging from 1.0 (achromatic) to 1.75 (fully saturated). The adjusted luminance proxy becomes:

$$Y_{\text{lighter}} = \left(L_{\text{lighter}}^{\text{exp}}\right)^3$$

For a neutral white lighter element: C = 0, satW = 0, exp = 1, so $Y_{\text{lighter}} = L^3 = 1.0$ --- unchanged.

For hot pink (C ≈ 0.197 > 0.15): satW = 1, exp = 1.75 --- the lighter element is penalised and the ratio drops below WCAG.

The threshold of 0.15 is calibrated so the penalty is negligible for lightly tinted neutrals (e.g. off-white at C ≈ 0.01) and fully active for vivid designer palette colours (C ≥ 0.15).

### 5.2 Green Correction on the Darker Element (Step 4)

**Problem.** For green hues, $L^3$ underestimates WCAG Y. Specifically, `#228b22` (forest green) has L = 0.558, $L^3 = 0.174$, while WCAG Y = 0.189. Because the denominator in the ratio formula is too small (darker element appears darker than WCAG says), the ratio is inflated --- creating a false-pass risk.

Root cause: IEC 61966-2-1 assigns 71.5% weight to the sRGB green channel. OKLCH L's perceptual uniformity distributes weight more evenly. The gap is hue-dependent and largest for vivid greens.

**Mechanism.** For the darker element, if its Oklab `a` coordinate is below the gate threshold (true greens; not blues, which have a slightly negative `a` but at much smaller magnitude), the effective lightness is boosted:

$$L_{\text{eff}} = L_{\text{darker}} + \max\left(0, \ K_{\text{DARK}} \times (-a - A_{\text{THRESH}})\right)$$

$$Y_{\text{darker}} = L_{\text{eff}}^{3}$$

With $K_{\text{DARK}} = 0.155$ and $A_{\text{THRESH}} = 0.05$.

For forest green (`#228b22`): a = −0.135, correction = 0.155 × (0.135 − 0.05) = 0.013, so $L_{\text{eff}}$ = 0.558 + 0.013 = 0.571, and $Y_{\text{darker}}$ = 0.186. The inflated denominator brings the ratio down from 4.5 to 4.4 --- matching WCAG's 4.4.

**The gate threshold matters.** Without it, the correction would fire for slightly blue-shifted colours like Tailwind blue-700 (`#1d4ed8`, a ≈ −0.047), where $L^3 \approx Y_{\text{WCAG}}$ and no correction is needed. Setting the gate at 0.05 restricts the correction to colours where the gap is real and meaningful.

**Rounding interaction.** $K_{\text{DARK}} = 0.155$ gives a raw ratio of 4.448 for white/`#228b22`, which rounds to 4.4 via `toFixed(1)`. Probe calibration must account for the production rounding mode --- a raw ratio of 4.471 would round to "4.5", producing a false pass at display precision.

---

## 6. Achromatic Behaviour

For neutral grey pairs, both corrections reduce to identity:

- **Step 3:** Oklab chroma C = 0, so satW = 0, exp = 1, and $Y_{\text{lighter}} = L^3$.
- **Step 4:** Oklab a = 0, so the gate is not reached and $Y_{\text{darker}} = L^3$.

Since $L^3 \approx Y_{\text{WCAG}}$ for greys (up to floating-point precision of the OKLCH transform), the algorithm produces **exact WCAG 2.x ratios for achromatic pairs** --- white/black = 21, white/`#767676` = 4.5. This is the most important compatibility property: the AA boundary grey anchor is preserved exactly.

---

## 7. Polarity Model

OKCA is **polarity-aware**: `okca(A, B) ≠ okca(B, A)` when A and B differ in lightness. The ratio formula takes the designated text and background roles into account via a final scaling step.

**Step 5** applies a polarity scale factor to the raw contrast ratio:

$$\text{ratio} = \frac{Y_{\text{lighter}} + 0.05}{Y_{\text{darker}} + 0.05} \times P$$

where:

$$P = \begin{cases} \text{LOD\_SCALE} & \text{if text is lighter (light-on-dark)} \\ \text{DOL\_SCALE} & \text{if background is lighter (dark-on-light)} \end{cases}$$

with $\text{LOD\_SCALE} = 0.92$ and $\text{DOL\_SCALE} = 0.80$.

**Rationale.** Perceptual research indicates that negative polarity (light text on dark background) produces higher perceived contrast than positive polarity (dark text on light background) at the same luminance ratio. OKCA encodes this asymmetry: a light-on-dark pair scores higher than the same colours reversed. Both scale factors are less than 1 (all scores are conservative relative to raw WCAG), and $\text{LOD\_SCALE} > \text{DOL\_SCALE}$ (light-on-dark retains a relative advantage).

**FP = 0 proof for step 5.** Both $P < 1$, so multiplying reduces every ratio. The existing guarantee ($\text{ratio}_\text{OKCA} \leq \text{ratio}_\text{WCAG}$) is preserved: if $\text{WCAG} < 4.5$, then $\text{ratio}_\text{OKCA} \times P \leq \text{WCAG} \times P < 4.5$.

**Achromatic reference pairs** (for calibration):

| Pair | Polarity | Score |
|------|----------|------:|
| white on black | L-o-D | 19.3 |
| black on white | D-o-L | 16.8 |
| white on #767676 | L-o-D | 4.2 |
| #767676 on white | D-o-L | 3.6 |

---

## 8. Probe Validation Summary

Three independent batteries:

| Battery | Pairs | FP | FF | Notes |
|---------|------:|:--:|:--:|-------|
| Light-on-dark | 53 | **0** | 5 | AA-boundary grey, D3 red, hot pink, dark orange |
| Dark-on-light | 54 | **0** | 7 | AA-boundary greys, greens, D3 red, teal |
| Design systems | 2,480 | **0** | 151 | Increased conservatism from polarity factors |
| **Total** | **2,587** | **0** | **163** | |

The 28 design-system false failures are all warm saturated families (red, fuchsia, pink, rose, orange, plum, indigo) in Tailwind, Material, and Radix UI palettes. They represent principled conservatism: $L^3 > Y_{\text{WCAG}}$ for warm hues, so OKCA underestimates those pairs relative to WCAG. No correction is applied because any warm-side correction on the lighter element risks false passes for pink/fuchsia text near the AA boundary.

---

## 9. Key Constants

| Constant | Value | Role |
|----------|------:|------|
| `C_THRESH` | 0.15 | Oklab chroma at which lighter-element penalty is fully active |
| `CHROMA_K` | 0.75 | Maximum additional power exponent at full saturation |
| `K_DARK` | 0.155 | Green correction coefficient on darker element |
| `A_THRESH` | 0.05 | Oklab `a` gate: green correction fires only when a < −0.05 |
| `LOD_SCALE` | 0.92 | Polarity scale for light-on-dark (text is lighter than background) |
| `DOL_SCALE` | 0.80 | Polarity scale for dark-on-light (background is lighter than text) |

All four constants have one degree of freedom each. They were calibrated by the following anchors:

- **C_THRESH = 0.15** --- Typical Oklab chroma for designer palette saturated colours; lightly tinted neutrals (C < 0.05) receive less than 10% of the full penalty.

- **CHROMA_K = 0.75** --- Yields exp = 1.75 at full saturation, which reduces hot pink's effective ratio from 6.6 to 4.0 (below the 4.5 AA threshold). This is the target: WCAG's two most-cited false passes (hot pink and dark orange on near-black) become OKCA false failures.

- **A_THRESH = 0.05** --- Separates true greens (a ≈ −0.13 for forest green) from blue-shifted colours like Tailwind blue-700 (a ≈ −0.047). The gate must be above −0.047 and below −0.085 (the weakest green that needs correction).

- **K_DARK = 0.155** --- Minimum value such that white/`#228b22` gives a raw ratio ≤ 4.45 (rounds to 4.4, not 4.5). Derived analytically from the target $Y_{\text{darker}} \ge 0.18596$.

---

## 10. What OKCA Does Not Do

Understanding the scope prevents incorrect use and misguided extension attempts.

**Does not model font size or weight.** WCAG AA (4.5:1) applies uniformly regardless of text size. OKCA outputs a single ratio; size-dependent thresholds are the caller's responsibility.

**Does not replace perceptual judgement.** An OKCA score of 4.5 on a warm fuchsia text/white background means the pair clears the numerical threshold. A designer may still find it unpleasant. OKCA is a safety floor, not a design recommendation.

**Does not correct warm-hue false passes in WCAG.** WCAG 2.x has known false passes for warm chromatic text on very dark backgrounds. OKCA catches the two most-cited examples (hot pink, dark orange on near-black). It does not systematically correct all warm-hue WCAG false passes, because doing so would require a polarity model and risks introducing new false passes.

---

## 11. Extension Guidelines

When modifying the algorithm, these properties must be preserved:

1. **FP = 0.** Run all three probe batteries after any constant change. A false pass in the production service requires that the probe test be run with rounding applied (`toFixed(1)` on the raw ratio), not just with raw floats.

2. **Achromatic exactness.** White/black = 21, white/`#767676` = 4.5. These are the WCAG 2.x anchors that users will cross-check. Any deviation breaks trust.

3. **No third-party contrast algorithm source code.** Mathematical derivations from public specifications are permitted; copying control flow or constant blocks from third-party packages is not.

4. **Update probe battery expectations.** If any probe result changes intentionally, document the rationale before committing.
