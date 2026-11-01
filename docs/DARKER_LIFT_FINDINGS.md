# Darker-Element Lift — Fit Findings

Research notes for [#31](https://github.com/pawn002/okca/issues/31). This is
*analysis*: nothing here is in `src/`.

Reproduce:

```
npm run darker-lift     # scripts/darker-lift-fit.ts
```

---

## 1. The problem

Step 4 lifts the darker element along an opponent-axis direction (#28):

$$
e_D = 1 + K_D \cdot \min\left(1, \left(\frac{w_D}{0.15}\right)^{2}\right), \qquad w_D = \frac{C + a \cos\theta_D + b \sin\theta_D}{2}
$$

with $\theta_D = 313.7°$ and $K_D = 0.09$. Two of its three pieces came from
CVD data:

- **$\theta_D$** was the loss-weighted direction of raw colour-vision-deficiency
  loss for dark colours on light backgrounds.
- **$K_D$** was the smallest strength at which no grid pair scores above a
  dichromat's ratio (Machado et al. 2009, severity 1.0).

**The ramp shape** (capped at `C_THRESH`) was borrowed from Step 3, not
derived.

After #30 set one cap for both polarities, that rule fails for 43 grid pairs,
and no $K_D$ along $313.7°$ restores it. The rule can be applied consistently
only by fitting all three pieces to what OKCA actually needs.

---

## 2. What each dark colour needs

For every dark colour on the grid, find the smallest $e_D$ at which no pair
with a lighter grid colour, in either polarity, scores above the dichromat's
ratio, with every other step as it is:

| Colour | Hue | Chroma | $e_D$ needed |
|---|---:|---:|---:|
| `#0000ee` | 264° | 0.297 | 1.117 |
| `#0000cc` | 264° | 0.265 | 1.112 |
| `#2200ee` | 268° | 0.292 | 1.101 |
| `#0000aa` | 264° | 0.231 | 1.095 |
| `#000088` | 264° | 0.196 | 1.089 |
| `#000066` | 264° | 0.160 | 1.074 |
| `#000044` | 264° | 0.121 | 1.038 |

- **Concentrated, not broad.** 35 of 512 dark colours need a lift, nearly all
  blue to violet (hue 260–287°). Three dark greens need at most 1.010.
- **Not where raw CVD loss pointed.** Purples and magentas pulled the raw-loss
  direction to $313.7°$, but they need no lift: Steps 3–6 already cover them.
- **Linear in chroma.** Along the blue axis the requirement grows roughly in
  proportion to chroma. The cap at `C_THRESH` is why the old form could not
  follow it: every saturated blue got the same lift.

The **requirement-weighted direction** is $\theta_D = 267°$, essentially
Oklab's $-b$ axis.

---

## 3. Fitting the lift

Along $\theta_D = 267°$, three ramp shapes, each with $K_D$ set by the same
rule (smallest with no grid pair above the dichromat ratio). Counts are on a
262,144-pair grid, against the current branch:

| Form | $K_D$ | Above the dichromat ratio | Lowered | Raised | AA lost | AA gained |
|---|---:|---:|---:|---:|---:|---:|
| capped | 0.331 | 0 | 76,994 | 8,488 | 3,171 | 81 |
| quadratic | 0.331 | 0 | 76,994 | 8,488 | 3,500 | 81 |
| **linear** | **0.070** | **0** | 26,654 | 25,162 | **336** | **310** |

**Dark text on white, median score / WCAG by hue** (chroma at least 0.12):

| | red | orange | yellow | green | blue | purple | magenta |
|---|---:|---:|---:|---:|---:|---:|---:|
| Dichromat (CVD / WCAG) | 0.88 | 0.91 | 0.98 | 0.95 | 0.88 | 0.95 | 0.92 |
| current | 0.76 | 0.81 | 0.85 | 0.90 | 0.76 | 0.71 | 0.71 |
| capped, 0.331 | 0.77 | 0.82 | 0.85 | 0.89 | 0.56 | 0.54 | 0.64 |
| linear, 0.070 | 0.78 | 0.81 | 0.85 | 0.89 | 0.76 | 0.73 | 0.74 |

---

## 4. Readings

1. **The linear lift along the requirement direction meets the rule with
   almost no collateral.** No grid pair scores above the dichromat ratio. Per-hue
   behaviour stays within 0.03 of the current branch; magenta and purple ease
   slightly (0.71 → 0.73–0.74), since the lift no longer leans toward them. The
   net verdict change is roughly even: 336 AA lost, 310 gained.
2. **Every piece is now derived.**
   - **The direction** is where OKCA needs a lift, not the raw CVD-loss average.
   - **The shape** is linear, because the requirement grows linearly with
     chroma.
   - **The strength** follows the same rule as before.

   The form is $e_D = 1 + K_D \cdot w_D / 0.15$ with no cap, still linear in
   $a$, $b$ and $C$, with no hue branch.
3. **Capped and quadratic shapes meet the rule only by over-lifting.** Blue and
   purple text on white falls to about 0.5–0.55 of WCAG, against the 0.88–0.95
   that dichromats keep.
4. **FP=0 is unaffected.** The lift only raises the darker proxy
   ($e_D \ge 1$), so lemma B holds a fortiori.

## 5. Recommendation

Replace Step 4's darker lift with the linear form along $\theta_D = 267°$,
$K_D = 0.070$. Not applied.
