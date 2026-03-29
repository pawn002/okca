# OKCA — Executive Brief

## The Problem

The current industry standard for text contrast — WCAG 2.x — has two measurable gaps that cause accessible-looking designs to fail real users.

**First: it passes colors it shouldn't.** Hot pink text on a near-black background scores 6.6 against WCAG's 4.5 passing threshold. It looks like a solid pass. In practice, the color is hard to read because the eye processes saturated color and luminance contrast differently. WCAG's formula, written for display calibration in the 1990s, doesn't account for this. The result is that products ship text their users cannot reliably read, while believing they have met the accessibility standard.

**Second: it treats all contrast as equal regardless of direction.** WCAG scores white-on-black and black-on-white identically. Research shows they are not the same — light text on dark backgrounds is perceived as higher contrast. A tool that ignores this gives designers incomplete information when making color choices.

These are not edge cases. A systematic audit of three major design systems — Tailwind CSS, Material Design, and Radix UI — identified **225 color combinations** that WCAG passes but that sit in the zone practitioners consistently reject as marginal or inadequate.

---

## Why It Matters

Accessibility standards exist to protect real users — people with low vision, color vision deficiencies, and age-related contrast sensitivity loss. A flawed measurement tool does not eliminate the harm; it only masks it. Organizations that rely on WCAG compliance as a proxy for accessibility are exposed on two fronts:

1. **User harm.** Text that passes the tool but fails in practice reaches production. Users encounter it and cannot read it.

2. **Legal and audit risk.** Accessibility litigation and regulatory review increasingly look at outcomes, not just compliance paperwork. A tool that systematically passes marginal combinations is not a defensible baseline.

---

## The Solution

OKCA (OK Contrast Algorithm) is a drop-in replacement for WCAG contrast measurement. It uses the same familiar 1–21 scale and the same AA (4.5) and AAA (7.0) thresholds — no retraining required.

It closes the two gaps above:

- **Saturated colors are penalized.** Vivid chromatic text is measured as lower contrast than an achromatic color at the same luminance, because that matches how it is actually perceived.

- **Direction is scored.** Light-on-dark scores higher than dark-on-light for the same color pair, reflecting the real perceptual asymmetry.

The key safety property: **OKCA never passes a combination that WCAG fails.** Every OKCA score is equal to or lower than the WCAG score for the same pair. Teams that adopt OKCA cannot accidentally approve something WCAG would have caught.

---

## Impact

| Property | WCAG 2.x | OKCA |
|---|---|---|
| Scale | 1–21 | 1–21 |
| AA threshold | 4.5 | 4.5 |
| AAA threshold | 7.0 | 7.0 |
| Saturated chromatic text | Over-rates | Penalized |
| Polarity (direction) | Ignored | Scored |
| False passes vs. WCAG | Reference | **Zero** |
| Marginal pairs flagged | 0 of 225 | 225 of 225 |

The 225 flagged pairs are not failures of calibration — they are the point. These are the colors that WCAG passes and practitioners reject. OKCA makes the measurement tool agree with expert judgement.

---

## Who This Is For

OKCA is a developer library. It is intended for teams building:

- Design system tooling and documentation
- Automated accessibility testing pipelines
- Color picker and design application features

It is not a replacement for manual accessibility review or user testing. It is a more accurate floor — a safety check that catches more of what can go wrong before it reaches users.
