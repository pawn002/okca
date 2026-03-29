# OKCA — Executive Brief

> **Persona note** *(internal framing, not for distribution)*
>
> **Dr. Mira Voss** — Senior Accessibility Researcher, W3C AG Working Group contributor.
> Mira has spent twelve years on accessibility standards and tooling. She co-authored
> a published critique of WCAG 2.x luminance scoring, follows the APCA debate closely,
> and is actively involved in the WCAG 3.0 / Silver working group. She knows exactly
> why hot pink on black passes WCAG and shouldn't. What she needs is not an explanation
> of the problem — she wrote the paper on it — but evidence that a proposed fix is
> methodologically sound, backward-compatible, and deployable today while the working
> group process grinds forward. Her skepticism is high: she has seen many "WCAG
> replacements" that introduced false passes while fixing false passes. Her first
> question will be: *how do you prove it never passes what WCAG fails?*

---

## Executive Summary

WCAG 2.x has two known measurement gaps: it over-rates saturated chromatic text on
dark backgrounds, and it scores contrast symmetrically when the perceptual reality is
not symmetric. Both cause marginal colour combinations to pass automated checks and
reach production, where real users with contrast sensitivity loss cannot read them.

OKCA is a drop-in contrast algorithm that closes both gaps while preserving the
familiar 1–21 scale and AA/AAA thresholds. It introduces no new compliance vocabulary.
Its central guarantee — that it never passes a pair WCAG fails — is proven from the
algorithm's structure, not inferred from test coverage. A 2,587-pair audit across
Tailwind, Material Design, and Radix UI found zero false passes and flagged 225 pairs
that WCAG passes but practitioners consistently reject as inadequate.

---

## The Gap WCAG 2.x Has Always Had

The WCAG 2.x relative luminance formula encodes photopic luminance sensitivity, not
legibility. The working group has known since at least 2019 that two failure modes
accumulate at scale:

**Polarity blindness.** The formula is symmetric — `contrast(A, B) = contrast(B, A)` —
despite evidence that positive polarity (dark-on-light) and negative polarity
(light-on-dark) produce different reading performance. Buchner & Baumgartner (2007)
established the positive polarity advantage for display reading; subsequent work by
Piepenbrock, Mayr, and Buchner (2013, 2014) extended the finding to older adults and
measured the pupil-size mechanism. Buchner, Mayr & Brandt (2009) traced the mechanism: light backgrounds are
intrinsically brighter, and that higher ambient luminance drives the reading
advantage. WCAG 2.x cannot capture this because its formula produces the same score
regardless of which colour is text and which is background. WCAG 3.0 /
Silver acknowledges this asymmetry; WCAG 2.x has no path to correction within its
current architecture.

**Chromatic over-rating near threshold.** Saturated chromatic text on dark
backgrounds — the hot pink / near-black case is canonical — scores well above the
4.5 AA threshold while failing in user studies at moderate to severe contrast
sensitivity loss. The IEC 61966-2-1 weighting assigns 71.5% of luminance to the
green channel, which does not translate cleanly to chromatic legibility. The result
is a systematic over-rating of vivid lighter elements in negative polarity.

These are not rare conditions. A structured audit of three production design systems
— Tailwind CSS v3.4, Material Design 2 named palette, Radix UI Colors ≥3.0.0 —
found **225 pairs** that pass WCAG 2.x AA while sitting in the marginal zone
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
false passes against WCAG 2.x.**

This is not a calibration claim — it is provable from the algorithm's structure.
The chroma compression exponent is ≥ 1 applied to a value ≤ 1, so the lighter
element's luminance proxy can only decrease or stay the same. The polarity power
curve `CAP × (r/21)^k` satisfies `ratio ≤ r_raw ≤ r_WCAG` for k ≥ 1 and CAP ≤ 21
by construction. Any pair WCAG 2.x fails, OKCA also fails — no exceptions,
no heuristic boundary.

The 2,587-pair test battery (curated probes + Tailwind, Material, Radix) confirms
zero false passes at production rounding precision (`toFixed(1)`).

---

## The WCAG 3.0 Context

OKCA is not a candidate to replace WCAG 3.0 / APCA. It occupies a different
position: a conservative, deployable improvement that operates within the WCAG 2.x
frame (same scale, same thresholds, same AA/AAA language) for teams that cannot
wait for the standards process. It catches what WCAG 2.x misses without asking
organisations to re-baseline their compliance posture.

For working group purposes, the algorithm and its calibration corpus are open and
auditable. The 225-pair disagreement dataset (see `docs/WCAG_DISAGREEMENTS.md`)
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
| False passes vs. WCAG 2.x | Reference | **Zero (proven)** |
| Marginal pairs flagged in audit | 0 of 225 | 225 of 225 |
| Deployable today | Yes | Yes |
