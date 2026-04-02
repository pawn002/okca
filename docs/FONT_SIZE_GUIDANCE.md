# OKCA — Font Size Guidance

OKCA outputs a single contrast score. This document describes how to interpret
that score in terms of minimum supported font size. It is guidance, not a
compliance regulation.

---

## The table

| Size | Regular | Bold | Notes |
|------|--------:|-----:|-------|
| ≥ 24 px | 3.0 | 3.0 | Both weights qualify as large text; weight no longer affects the required score |
| 23 px | 4.5 | 3.0 | |
| 22 px | 4.5 | 3.0 | |
| 21 px | 4.5 | 3.0 | |
| 20 px | 4.5 | 3.0 | |
| 19 px | 4.5 | 3.0 | Bold qualifies as WCAG large text from 18.67 px (14 pt); regular does not until 24 px |
| 18 px | 4.5 | 4.5 | Bold has not yet reached the 18.67 px large text threshold — WCAG 4.5 floor binds both weights |
| 17 px | 4.5 | 4.5 | |
| 16 px | 4.5 | 4.5 | |
| 15 px | 6.5 | 4.5 | Bold one-pixel shift lands exactly on the WCAG 4.5 floor; no further reduction is possible |
| 14 px | 9.5 | 6.5 | |
| 13 px | 13.8 | 9.5 | |
| 12 px | 20 | 13.8 | Small text floor; no bold path to 12 px at normal-text contrast levels |
| < 12 px | — | — | Not supported — contrast cannot compensate for letterform resolution failure at this size |

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

### Bold adjustments

WCAG already applies a bold adjustment at the large text boundary: 14 pt
(18.67 px) bold qualifies as large text, whereas non-bold text must reach
24 px. The same principle — that heavier stroke weight improves letterform
distinction at smaller sizes — extends into the small text zone.

**Normal text (16–23 px):** WCAG's 4.5 floor applies regardless of weight for
text below the large text boundary. OKCA cannot go below that without a false
pass, so no bold adjustment is possible until bold reaches 18.67 px and
qualifies as large text. This produces the flat zone at 16–18 px where regular
and bold require the same score despite the weight difference.

**Small text (12–15 px):** Bold text at size N uses the threshold for regular
text at N+1 — a one-pixel shift, directly mirroring WCAG's own approach.
Backwards compatibility holds: WCAG requires 4.5 for all text in this range
regardless of weight, and every bold value in the table is ≥ 4.5.

---

## What this table does not cover

**AAA calls.** This document specifies AA guidance only. AAA thresholds (7.0
for normal and large text) apply independently of this table and are not
extended here.

**Polarity.** OKCA scores are polarity-aware; this table is not. The threshold
at each size applies regardless of whether the pair is light-on-dark or
dark-on-light.

**Non-text elements.** WCAG's 3.0 threshold for UI components and graphical
objects is a separate consideration not addressed here.
