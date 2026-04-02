# OKCA — Font Size Guidance

OKCA outputs a single contrast score. This document describes how to interpret
that score in terms of minimum supported font size. It is guidance, not a
compliance regulation.

---

## The table

| Tier | Size / weight | Minimum OKCA score |
|------|--------------|-------------------|
| Large text | ≥ 24 px, or ≥ 18.67 px bold | 3.0 |
| Normal text | ≥ 16 px | 4.5 |
| Small text | 15 px | 6.5 |
| Small text | 14 px | 9.5 |
| Small text | 13 px | 13.8 |
| Small text | 12 px | 20 |
| Below 12 px | — | not supported |

---

## Why these tiers

### Large text and normal text — WCAG anchors

WCAG 2.x defines two text categories: normal text (AA threshold 4.5) and large
text (AA threshold 3.0, defined as ≥ 18 pt / 24 px, or ≥ 14 pt / 18.67 px
bold). OKCA uses the same thresholds and the same size boundaries for these two
tiers. No interpolation between them.

WCAG backwards compatibility is preserved by construction: OKCA scores are
always ≤ the equivalent WCAG score, so any pair that fails WCAG also fails OKCA
at these thresholds.

### Small text — where WCAG is silent

WCAG's "normal text" category covers all text below the large text boundary,
including text at 10 px or 12 px. WCAG does not distinguish between 16 px and
10 px: both require the same 4.5 threshold. That is the gap this tier closes.

**12 px as the floor.** Below 12 px, contrast cannot compensate for letterform
resolution failure. Individual glyphs — the counter of a "g", the dot on an
"i", the gap between adjacent serifs — become physically unresolvable at typical
display densities regardless of the foreground/background relationship. Guidance
at sub-12 px sizes would be false confidence. Major production design systems
(Material Design, GOV.UK, Apple HIG) treat 12 px as the practical minimum for
any rendered text.

**20 as the 12 px anchor.** A score of 20 is achievable in both polarities:
white on black scores 21 (light-on-dark), black on white scores exactly 20.0
(the dark-on-light polarity cap). The 12 px threshold therefore admits the
maximum achromatic pair in either direction. No chromatic combination and no
near-neutral pair reaches 20 — `#ffffff` on `#111111` scores 18.5; any chroma
in the lighter element reduces the score further. This is intentional: 12 px
text carries a real cost, and the required palette reflects that.

**The ramp from 12 px to 16 px.** Rather than a cliff from 4.5 (16 px) to 20
(12 px), the small text zone uses a per-pixel exponential ramp between the two
anchors. The ramp is geometric — each pixel step multiplies the required score
by the same factor — which matches the general character of contrast scales and
the nonlinear relationship between size and legibility already implied by the
WCAG large text data (16 px → 4.5, 24 px → 3.0).

The intermediate values are not borrowed from any named external threshold.
They stand on the shape of the ramp and the two anchor points alone.

| px | Required score | Notes |
|----|---------------|-------|
| 16 | 4.5 | WCAG normal text AA |
| 15 | 6.5 | ramp |
| 14 | 9.5 | ramp |
| 13 | 13.8 | ramp |
| 12 | 20 | anchor — maximum achromatic pair, either polarity |

---

## What this table does not cover

**AAA calls.** This document specifies AA guidance only. AAA thresholds (7.0
for normal and large text) apply independently of this table and are not
extended here.

**Weight within small text.** WCAG distinguishes bold at the large text
boundary (14 pt bold qualifies as large text). This table does not extend that
distinction into the small text zone. 12–15 px bold text is still small text
and requires the same score as regular weight at that size.

**Polarity.** OKCA scores are polarity-aware; this table is not. The threshold
at each size applies regardless of whether the pair is light-on-dark or
dark-on-light.

**Non-text elements.** WCAG's 3.0 threshold for UI components and graphical
objects is a separate consideration not addressed here.
