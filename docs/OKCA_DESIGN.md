# OKCA --- Design Document

**Algorithm:** OK Contrast Algorithm
**Status:** Production

---

## 1. What OKCA Is Trying to Solve

WCAG 2.x contrast uses the ratio formula:

$$\text{ratio} = \frac{Y_1 + 0.05}{Y_2 + 0.05}$$

This has four failure modes OKCA addresses:

1. **False passes for saturated chromatic text.** Hot pink on near-black scores 6.6:1 under WCAG --- a comfortable AA pass. Designers routinely judge it inadequate for text, and it is one of the most commonly cited examples of WCAG producing a result that does not match production experience. Part of the gap is measurable: a reader with red–green colour-vision deficiency keeps about 5.3 of its 6.6, while a grey of the same luminance loses nothing ([`CVD_FINDINGS.md`](CVD_FINDINGS.md)). WCAG's luminance formula treats it identically to an achromatic pair at the same luminance ratio.

2. **Polarity blindness.** WCAG's ratio is symmetric: `ratio(A on B) = ratio(B on A)`. The two directions are not equivalent: reading research finds dark text on a light background outperforms the reverse (§7), and dark backgrounds measurably cost contrast (failure modes 3 and 4). WCAG does not model this asymmetry.

3. **Background-blind lightness.** WCAG and Oklab both treat a colour's lightness as fixed, whatever it sits on. The CIE-lineage colour appearance model CAM16 does not: a darker background flattens the lightness scale, so the same pair carries less lightness difference on a dark background than on a light one. At the AA line, a just-passing grey on `#1a1a1a` carries 25% less CAM16 lightness gap than one on white ([`CAM16_FINDINGS.md`](CAM16_FINDINGS.md)).

4. **Fragile passes on near-black backgrounds.** On a near-black background the ratio gets most of its value from the near-zero denominator --- the term stray light erodes first. A just-passing grey on black keeps a ratio of 3.1 when the flare allowance doubles; a just-passing grey on white keeps 4.5. Two pairs at the same score carry very different margins against the room they are read in ([`MIDTONE_SURVEY_FINDINGS.md`](MIDTONE_SURVEY_FINDINGS.md)).

OKCA corrects all four while being **never more permissive than WCAG** --- every score lands at or below the WCAG score for the same pair, so OKCA never tells a designer a pair is safe when WCAG says it fails.

OKCA is a stricter WCAG 2.x checker for sRGB, not a new perceptual model: it keeps WCAG's scale and thresholds and tightens the four failure modes above. Its one guarantee is the safety bound.

### Algorithm overview

OKCA processes a foreground/background color pair in six steps:

1. **Extract lightness.** Parse each color to OKLCH L — a perceptually uniform lightness measure used as the luminance input throughout.
2. **Identify polarity.** The element with higher L is the lighter element. If the foreground is lighter the pair is light-on-dark (L-o-D); if the background is lighter it is dark-on-light (D-o-L).
3. **Compress the lighter element.** Weight its Oklab $(a, b)$ along the red–green opponent direction (§2.4) and apply a power exponent that grows with that weight, reducing its effective luminance proxy. Saturated reds and magentas lose the most; greys, blues and greens little or nothing.
4. **Compute the darker element's proxy.** The darker element uses $L^3$, lifted by two factors that can only raise it: background induction, which depends on the background's lightness (§3), and a lift for saturated blue darker colours (§5). On backgrounds at least as light as `#767676` a grey keeps plain $L^3$.
5. **Apply the power-curve scaling.** Form a raw ratio from the two luminance proxies, then scale it with one power curve and one cap, `CAP` = 20.9, in both polarities. Polarity differences come from Step 4's background induction, not from this step.
6. **Apply the flare-robustness ceiling.** Re-run the same curve on the uncompressed $L^3$ proxies with twice WCAG's flare allowance, and keep the lower of the two scores. Binds only where the ratio leans on a near-black darker element. Output is in $[1, 21]$.

Sections 3–7 cover each step in depth. Section 4 proves FP = 0 for every sRGB pair.

---

## 2. Core Design Principles

### 2.1 Safety: FP = 0 Is Non-Negotiable

A contrast algorithm used for accessibility decisions must never approve a pair that WCAG rejects. This is not a calibration preference --- it is the definition of a safe accessibility tool. FP = 0 is proven for every sRGB pair, chromatic or not (see [Section 4](#4-the-fp--0-guarantee)).

### 2.2 WCAG-Compatible Scale and Thresholds

OKCA outputs ratios in $[1, 21]$, uses the same AA threshold (4.5) and AAA threshold (7.0) as WCAG 2.x. Designers and developers see familiar numbers. No re-education required.

### 2.3 OKLCH L as the Luminance Input

WCAG 2.x computes luminance from linearised sRGB (IEC 61966-2-1). OKLCH L is a perceptually uniform lightness derived from the Oklab colour space. For neutral greys, the relationship is straightforward:

$$L^3 \approx Y_{\text{WCAG}}$$

The cube-root perceptual transform inverts to linear luminance. Using L as the primary input makes the algorithm coherent with what designers see in modern colour pickers.

### 2.4 Pure OKLCH/Oklab — No WCAG Hybrid Patches

OKCA is derived entirely from OKLCH and Oklab geometry. The chroma terms (Steps 3 and 4) are weighted along **Oklab's opponent axes**: a colour's weight is a projection of its $(a, b)$ coordinates onto a fixed direction,

$$
w = \frac{C + a \cos\theta + b \sin\theta}{2}
$$

which is $C$ in direction $\theta$, $C/2$ at 90° from it and $0$ opposite. It is linear in $a$ and $b$, and there is **no hue branch**: no hue ranges and no conditions on hue angle. It is deliberately *not* rotationally symmetric, because colour-vision deficiency is not: dichromats lose much of the contrast of reds, oranges and magentas, and little of greens, blues and purples ([`CVD_FINDINGS.md`](CVD_FINDINGS.md)). The lighter element's direction, $9.4°$, is the loss-weighted direction of that loss ([`OPPONENT_AXIS_FINDINGS.md`](OPPONENT_AXIS_FINDINGS.md)), essentially Oklab's $+a$ axis: the red end of the red–green opponent channel that protans and deutans lose. The darker element's direction, $267°$, is where OKCA's own scores need a lift to stay at or below a dichromat's ([`DARKER_LIFT_FINDINGS.md`](DARKER_LIFT_FINDINGS.md)), essentially Oklab's $-b$ axis.

FP = 0 comes from the cap below 21 and two proven single-colour bounds (see [Section 4](#4-the-fp--0-guarantee)), not from hue- or channel-specific patches.

### 2.5 Clean-Room IP

OKCA is a clean-room implementation derived from mathematical specifications and probe-validated calibration, with no third-party contrast algorithm source code.

### 2.6 Conservative Rather Than Liberal

When the algorithm must choose between overcounting contrast (false pass) and undercounting (false failure), it chooses undercounting. False failures result in designers choosing safer, more distinct colour pairs. False passes result in inaccessible text shipped to production.

---

## 3. Why $L^3$ Instead of WCAG Y

WCAG luminance is defined as:

$$Y = 0.2126 R_{\text{lin}} + 0.7152 G_{\text{lin}} + 0.0722 B_{\text{lin}}$$

per IEC 61966-2-1 (linearised sRGB). This formula was designed for display calibration, not for predicting legibility. Two shortcomings are relevant to OKCA:

1. **Not designer-readable.** A designer cannot look at a colour picker, read the OKLCH L values, and predict the WCAG ratio without a separate calculation.

2. **Chromatic text on dark backgrounds.** WCAG Y does not distinguish between saturated and desaturated light text. A chromatic lighter element at the same Y as an achromatic one produces the same ratio, though a reader with colour-vision deficiency loses more of the chromatic pair's contrast (§5).

OKLCH $L^3$ addresses both points directly. For neutral greys, $L^3 \approx Y_{\text{WCAG}}$ holds to within floating-point precision of the OKLCH transform. For chromatic pairs, the chroma compression in Step 3 reduces the effective lighter-element luminance below the $L^3$ value, producing the desired penalty.

### Background induction (Step 4)

**Problem.** $L^3$ is the same whatever a colour sits on. CAM16 (Li et al. 2017; the basis of the CIE's CIECAM16, CIE 248:2022) models lightness relative to the background. For greys, CAM16 lightness is very nearly a power of OKLab $L$, and the background sets the power:

$$
J/100 \approx L^{\gamma}, \qquad \gamma \approx 1.26 c \left(1.48 + L_{\text{bg}}^{1.5}\right)
$$

from about 1.36 on near-black to 2.13 on white, fit to within 0.15 $J$. A darker background flattens the scale, so the same pair carries less lightness difference. Without Step 4, a grey just passing 4.5 on `#1a1a1a` carries a background-aware CAM16-UCS lightness gap of 47.6, and one on `#333333` 45.1, against 63.4 on white ([`CAM16_FINDINGS.md`](CAM16_FINDINGS.md) §2–§3).

**Mechanism.** Take CAM16's exponent relative to a reference background. The factor $1.26 c$ cancels:

$$
s = \min\left(1, \frac{1.48 + L_{\text{bg}}^{1.5}}{1.48 + L_{\text{ref}}^{1.5}}\right), \qquad Y_{\text{darker}} = L_{\text{darker}}^{3s}
$$

where $L_{\text{bg}}$ is the background's OKLab $L$ and $L_{\text{ref}} = 0.5658$ is OKLab $L$ of `#767676`.

- **No tuned constants.** $1.48$ is CAM16's own constant, and the reference is the background of the white/`#767676` anchor.
- **Identity on lighter backgrounds.** On any background at least as light as `#767676`, $s = 1$. The anchors, and every score on such a background, are unchanged.
- **Lifts the darker element on darker backgrounds.** Example values are $s = 0.777$ on black, $0.830$ on `#1a1a1a` and $0.903$ on `#444444`.

**Why only the darker element.** CAM16 lifts both elements. Lifting the lighter one too raises the numerator: it makes pure-black pairs *more* lenient, and it produced 175 false passes in a 67,396-pair sample. Lifting only the darker proxy can only shrink the ratio, so no score rises above its value without Step 4 (§4).

**Effect.** The spread of the CAM16 lightness gap at the AA line, across backgrounds, falls from 18.2 to 13.2. Mid-dark backgrounds benefit most:

| Pair | Without Step 4 | With Step 4 |
|---|---:|---:|
| `#919191` on `#121212` | 5.2 | 4.4 |
| `#9f9f9f` on `#1a1a1a` | 5.8 | 4.8 |
| `#cccccc` on `#333333` | 7.1 | 5.7 |
| white on `#595959` | 6.2 | 5.7 |
| white on `#333333` | 12.0 | 9.6 |
| `#888888` on `#000000` | 5.2 | 5.2 |

- **Pure black is unchanged by Step 4.** Its proxy is 0 for any $s$. Step 6's flare ceiling is what tightens pairs on pure black.
- **High-contrast scores fall too.** White on `#111111` goes from 18.6 to 15.8, because the correction scales the whole dark side.
- **AAA feels it most.** Of the 107 curated probe pairs, Step 4 takes nine below 7.0 and two below 4.5.

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

### Step 5: the scaling curve supplies the margin (by construction)

The final ratio is

$$\text{ratio} = \text{CAP} \times \left(\frac{r_{\text{raw}}}{21}\right)^{k}, \qquad k = 1.100 \ge 1, \quad \text{CAP} \le 20.9 < 21.$$

where $k$ is `POL_K` and $\text{CAP}$ is `CAP` = 20.9, the same in both polarities.

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

exactly (since $21\cdot 0.05 = 1.05$). Because the cap is set **below 21**
(`CAP` = 20.9), the bound at the anchor becomes
$20.9/21 = 0.99524 < 1$ — a strict margin, so there is **no equality
point** and OKCA is strictly below WCAG everywhere. FP = 0 then reduces to two single-colour lemmas,
$A(l) \le A(\text{white})$ and $B(d) \le B(\text{black})$, each **verified by
interval arithmetic** over the sRGB cube with **0 uncertified boxes**
(`npm run fp0`; full argument in [`docs/FP0_PROOF.md`](FP0_PROOF.md)).

**Step 4 keeps the bound.** Background induction and the opponent-axis lift both raise the darker proxy: $L^{3s/e_D} \ge L^3$ for $s \le 1$, $e_D \ge 1$ and $L \le 1$. Lemma B's $B(d)$ only falls as the darker proxy rises, so the lemma holds a fortiori and no new lemma is needed ([`FP0_PROOF.md`](FP0_PROOF.md) §5). Lemma A is verified under Step 3's opponent-axis weight, which encloses $w_L$ from the enclosures of $a$ and $b$.

**Step 6 keeps the bound.** It takes a minimum with this score, so it can only lower it and the bound carries over unchanged ([`FP0_PROOF.md`](FP0_PROOF.md) §6).

So FP = 0 is **verified for all sRGB inputs** — an exact identity plus two
interval-checked lemmas, not a calibration-dependent headroom property. (The
chroma penalty and Step-5 compression still shape *how far* below WCAG each score
sits; they are not load-bearing for the guarantee itself.)

**Scope and caveats.** The proof covers **sRGB** inputs. It re-runs via
`npm run fp0` after any change to $k$, the cap, or the chroma penalty (the
identity holds for any $k$; the two lemmas are re-checked), so it is robust to
retuning. Inputs **outside sRGB** (wide-gamut P3/Rec.2020 `oklch()` values) are
not covered — the lemma search is over the sRGB cube and must be extended to the
wider domain (see [Section 11](#11-extension-guidelines)).

---

## 5. The Opponent-Axis Compression Mechanism (Step 3)

**Problem.** WCAG scores saturated light text on a dark background the same as a grey of equal luminance (§1, failure mode 1). Hot pink (`#ff69b4`) on near-black (`#1a1a1a`) is the standard example.

Because WCAG contrast is a function of $Y$ alone, any two foreground colors sharing a luminance value produce identical ratios regardless of hue or saturation. `#9f9f9f` is the neutral grey with the same WCAG luminance as hot pink ($Y = 0.347$):

| Foreground | $Y$ | WCAG on `#1a1a1a` | OKCA on `#1a1a1a` |
|---|---:|---:|---:|
| `#ff69b4` (hot pink) | 0.347 | 6.6 | 4.1 |
| `#9f9f9f` (grey at the same $Y$) | 0.347 | 6.6 | 4.7 |

WCAG scores them identically. OKCA scores hot pink 4.1 (fails AA) and the grey 4.7 (passes AA). Both scores include Step 4's induction from the near-black background, which alone would give the grey 4.8; Step 6's flare ceiling sets it at 4.7. The gap between them is the chroma penalty.

**Mechanism.** The lighter element's luminance proxy is penalised by a power exponent driven by its opponent-axis weight (§2.4), with $\theta_L =$ `OPP_THETA_L` $= 9.4°$:

$$w_L = \frac{C + a \cos\theta_L + b \sin\theta_L}{2}, \qquad \text{exp} = 1 + K_L \cdot \frac{w_L}{0.15}$$

with $K_L =$ `CHROMA_K` $= 0.22$. The penalty is linear in the weight and uncapped: zero for achromatic colours, and rising in step with saturation toward $\theta_L$. Reds and magentas carry the most; blues and greens, on the far side, carry little. Across sRGB the exponent runs from 1.0 to about 1.4. The adjusted luminance proxy becomes:

$$Y_{\text{lighter}} = \left(L_{\text{lighter}}^{\text{exp}}\right)^3$$

For a neutral white lighter element: $w_L = 0$ and $\text{exp} = 1$, so $Y_{\text{lighter}} = L^3 = 1.0$ --- unchanged.

For hot pink ($C \approx 0.197$, near the warm direction): $w_L \approx 0.19$ and $\text{exp} \approx 1.28$. After Step 4's background induction and Step 5's scaling, hot pink on near-black scores 4.1, below the 4.5 AA threshold.

**Where the strength comes from.** $K_L$ is not set from any target pair. It is fitted by the rule that sets the darker lift: the smallest correction at which no pair on a 262,144-pair grid scores above what a dichromat sees (Machado et al. 2009, severity 1.0). Every light colour that needs a penalty under that rule is red, orange, yellow, purple or magenta, and the need grows in step with the weight, which gives the linear shape ([`CHROMA_K_FINDINGS.md`](CHROMA_K_FINDINGS.md)). The two strengths are fitted together, because a weaker lighter penalty needs a stronger darker lift. Designers' judgement that hot pink on near-black is inadequate for text is kept as a test of the result, not an input to it. Dark orange on near-black scores 4.8 and passes: a dichromat sees 6.1.

**By hue.** Median score / WCAG for saturated colours (chroma at least 0.12), against what a dichromat keeps:

| | red | orange | yellow | green | cyan | blue | purple | magenta |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Light text on black: dichromat | 0.80 | 0.87 | 0.96 | 0.97 | 0.93 | 0.94 | 0.98 | 0.87 |
| Light text on black: OKCA | 0.66 | 0.71 | 0.78 | 0.71 | 0.75 | 0.62 | 0.66 | 0.68 |
| Dark text on white: dichromat | 0.88 | 0.91 | 0.98 | 0.95 | 0.92 | 0.88 | 0.95 | 0.92 |
| Dark text on white: OKCA | 0.78 | 0.81 | 0.85 | 0.89 | 0.87 | 0.77 | 0.74 | 0.75 |

On black, every hue sits further below the dichromat line than on white, because Step 6's flare ceiling binds on pure black: blue `#3b82f6` scores 3.6 and green `#22c55e` 6.0. Purple stays partly penalised: its $a$ is positive, and one smooth lobe cannot separate it from magenta.

### The darker element's opponent-axis lift (Step 4)

The lighter penalty does not cover saturated dark text on light fills, where the colour-vision loss is in the darker *text*, which dichromats see as lighter. Step 4 therefore also lifts the darker element along its own direction, $\theta_D =$ `OPP_THETA_D` $= 267°$ (blue, essentially Oklab's $-b$ axis), linearly and without a cap:

$$e_D = 1 + K_D \cdot \frac{w_D}{0.15}, \qquad Y_{\text{darker}} = L_{\text{darker}}^{3s/e_D}$$

All three pieces are fitted to one rule: no pair on a 262,144-pair grid should score above what a dichromat sees (Machado et al. 2009, severity 1.0). For each dark colour, find the smallest $e_D$ that meets it. Only 35 of 512 need any lift, nearly all blue to violet, and the requirement grows roughly in proportion to chroma. Hence the direction ($\theta_D$, the requirement-weighted direction), the linear shape, and $K_D =$ `OPP_K_D` $= 0.065$, fitted jointly with the lighter penalty's strength ([`DARKER_LIFT_FINDINGS.md`](DARKER_LIFT_FINDINGS.md), [`CHROMA_K_FINDINGS.md`](CHROMA_K_FINDINGS.md)). No grid pair then scores above the dichromat's ratio. That is rationale for the calibration, not a guarantee; OKCA's promise is the WCAG bound. The lift only raises the darker proxy, so it can only lower a score (§4). `#1d4ed8` on white scores 4.8, against a dichromat's 5.4.

---

## 6. Achromatic Behaviour

For neutral grey pairs, chroma compression reduces to identity:

- **Step 3:** $a = b = 0$, so $w_L = 0$, $\text{exp} = 1$, and $Y_{\text{lighter}} = L^3$. Step 4's lift is likewise $e_D = 1$.
- **Step 4:** $Y_{\text{darker}} = L^3$ on backgrounds at least as light as `#767676`. On darker backgrounds, background induction raises it to $L^{3s}$ (§3).

Since $L^3 \approx Y_{\text{WCAG}}$ for greys (up to floating-point precision of the OKLCH transform), the raw contrast ratio before Step 5 equals the WCAG ratio for neutral pairs on backgrounds at least as light as `#767676`, and falls below it on darker ones. Step 5 then scales the ratio by one power curve. Achromatic pairs on backgrounds at least as light as `#767676` score the same in both directions. The achromatic anchors are:

| Pair | Polarity | Score |
|------|----------|------:|
| white on black | L-o-D | 20.9 |
| black on white | D-o-L | 20.9 |
| white on `#767676` | L-o-D | 3.9 |
| `#767676` on white | D-o-L | 3.9 |

The WCAG AA boundary grey (`#767676`) fails AA under OKCA in both polarities.

---

## 7. Scaling, Polarity and Flare Ceiling (Steps 5–6)

**Mechanism.** Let $r$ denote the raw ratio after Steps 1–4:

$$\text{ratio} = \text{CAP} \times \left(\frac{r}{21}\right)^{k}$$

where $k =$ `POL_K` $= 1.100$ and $\text{CAP} =$ `CAP` $= 20.9$ in both polarities. The formula pins at 20.9 when $r = 21$ --- a hair below WCAG's 21, the strict margin that makes FP = 0 hold by construction (Section 4) --- and reduces all lower ratios by the power factor.

**Polarity.** OKCA is **polarity-aware**: `okca(A, B)` can differ from `okca(B, A)`. The difference comes only from Step 4's background induction (§3), which depends on which colour is the background. Every other step treats the lighter and darker colour the same whichever is text, including Step 6's flare ceiling. So a light-on-dark pair can score lower than the same colours reversed, and **never higher**. Where Step 4 does not act (achromatic pairs on backgrounds at least as light as `#767676`), the two directions tie.

**Why one cap.** Any polarity difference comes from a measured effect, not from the scaling. Step 4 tightens dark backgrounds, and the reading studies point the same way for most readers: proofreading is better with dark text on a light background (Buchner & Baumgartner, 2007; Piepenbrock, Mayr & Buchner, 2014a, 2014b), for older adults as well as younger ones (Piepenbrock, Mayr, Mund & Buchner, 2013). No source gives a contrast-equivalent size for the polarity effect itself, so the scaling adds none ([`POLARITY_FINDINGS.md`](POLARITY_FINDINGS.md)).

**The exception: eyes that scatter light.** Light scattered inside the eye veils the image in proportion to the background's luminance, so a bright background costs dark text contrast. For eyes with cloudy ocular media the effect is large enough to reverse the reading result: in Rubin & Legge (1989), four of the five low-vision readers who read white-on-black faster had cloudy media. The default score does not model this; the experimental scatter observer below does ([`SCATTER_FINDINGS.md`](SCATTER_FINDINGS.md)).

**Deriving $k$.** The exponent is set so that white on `#767676` --- the canonical WCAG AA boundary grey, raw $r \approx 4.54$ --- rounds to 3.9, the boundary anchor (§9):

$$k = \frac{\ln(3.9/21)}{\ln(4.54/21)} \approx 1.0996 \rightarrow 1.100$$

**FP = 0 and Step 5.** For $k \ge 1$ and $\text{CAP} \le 21$ the scaled ratio is always $\le r_{\text{raw}}$ (Section 4). On the achromatic axis $r_{\text{raw}} = r_{\text{WCAG}}$; for chromatic inputs the resulting headroom is what holds the final score $\le r_{\text{WCAG}}$ across the gamut.

### Step 6 — flare-robustness ceiling

**Problem.** For achromatic pairs $L^3 = Y$, so Steps 1–5 inherit WCAG's behaviour on dark backgrounds. There the ratio is carried by the near-zero denominator $Y_{\text{darker}} + 0.05$, and that is the term stray light raises first. The chroma penalty offsets this for some saturated foregrounds; greys get no such offset. At the AA line the gap is large:

| Background | Grey reaching 4.5 without Step 6 | Its ratio with flare 0.10 |
|---|---|---:|
| `#000000` | `#7e7e7e` | 3.09 |
| `#1a1a1a` | `#8c8c8c` | 3.28 |
| `#ffffff` | `#6a6a6a` | 4.51 |

Colour difference (CIEDE2000) and colour-vision-deficiency simulation do **not** flag these pairs. The leniency is in luminance margin, not in separation ([`MIDTONE_SURVEY_FINDINGS.md`](MIDTONE_SURVEY_FINDINGS.md)).

**Mechanism.** Recompute the raw ratio on the uncompressed proxies with a flare term $F$, re-anchor it so white on black keeps its cap, and take the minimum:

$$
\text{ceiling} = \text{CAP} \times \left( \frac{(L_{\text{lighter}}^3 + F)/(L_{\text{darker}}^3 + F)}{(1 + F)/F} \right)^{k_F}
$$

$$
\text{score} = \min\left(\text{ratio}, \text{ceiling}\right)
$$

with $F =$ `FLARE` $= 0.10$ and $k_F =$ `FLARE_K` $= 1.5$.

**Calibration.**

- $F = 0.10$ is twice WCAG's flare allowance. At this value the grey that first reaches 4.5 keeps about 3.95 under doubled flare on **every** dark background, from `#000000` to `#444444`.
- $k_F = 1.5$ is the largest exponent at which the ceiling never binds on a white-on-grey or grey-on-white pair scoring 2 or above. The light side, the four achromatic anchors and the WCAG disagreements are therefore unchanged by the ceiling.
- The ceiling uses the **uncompressed** $L^3$, so it rarely binds where the chroma penalty already has: the ceiling does not move hot pink or dark orange on near-black (4.1 and 4.8).

**Effect.** Text on dark surfaces needs about one palette grade more lightness to pass. Without and with Step 6: `#888888` on black 5.2 and 3.7; USWDS gray-40 (`#919191`) on `#121212` 4.4 and 3.9. As light text on nine real dark surfaces, Step 6 takes 38 of 4,938 Tailwind, GOV.UK and USWDS pairs below AA: 15 grey or near-grey (Oklab chroma below 0.08) and 23 chromatic. The ceiling is polarity-independent because flare is: dark text on mid-tone fills tightens too (`#000000` on `#767676`: 4.0 and 2.7).

**Not a viewing-conditions model.** The ceiling does not estimate a room (see §10). It measures how much of a pair's contrast depends on its darkest patch staying dark. Pairs with the same score carry comparable margin against whatever room they are read in. That is the variance argument §10 makes for conservative floors, applied evenly across backgrounds.


### Scatter observer (experimental)

**Opt-in.** `contrast(fg, bg, { observer: 'scatter' })`. Release candidates only; it may change or be removed before 3.0.0.

**Mechanism.** A veil proportional to the background's luminance is added to both patches of the Step 5 raw ratio:

$$
r_{\text{raw}} = \frac{Y_{\text{lighter}} + 0.05 + v}{Y_{\text{darker}} + 0.05 + v}, \qquad v = k_s L_{\text{bg}}^{3}
$$

with $k_s =$ `SCATTER_K` $= 0.155$. That is the age-adjusted Stiles–Holladay veil for an 80-year-old eye, the reader WCAG's 4.5:1 is calculated for, integrated over a uniform background from $1°$ to $20°$ around the text. Light closer than $1°$ counts as blur, which acuity covers. Every other step, including `POL_K`, is unchanged.

**Effect.** Light-on-dark scores at least as high as the reverse for every pair where either direction reaches 3.0. A white background veils black text: black on white scores 5.2, white on black 20.9. White on `#767676` scores 3.5 and `#767676` on white 2.6. On WCAG's ratio scale a veil over the darker patch reads as a large loss: black text on white still keeps about 80% Weber contrast at 5.2.

**FP = 0.** Adding the same $v \ge 0$ to both patches can only lower a ratio above 1, so every scatter score is at or below the default score and the guarantee carries over ([`FP0_PROOF.md`](FP0_PROOF.md) §7). Re-deriving `POL_K` to hold the 3.9 anchor under the veil would need $k \approx 1.037$, and lemma A does not certify there.

---

## 8. Probe Validation Summary

Three independent batteries:

| Battery | Pairs | FP | WCAG Disagreements | Notes |
|---------|------:|:--:|:------------------:|-------|
| Light-on-dark | 53 | **0** | — | See design-systems for FP=0 coverage |
| Dark-on-light | 54 | **0** | — | See design-systems for FP=0 coverage |
| Design systems | 1,142 | **0** | 107 | See note below |
| **Total** | **1,249** | **0** | **107** | |

**False passes are zero** --- the non-negotiable invariant holds across all 1,249 pairs.

**WCAG disagreements** (pairs where OKCA < 4.5 but WCAG ≥ 4.5) are intentional and should not be read as miscalibration. White on `#767676` --- the canonical WCAG AA boundary anchor --- sits exactly on the line, where the verdict turns on the display and the room rather than on the colours (see *Does not model viewing conditions* in §10 below). 97 of the 107 sit in that marginal zone, with WCAG ratios of 4.5–5.4: proximity to the boundary is not the same as being safely above it, and a pair on the line has no margin against the conditions it will be read in. The other ten are saturated purples, violets and pinks that WCAG rates 5.7–7.1. Oklab rates them lighter than WCAG's luminance does (§4), so they carry less contrast against white.

By system: Tailwind CSS v3.4 (43), GOV.UK Design System (14), USWDS v3.x (50). Five Tailwind 700 shades fail only as white text on the colour. See `docs/WCAG_DISAGREEMENTS.md` for the full enumeration with hex values.

---

## 9. Key Constants

| Constant | Value | Role |
|----------|------:|------|
| `C_THRESH` | 0.15 | Weight scale for both opponent-axis terms (Oklab chroma units) |
| `CHROMA_K` | 0.22 | Lighter-element penalty strength (linear in $w_L$, uncapped) |
| `OPP_THETA_L` | 9.4° | Direction of the lighter element's opponent-axis weight (CVD loss, light on dark) |
| `OPP_THETA_D` | 267° | Direction of the darker element's lift (where OKCA needs one, dark on light) |
| `OPP_K_D` | 0.065 | Darker-element lift strength (linear in $w_D$, uncapped) |
| `POL_K` | 1.100 | Scaling exponent, both polarities: $\text{CAP} \times (r/21)^{k}$, set by the boundary anchor |
| `CAP` | 20.9 | Contrast cap, both polarities (< 21 → OKCA strictly below WCAG, FP=0 by construction) |
| `IND_Z` | 1.48 | CAM16's lightness-exponent constant, used by Step 4 |
| `IND_REF_L` | 0.5658 | OKLab $L$ of `#767676`: backgrounds at or above it keep $s = 1$ |
| `FLARE` | 0.10 | Flare term for the Step 6 ceiling (twice WCAG's 0.05) |
| `FLARE_K` | 1.5 | Step 6 ceiling exponent |
| `SCATTER_K` | 0.155 | Scatter observer only: veil as a fraction of background luminance |

**Calibration anchors:**

- **`C_THRESH` = 0.15** --- A scale, not a threshold: both opponent-axis terms measure the weight in units of 0.15 Oklab chroma. Only the ratio of each strength to it matters.

- **`CHROMA_K` = 0.22** --- Fitted with `OPP_K_D` = 0.065 as the least correction at which no grid pair scores above a dichromat's ratio (§5). Hot pink on near-black scores 4.1 and dark orange 4.8, where WCAG rates them 6.6 and 7.5. The penalty acts only on chromatic lighter elements, so the achromatic anchors are untouched.

- **`POL_K` = 1.100** --- Set by the boundary anchor: white/`#767676`, WCAG's own AA boundary pair, scores 3.9. Derived: $k = \ln(3.9/21) / \ln(4.54/21) \approx 1.0996$.

  **The anchor is OKCA's one policy input.** Every other strength is fitted to data or fixed by a constraint. This one states OKCA's position: a pair sitting on WCAG's AA line has no margin against the conditions it will be read in, so it should not pass AA (§8, §10). How far below the line is a judgement, and 3.9 is that judgement. One measurement agrees with it: under doubled flare, the premise of Step 6, white on `#767676` keeps a WCAG ratio of 3.91. That match was found after the anchor was set and holds at this pair only, not along the grey ramp, so it is a consistency check, not a derivation.

- **`CAP` = 20.9** --- One notch below 21, in both polarities. This is the strict-margin lever for the FP=0 proof: with the cap below 21 the identity $21^{1-k} \cdot A(\text{white}) \cdot B(\text{black}) = 1$ becomes $20.9/21 = 0.99524 < 1$, removing the single white-on-black equality point so OKCA is strictly below WCAG everywhere (Section 4). White on black and black on white: 20.9. The same cap applies in both polarities (§7).

- **`IND_Z` = 1.48, `IND_REF_L` = 0.5658** --- Not tuned. `IND_Z` is the constant in CAM16's $z = 1.48 + \sqrt{Y_b}$, and `IND_REF_L` is the OKLab $L$ of the background in the white/`#767676` anchor. That reference keeps the anchors exact. A lighter reference would also even out light backgrounds (`#c8c8c8` trails white by about 10 CAM16 lightness units at the AA line), but it would move the anchor.

- **`FLARE` = 0.10** --- Twice WCAG's flare allowance. Chosen because it equalises flare robustness at the AA line: the grey that first reaches 4.5 keeps about 3.95 under doubled flare on every dark background (§7).

- **`FLARE_K` = 1.5** --- The largest exponent that leaves every white/grey pair scoring 2 or above untouched (1.505 before rounding). Asserted in `flare-ceiling.spec.ts`.

---

## 10. What OKCA Does Not Do

Understanding the scope prevents incorrect use and misguided extension attempts.

**Does not model font size or weight.** WCAG AA (4.5:1) applies uniformly regardless of text size. OKCA outputs a single ratio; size-dependent thresholds are the caller's responsibility.

**Does not replace perceptual judgement.** An OKCA score of 4.5 on a warm fuchsia text/white background means the pair clears the numerical threshold. A designer may still find it unpleasant. OKCA is a safety floor, not a design recommendation.

**Does not model viewing conditions.** The contrast at which text becomes acceptable moves substantially with display luminance and ambient light — far enough that a pair near the AA boundary can be judged shippable under one setup and not another by the same person in the same room ([#22](https://github.com/pawn002/okca/issues/22#issuecomment-5282357292)). OKCA is a relative metric over sRGB with no access to absolute luminance, so it does not model this and no constant of its own could: a level-dependent term was measured for and not detected, while the effect that does exist tracks a quantity the algorithm cannot observe. The safety bound is unaffected, being a relation between two relative metrics. The practical consequence is that OKCA's floors are viewing-condition independent by construction, which is a reason to keep them conservative rather than to tune them.

**Models one reader by default.** The default score follows the reading studies, in which dark text on a light background reads better for younger and older adults. Eyes that scatter light, as with cataract, can read light-on-dark better. The experimental scatter observer (§7) scores for that eye; the default does not.

**Does not rescue a pair WCAG fails.** OKCA never scores above WCAG, so where WCAG under-rates a pair, OKCA fails it too. It corrects WCAG in one direction only.

**Does not patch WCAG's channel weighting.** OKCA does not compensate for the IEC 61966-2-1 green-channel weighting in WCAG's luminance formula. Its chroma terms are weighted along Oklab's opponent axes (§2.4), in directions derived from colour-vision-deficiency loss, not from WCAG's channel weights. There is no hue branch, and no per-hue table or condition.

---

## 11. Extension Guidelines

When modifying the algorithm, these properties must be preserved:

1. **FP = 0.** Re-run the proof (`npm run fp0`) after any change to Steps 3 or 5; it must certify with 0 uncertified boxes. The probe batteries are not enough: the proof's lemmas depend on the constants, so a change can break FP = 0 in a hue region the batteries miss. Steps 4 and 6 stay inside the proof only while they can lower a score and never raise it (rules 5 and 6).

2. **Achromatic anchors.** White/black = 20.9 in both directions. White/`#767676` = 3.9 in both directions. These are the calibration reference points. (White/black is 20.9, not 21, by design — see `CAP` and Section 4.)

3. **No third-party contrast algorithm source code.** Mathematical derivations from public specifications are permitted; copying control flow or constant blocks from third-party packages is not.

4. **Update probe battery expectations.** If any probe result changes intentionally, document the rationale before committing.

5. **Background induction.** Step 4 must keep $s \le 1$ and apply only to the darker element. Those two properties are what keep it inside the FP=0 proof, and they are asserted in `background-induction.spec.ts`.

6. **Flare ceiling.** `FLARE_K` must stay the largest exponent that leaves white/grey pairs untouched for the chosen `FLARE`; retuning one means re-deriving the other (`npm run midtone` reports the bound). The ceiling must stay a minimum --- that is what keeps it outside the FP=0 proof.

7. **Opponent-axis terms.** The directions are derived, not tuned: `OPP_THETA_L` from CVD loss (`npm run opponent`), `OPP_THETA_D` from where OKCA needs a darker lift (`npm run darker-lift`). The strengths `CHROMA_K` and `OPP_K_D` are fitted together as the least CVD-consistent correction (`npm run chroma-k`). Any change to Steps 3–6 can move that requirement, so re-run the fit after one. The darker lift must keep $e_D \ge 1$, so it only raises the darker proxy. Lemma A is verified under the linear opponent-axis penalty (`npm run fp0`). Lemma A also needs the penalty: with none it does not certify.
