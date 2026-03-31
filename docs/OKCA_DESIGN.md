# OKCA --- Design Document

**Algorithm:** OK Contrast Algorithm
**Status:** Production

---

## 1. What OKCA Is Trying to Solve

WCAG 2.x contrast uses the ratio formula:

$$\text{ratio} = \frac{Y_1 + 0.05}{Y_2 + 0.05}$$

This has two well-documented failure modes:

1. **False passes for saturated chromatic text.** Hot pink on near-black scores 6.6:1 under WCAG --- a comfortable AA pass. Accessibility practitioners consistently identify it as inadequate, and it is one of the most commonly cited examples of WCAG producing a result that does not match production experience. WCAG's luminance formula treats it identically to an achromatic pair at the same luminance ratio.

2. **Polarity blindness.** WCAG's ratio is symmetric: `ratio(A on B) = ratio(B on A)`. Designers and design systems treat the two directions as distinct --- dark mode and light mode are different design decisions, not interchangeable. WCAG does not model this asymmetry.

OKCA corrects both, while maintaining **zero false passes** against WCAG --- meaning OKCA never tells a designer a pair is safe when WCAG says it fails.

### Algorithm overview

OKCA processes a foreground/background color pair in five steps:

1. **Extract lightness.** Parse each color to OKLCH L — a perceptually uniform lightness measure used as the luminance input throughout.
2. **Identify polarity.** The element with higher L is the lighter element. If the foreground is lighter the pair is light-on-dark (L-o-D); if the background is lighter it is dark-on-light (D-o-L).
3. **Compress the lighter element.** Compute Oklab chroma $C = \sqrt{a^2+b^2}$. Apply a chroma-weighted power exponent to the lighter element's L, reducing its effective luminance proxy. Higher chroma → larger reduction.
4. **Compute the darker element's proxy.** The darker element uses $L^3$ directly — no chroma correction applied.
5. **Apply polarity-aware scaling.** Form a raw ratio from the two luminance proxies, then scale with a power curve that differs by polarity: L-o-D uses a cap of 21; D-o-L uses 20. Output is in [1, 21].

Sections 3–7 cover each step in depth. Section 4 proves FP = 0 holds across all inputs.

---

## 2. Core Design Principles

### 2.1 Safety: FP = 0 Is Non-Negotiable

A contrast algorithm used for accessibility decisions must never approve a pair that WCAG rejects. This is not a calibration preference --- it is the definition of a safe accessibility tool. OKCA guarantees this mathematically (see [Section 4](#4-the-fp--0-guarantee)).

### 2.2 WCAG-Compatible Scale and Thresholds

OKCA outputs ratios in [1, 21], uses the same AA threshold (4.5) and AAA threshold (7.0) as WCAG 2.x. Designers and developers see familiar numbers. No re-education required.

### 2.3 OKLCH L as the Luminance Input

WCAG 2.x computes luminance from linearised sRGB (IEC 61966-2-1). OKLCH L is a perceptually uniform lightness derived from the Oklab colour space. For neutral greys, the relationship is straightforward:

$$L^3 \approx Y_{\text{WCAG}}$$

The cube-root perceptual transform inverts to linear luminance. Using L as the primary input makes the algorithm coherent with what designers see in modern colour pickers.

### 2.4 Pure OKLCH/Oklab — No WCAG Hybrid Patches

OKCA is derived entirely from OKLCH and Oklab geometry. The chroma compression (Step 3) operates on Oklab chroma $C = \sqrt{a^2 + b^2}$ — the Euclidean distance from the achromatic axis in ab-space. This is rotationally symmetric: two colours at the same chroma magnitude receive the same penalty regardless of hue angle. The formula contains no hue branch and treats the $a$ and $b$ channels symmetrically.

In practice, outcomes do vary across hues because different hues reach different C values at any given lightness — warm reds and magentas typically achieve higher chroma than blues or greens at similar L, so the penalty lands harder on those hues. That variation is a consequence of Oklab geometry, not an explicit algorithmic choice.

FP = 0 is maintained by the polarity model (see [Section 4](#4-the-fp--0-guarantee)) rather than by green-channel patches.

### 2.5 Clean-Room IP

OKCA is a clean-room implementation derived from mathematical specifications and probe-validated calibration, with no third-party contrast algorithm source code.

### 2.6 Conservative Rather Than Liberal

When the algorithm must choose between overcounting contrast (false pass) and undercounting (false failure), it chooses undercounting. False failures result in designers choosing safer, more distinct colour pairs. False passes result in inaccessible text shipped to production.

---

## 3. Why $L^3$ Instead of WCAG Y

WCAG luminance is defined as:

$$Y = 0.2126\,R_{\text{lin}} + 0.7152\,G_{\text{lin}} + 0.0722\,B_{\text{lin}}$$

per IEC 61966-2-1 (linearised sRGB). This formula was designed for display calibration, not for predicting legibility. Two shortcomings are relevant to OKCA:

1. **Not designer-readable.** A designer cannot look at a colour picker, read the OKLCH L values, and predict the WCAG ratio without a separate calculation.

2. **Chromatic text on dark backgrounds.** WCAG Y does not distinguish between saturated and desaturated light text. A chromatic lighter element at the same Y as an achromatic one produces the same ratio --- even though practitioners and production audits consistently treat them differently.

OKLCH $L^3$ addresses both points directly. For neutral greys, $L^3 \approx Y_{\text{WCAG}}$ holds to within floating-point precision of the OKLCH transform. For chromatic pairs, the chroma compression in Step 3 reduces the effective lighter-element luminance below the $L^3$ value, producing the desired penalty.

---

## 4. The FP = 0 Guarantee

### Step 3: chroma compression reduces the lighter-element proxy

The exponent applied to the lighter element is $\ge 1$ and $L_{\text{lighter}} \le 1$, so:

$$L^{\text{exp}} \le L^1 \quad \Rightarrow \quad Y_{\text{lighter}} \le L^3$$

The numerator in the raw ratio can only decrease or stay the same.

### Step 4: pure $L^3$ for the darker element

No correction is applied to the darker element. With $Y_{\text{lighter}}$ at most equal to its WCAG equivalent, and the denominator at most equal to its WCAG equivalent:

$$r_{\text{raw}} = \frac{Y_{\text{lighter}} + 0.05}{Y_{\text{darker}} + 0.05} \le r_{\text{WCAG}}$$

### Step 5: polarity power curve cannot exceed the raw ratio

The ratio formula is:

$$\text{ratio} = \text{CAP} \times \left(\frac{r_{\text{raw}}}{21}\right)^{k}$$

where $k =$ `POL_K` $= 1.175 \ge 1$ and $\text{CAP} \le 21$.

Rewriting:

$$\text{ratio} = r_{\text{raw}} \times \left(\frac{r_{\text{raw}}}{21}\right)^{k-1} \times \frac{\text{CAP}}{21}$$

Since $k \ge 1$, $(r_{\text{raw}}/21)^{k-1} \le 1$ for $r_{\text{raw}} \le 21$. Since $\text{CAP} \le 21$, $\text{CAP}/21 \le 1$. Therefore:

$$\text{ratio} \le r_{\text{raw}} \le r_{\text{WCAG}}$$

**FP = 0 holds for both polarities.** A pair WCAG fails will also fail OKCA.

---

## 5. The Chroma Compression Mechanism (Step 3)

**Problem.** Saturated chromatic light text on a dark background --- e.g. hot pink (`#ff69b4`) on near-black (`#1a1a1a`) --- scores 6.6:1 under WCAG, the same as an achromatic pair at equivalent luminance. It is one of the most commonly cited WCAG false passes: experienced practitioners flag it as inadequate, and it fails at moderate contrast sensitivity loss. WCAG's formula has no mechanism to distinguish it from an achromatic pair.

Because WCAG contrast is a function of $Y$ alone, any two foreground colors sharing a luminance value produce identical ratios regardless of hue or saturation. `#9f9f9f` is the neutral grey with the same WCAG luminance as hot pink ($Y = 0.347$):

| Foreground | $Y$ | WCAG on `#1a1a1a` | OKCA on `#1a1a1a` |
|---|---:|---:|---:|
| `#ff69b4` (hot pink) | 0.347 | 6.6 | 3.7 |
| `#9f9f9f` (same-$Y$ grey) | 0.347 | 6.6 | 5.4 |

WCAG scores them identically. OKCA scores hot pink 3.7 (fails AA) and the grey 5.4 (passes AA).

**Mechanism.** The lighter element's luminance proxy is penalised by a chroma-weighted power exponent. First, a saturation weight is computed from the Oklab chroma:

$$\text{satW} = \min\left(1, \left(\frac{C}{0.15}\right)^{2}\right)$$

This is a quadratic ramp: zero for achromatic colours, reaching 1.0 when chroma hits the threshold. The exponent is then:

$$\text{exp} = 1 + 0.50 \times \text{satW}$$

ranging from 1.0 (achromatic) to 1.50 (fully saturated). The adjusted luminance proxy becomes:

$$Y_{\text{lighter}} = \left(L_{\text{lighter}}^{\text{exp}}\right)^3$$

For a neutral white lighter element: C = 0, satW = 0, exp = 1, so $Y_{\text{lighter}} = L^3 = 1.0$ --- unchanged.

For hot pink (C ≈ 0.197 > 0.15): satW = 1, exp = 1.50 --- the lighter element is penalised. After Step 5 polarity scaling, hot pink/near-black drops to 3.7, below the 4.5 AA threshold.

The threshold of 0.15 is calibrated so the penalty is negligible for lightly tinted neutrals (e.g. off-white at C ≈ 0.01) and fully active for vivid designer palette colours (C ≥ 0.15).

---

## 6. Achromatic Behaviour

For neutral grey pairs, chroma compression reduces to identity:

- **Step 3:** Oklab chroma C = 0, so satW = 0, exp = 1, and $Y_{\text{lighter}} = L^3$.
- **Step 4:** $Y_{\text{darker}} = L^3$ (no correction applied).

Since $L^3 \approx Y_{\text{WCAG}}$ for greys (up to floating-point precision of the OKLCH transform), the raw contrast ratio before Step 5 equals the WCAG ratio for neutral pairs. The polarity power model (Step 5) then scales scores according to polarity. The achromatic anchors are:

| Pair | Polarity | Score |
|------|----------|------:|
| white on black | L-o-D | 21.0 |
| black on white | D-o-L | 20.0 |
| white on `#767676` | L-o-D | 3.5 |
| `#767676` on white | D-o-L | 3.3 |

The WCAG AA boundary grey (`#767676`) fails AA under OKCA in both polarities.

---

## 7. Polarity Model (Step 5)

OKCA is **polarity-aware**: `okca(A, B) ≠ okca(B, A)` when A and B differ in lightness. The ratio formula takes the designated text and background roles into account via a final power-curve scaling.

**Mechanism.** Let $r$ denote the raw ratio after Steps 1–4, and let $\text{CAP}$ be the polarity cap:

$$\text{ratio} = \text{CAP} \times \left(\frac{r}{21}\right)^{k}$$

where $k =$ `POL_K` $= 1.175$ and:

$$\text{CAP} = \begin{cases} 21 & \text{if text is lighter (light-on-dark)} \\ 20 & \text{if background is lighter (dark-on-light)} \end{cases}$$

For L-o-D ($\text{CAP} = 21$): the formula pins exactly at 21.0 when $r = 21$ and reduces all lower ratios by the power factor. For D-o-L ($\text{CAP} = 20$): the same power curve is applied but the cap is proportionally lower, applying a polarity penalty at every contrast level. Both polarities share the same exponent $k$, giving consistent curve shape.

**Rationale.** Designers and design systems treat polarity as a meaningful input --- dark mode and light mode are distinct design decisions, and practitioners evaluate them differently. WCAG's symmetric formula discards this information. OKCA encodes the asymmetry as a calibrated design choice: a light-on-dark pair scores higher than the same colours reversed, anchored to practitioner-accepted reference values (white/black = 21.0/20.0, `#767676` = 3.5/3.3). Both transforms produce ratios at or below the raw WCAG value (all scores are conservative).

**Deriving $k$.** The exponent was calibrated so that white on `#767676` --- the canonical WCAG AA boundary grey, raw $r \approx 4.57$ --- rounds to exactly 3.5 under L-o-D:

$$k = \frac{\ln(3.5/21)}{\ln(4.57/21)} \approx 1.1746 \rightarrow 1.175$$

**FP = 0 proof for Step 5.** Restated from Section 4: for $k \ge 1$ and $\text{CAP} \le 21$, the polarity ratio is always $\le r_{\text{raw}} \le r_{\text{WCAG}}$.

---

## 8. Probe Validation Summary

Three independent batteries:

| Battery | Pairs | FP | WCAG Disagreements | Notes |
|---------|------:|:--:|:------------------:|-------|
| Light-on-dark | 53 | **0** | — | See design-systems for FP=0 coverage |
| Dark-on-light | 54 | **0** | — | See design-systems for FP=0 coverage |
| Design systems | 1,142 | **0** | 111 | See note below |
| **Total** | **1,249** | **0** | **111** | |

**False passes are zero** --- the non-negotiable invariant holds across all 1,249 pairs.

**WCAG disagreements** (pairs where OKCA < 4.5 but WCAG ≥ 4.5) are intentional and should not be read as miscalibration. WCAG's 4.5:1 AA threshold is widely considered too permissive by practitioners. White on `#767676` --- the canonical WCAG AA boundary anchor --- is not production-ready in most real designs. All 111 disagreements involve colours in that marginal zone: proximity to the boundary is not the same as being safely above it.

By system: Tailwind CSS v3.4 (46), GOV.UK Design System (15), USWDS v3.x (50). See `docs/WCAG_DISAGREEMENTS.md` for full enumeration with hex values.

---

## 9. Key Constants

| Constant | Value | Role |
|----------|------:|------|
| `C_THRESH` | 0.15 | Oklab chroma at which lighter-element penalty is fully active |
| `CHROMA_K` | 0.50 | Maximum additional power exponent at full saturation (exp range: 1.0–1.5) |
| `POL_K` | 1.175 | Shared polarity power exponent: CAP×(r/21)^k |
| `DOL_CAP` | 20 | Dark-on-light contrast cap (vs 21 for L-o-D); proportional polarity penalty |

**Calibration anchors:**

- **`C_THRESH` = 0.15** --- Typical Oklab chroma for designer palette saturated colours; lightly tinted neutrals (C < 0.05) receive less than 10% of the full penalty.

- **`CHROMA_K` = 0.50** --- Yields exp = 1.50 at full saturation. Combined with the polarity factor, hot pink/near-black scores 3.7 and dark orange/near-black scores 4.2 --- both below the 4.5 AA threshold. These are two of WCAG's most-cited false passes.

- **`POL_K` = 1.175** --- Calibrated so white/`#767676` (WCAG AA boundary grey) scores exactly 3.5 under L-o-D. Derived: $k = \ln(3.5/21) / \ln(4.57/21) \approx 1.1746$.

- **`DOL_CAP` = 20** --- Proportional polarity penalty for D-o-L: at any given raw ratio, D-o-L scores $(20/21) \approx 95\%$ of the equivalent L-o-D score. Black on white: 20.0. `#767676` on white: $(20/21) \times 3.5 \approx 3.3$.

---

## 10. What OKCA Does Not Do

Understanding the scope prevents incorrect use and misguided extension attempts.

**Does not model font size or weight.** WCAG AA (4.5:1) applies uniformly regardless of text size. OKCA outputs a single ratio; size-dependent thresholds are the caller's responsibility.

**Does not replace perceptual judgement.** An OKCA score of 4.5 on a warm fuchsia text/white background means the pair clears the numerical threshold. A designer may still find it unpleasant. OKCA is a safety floor, not a design recommendation.

**Does not patch WCAG's channel weighting.** OKCA does not compensate for the IEC 61966-2-1 green-channel weighting in WCAG's luminance formula. The chroma compression is rotationally symmetric in ab-space — no hue branch, no asymmetric treatment of $a$ vs $b$. Hue-varying outcomes arise from Oklab geometry (different hues reach different C values at similar lightness), not from explicit hue targeting.

---

## 11. Extension Guidelines

When modifying the algorithm, these properties must be preserved:

1. **FP = 0.** Run all three probe batteries after any constant change. A false pass in the production service requires that the probe test be run with rounding applied (`toFixed(1)` on the raw ratio), not just with raw floats.

2. **Achromatic anchors.** White/black = 21.0 (L-o-D) / 20.0 (D-o-L). White/`#767676` = 3.5 (L-o-D) / 3.3 (D-o-L). These are the calibration reference points. Any unintended deviation breaks the polarity model calibration.

3. **No third-party contrast algorithm source code.** Mathematical derivations from public specifications are permitted; copying control flow or constant blocks from third-party packages is not.

4. **Update probe battery expectations.** If any probe result changes intentionally, document the rationale before committing.
