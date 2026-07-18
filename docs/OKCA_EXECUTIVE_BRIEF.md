# OKCA — Executive Brief

## Executive Summary

WCAG 2.x has two known measurement gaps: it over-rates saturated chromatic text on
dark backgrounds, and it scores contrast symmetrically when the perceptual reality is
not symmetric. Both cause marginal colour combinations to pass automated checks and
reach production, where real users with contrast sensitivity loss cannot read them.

OKCA is a drop-in contrast algorithm that closes both gaps while preserving the
familiar 1–21 scale and AA/AAA thresholds. It introduces no new compliance vocabulary.
Its central property — that it never passes a pair WCAG fails (zero false passes) — is
guaranteed by construction across the full sRGB gamut (an exact identity plus
interval-verified lemmas, `docs/FP0_PROOF.md`). A 1,249-pair audit across Tailwind, GOV.UK Design System, and USWDS found zero
false passes and flagged 97 pairs that WCAG passes but practitioners consistently reject
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
found **97 pairs** that pass WCAG 2.x AA while sitting in the marginal zone
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
by design, calibrated against the achromatic anchors white/black (20.9 L-o-D, 20.0
D-o-L) and the canonical AA boundary grey `#767676` (3.9 L-o-D, 3.7 D-o-L).

**Chromatic text receives a chroma-weighted luminance penalty.** The lighter
element's luminance proxy is compressed by a power exponent that scales with Oklab
chroma. Achromatic pairs are unaffected. Vivid chromatic lighter elements — the
failure zone — score lower than an achromatic element at equivalent OKLCH L. Hot
pink on near-black: WCAG 6.6, OKCA 3.6.

---

## The Safety Guarantee

The property that matters most for a working group context: **OKCA produces zero
false passes against WCAG 2.x** — it never approves a pair WCAG rejects.

The guarantee is **proven by construction for the full sRGB gamut** — not
calibration-dependent headroom. The proof has three parts:

- **Algebraic reduction.** `OKCA ≤ WCAG` separates into two single-element
  factors: it is equivalent to `(CAP/21^k)·A(lighter)·B(darker) ≤ 1`.
- **An exact identity.** At the achromatic anchors, `21^(1−k)·A(white)·B(black) = 1`
  for any k. Because the light-on-dark cap is set just below 21 (`LOD_CAP = 20.9`),
  the anchor bound is `20.9/21 = 0.99524 < 1` — a strict margin, so OKCA is
  *strictly* below WCAG everywhere (no equality point).
- **Two verified lemmas.** `A(l) ≤ A(white)` and `B(d) ≤ B(black)` are each
  confirmed by interval arithmetic over the sRGB cube with **0 uncertified boxes**
  — a machine-checked proof over continuous regions, not a sample.

**The one visible consequence:** OKCA's maximum (white on black) is **20.9**, a
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
auditable. The 97-pair disagreement dataset (see `docs/WCAG_DISAGREEMENTS.md`)
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
| False passes vs. WCAG 2.x | Reference | **Zero** (proven by construction across sRGB: identity + interval-verified lemmas) |
| Marginal pairs flagged in audit | 0 of 97 | 97 of 97 |
| Deployable today | Yes | Yes |
