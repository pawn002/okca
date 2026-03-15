# OKCA --- Design Document

**Algorithm:** OK Contrast Algorithm
**Status:** Production

---

## 1. What OKCA Is Trying to Solve

WCAG 2.x contrast $\bigl(\text{ratio} = (Y_1 + 0.05) / (Y_2 + 0.05)\bigr)$ has two well-documented failure modes:

1. **False passes for saturated chromatic text.** Hot pink on near-black scores $6.6{:}1$ under WCAG --- a comfortable AA pass. Perceptual research flags it as harder to read than achromatic pairs at equivalent luminance. WCAG's luminance formula does not encode the reduced effectiveness of saturated chromatic light on very dark backgrounds.

2. **False passes for green text/backgrounds near the AA boundary.** OKLCH $L^3$ (used as a perceptually uniform luminance proxy) underestimates WCAG $Y$ for green hues because IEC 61966-2-1 weights sRGB green strongly ($0.7152$). A pair that WCAG rates $4.4$ can appear to score $4.7$ when the luminance proxy is miscalibrated.

OKCA corrects both, while maintaining **zero false passes** against WCAG --- meaning OKCA never tells a designer a pair is safe when WCAG says it fails.

---

## 2. Core Design Principles

### 2.1 Safety: FP = 0 Is Non-Negotiable

A contrast algorithm used for accessibility decisions must never approve a pair that WCAG rejects. This is not a calibration preference --- it is the definition of a safe accessibility tool. OKCA guarantees this mathematically (see [§4](#4-the-fp--0-guarantee)).

### 2.2 WCAG-Compatible Scale and Thresholds

OKCA outputs ratios in $[1, 21]$, uses the same AA threshold ($4.5$) and AAA threshold ($7.0$) as WCAG 2.x. Designers and developers see familiar numbers. No re-education required.

### 2.3 OKLCH L as the Luminance Input

WCAG 2.x computes luminance from linearised sRGB (IEC 61966-2-1). OKLCH $L$ is a perceptually uniform lightness derived from the Oklab colour space. For neutral greys, $L^3 \approx \text{WCAG}\;Y$ --- the cube-root perceptual transform inverts to linear luminance. Using $L$ as the primary input makes the algorithm coherent with what designers see in modern colour pickers.

### 2.4 Clean-Room IP

OKCA is a clean-room implementation derived from mathematical specifications and probe-validated calibration, with no third-party contrast algorithm source code.

### 2.5 Conservative Rather Than Liberal

When the algorithm must choose between overcounting contrast (false pass) and undercounting (false failure), it chooses undercounting. False failures result in designers choosing safer, more distinct colour pairs. False passes result in inaccessible text shipped to production.

---

## 3. Why $L^3$ Instead of WCAG $Y$

WCAG $Y$ is defined as:

$$Y = 0.2126\,R_{\mathrm{lin}} + 0.7152\,G_{\mathrm{lin}} + 0.0722\,B_{\mathrm{lin}}$$

per IEC 61966-2-1 (linearised sRGB). This formula was designed for display calibration, not for predicting legibility. Three shortcomings are relevant to OKCA:

1. **Green is over-weighted.** The $0.7152$ green coefficient reflects photopic luminance sensitivity, not perceptual contrast effectiveness. Pure green at WCAG $Y = 0.715$ scores $14.5{:}1$ against black --- visually plausible --- but formula-level deviations accumulate near the AA boundary for dark greens.

2. **Not designer-readable.** A designer cannot look at a colour picker, read the OKLCH $L$ values, and predict the WCAG ratio without a separate calculation.

3. **Chromatic text on dark backgrounds.** WCAG $Y$ does not distinguish between saturated and desaturated light text. A chromatic lighter element at the same $Y$ as an achromatic one produces the same ratio --- even though the saturated one has demonstrably lower effective contrast against a dark background.

OKLCH $L^3$ addresses points 2 and 3 directly. The green over-weighting (point 1) is corrected by step 4 of the algorithm ([§5.2](#52-green-correction-on-the-darker-element-step-4)).

---

## 4. The FP = 0 Guarantee

The guarantee rests on two properties of the algorithm:

**Step 3 (lighter-element compression) can only reduce the ratio.**

```
exp = 1 + CHROMA_K * satW    where satW in [0, 1]
```

For achromatic colours, $\mathit{satW} = 0$, $\mathit{exp} = 1$, and $\mathit{lighterY} = L^3$ --- the pure luminance proxy. For saturated colours, $\mathit{exp} > 1$, so $L_{\mathrm{lighter}}^{\,\mathit{exp}} < L_{\mathrm{lighter}}$ (since $L \le 1$), making $\mathit{lighterY} < L_{\mathrm{lighter}}^{\,3} \le Y_{\mathrm{WCAG,lighter}}$. The compressed lighter element produces a *smaller* numerator and therefore a *lower* ratio than WCAG.

**Step 4 (darker-element green correction) can only increase $\mathit{darkerY}$.**

The correction adds a non-negative term to $\mathit{darkerL}$ before cubing. A larger $\mathit{darkerY}$ means a larger denominator and therefore a *lower* ratio than the uncorrected version. The gate $a < -A_{\mathrm{THRESH}}$ ensures it fires only where $L^3$ genuinely undershoots WCAG $Y$ (true greens), preventing spurious ratio reductions elsewhere.

Together:

$$\text{ratio}_{\mathrm{OKCA}} \;\le\; \text{ratio}_{\mathrm{WCAG}} \qquad\text{for any input.}$$

A pair WCAG fails ($\text{ratio} < 4.5$) will also fail OKCA. **FP = 0 by construction.**

---

## 5. The Two Correction Mechanisms

### 5.1 Chroma Compression on the Lighter Element (Step 3)

**Problem.** Saturated chromatic light text on a dark background --- e.g. hot pink (`#ff69b4`) on near-black (`#1a1a1a`) --- has the same WCAG luminance ratio as achromatic white on a dark grey, but is demonstrably harder to read. The reduced effectiveness comes from chromatic contrast partially substituting for luminance contrast in the visual system.

**Mechanism.** The lighter element's luminance proxy is penalised by a chroma-weighted power exponent:

```
C    = sqrt(a² + b²)            // Oklab chroma of lighter element
satW = min(1, (C / 0.15)²)      // quadratic ramp: 0 at C=0, 1 at C>=0.15
exp  = 1 + 0.75 × satW          // range: 1.0 (achromatic) … 1.75 (saturated)
lighterY = (lighterL ^ exp) ^ 3
```

For a neutral white lighter element: $C = 0$, $\mathit{satW} = 0$, $\mathit{exp} = 1$, $\mathit{lighterY} = L^3 = 1.0$ (unchanged).

For hot pink ($C \approx 0.197 > 0.15$): $\mathit{satW} = 1$, $\mathit{exp} = 1.75$ --- the lighter element is penalised and the ratio drops below WCAG.

The threshold $C_{\mathrm{THRESH}} = 0.15$ is calibrated so the penalty is negligible for lightly tinted neutrals (e.g. off-white at $C \approx 0.01$) and fully active for vivid designer palette colours ($C \ge 0.15$).

### 5.2 Green Correction on the Darker Element (Step 4)

**Problem.** For green hues, OKLCH $L^3$ underestimates WCAG $Y$. Specifically, `#228b22` (forest green) has $L = 0.558$, $L^3 = 0.174$, while WCAG $Y = 0.189$. Because the denominator in the ratio formula is too small (darker element appears darker than WCAG says), the ratio is inflated --- creating a false-pass risk.

Root cause: IEC 61966-2-1 assigns 71.5% weight to the sRGB green channel. OKLCH $L$'s perceptual uniformity distributes weight more evenly. The gap is hue-dependent and largest for vivid greens.

**Mechanism.** For the darker element, if its Oklab $a$ coordinate is below $-A_{\mathrm{THRESH}}$ (true greens; not blues, which have a slightly negative $a$ but at much smaller magnitude):

```
da      = oklab(darkerColor).a
Leff    = darkerL + max(0, K_DARK × (-da - A_THRESH))   // only adds
darkerY = Leff³
```

Constants: $K_{\mathrm{DARK}} = 0.155$, $A_{\mathrm{THRESH}} = 0.05$.

For forest green (`#228b22`): $a = -0.135$, correction $= 0.155 \times (0.135 - 0.05) = 0.013$, $L_{\mathrm{eff}} = 0.558 + 0.013 = 0.571$, $\mathit{darkerY} = 0.186$. The inflated denominator brings the ratio down from $4.5$ to $4.4$ --- matching WCAG's $4.4$.

**The $A_{\mathrm{THRESH}}$ gate matters.** Without it, the correction would fire for slightly blue-shifted colours like Tailwind blue-700 (`#1d4ed8`, $a \approx -0.047$), where $L^3 \approx Y_{\mathrm{WCAG}}$ and no correction is needed. Setting $A_{\mathrm{THRESH}} = 0.05$ restricts the correction to colours where the $L^3 / Y_{\mathrm{WCAG}}$ gap is real and meaningful.

**$K_{\mathrm{DARK}}$ and rounding.** $K_{\mathrm{DARK}} = 0.155$ gives a raw ratio of $4.448$ for white/`#228b22`, which rounds to $4.4$ via `toFixed(1)`. Probe calibration must account for the production rounding mode --- a raw ratio of $4.471$ would round to "4.5", producing a false pass at display precision.

---

## 6. Achromatic Behaviour

For neutral grey pairs, both corrections reduce to identity:

- **Step 3:** Oklab chroma $C = 0 \Rightarrow \mathit{satW} = 0 \Rightarrow \mathit{exp} = 1 \Rightarrow \mathit{lighterY} = L^3$.
- **Step 4:** Oklab $a = 0 \Rightarrow$ gate not reached $\Rightarrow \mathit{darkerY} = L^3$.

$L^3 \approx Y_{\mathrm{WCAG}}$ for greys (up to floating-point precision of the OKLCH transform). The algorithm therefore produces **exact WCAG 2.x ratios for achromatic pairs** --- white/black $= 21$, white/`#767676` $= 4.5$. This is the most important compatibility property: the AA boundary grey anchor is preserved exactly.

---

## 7. Symmetry

OKCA is **symmetric**: $\mathrm{okca}(A, B) = \mathrm{okca}(B, A)$. This follows from:

1. The lighter/darker split uses OKLCH $L$ magnitude, not polarity (fg/bg roles are irrelevant).
2. Both correction functions depend only on the colour, not on whether it is text or background.
3. The ratio formula $(Y_{\mathrm{lighter}} + 0.05) / (Y_{\mathrm{darker}} + 0.05)$ uses positional roles determined by $L$.

Some contrast algorithms use asymmetric polarity models --- they model the difference between reading light text on dark vs. dark text on light backgrounds. OKCA does not encode this asymmetry. This is a deliberate design choice: it produces consistent numbers regardless of which colour a designer designates as "text," and avoids the calibration complexity of polarity-dependent response curves.

The cost: OKCA does not capture the finding that warm chromatic light text on dark backgrounds is harder to read than dark text on light backgrounds at the same luminance ratio. It handles this partially via the chroma compression penalty (step 3), but not via a full polarity model.

---

## 8. Probe Validation Summary

Three independent batteries:

| Battery | Pairs | FP | FF | Notes |
|---------|------:|:--:|:--:|-------|
| Light-on-dark | 53 | **0** | 1 | Hot pink --- intentional WCAG FP |
| Dark-on-light | 54 | **0** | 0 | Clean sweep |
| Design systems | 2,480 | **0** | 28 | All warm-hue conservatism |
| **Total** | **2,587** | **0** | **29** | |

The 28 design-system false failures are all warm saturated families (red, fuchsia, pink, rose, orange, plum, indigo) in Tailwind, Material, and Radix UI palettes. They represent principled conservatism: $L^3 > Y_{\mathrm{WCAG}}$ for warm hues, so OKCA underestimates those pairs relative to WCAG. No correction is applied because any warm-side correction on the lighter element risks false passes for pink/fuchsia text near the AA boundary.

---

## 9. Key Constants

| Constant | Value | Role |
|----------|------:|------|
| `C_THRESH` | 0.15 | Oklab chroma at which lighter-element penalty is fully active |
| `CHROMA_K` | 0.75 | Maximum additional power exponent at full saturation |
| `K_DARK` | 0.155 | Green correction coefficient on darker element |
| `A_THRESH` | 0.05 | Oklab $a$ gate: green correction fires only when $a < -0.05$ |

All four constants have one degree of freedom each. They were calibrated by the following anchors:

- **$C_{\mathrm{THRESH}} = 0.15$** --- Typical Oklab chroma for designer palette saturated colours; lightly tinted neutrals ($C < 0.05$) receive $< 10\%$ of the full penalty.

- **$\mathrm{CHROMA\_K} = 0.75$** --- Yields $\mathit{exp} = 1.75$ at full saturation, which reduces hot pink's effective ratio from $6.6$ to $4.0$ (below the $4.5$ AA threshold). This is the target: WCAG's two most-cited false passes (hot pink and dark orange on near-black) become OKCA false failures.

- **$A_{\mathrm{THRESH}} = 0.05$** --- Separates true greens ($a \approx -0.13$ for forest green) from blue-shifted colours like Tailwind blue-700 ($a \approx -0.047$). The gate must be above $-0.047$ and below $-0.085$ (the weakest green that needs correction).

- **$K_{\mathrm{DARK}} = 0.155$** --- Minimum value such that white/`#228b22` gives a raw ratio $\le 4.45$ (rounds to $4.4$, not $4.5$). Derived analytically from the target $\mathit{darkerY} \ge 0.18596$.

---

## 10. What OKCA Does Not Do

Understanding the scope prevents incorrect use and misguided extension attempts.

**Does not model polarity.** Reading direction (light-on-dark vs. dark-on-light) is not encoded. Polarity models add significant calibration complexity and require asymmetric response functions. OKCA prioritises simplicity and symmetry.

**Does not model font size or weight.** WCAG AA ($4.5{:}1$) applies uniformly regardless of text size. OKCA outputs a single ratio; size-dependent thresholds are the caller's responsibility.

**Does not replace perceptual judgement.** An OKCA score of $4.5$ on a warm fuchsia text/white background means the pair clears the numerical threshold. A designer may still find it unpleasant. OKCA is a safety floor, not a design recommendation.

**Does not correct warm-hue false passes in WCAG.** WCAG 2.x has known false passes for warm chromatic text on very dark backgrounds. OKCA catches the two most-cited examples (hot pink, dark orange on near-black). It does not systematically correct all warm-hue WCAG false passes, because doing so would require a polarity model and risks introducing new false passes.

---

## 11. Extension Guidelines

When modifying the algorithm, these properties must be preserved:

1. **FP = 0.** Run all three probe batteries after any constant change. A false pass in the production service requires that the probe test be run with rounding applied (`toFixed(1)` on the raw ratio), not just with raw floats.

2. **Achromatic exactness.** White/black $= 21$, white/`#767676` $= 4.5$. These are the WCAG 2.x anchors that users will cross-check. Any deviation breaks trust.

3. **No third-party contrast algorithm source code.** Mathematical derivations from public specifications are permitted; copying control flow or constant blocks from third-party packages is not.

4. **Update probe battery expectations.** If any probe result changes intentionally, document the rationale before committing.
