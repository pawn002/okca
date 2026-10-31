# Opponent-Axis Terms — Prototype Findings

Research notes for [#28](https://github.com/pawn002/okca/issues/28). Builds on
the CVD survey in [`CVD_FINDINGS.md`](CVD_FINDINGS.md). This is *analysis*:
nothing here is in `src/`.

Reproduce:

```
npm run opponent     # scripts/opponent-axis-prototype.ts
```

---

## 1. The idea

OKCA's chroma penalty (Step 3) treats every hue the same. Colour-vision
deficiency does not. Dichromats lose much of the contrast of reds, oranges and
magentas, and little of greens, blues and purples. Hue branching is off the
table, but Oklab's $a$ and $b$ coordinates together carry both hue and chroma.
So a smooth index can be built from them directly:

$$
w(a, b) = \frac{C + a \cos\theta + b \sin\theta}{2}
$$

This is $C$ in the direction $\theta$, $C/2$ at 90° from it and $0$ opposite.
It is linear in $a$ and $b$, with no hue branch. It does give up the rotational
symmetry stated in [`OKCA_DESIGN.md`](OKCA_DESIGN.md) §2.4; that would have to
be changed outright.

Two terms use it:

- **Lighter element.** Step 3's chroma ramp is driven by $w_L$ instead of $C$.
  Colours away from $\theta_L$ are penalised less.
- **Darker element.** Its proxy is lifted, $L^{3s/e_D}$ with
  $e_D = 1 + K_D \cdot \text{ramp}(w_D)$. Like Step 4's induction, this only
  raises the darker proxy, so it can only lower a score.

The lighter term alone is not enough. Easing the lighter penalty adds 50 AA
passes that a dichromat fails, mostly saturated blue text on pale green or
yellow fills. The CVD loss there is in the darker *text*, which the hue-uniform
penalty on the background had been covering by accident. The darker term covers
it on purpose.

---

## 2. Nothing is tuned

| Quantity | Value | How it is set |
|---|---:|---|
| $\theta_L$ | 9.4° | Loss-weighted direction of CVD contrast loss, light colours on `#000000`, `#1a1a1a` and `#333333` (n = 39,761) |
| $\theta_D$ | 313.7° | The same, dark colours on `#ffffff`, `#f0f0f0` and `#dddddd` (n = 30,358) |
| $K_D$ | 0.09 | Smallest strength at which no grid pair scores above the CVD ratio (0.0881 by bisection, rounded up) |
| `CHROMA_K`, `C_THRESH` | 0.65, 0.15 | Unchanged; reused by both ramps |

$\theta_L \approx 9°$ is essentially Oklab's $+a$ axis: the red end of the
red–green opponent channel, which protans and deutans lose. $\theta_D$ points
between blue and magenta, where dark colours look *lighter* to a dichromat and
so lose contrast against a light background.

"CVD ratio" is the WCAG ratio of the pair as a dichromat sees it: Machado,
Oliveira & Fernandes (2009), severity 1.0, worst of protan, deutan and tritan
(`scripts/cvd.ts`). It is the yardstick, not part of the algorithm.

---

## 3. Results

**262,144-pair sRGB grid, against the current `okca-26-cam16` algorithm:**

| Variant | Above WCAG | Above the CVD ratio | AA a dichromat fails | Raised (L-o-D / D-o-L) | Lowered | AA gained | AA lost |
|---|---:|---:|---:|---|---:|---:|---:|
| current | 0 | 243 | 11 | — | — | — | — |
| warm lighter only | 0 | 538 | 50 | 67,370 / 66,500 | 0 | 6,624 | 0 |
| **paired, $K_D$ = 0.09** | 0 | **0** | **0** | 56,908 / 56,097 | 18,929 | 4,579 | 451 |
| paired, $K_D$ = `CHROMA_K` | 0 | 0 | 0 | 27,190 / 26,734 | 68,967 | 2,307 | 3,707 |

**Median score / WCAG by hue, saturated colours (chroma at least 0.12):**

| | red | orange | yellow | green | cyan | blue | purple | magenta |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| *Light text on black:* CVD / WCAG | 0.80 | 0.87 | 0.96 | 0.97 | 0.93 | 0.94 | 0.98 | 0.87 |
| current | 0.47 | 0.56 | 0.66 | 0.57 | 0.66 | 0.44 | 0.44 | 0.49 |
| paired | 0.48 | 0.66 | 0.85 | 0.86 | 0.89 | 0.79 | 0.57 | 0.50 |
| *Dark text on white:* CVD / WCAG | 0.88 | 0.91 | 0.98 | 0.95 | 0.92 | 0.88 | 0.95 | 0.92 |
| current | 0.77 | 0.79 | 0.82 | 0.87 | 0.87 | 0.81 | 0.78 | 0.77 |
| paired | 0.72 | 0.77 | 0.82 | 0.87 | 0.87 | 0.73 | 0.68 | 0.68 |

**Calibration pairs:**

| Pair | WCAG | CVD | current | paired |
|---|---:|---:|---:|---:|
| `#ffffff` on `#767676` | 4.5 | 4.5 | 3.9 | 3.9 |
| `#767676` on `#ffffff` | 4.5 | 4.5 | 3.7 | 3.7 |
| `#ff69b4` on `#1a1a1a` | 6.6 | 5.3 | 3.0 | 3.0 |
| `#ff0000` on `#000000` | 5.3 | 3.3 | 2.5 | 2.5 |
| `#3b82f6` on `#000000` | 5.7 | 5.3 | 2.4 | 4.4 |
| `#22c55e` on `#000000` | 9.2 | 8.7 | 4.3 | 7.7 |
| `#8b5cf6` on `#000000` | 5.0 | 5.0 | 2.2 | 2.5 |
| `#0000ff` on `#dddddd` | 6.3 | 4.0 | 4.5 | 3.9 |
| `#1d4ed8` on `#ffffff` | 6.7 | 5.4 | 5.3 | 4.6 |
| `#dc2626` on `#ffffff` | 4.8 | 4.0 | 3.5 | 3.2 |
| `#000000` on `#00cc00` | 9.6 | 9.1 | 4.4 | 7.4 |

---

## 4. Readings

1. **CVD-safe everywhere on the grid.** The paired design closes the 243
   existing cases where OKCA scored above what a dichromat sees, including the
   11 AA passes a dichromat fails. The current algorithm does not.
2. **Strict where CVD says strict.** Reds, hot pink, dark orange and magenta
   are unchanged. Every anchor is exact.
3. **Eases where CVD says ease.** Blue, green, yellow and cyan on dark move
   from about 0.44–0.66 of WCAG to 0.79–0.89. That is still below what
   dichromats see.
4. **Tightens dark cool text on light backgrounds**, slightly, to just below
   the CVD ratio. `#1d4ed8` on white goes from 5.3 to 4.6.
5. **A large net loosening.** About 113,000 grid pairs rise and 4,579 newly
   pass AA, against 451 that lose it. This is the direction the evidence
   points: the current penalty exceeds CVD loss at every hue on dark
   backgrounds. But it is a real recalibration.

---

## 5. Open before adoption

- **Purple.** It stays penalised (0.57 of WCAG on black, against CVD 0.98)
  because its $a$ is positive. One smooth lobe cannot separate purple from
  magenta.
- ~~**FP=0.**~~ **Proven** (see §6).
- **The yardstick sets the strength.** $K_D$ is fitted to Machado's severity
  1.0 model. Anomalous trichromacy loses less.
- **Design principle.** §2.4 of the design doc ("rotationally symmetric, no hue
  branch") would become "no hue branch; weighted along Oklab's opponent axes".

---

## 6. FP=0 under the paired design

`OKCA_WEIGHT=opponent npm run fp0` runs the interval verifier with Step 3's ramp
driven by the opponent weight. Two changes make that possible:

- `scripts/interval.ts` now also returns enclosures of Oklab $a$ and $b$.
- The verifier encloses $w = (C + a \cos\theta_L + b \sin\theta_L)/2$ with
  $\theta_L = 9.4°$. It clamps $w$ at 0, which is exact because
  $|a \cos\theta + b \sin\theta| \le C$.

| Lemma | Weight | Boxes | Uncertified |
|---|---|---:|---:|
| A: $A(l) \le A(\text{white}) \cdot s$ | chroma (current) | 96,355 | 0 |
| A: $A(l) \le A(\text{white}) \cdot s$ | opponent | 138,773 | **0** |
| B: $B(d) \le B(\text{black}) \cdot s$ | — | 271,661 | 0 |

- **Lemma A** takes more boxes under the opponent weight, because the penalty
  is weaker, but every box certifies.
- **Lemma B** is unchanged. Step 4's induction and the darker lift both raise
  the darker proxy, since its exponent $3s/e_D \le 3$. So $B(d)$ can only fall
  and the lemma holds a fortiori.
- **Together with the exact identity**, the paired design is FP=0 over the full
  sRGB gamut.
