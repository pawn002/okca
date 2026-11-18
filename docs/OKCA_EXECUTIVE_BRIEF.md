# OKCA — Executive Brief

## Executive Summary

WCAG 2.x has four measurement gaps OKCA addresses: it over-rates saturated
colours, it scores contrast symmetrically when the perceptual reality
is not symmetric, it treats a colour's lightness as fixed whatever background it
sits on, and its passes on near-black backgrounds rest on a margin that stray light
removes first. All four cause marginal colour combinations to pass automated checks and
reach production with the least margin for readers who need it most.

OKCA is a **stricter drop-in for WCAG 2.x** that closes all four gaps on the familiar 1–21
scale and the same AA/AAA thresholds, with no new compliance vocabulary. Its key
property is safety: **it is never more permissive than WCAG.** Every score lands at or
below the WCAG score for the same pair, so a pair that clears OKCA always clears WCAG.
That property is verified across the full sRGB gamut (an exact identity plus
interval-checked lemmas, `docs/FP0_PROOF.md`). A 1,249-pair audit across Tailwind, GOV.UK
Design System, and USWDS found zero false passes and flagged 105 pairs that WCAG passes
and OKCA does not. Most sit on or near the AA line, with little margin against the
conditions they will be read in.

---

## The Gaps in WCAG 2.x

The WCAG 2.x relative luminance formula encodes photopic luminance sensitivity, not
legibility. Four gaps follow from that.

**Polarity blindness.** The formula is symmetric — `contrast(A, B) = contrast(B, A)`.
The two directions are not equivalent. Reading research finds proofreading
better with dark text on a light background, for older adults as well as younger
ones (Buchner & Baumgartner, 2007; Piepenbrock et al., 2013, 2014), and dark
backgrounds measurably cost contrast, as the background gap below shows. Eyes
that scatter light, as with cataract, are the exception: a bright background
veils the text, and light-on-dark can read better (Rubin & Legge, 1989). WCAG 2.x
cannot capture any of this, because its formula gives the same score whichever
colour is the text.

**Chromatic over-rating.** Saturated chromatic text on dark
backgrounds, such as hot pink on near-black, scores well above the
4.5 AA threshold (6.6), yet designers routinely judge it inadequate for text. Part
of that is measurable: a reader with red–green colour-vision deficiency keeps about
5.3 of its 6.6, while a grey of the same luminance loses nothing. WCAG's formula
sees only luminance, so it scores the two the same. The same loss runs the other way
for dark blue text on light backgrounds, which dichromats see as lighter than its value:
`#1d4ed8` on white scores 6.7 under WCAG, and a dichromat keeps about 5.4.

Two further gaps are less often discussed.

**Background-blind lightness.** WCAG's formula gives a colour the same lightness on
any background. The CAM16 colour appearance model, the basis of the CIE's CIECAM16
(CIE 248:2022), does not: a darker background flattens the lightness scale. At the
AA line, a grey that just passes on a near-black background carries about 25% less
CAM16 lightness difference than one that just passes on white. Dark-mode passes
are systematically easier to earn under WCAG.

**Fragile margin on near-black backgrounds.** WCAG's ratio adds a fixed 0.05 to both
luminances to stand in for ambient light. On a near-black background the ratio gets
most of its value from that small denominator. Add a little more stray light and a
grey that just passes AA on black falls to 3.1; one that just passes on white holds
4.5. Two pairs with the same WCAG score therefore carry very different margins
against the room they are read in. Colour-difference metrics and colour-vision
simulations do not flag these pairs. The weakness is in the luminance margin.

These are not rare conditions. A structured audit of three production design systems
— Tailwind CSS v3.4, GOV.UK Design System, and USWDS v3.x —
found **105 pairs** that pass WCAG 2.x AA and fail OKCA. 95 sit within about one point
of the line, where the verdict can turn on screen brightness and room light rather
than on the colours. The other ten are saturated purples and pinks that WCAG rates
well above the line but Oklab rates lighter, leaving less contrast against white.

---

## What OKCA Does

OKCA (OK Contrast Algorithm) is an OKLCH-native contrast algorithm. It uses the
perceptually uniform Oklab/OKLCH colour space as its luminance input in place of
the IEC 61966-2-1 sRGB decomposition. Oklab was introduced by Björn Ottosson in
2020 and is now widely adopted. It keeps WCAG's
1–21 scale and AA/AAA thresholds and makes the same check harder to pass by
mistake, so it can run alongside existing WCAG tooling.

**Polarity follows the evidence.** `okca(text, background)` can differ from
`okca(background, text)`, but only because dark backgrounds measurably cost contrast:
light text on a dark background can score lower than the same pair reversed, never
higher. That matches the reading research for younger and older adults. On light
and mid-tone backgrounds the two directions score the same (white/black 20.9,
`#767676` and white 3.9). For eyes that scatter light, an
experimental option scores the other way: a bright background veils the text, so
dark-on-light loses contrast. It is opt-in and never scores above the default.
**Warning: experimental.** It is outside semver and may change in any minor release.

**Saturated colours are penalised, hue by hue, as colour-vision deficiency
predicts.** About 8% of men of Northern European descent have red–green
colour-vision deficiency. Dichromats lose much of the contrast of reds, oranges
and magentas, and little of greens, blues and purples. OKCA reduces the lighter
colour's luminance in proportion to its saturation along that red–green
direction, and adds a small lift to dark blue text. Greys are unaffected. The
strength of each is the smallest that keeps scores at or below what dichromats
see; both are derived from data. Hot pink on
near-black scores 4.1 (WCAG 6.6), pure red on black 3.3 (WCAG 5.3), and
saturated blue `#3b82f6` on black 3.6 (WCAG 5.7).

**The darker colour is corrected for its background.** On any background darker
than the AA boundary grey `#767676`, OKCA applies CAM16's background effect to the
darker colour's lightness, using CAM16's constant. Lighter
backgrounds, and so the anchors above, are untouched. The correction can only lower
a score. Light grey `#cccccc` on `#333333` scores 5.7 (WCAG 7.9). Grey and near-grey
text on dark surfaces needs more lightness to pass than WCAG asks, and AAA is affected
most.

**Each score is capped at what survives doubled flare.** OKCA re-scores every pair
with twice WCAG's flare allowance and keeps the lower result. Its strength is the
largest that never moves a grey pair on a white background, so the anchors above hold.
On dark backgrounds, text needs about one palette grade more
lightness to pass: mid-grey `#888888` on black scores 3.7 (WCAG 5.9).
This is a margin argument, not a model of viewing conditions: OKCA still has no
access to the room, so it keeps the same margin everywhere.

The two corrections cover different ground. The background correction cannot act
on pure black, whose lightness is zero on any background; the flare cap does. The
flare cap acts mainly near black; the background correction reaches mid-dark
surfaces as well.

---

## The Safety Guarantee

**OKCA produces zero false passes against WCAG 2.x**: it never approves a pair WCAG
rejects.

The guarantee is **verified for the full sRGB gamut**. The argument:

- **Algebraic reduction.** $\text{OKCA} \le \text{WCAG}$ separates into two
  single-element factors: it is equivalent to
  $(\text{CAP}/21^{k}) \cdot A(\text{lighter}) \cdot B(\text{darker}) \le 1$.
- **An exact identity.** At the achromatic anchors,
  $21^{1-k} \cdot A(\text{white}) \cdot B(\text{black}) = 1$ for any $k$. Because
  the cap is set just below 21 (`CAP = 20.9`, both polarities), the anchor bound
  is $20.9/21 = 0.99524 < 1$ — a strict margin, so OKCA is *strictly* below WCAG
  everywhere (no equality point).
- **Two verified lemmas.** $A(l) \le A(\text{white})$ and
  $B(d) \le B(\text{black})$ are each
  confirmed by interval arithmetic over the sRGB cube with **0 uncertified boxes**
  — a machine-checked proof over continuous regions, not a sample.
- **The background correction and the blue lift only lower scores.** Both raise the
  darker colour's effective luminance, which shrinks the ratio, so they need no new
  lemma.
- **The flare cap only lowers scores.** It is a minimum with the proven score, so
  it inherits the guarantee without a new lemma.

**The one visible consequence:** OKCA's maximum (white on black, and black on white) is **20.9**, just under WCAG's 21. That small gap is what makes the zero-false-pass guarantee provable. Thresholds (4.5 / 7.0) and the 1–21 scale are otherwise unchanged, so
OKCA still drops into WCAG-based tooling. Full argument:
[`docs/FP0_PROOF.md`](https://github.com/pawn002/okca/blob/main/docs/FP0_PROOF.md)
(`npm run fp0`).

---

## The WCAG 3.0 Context

WCAG 3.0 has not settled its contrast method: the Working Draft of 10 September 2026
states that "the contrast algorithm used in WCAG 3 is yet to be determined." OKCA
works within the WCAG 2.x frame (same scale, same thresholds, same AA/AAA language),
so organisations can adopt it today without re-baselining, whatever WCAG 3 decides.

Everything needed to review it is open: the algorithm and its specification, the FP = 0
proof and its verifier, the calibration corpus, and the 105-pair disagreement dataset
(`docs/WCAG_DISAGREEMENTS.md`), which records where OKCA and WCAG 2.x diverge by design
system, colour family and polarity.

---

## Summary

| Property | WCAG 2.x | OKCA |
|---|---|---|
| Luminance input | IEC 61966-2-1 sRGB | OKLCH $L^3$ (Oklab) |
| Scale | 1–21 | 1–21 |
| AA / AAA thresholds | 4.5 / 7.0 | 4.5 / 7.0 |
| Polarity | Symmetric | Asymmetric where dark backgrounds cost contrast; opt-in scatter observer reverses it for eyes that scatter light |
| Saturated light colours | Over-rated | Penalised where colour-vision deficiency loses contrast |
| Saturated dark colours | Over-rated | Lifted where dichromats see them lighter (dark blues) |
| Background | Ignored | Corrected on dark backgrounds (CAM16) |
| Margin on near-black backgrounds | Smaller than on light | Matched (flare cap) |
| False passes vs. WCAG 2.x | Reference | **Zero** (verified across sRGB: exact identity + interval-checked lemmas) |
| Marginal pairs flagged in audit | 0 of 105 | 105 of 105 |
| Deployable today | Yes | Yes |
