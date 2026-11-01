# Lighter-Element Penalty — Fit Findings

Research notes for [#33](https://github.com/pawn002/okca/issues/33). This is
*analysis*: nothing here is in `src/`.

Reproduce:

```
npm run chroma-k                                # scripts/chroma-k-fit.ts
OKCA_RAMP=linear OKCA_CHROMA_K=0.22 npm run fp0 # lemma A under the fitted penalty
```

---

## 1. The question

Step 3 penalises a saturated lighter element:

$$
e_L = 1 + K_L \cdot \min\left(1, \left(\frac{w_L}{0.15}\right)^{2}\right), \qquad Y_{\text{lighter}} = L_{\text{lighter}}^{3 e_L}
$$

with $K_L =$ `CHROMA_K` $= 0.65$ and the weight $w_L$ taken along
$\theta_L = 9.4°$. Its direction was measured from colour-vision-deficiency
loss (#28). Its strength was not derived: it was set so that hot pink on
near-black fails AA, matching designers' judgement. Its shape, a quadratic
ramp capped at `C_THRESH` = 0.15, was a design choice.

A dichromat keeps about 5.3 of hot pink's 6.6 on `#1a1a1a`; OKCA scores it
3.0. No legibility source found covers the gap (see #33). This fit applies the
rule #31 used for the darker lift: no pair on the 262,144-pair grid may score
above a dichromat's ratio (Machado et al. 2009, severity 1.0), with every
correction as small as that allows.

---

## 2. What each light colour needs

For every light colour on the grid, the smallest $e_L$ at which no pair with a
darker grid colour, in either polarity, scores above the dichromat's ratio,
with every other step as it is:

| Hue band | Colours needing a penalty | Largest $e_L$ needed | Current $e_L$ there |
|---|---:|---:|---:|
| red | 46 | 1.336 | 1.650 |
| orange | 18 | 1.202 | 1.650 |
| yellow | 5 | 1.046 | 1.241 |
| green, cyan, blue | 0 | 1.000 | 1.000 |
| purple | 3 | 1.076 | 1.650 |
| magenta | 41 | 1.289 | 1.650 |

- **Eliminating the penalty is ruled out.** 113 of 512 light colours need one.
- **The current penalty is about twice what is needed.** The largest
  requirement is $e_L = 1.34$, against 1.65 applied.
- **The direction holds.** The requirement-weighted direction is $7°$, against
  $9.4°$ measured from raw CVD loss. Unlike the darker lift (#31), the two
  agree.
- **Linear in the weight.** The median requirement rises steadily with $w_L$,
  from 0.04 below $w_L = 0.10$ to 0.23 at 0.20–0.30. The cap at `C_THRESH`
  gives every saturated colour the same penalty.

---

## 3. Fitting the penalty

The two strengths trade off: a weaker lighter penalty needs a stronger darker
lift to keep dark text on saturated fills at or below the dichromat ratio. For
each shape, every $K_L$ was paired with the smallest $K_D$ meeting the rule,
and the pair keeping scores closest beneath the dichromat ratio was chosen
(largest mean of score / dichromat ratio, capped at 1): the least correction
the rule allows. Direction made no material difference ($7°$ and $9.4°$
within 0.0003); figures are at $9.4°$.

| Shape | $K_L$ | $K_D$ | Closeness | Raised | Lowered | AA gained | AA lost |
|---|---:|---:|---:|---:|---:|---:|---:|
| current (capped) | 0.65 | 0.070 | 0.7352 | — | — | — | — |
| capped | 0.34 | 0.089 | 0.7457 | 37,518 | 23,725 | 378 | 329 |
| quadratic | 0.24 | 0.104 | 0.7417 | 34,985 | 37,523 | 459 | 637 |
| **linear** | **0.22** | **0.065** | **0.7529** | 43,387 | 5,075 | 548 | 45 |

Every variant leaves 0 grid pairs above WCAG and 0 above the dichromat ratio.

**Example pairs:**

| Pair | WCAG | Dichromat | Current | Linear fit |
|---|---:|---:|---:|---:|
| hot pink `#ff69b4` / `#1a1a1a` | 6.6 | 5.3 | 3.0 | 4.1 |
| dark orange `#ff8c00` / `#1a1a1a` | 7.5 | 6.1 | 3.4 | 4.8 |
| red `#ff0000` / `#000000` | 5.3 | 3.3 | 2.5 | 3.3 |
| `#000000` / hot pink | 7.9 | 6.4 | 4.5 | 6.1 |
| blue `#3b82f6` / `#000000` | 5.7 | 5.3 | 3.6 | 3.6 |
| `#1d4ed8` / `#ffffff` | 6.7 | 5.4 | 4.8 | 4.8 |
| `#ffffff` / `#767676` | 4.5 | 4.5 | 3.9 | 3.9 |

Design-system WCAG disagreements: 108 → 107.

---

## 4. Readings

1. **The penalty is needed, at about a third of its current strength.** The
   rule requires a lighter penalty for 113 of 512 colours, all red to magenta.
   The linear fit meets it with $K_L = 0.22$ against 0.65.
2. **The linear shape fits best, as it did for the darker lift.** It keeps
   scores closest beneath the dichromat ratio, and it loosens the most while
   tightening the least: 548 AA gained, 45 lost. The capped and quadratic
   shapes meet the rule only by over-penalising some colours and leaning harder
   on the darker lift.
3. **`C_THRESH` stops being a constant.** In the linear form only the ratio
   $K_L / 0.15$ matters, so one derived strength replaces two chosen values.
4. **Hot pink still fails AA.** It scores 4.1, up from 3.0. The verdict
   designers reach by eye survives derivation, with less margin.
5. **Dark orange no longer fails AA.** It scores 4.8 (dichromat 6.1). The
   design docs name it, with hot pink, as a pair OKCA should fail. The fit says
   colour-vision loss does not support that call for orange.
6. **FP=0 holds.** Lemma A certifies under the linear penalty with $K_L = 0.22$
   and 0 uncertified boxes; lemma B is unchanged. With no penalty, the verifier
   exhausts memory without certifying lemma A: the penalty also helps keep
   saturated light colours within the WCAG bound.

## 5. Recommendation

Replace Step 3's ramp with the linear form along $\theta_L = 9.4°$,
$K_L = 0.22$, and refit the darker lift to $K_D = 0.065$. Every strength in
OKCA is then derived from the same rule. Two decisions belong to the
maintainer:

- whether dark orange passing AA on near-black (4.8) is acceptable, since the
  evidence supports it and the earlier design judgement does not;
- whether "hot pink on near-black fails AA" becomes a pinned test, as a
  check on the derivation rather than an input to it.

Not applied.
