# Polarity Caps — Exploration Findings

Research notes for [#30](https://github.com/pawn002/okca/issues/30). This is
*analysis*: nothing here is in `src/`.

Reproduce:

```
npm run polarity     # scripts/polarity-caps.ts
```

---

## 1. The question

Step 5 scales light-on-dark (L-o-D) pairs to `LOD_CAP` = 20.9 and
dark-on-light (D-o-L) pairs to `DOL_CAP` = 20. That is an editorial asymmetry
that scores light-on-dark higher; [`OKCA_DESIGN.md`](OKCA_DESIGN.md) §7
anchors it to practitioner reference values.

Three later findings push the other way:

- **Steps 4 and 6 tighten dark backgrounds,** which in practice means
  light-on-dark pairs: induction and the opponent lift
  ([`CAM16_FINDINGS.md`](CAM16_FINDINGS.md),
  [`OPPONENT_AXIS_FINDINGS.md`](OPPONENT_AXIS_FINDINGS.md)) and the flare
  ceiling ([`MIDTONE_SURVEY_FINDINGS.md`](MIDTONE_SURVEY_FINDINGS.md)).
- **The reading literature favours dark text on light backgrounds:** Buchner
  & Baumgartner (2007); Piepenbrock, Mayr, Mund & Buchner (2013); Piepenbrock,
  Mayr & Buchner (2014a, 2014b). See
  [`MIDTONE_SURVEY_FINDINGS.md`](MIDTONE_SURVEY_FINDINGS.md) §6.
- **Moving the induction reference** ([`INDUCTION_REFERENCE_FINDINGS.md`](INDUCTION_REFERENCE_FINDINGS.md))
  could not hold both polarity anchors.

The full 3.0 algorithm is reimplemented with both caps as parameters. It
reproduces the live `contrast()` exactly at the current values.

---

## 2. Results

**Which polarity scores higher.** Each unordered pair is scored both ways,
counting pairs where either direction reaches 3.0. Bands are by the darker
colour's OKLab $L$.

| Caps (L-o-D / D-o-L) | $L$ < 0.3 | 0.3–0.5 | 0.5–0.566 | ≥ 0.566 |
|---|---|---|---|---|
| current (20.9 / 20) | L-o-D 14%, D-o-L 82% | L-o-D 0%, D-o-L 99% | L-o-D 36%, D-o-L 14% | **L-o-D 100%** |
| **equal (20.9 / 20.9)** | L-o-D 0%, D-o-L 89% | L-o-D 0%, D-o-L 100% | L-o-D 0%, D-o-L 85% | tie 100% |
| inverted (20 / 20.9) | L-o-D 0%, D-o-L 100% | L-o-D 0%, D-o-L 100% | L-o-D 0%, D-o-L 100% | D-o-L 100% |

In 3.0 the current caps already lose for almost every dark-mode pair. They win
only near and above `#767676`, which is where the anchors sit. The algorithm
holds two contradictory positions on polarity.

**Anchors and calibration pairs (L-o-D / D-o-L):**

| Pair | WCAG | current | equal | inverted |
|---|---:|---:|---:|---:|
| `#ffffff` / `#000000` | 21.00 | 20.9 / 20.0 | 20.9 / 20.9 | 20.0 / 20.9 |
| `#ffffff` / `#767676` | 4.54 | 3.9 / 3.7 | 3.9 / 3.9 | 3.7 / 3.9 |
| `#ffffff` / `#595959` | 7.00 | 5.7 / 6.0 | 5.7 / 6.2 | 5.4 / 6.2 |
| `#cccccc` / `#333333` | 7.87 | 5.7 / 6.7 | 5.7 / 7.0 | 5.5 / 7.0 |
| `#ff69b4` / `#1a1a1a` | 6.57 | 3.0 / 3.5 | 3.0 / 3.6 | 2.8 / 3.6 |

**Design-system disagreements and the 262,144-pair grid:**

| Caps | Disagreements | Above WCAG | Raised | Lowered | AA gained | AA lost |
|---|---:|---:|---:|---:|---:|---:|
| current | 109 | 0 | — | — | — | — |
| equal | 107 | 0 | 57,730 | 0 | 788 | 0 |
| inverted | 111 | 0 | 57,730 | 55,262 | 788 | 638 |

---

## 3. Readings

1. **Equal caps make polarity consistent.** Light-on-dark never outscores
   dark-on-light. Every remaining asymmetry comes from the evidence-based steps,
   always in the literature's direction, and it is a tie where those steps do
   not act (backgrounds at least as light as `#767676`).
2. **Equal caps remove an editorial input instead of replacing it.** Inverting
   the caps also gives consistent ordering, but it keeps an editorial magnitude,
   just pointed the other way. No source gives a contrast-equivalent size for
   the polarity effect, so there is nothing to set that magnitude from.
3. **The cost is a modest loosening of dark-on-light.** Every D-o-L score is
   multiplied by 20.9/20 (about 4.5%). On the grid, 788 pairs newly pass AA and
   none lose it. `#767676` on white goes from 3.7 to 3.9, matching its
   light-on-dark counterpart.
4. **FP=0 is unaffected.** The D-o-L cap of 20.9 is the same value whose strict
   margin the proof already uses for L-o-D, so the identity and both lemmas
   carry over. The grid shows no false passes for any variant.
5. **"Polarity-aware" stays true in a different sense.** OKCA still scores the
   two directions differently, but because dark backgrounds measurably cost
   contrast, not because of a cap.

## 4. Recommendation

Equal caps: `DOL_CAP` = `LOD_CAP` = 20.9. Not applied.
