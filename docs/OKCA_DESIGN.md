# OKCA --- Design Document

**Algorithm:** OK Contrast Algorithm
**Status:** Production

---

## 1. What OKCA Is Trying to Solve

WCAG 2.x contrast uses the ratio formula:

$$\text{ratio} = \frac{Y_1 + 0.05}{Y_2 + 0.05}$$

This has three failure modes OKCA addresses:

1. **False passes for saturated chromatic text.** Hot pink on near-black scores 6.6:1 under WCAG --- a comfortable AA pass. Accessibility practitioners consistently identify it as inadequate, and it is one of the most commonly cited examples of WCAG producing a result that does not match production experience. WCAG's luminance formula treats it identically to an achromatic pair at the same luminance ratio.

2. **Polarity blindness.** WCAG's ratio is symmetric: `ratio(A on B) = ratio(B on A)`. Designers and design systems treat the two directions as distinct --- dark mode and light mode are different design decisions, not interchangeable. WCAG does not model this asymmetry.

3. **Background-blind lightness.** WCAG and Oklab both treat a colour's lightness as fixed, whatever it sits on. The CIE-lineage colour appearance model CAM16 does not: a darker background flattens the lightness scale, so the same pair carries less lightness difference on a dark background than on a light one. At the AA line, a just-passing grey on `#1a1a1a` carries 25% less CAM16 lightness gap than one on white ([`CAM16_FINDINGS.md`](CAM16_FINDINGS.md)).

OKCA corrects all three while being **never more permissive than WCAG** --- every score lands at or below the WCAG score for the same pair, so OKCA never tells a designer a pair is safe when WCAG says it fails.

OKCA is a stricter WCAG 2.x checker for sRGB, not a new perceptual model: it keeps WCAG's scale and thresholds and tightens the three failure modes above. Its one guarantee is the safety bound.

### Algorithm overview

OKCA processes a foreground/background color pair in five steps:

1. **Extract lightness.** Parse each color to OKLCH L — a perceptually uniform lightness measure used as the luminance input throughout.
2. **Identify polarity.** The element with higher L is the lighter element. If the foreground is lighter the pair is light-on-dark (L-o-D); if the background is lighter it is dark-on-light (D-o-L).
3. **Compress the lighter element.** Compute Oklab chroma $C = \sqrt{a^2+b^2}$. Apply a chroma-weighted power exponent to the lighter element's L, reducing its effective luminance proxy. Higher chroma → larger reduction.
4. **Compute the darker element's proxy.** The darker element uses $L^3$, raised to a power $s \le 1$ that depends on the background's lightness (background induction, §3). On backgrounds at least as light as `#767676`, $s = 1$.
5. **Apply polarity-aware scaling.** Form a raw ratio from the two luminance proxies, then scale with a power curve that differs by polarity: L-o-D uses a cap of 20.9 (`LOD_CAP`); D-o-L uses 20. Output is in $[1, 21]$.

Sections 3–7 cover each step in depth. Section 4 establishes FP = 0 — by construction on the achromatic axis, and by gamut-wide verification for chromatic inputs.

---

## 2. Core Design Principles

### 2.1 Safety: FP = 0 Is Non-Negotiable

A contrast algorithm used for accessibility decisions must never approve a pair that WCAG rejects. This is not a calibration preference --- it is the definition of a safe accessibility tool. FP = 0 holds by construction on the achromatic axis and is verified across the sRGB gamut for chromatic inputs (see [Section 4](#4-the-fp--0-guarantee)).

### 2.2 WCAG-Compatible Scale and Thresholds

OKCA outputs ratios in $[1, 21]$, uses the same AA threshold (4.5) and AAA threshold (7.0) as WCAG 2.x. Designers and developers see familiar numbers. No re-education required.

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

$$Y = 0.2126\thinspace R_{\text{lin}} + 0.7152\thinspace G_{\text{lin}} + 0.0722\thinspace B_{\text{lin}}$$

per IEC 61966-2-1 (linearised sRGB). This formula was designed for display calibration, not for predicting legibility. Two shortcomings are relevant to OKCA:

1. **Not designer-readable.** A designer cannot look at a colour picker, read the OKLCH L values, and predict the WCAG ratio without a separate calculation.

2. **Chromatic text on dark backgrounds.** WCAG Y does not distinguish between saturated and desaturated light text. A chromatic lighter element at the same Y as an achromatic one produces the same ratio --- even though practitioners and production audits consistently treat them differently.

OKLCH $L^3$ addresses both points directly. For neutral greys, $L^3 \approx Y_{\text{WCAG}}$ holds to within floating-point precision of the OKLCH transform. For chromatic pairs, the chroma compression in Step 3 reduces the effective lighter-element luminance below the $L^3$ value, producing the desired penalty.

### Background induction (Step 4)

**Problem.** $L^3$ is the same whatever a colour sits on. CAM16 (Li et al. 2017; the basis of the CIE's CIECAM16, CIE 248:2022) models lightness relative to the background. For greys, CAM16 lightness is very nearly a power of OKLab $L$, and the background sets the power:

$$
J/100 \approx L^{\gamma}, \qquad \gamma \approx 1.26 \thinspace c \thinspace \left(1.48 + L_{\text{bg}}^{1.5}\right)
$$

from about 1.36 on near-black to 2.13 on white, fit to within 0.15 $J$. A darker background flattens the scale, so the same pair carries less lightness difference. Before Step 4 existed, a grey just passing 4.5 on `#1a1a1a` carried a background-aware CAM16-UCS lightness gap of 47.6, and one on `#333333` 45.1, against 63.4 on white ([`CAM16_FINDINGS.md`](CAM16_FINDINGS.md) §2–§3).

**Mechanism.** Take CAM16's exponent relative to a reference background. The factor $1.26 \thinspace c$ cancels:

$$
s = \min\left(1, \thinspace \frac{1.48 + L_{\text{bg}}^{1.5}}{1.48 + L_{\text{ref}}^{1.5}}\right), \qquad Y_{\text{darker}} = L_{\text{darker}}^{3s}
$$

where $L_{\text{bg}}$ is the background's OKLab $L$ and $L_{\text{ref}} = 0.5658$ is OKLab $L$ of `#767676`.

- **No tuned constants.** $1.48$ is CAM16's own constant, and the reference is the background of the white/`#767676` anchor.
- **Identity on lighter backgrounds.** On any background at least as light as `#767676`, $s = 1$. The anchors, and every score on such a background, are unchanged.
- **Lifts the darker element on darker backgrounds.** Example values are $s = 0.777$ on black, $0.830$ on `#1a1a1a` and $0.903$ on `#444444`.

**Why only the darker element.** CAM16 lifts both elements. Lifting the lighter one too raises the numerator: it makes pure-black pairs *more* lenient, and it produced 175 false passes in a 67,396-pair sample. Lifting only the darker proxy can only shrink the ratio, so no score rises above its value without Step 4 (§4).

**Effect.** The spread of the CAM16 lightness gap at the AA line, across backgrounds, falls from 18.2 to 13.2. Mid-dark backgrounds benefit most:

| Pair | Before Step 4 | With Step 4 |
|---|---:|---:|
| `#919191` on `#121212` | 5.2 | 4.4 |
| `#9f9f9f` on `#1a1a1a` | 5.8 | 4.8 |
| `#cccccc` on `#333333` | 7.1 | 5.7 |
| white on `#595959` | 6.2 | 5.7 |
| white on `#333333` | 12.0 | 9.6 |
| `#888888` on `#000000` | 5.2 | 5.2 |

- **Pure black is unchanged.** Its proxy is 0 for any $s$.
- **High-contrast scores fall too.** White on `#111111` goes from 18.6 to 15.8, because the correction scales the whole dark side.
- **AAA feels it most.** Eleven curated pairs drop below 7.0; one drops below 4.5.

**Not a viewing-conditions model.** $Y_b$ is the background colour, which OKCA receives as an input. Absolute luminance and surround, which OKCA cannot observe, were also tested in CAM16; they do not separate dark backgrounds from light ones (§10, and [`CAM16_FINDINGS.md`](CAM16_FINDINGS.md) §4).

---

## 4. The FP = 0 Guarantee

FP = 0 means that for **every** input pair the final OKCA score is at most the
WCAG ratio, so OKCA never approves a pair WCAG rejects. This holds **by
construction across the full sRGB gamut** — an exact algebraic identity plus two
interval-verified single-colour lemmas (summarised below; full argument in
[`docs/FP0_PROOF.md`](FP0_PROOF.md)). The building blocks (Steps 3 and 5 below)
are individually deductive; the identity ties them together.

### Step 3: chroma compression reduces the lighter-element proxy (by construction)

The exponent applied to the lighter element is $\ge 1$ and $L_{\text{lighter}} \le 1$, so:

$$L^{\text{exp}} \le L^1 \quad \Rightarrow \quad Y_{\text{lighter}} = (L^{\text{exp}})^3 \le L^3$$

The raw-ratio numerator can only decrease relative to the uncompressed $L^3$.

### The luminance proxy is exact only on the achromatic axis

OKCA uses $L^3$ as its luminance proxy. For neutral greys this equals WCAG
luminance to floating-point precision ($L^3 = Y_{\text{WCAG}}$). **Off the
achromatic axis it does not.** OKLCH L is not a fixed-weight sum of linearised
RGB, so $L^3$ diverges from $Y_{\text{WCAG}}$ by hue — greens **undershoot**
($L^3 < Y_{\text{WCAG}}$; pure green $L^3 = 0.65$ vs $Y = 0.715$), reds and blues
overshoot. When the **darker** element is chromatic — especially green — its
proxy can fall below $Y_{\text{WCAG}}$, shrinking the denominator and pushing the
**raw** ratio *above* the WCAG ratio. So, for chromatic darker elements:

$$r_{\text{raw}} = \frac{Y_{\text{lighter}} + 0.05}{Y_{\text{darker}} + 0.05} \quad \not\le \quad r_{\text{WCAG}} \quad\text{in general.}$$

This is the step where the naive argument — $L^3 = Y_{\text{WCAG}}$, therefore $r_{\text{raw}} \le r_{\text{WCAG}}$ — fails. FP = 0 is **not** carried by the raw ratio.

### Step 5: the polarity curve supplies the margin (by construction)

The final ratio is

$$\text{ratio} = \text{CAP} \times \left(\frac{r_{\text{raw}}}{21}\right)^{k}, \qquad k = 1.100 \ge 1, \quad \text{CAP} \le 20.9 < 21.$$

where $k$ is `POL_K` and the cap ceiling is `LOD_CAP` = 20.9.

Rewriting, $\text{ratio} = r_{\text{raw}} \times (r_{\text{raw}}/21)^{k-1} \times (\text{CAP}/21)$. Since $k \ge 1$ and $r_{\text{raw}} \le 21$, the factor $(r_{\text{raw}}/21)^{k-1} \le 1$; and $\text{CAP}/21 < 1$ (strictly, since $\text{CAP} \le 20.9$). Therefore, **unconditionally**:

$$\text{ratio} \le r_{\text{raw}}$$

The compression is what creates **headroom**: the final score sits below the raw
ratio by a margin that grows as the ratio falls below 21.

### Why FP = 0 holds — by construction across the full sRGB gamut

The raw ratio can exceed WCAG for chromatic darker elements, so FP = 0 is **not**
carried by the raw ratio. But the full inequality **is** a theorem. Rearranging
$\text{OKCA} \le \text{WCAG}$ separates the two elements completely:

$$\text{OKCA} \le \text{WCAG} \iff \frac{\text{CAP}}{21^{k}} \cdot A(\text{lighter}) \cdot B(\text{darker}) \le 1,$$

with $A(l) = (Y_{\text{lighter}}+0.05)^{k}/(Y_{l}+0.05)$ and
$B(d) = (Y_{d}+0.05)/(Y_{\text{darker}}+0.05)^{k}$ each depending on a **single**
element. At the achromatic anchors, for any $k$,

$$21^{1-k} \cdot A(\text{white}) \cdot B(\text{black}) = (21\cdot 0.05)^{1-k}\cdot 1.05^{k-1} = 1$$

exactly (since $21\cdot 0.05 = 1.05$). Because the L-o-D cap is set **below 21**
(`LOD_CAP` = 20.9), the bound at the anchor becomes
$20.9/21 = 0.99524 < 1$ — a strict margin, so there is **no equality
point** and OKCA is strictly below WCAG everywhere. FP = 0 then reduces to two single-colour lemmas,
$A(l) \le A(\text{white})$ and $B(d) \le B(\text{black})$, each **verified by
interval arithmetic** over the sRGB cube with **0 uncertified boxes**
(`npm run fp0`; full argument in [`docs/FP0_PROOF.md`](FP0_PROOF.md)).

**Step 4 keeps the bound.** Background induction raises the darker proxy: $L^{3s} \ge L^3$ for $s \le 1$ and $L \le 1$. Lemma B's $B(d)$ only falls as the darker proxy rises, so the lemma holds a fortiori and no new lemma is needed ([`FP0_PROOF.md`](FP0_PROOF.md) §5).

So FP = 0 is **verified for all sRGB inputs** — an exact identity plus two
interval-checked lemmas, not a calibration-dependent headroom property. (The
chroma penalty and Step-5 compression still shape *how far* below WCAG each score
sits; they are no longer load-bearing for the guarantee itself.)

**Scope and caveats.** The proof covers **sRGB** inputs. It re-runs via
`npm run fp0` after any change to $k$, the caps, or the chroma penalty (the
identity holds for any $k$; the two lemmas are re-checked), so it is robust to
retuning. Inputs **outside sRGB** (wide-gamut P3/Rec.2020 `oklch()` values) are
not covered — the lemma search is over the sRGB cube and must be extended to the
wider domain (see [Section 11](#11-extension-guidelines)).

---

## 5. The Chroma Compression Mechanism (Step 3)

**Problem.** Saturated chromatic light text on a dark background --- e.g. hot pink (`#ff69b4`) on near-black (`#1a1a1a`) --- scores 6.6:1 under WCAG, the same as an achromatic pair at equivalent luminance. It is one of the most commonly cited WCAG false passes: experienced practitioners flag it as inadequate, and it fails at moderate contrast sensitivity loss. WCAG's formula has no mechanism to distinguish it from an achromatic pair.

Because WCAG contrast is a function of $Y$ alone, any two foreground colors sharing a luminance value produce identical ratios regardless of hue or saturation. `#9f9f9f` is the neutral grey with the same WCAG luminance as hot pink ($Y = 0.347$):

| Foreground | $Y$ | WCAG on `#1a1a1a` | OKCA on `#1a1a1a` |
|---|---:|---:|---:|
| `#ff69b4` (hot pink) | 0.347 | 6.6 | 3.0 |
| `#9f9f9f` (grey at the same $Y$) | 0.347 | 6.6 | 4.8 |

WCAG scores them identically. OKCA scores hot pink 3.0 (fails AA) and the grey 4.8 (passes AA). Both include Step 4's induction from the near-black background; the gap between them is the chroma penalty.

**Mechanism.** The lighter element's luminance proxy is penalised by a chroma-weighted power exponent. First, a saturation weight is computed from the Oklab chroma:

$$\text{satW} = \min\left(1, \left(\frac{C}{0.15}\right)^{2}\right)$$

This is a quadratic ramp: zero for achromatic colours, reaching 1.0 when chroma hits the threshold. The exponent is then:

$$\text{exp} = 1 + 0.65 \times \text{satW}$$

ranging from 1.0 (achromatic) to 1.65 (fully saturated). The adjusted luminance proxy becomes:

$$Y_{\text{lighter}} = \left(L_{\text{lighter}}^{\text{exp}}\right)^3$$

For a neutral white lighter element: $C = 0$, $\text{satW} = 0$, $\text{exp} = 1$, so $Y_{\text{lighter}} = L^3 = 1.0$ --- unchanged.

For hot pink ($C \approx 0.197 > 0.15$): $\text{satW} = 1$, $\text{exp} = 1.65$ --- the lighter element is penalised. After Step 4's background induction and Step 5's polarity scaling, hot pink/near-black drops to 3.0, below the 4.5 AA threshold.

The threshold of 0.15 is calibrated so the penalty is negligible for lightly tinted neutrals (e.g. off-white at $C \approx 0.01$) and fully active for vivid designer palette colours ($C \ge 0.15$).

---

## 6. Achromatic Behaviour

For neutral grey pairs, chroma compression reduces to identity:

- **Step 3:** Oklab chroma $C = 0$, so $\text{satW} = 0$, $\text{exp} = 1$, and $Y_{\text{lighter}} = L^3$.
- **Step 4:** $Y_{\text{darker}} = L^3$ on backgrounds at least as light as `#767676`. On darker backgrounds, background induction raises it to $L^{3s}$ (§3).

Since $L^3 \approx Y_{\text{WCAG}}$ for greys (up to floating-point precision of the OKLCH transform), the raw contrast ratio before Step 5 equals the WCAG ratio for neutral pairs on backgrounds at least as light as `#767676`, and falls below it on darker ones. The polarity power model (Step 5) then scales scores according to polarity. The achromatic anchors are:

| Pair | Polarity | Score |
|------|----------|------:|
| white on black | L-o-D | 20.9 |
| black on white | D-o-L | 20.0 |
| white on `#767676` | L-o-D | 3.9 |
| `#767676` on white | D-o-L | 3.7 |

The WCAG AA boundary grey (`#767676`) fails AA under OKCA in both polarities.

---

## 7. Polarity Model (Step 5)

OKCA is **polarity-aware**: `okca(A, B) ≠ okca(B, A)` when A and B differ in lightness. The ratio formula takes the designated text and background roles into account via a final power-curve scaling.

**Mechanism.** Let $r$ denote the raw ratio after Steps 1–4, and let $\text{CAP}$ be the polarity cap:

$$\text{ratio} = \text{CAP} \times \left(\frac{r}{21}\right)^{k}$$

where $k =$ `POL_K` $= 1.100$ and:

$$\text{CAP} = \begin{cases}
20.9 & \text{if text is lighter (light-on-dark)} \\
20 & \text{if background is lighter (dark-on-light)}
\end{cases}$$

For L-o-D (`LOD_CAP`, $\text{CAP} = 20.9$): the formula pins at 20.9 when $r = 21$ — a hair below WCAG's 21, the strict-margin that makes FP = 0 hold by construction (Section 4) — and reduces all lower ratios by the power factor. For D-o-L ($\text{CAP} = 20$): the same power curve with a lower cap, applying a polarity penalty at every contrast level. Both polarities share the same exponent $k$, giving consistent curve shape.

**Rationale.** Designers and design systems treat polarity as a meaningful input --- dark mode and light mode are distinct design decisions, and practitioners evaluate them differently. WCAG's symmetric formula discards this information. OKCA encodes the asymmetry as a calibrated design choice: a light-on-dark pair scores higher than the same colours reversed, anchored to practitioner-accepted reference values (white/black = 20.9/20.0, `#767676` = 3.9/3.7). Both transforms produce ratios strictly at or below the raw WCAG value (all scores are conservative).

**Deriving $k$.** The exponent was calibrated so that white on `#767676` --- the canonical WCAG AA boundary grey, raw $r \approx 4.54$ --- rounds to 3.9 under L-o-D (raised from an earlier 3.5 anchor to reduce over-conservatism on mid-range chromatics; FP = 0 re-verified across the gamut):

$$k = \frac{\ln(3.9/21)}{\ln(4.54/21)} \approx 1.0996 \rightarrow 1.100$$

**FP = 0 and Step 5.** For $k \ge 1$ and $\text{CAP} \le 21$ the polarity ratio is always $\le r_{\text{raw}}$ (Section 4). On the achromatic axis $r_{\text{raw}} = r_{\text{WCAG}}$; for chromatic inputs the resulting headroom is what holds the final score $\le r_{\text{WCAG}}$ across the gamut.

---

## 8. Probe Validation Summary

Three independent batteries:

| Battery | Pairs | FP | WCAG Disagreements | Notes |
|---------|------:|:--:|:------------------:|-------|
| Light-on-dark | 53 | **0** | — | See design-systems for FP=0 coverage |
| Dark-on-light | 54 | **0** | — | See design-systems for FP=0 coverage |
| Design systems | 1,142 | **0** | 99 | See note below |
| **Total** | **1,249** | **0** | **99** | |

**False passes are zero** --- the non-negotiable invariant holds across all 1,249 pairs.

**WCAG disagreements** (pairs where OKCA < 4.5 but WCAG ≥ 4.5) are intentional and should not be read as miscalibration. WCAG's 4.5:1 AA threshold is widely considered too permissive by practitioners. White on `#767676` --- the canonical WCAG AA boundary anchor --- sits exactly on the line, where the verdict turns on the display and the room rather than on the colours (see *Does not model viewing conditions* in §10 below). All 97 disagreements involve colours in that marginal zone: proximity to the boundary is not the same as being safely above it, and a pair on the line has no margin against the conditions it will be read in. (The count was 111 before the white/#767676 anchor was raised 3.5 → 3.9; that recalibration cleared 14 mid-range chromatics that sat just under 4.5.)

By system: Tailwind CSS v3.4 (35), GOV.UK Design System (14), USWDS v3.x (50). Step 4 added two: white on lime-700 and white on GOV.UK blue, each 4.5 to 4.4. See `docs/WCAG_DISAGREEMENTS.md` for full enumeration with hex values.

---

## 9. Key Constants

| Constant | Value | Role |
|----------|------:|------|
| `C_THRESH` | 0.15 | Oklab chroma at which lighter-element penalty is fully active |
| `CHROMA_K` | 0.65 | Maximum additional power exponent at full saturation (exp range: 1.0–1.65) |
| `POL_K` | 1.100 | Shared polarity power exponent: $\text{CAP} \times (r/21)^{k}$ |
| `LOD_CAP` | 20.9 | Light-on-dark contrast cap (< 21 → OKCA strictly below WCAG, FP=0 by construction) |
| `DOL_CAP` | 20 | Dark-on-light contrast cap (< LOD_CAP); proportional polarity penalty |
| `IND_Z` | 1.48 | CAM16's lightness-exponent constant, used by Step 4 |
| `IND_REF_L` | 0.5658 | OKLab $L$ of `#767676`: backgrounds at or above it keep $s = 1$ |

**Calibration anchors:**

- **`C_THRESH` = 0.15** --- Typical Oklab chroma for designer palette saturated colours; lightly tinted neutrals ($C < 0.05$) receive less than 10% of the full penalty.

- **`CHROMA_K` = 0.65** --- Yields $\text{exp} = 1.65$ at full saturation. Combined with Step 4 and the polarity factor, hot pink/near-black scores 3.0 and dark orange/near-black scores 3.4 --- both below the 4.5 AA threshold, where WCAG rates them 6.6 and 7.5 (two of WCAG's most-cited false passes). Before Step 4 they scored 3.6 and 4.2. `CHROMA_K` was not lowered to restore those figures: neither survey supports a weaker chroma penalty, and lowering it would loosen dark text on saturated fills, which induction does not reach. Raised from 0.50 alongside the 3.9 anchor move: the anchor lowered `POL_K` (which lifts all scores globally, including these saturated catches), and the stronger chroma penalty re-docks vivid saturated foregrounds to their intended sub-AA scores. Because the penalty acts only on the lighter element, this leaves the achromatic anchors and the (white-lighter) design-system disagreement counts untouched.

- **`POL_K` = 1.100** --- Calibrated so white/`#767676` (WCAG AA boundary grey) scores 3.9 under L-o-D (raised from a 3.5 anchor / `POL_K` 1.175 to reduce over-conservatism on mid-range chromatics). Derived: $k = \ln(3.9/21) / \ln(4.54/21) \approx 1.0996$.

- **`LOD_CAP` = 20.9** --- Light-on-dark cap, one notch below 21. This is the strict-margin lever for the FP=0 proof: with the cap below 21 the identity $21^{1-k} \cdot A(\text{white}) \cdot B(\text{black}) = 1$ becomes $20.9/21 = 0.99524 < 1$, removing the single white-on-black equality point so OKCA is strictly below WCAG everywhere (Section 4). White on black: 20.9.

- **`DOL_CAP` = 20** --- Proportional polarity penalty for D-o-L: at any given raw ratio, D-o-L scores $20/20.9 \approx 0.96$ — about 96% — of the equivalent L-o-D score. Black on white: 20.0. `#767676` on white: $(20/20.9) \times 3.9 \approx 3.7$.

- **`IND_Z` = 1.48, `IND_REF_L` = 0.5658** --- Not tuned. `IND_Z` is the constant in CAM16's $z = 1.48 + \sqrt{Y_b}$, and `IND_REF_L` is the OKLab $L$ of the background in the white/`#767676` anchor. That reference keeps the anchors exact. A lighter reference would also even out light backgrounds (`#c8c8c8` trails white by about 10 CAM16 lightness units at the AA line), but it would move the anchor.

---

## 10. What OKCA Does Not Do

Understanding the scope prevents incorrect use and misguided extension attempts.

**Does not model font size or weight.** WCAG AA (4.5:1) applies uniformly regardless of text size. OKCA outputs a single ratio; size-dependent thresholds are the caller's responsibility.

**Does not replace perceptual judgement.** An OKCA score of 4.5 on a warm fuchsia text/white background means the pair clears the numerical threshold. A designer may still find it unpleasant. OKCA is a safety floor, not a design recommendation.

**Does not model viewing conditions.** The contrast at which text becomes acceptable moves substantially with display luminance and ambient light — far enough that a pair near the AA boundary can be judged shippable under one setup and not another by the same person in the same room ([#22](https://github.com/pawn002/okca/issues/22#issuecomment-5282357292)). OKCA is a relative metric over sRGB with no access to absolute luminance, so it does not model this and no constant of its own could: a level-dependent term was measured for and not detected, while the effect that does exist tracks a quantity the algorithm cannot observe. The safety bound is unaffected, being a relation between two relative metrics. The practical consequence is that OKCA's floors are viewing-condition independent by construction, which is a reason to keep them conservative rather than to tune them.

**Does not patch WCAG's channel weighting.** OKCA does not compensate for the IEC 61966-2-1 green-channel weighting in WCAG's luminance formula. The chroma compression is rotationally symmetric in ab-space — no hue branch, no asymmetric treatment of $a$ vs $b$. Hue-varying outcomes arise from Oklab geometry (different hues reach different C values at similar lightness), not from explicit hue targeting.

---

## 11. Extension Guidelines

When modifying the algorithm, these properties must be preserved:

1. **FP = 0.** Re-verify FP = 0 **across the sRGB gamut**, not only on the three probe batteries — the property is calibration-dependent off the achromatic axis (Section 4), so a constant change can introduce a false pass in a hue region the batteries miss. Run checks with rounding applied (`toFixed(1)` on the raw ratio), not just raw floats.

2. **Achromatic anchors.** White/black = 20.9 (L-o-D) / 20.0 (D-o-L). White/`#767676` = 3.9 (L-o-D) / 3.7 (D-o-L). These are the calibration reference points. Any unintended deviation breaks the polarity model calibration. (White/black is 20.9, not 21, by design — see `LOD_CAP` and Section 4.)

3. **No third-party contrast algorithm source code.** Mathematical derivations from public specifications are permitted; copying control flow or constant blocks from third-party packages is not.

4. **Update probe battery expectations.** If any probe result changes intentionally, document the rationale before committing.

5. **Background induction.** Step 4 must keep $s \le 1$ and apply only to the darker element. Those two properties are what keep it inside the FP=0 proof, and they are asserted in `background-induction.spec.ts`.
