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
| Small text | 12 – 15 px | 21 |
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

**21 as the small text threshold.** The small text tier requires the maximum
possible OKCA score. This is intentional.

The rationale is not that 7.0 (WCAG AAA) is insufficiently strict in principle —
AAA is already demanding. The rationale is that 7.0 for small text creates false
confidence. A designer who reaches AAA at 12 px and considers the job done has
been given permission that the underlying readability does not support. The
chromatic palette available at 7.0 is wide enough to include many combinations
that are plausible in a colour picker but genuinely difficult at 12 px in
real-world rendering conditions (sub-pixel anti-aliasing, device variability,
ambient lighting).

At 21, the available palette collapses to near-neutral: dark text on a light
surface or light text on a dark surface with near-maximum lightness separation.
That collapse is the point. It communicates honestly that 12 px text is not a
decision to be decorated — it is a cost. If a design cannot reach 21 with its
chosen palette at 12 px, the answer is to use 16 px, not to find a colour that
clears 7.0.

A further property: since OKCA's AAA threshold is 7.0 and the small text
threshold is 21, the tiers are unambiguously distinct. A threshold of 7.0 for
small text would read as "meet the same bar as large-text AAA" — which signals
that small text is just another tier, slightly more demanding. A threshold of 21
signals that it is categorically different.

---

## What this table does not cover

**AAA calls.** This document specifies AA guidance only. AAA thresholds (7.0
for normal and large text) apply independently of this table and are not
extended here.

**Weight within small text.** WCAG distinguishes bold at the large text
boundary (14 pt bold qualifies as large text). This table does not extend that
distinction into the small text tier. 12–15 px bold text is still small text
and requires 21.

**Polarity.** OKCA scores are polarity-aware; this table is not. A score of
21 is rare in either direction. The table applies regardless of whether the
pair is light-on-dark or dark-on-light.

**Non-text elements.** WCAG's 3.0 threshold for UI components and graphical
objects is a separate consideration not addressed here.
