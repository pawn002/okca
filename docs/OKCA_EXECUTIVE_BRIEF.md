# OKCA — Executive Brief

## Executive Summary

WCAG 2.x has two known measurement gaps: it over-rates saturated chromatic text on
dark backgrounds, and it scores contrast symmetrically when the perceptual reality is
not symmetric. Both cause marginal colour combinations to pass automated checks and
reach production, where real users with contrast sensitivity loss cannot read them.

OKCA is a drop-in contrast algorithm that closes both gaps while preserving the
familiar 1–21 scale and AA/AAA thresholds. It introduces no new compliance vocabulary.
Its central property — that it never passes a pair WCAG fails (zero false passes) — holds
by construction on the achromatic axis and is verified across the sRGB gamut for chromatic
colours. A 1,249-pair audit across Tailwind, GOV.UK Design System, and USWDS found zero
false passes and flagged 111 pairs that WCAG passes but practitioners consistently reject
as inadequate.

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

These are not rare conditions. A structured audit of three production design systems
— Tailwind CSS v3.4, GOV.UK Design System, and USWDS v3.x —
found **111 pairs** that pass WCAG 2.x AA while sitting in the marginal zone
practitioners and user research consistently flag as inadequate.

---

## What OKCA Does

OKCA (OK Contrast Algorithm) is an OKLCH-native contrast algorithm. It uses the
perceptually uniform Oklab/OKLCH colour space — introduced by Björn Ottosson in a
widely-adopted 2020 technical publication — as its luminance input rather than the
IEC 61966-2-1 sRGB decomposition. This is not a patch on top of
WCAG — it is a different measurement model that happens to be expressible on the
same 1–21 scale with the same AA/AAA thresholds, allowing parallel deployment.

**Polarity is a first-class input.** `okca(text, background) ≠ okca(background, text)`
when the elements differ in lightness. Light-on-dark and dark-on-light scores diverge
by design, calibrated against the achromatic anchors white/black (21.0 L-o-D, 20.0
D-o-L) and the canonical AA boundary grey `#767676` (3.5 L-o-D, 3.3 D-o-L).

**Chromatic text receives a chroma-weighted luminance penalty.** The lighter
element's luminance proxy is compressed by a power exponent that scales with Oklab
chroma. Achromatic pairs are unaffected. Vivid chromatic lighter elements — the
failure zone — score lower than an achromatic element at equivalent OKLCH L. Hot
pink on near-black: WCAG 6.6, OKCA 3.7.

---

## The Safety Guarantee

The property that matters most for a working group context: **OKCA produces zero
false passes against WCAG 2.x** — it never approves a pair WCAG rejects.

The guarantee has two parts, held to different standards of certainty:

- **Achromatic axis — by construction.** For neutral greys `L³ = Y_WCAG` exactly, so
  the raw OKCA ratio equals the WCAG ratio; the polarity curve `CAP × (r/21)^k`
  (k ≥ 1, CAP ≤ 21) can only lower it. FP = 0 follows deductively.
- **Chromatic inputs — by calibrated headroom, verified across the gamut.** Off the
  achromatic axis the `L³` proxy diverges from WCAG luminance, so the *raw* ratio can
  sit slightly above WCAG. What guarantees FP = 0 is the headroom the polarity curve
  creates: across the sRGB gamut it exceeds that overshoot everywhere, so the final
  score lands at or below WCAG. This is a calibration property of the tuned constants
  and the gamut geometry — **not a closed-form theorem** — established by exhaustive
  verification.

**Verification.** A sweep of ~1.2M evaluations across the sRGB gamut (full grey grid,
hundreds of thousands of random pairs, an OKLCH lightness/chroma/hue grid, and a
green-darker stress band, both polarities) found the final OKCA score never exceeding
the WCAG ratio — **0 false passes**, at full precision and at production rounding
(`toFixed(1)`). The largest raw-ratio overshoot observed (≈ 0.44) was fully absorbed
by the polarity compression. Full argument:
[`docs/OKCA_DESIGN.md` §4](https://github.com/pawn002/okca/blob/main/docs/OKCA_DESIGN.md#4-the-fp--0-guarantee).

---

## The WCAG 3.0 Context

OKCA is not a candidate to replace WCAG 3.0 / APCA. It occupies a different
position: a conservative, deployable improvement that operates within the WCAG 2.x
frame (same scale, same thresholds, same AA/AAA language) and is compatible with
existing compliance postures. It catches what WCAG 2.x misses without requiring
organisations to re-baseline.

For working group purposes, the algorithm and its calibration corpus are open and
auditable. The 111-pair disagreement dataset (see `docs/WCAG_DISAGREEMENTS.md`)
documents exactly where OKCA and WCAG 2.x diverge, by design system, colour family,
and polarity — a resource for empirical comparison with APCA scoring on the same
pairs.

---

## Summary

| Property | WCAG 2.x | OKCA |
|---|---|---|
| Luminance input | IEC 61966-2-1 sRGB | OKLCH L³ (Oklab) |
| Scale | 1–21 | 1–21 |
| AA / AAA thresholds | 4.5 / 7.0 | 4.5 / 7.0 |
| Polarity | Symmetric | Asymmetric |
| Chromatic lighter element | Over-rated | Chroma-penalised |
| False passes vs. WCAG 2.x | Reference | **Zero** (by-construction on achromatic axis; gamut-verified for chromatic) |
| Marginal pairs flagged in audit | 0 of 111 | 111 of 111 |
| Deployable today | Yes | Yes |
