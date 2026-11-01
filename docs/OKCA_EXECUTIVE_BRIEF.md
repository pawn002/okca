# OKCA — Executive Brief

## Executive Summary

WCAG 2.x has four measurement gaps OKCA addresses: it over-rates saturated chromatic
text on dark backgrounds, it scores contrast symmetrically when the perceptual reality
is not symmetric, it treats a colour's lightness as fixed whatever background it
sits on, and its passes on near-black backgrounds rest on a margin that stray light
removes first. All four cause marginal colour combinations to pass automated checks and
reach production, where real users with contrast sensitivity loss cannot read them.

OKCA is a **stricter drop-in for WCAG 2.x** that closes all four gaps on the familiar 1–21
scale and the same AA/AAA thresholds — no new compliance vocabulary. Its one load-bearing
property is safety: **it is never more permissive than WCAG.** Every score lands at or
below the WCAG score for the same pair, so a pair that clears OKCA always clears WCAG.
That property is verified across the full sRGB gamut (an exact identity plus
interval-checked lemmas, `docs/FP0_PROOF.md`). A 1,249-pair audit across Tailwind, GOV.UK
Design System, and USWDS found zero false passes and flagged 107 pairs that WCAG passes but
practitioners consistently reject as inadequate.

---

## The Gap WCAG 2.x Has Always Had

The WCAG 2.x relative luminance formula encodes photopic luminance sensitivity, not
legibility. The working group has known since at least 2019 that two failure modes
accumulate at scale:

**Polarity blindness.** The formula is symmetric — `contrast(A, B) = contrast(B, A)` —
despite the fact that designers and accessibility practitioners consistently treat the
two directions as different. Dark mode interfaces, light text on photographic
backgrounds, and inverse colour schemes all behave differently in practice from their
luminance-equivalent positive polarity counterparts. WCAG 2.x cannot capture this
because its formula produces the same score regardless of which colour is text and
which is background. WCAG 3.0 / Silver addresses this asymmetry; WCAG 2.x has no
path to correction within its current architecture.

**Chromatic over-rating near threshold.** Saturated chromatic text on dark
backgrounds — the hot pink / near-black case is canonical — scores well above the
4.5 AA threshold while failing in user studies at moderate to severe contrast
sensitivity loss. The IEC 61966-2-1 weighting assigns 71.5% of luminance to the
green channel, which does not translate cleanly to chromatic legibility. The result
is a systematic over-rating of vivid lighter elements in negative polarity.

Two further gaps are less often discussed.

**Background-blind lightness.** WCAG's formula gives a colour the same lightness on
any background. The CAM16 colour appearance model, the basis of the CIE's CIECAM16
(CIE 248:2022), does not: a darker background flattens the lightness scale. At the
AA line, a grey that just passes on a near-black background carries about 25% less
CAM16 lightness difference than one that just passes on white. Dark-mode passes
were systematically easier to earn.

**Fragile margin on near-black backgrounds.** WCAG's ratio adds a fixed 0.05 to both
luminances to stand in for ambient light. On a near-black background the ratio gets
most of its value from that small denominator. Add a little more stray light and a
grey that just passes AA on black falls to 3.1; one that just passes on white holds
4.5. Two pairs with the same WCAG score therefore carry very different margins
against the room they are read in. Colour-difference metrics and colour-vision
simulations do not flag these pairs. The weakness is in the luminance margin.

These are not rare conditions. A structured audit of three production design systems
— Tailwind CSS v3.4, GOV.UK Design System, and USWDS v3.x —
found **107 pairs** that pass WCAG 2.x AA while sitting in the marginal zone
practitioners and user research consistently flag as inadequate.

---

## What OKCA Does

OKCA (OK Contrast Algorithm) is an OKLCH-native contrast algorithm. It uses the
perceptually uniform Oklab/OKLCH colour space — introduced by Björn Ottosson in a
widely-adopted 2020 technical publication — as its luminance input rather than the
IEC 61966-2-1 sRGB decomposition. This is not a patch on top of
WCAG — it is a different measurement model that happens to be expressible on the
same 1–21 scale with the same AA/AAA thresholds, allowing parallel deployment.

**Polarity follows the evidence.** `okca(text, background)` can differ from
`okca(background, text)`, but only because dark backgrounds measurably cost contrast:
light text on a dark background can score lower than the same pair reversed, never
higher. That matches reading research, which finds dark text on a light background
outperforms the reverse. There is no editorial polarity bias: the achromatic anchors
score the same both ways (white/black 20.9, `#767676` and white 3.9).

**Chromatic text receives a chroma-weighted luminance penalty.** The lighter
element's luminance proxy is compressed by a power exponent that scales with Oklab
chroma. Achromatic pairs are unaffected. Vivid chromatic lighter elements — the
failure zone — score lower than an achromatic element at equivalent OKLCH L. Hot
pink on near-black: WCAG 6.6, OKCA 3.0.

**The penalty follows colour-vision deficiency, hue by hue.** About 8% of men of
Northern European descent have red–green colour-vision deficiency. Dichromats
lose much of the contrast of reds, oranges and magentas, and little of greens,
blues and purples. OKCA weights its chroma penalty along the direction in Oklab
where that loss is greatest, essentially the red–green opponent axis, and adds a
small matching lift to dark text in the hues where dichromats see it as lighter.
The directions are measured, not tuned, and there is no hue branch. Reds stay
exactly as strict as before; saturated blue on black moves from 2.4 to 3.6.

**The darker colour is corrected for its background.** On any background darker
than the AA boundary grey `#767676`, OKCA applies CAM16's background effect to the
darker colour's lightness, using CAM16's own constant and no tuned value. Lighter
backgrounds, and so the anchors above, are untouched. The correction can only lower
a score. Light grey `#cccccc` on `#333333` goes from 7.1 to 5.7 (WCAG 7.9). Grey and
near-grey text on dark surfaces has to be lighter to pass, and AAA is affected most.

**Each score is capped at what survives doubled flare.** OKCA re-scores every pair
with twice WCAG's flare allowance and keeps the lower result. The cap was tuned so
it never moves a light-background grey pair, so the anchors above are unchanged.
On dark backgrounds, grey and near-grey text has to be about one palette grade
lighter to pass: mid-grey `#888888` on black goes from 5.2 to 3.7 (WCAG 5.9).
This is a margin argument, not a model of viewing conditions: OKCA still has no
access to the room, so it keeps the same margin everywhere.

The two corrections cover different ground. The background correction cannot act
on pure black, whose lightness is zero on any background; the flare cap does. The
flare cap acts mainly near black; the background correction reaches mid-dark
surfaces as well. Together, across Tailwind, GOV.UK and USWDS palettes as light text
on 15 dark and mid-dark surfaces, 286 of 7,851 pairs lose AA. No score rises.

---

## The Safety Guarantee

The property that matters most for a working group context: **OKCA produces zero
false passes against WCAG 2.x** — it never approves a pair WCAG rejects.

The guarantee is **verified for the full sRGB gamut** — not calibration-dependent
headroom. The argument has three parts:

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
- **The background correction only lowers scores.** It raises the darker colour's
  effective luminance, which shrinks the ratio, so it needs no new lemma.
- **The flare cap only lowers scores.** It is a minimum with the proven score, so
  it inherits the guarantee without a new lemma.

**The one visible consequence:** OKCA's maximum (white on black, and black on white) is **20.9**, a
hair under WCAG's 21 — the deliberate headroom that makes zero-false-pass a
theorem. Thresholds (4.5 / 7.0) and the 1–21 scale are otherwise unchanged, so
OKCA still drops into WCAG-based tooling. Full argument:
[`docs/FP0_PROOF.md`](https://github.com/pawn002/okca/blob/main/docs/FP0_PROOF.md)
(`npm run fp0`).

---

## The WCAG 3.0 Context

OKCA is not a candidate to replace WCAG 3.0 / APCA. It occupies a different
position: a conservative, deployable improvement that operates within the WCAG 2.x
frame (same scale, same thresholds, same AA/AAA language) and is compatible with
existing compliance postures. It catches what WCAG 2.x misses without requiring
organisations to re-baseline.

For working group purposes, the algorithm and its calibration corpus are open and
auditable. The 107-pair disagreement dataset (see `docs/WCAG_DISAGREEMENTS.md`)
documents exactly where OKCA and WCAG 2.x diverge, by design system, colour family,
and polarity — a resource for empirical comparison with APCA scoring on the same
pairs.

---

## Summary

| Property | WCAG 2.x | OKCA |
|---|---|---|
| Luminance input | IEC 61966-2-1 sRGB | OKLCH $L^3$ (Oklab) |
| Scale | 1–21 | 1–21 |
| AA / AAA thresholds | 4.5 / 7.0 | 4.5 / 7.0 |
| Polarity | Symmetric | Asymmetric where dark backgrounds cost contrast |
| Chromatic lighter element | Over-rated | Penalised where colour-vision deficiency loses contrast |
| Background | Ignored | Corrected on dark backgrounds (CAM16) |
| Margin on near-black backgrounds | Smaller than on light | Matched (flare cap) |
| False passes vs. WCAG 2.x | Reference | **Zero** (verified across sRGB: exact identity + interval-checked lemmas) |
| Marginal pairs flagged in audit | 0 of 107 | 107 of 107 |
| Deployable today | Yes | Yes |
