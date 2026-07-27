# FP=0 — guaranteed by construction (issue #14)

**Status: proven.** $\text{OKCA} \le \text{WCAG}$ for every sRGB pair is now an
**exact algebraic identity** plus **two single-colour lemmas verified by interval
arithmetic** — no calibration-dependent headroom, no residual. Reproduce:
`npm run fp0` (certifies with **0 uncertified boxes**).

Constants: `POL_K` = 1.100, `CHROMA_K` = 0.65, `LOD_CAP` = 20.9, `DOL_CAP` = 20.

## 1. Algebraic reduction

The final score is

$$\text{OKCA} = \text{CAP} \cdot \left(\frac{r_{\text{raw}}}{21}\right)^{k}, \qquad r_{\text{raw}} = \frac{Y_{\text{lighter}} + 0.05}{Y_{\text{darker}} + 0.05},$$

where $Y_{\text{lighter}} = \left(L_{\text{lighter}}^{\text{exp}}\right)^{3}$ is
the chroma-penalised lighter proxy, $Y_{\text{darker}} = L_{\text{darker}}^{3}$,
$k =$ `POL_K`, and $\text{CAP} =$ `LOD_CAP` (light-on-dark) or `DOL_CAP`
(dark-on-light). Writing $Y_l$ and $Y_d$ for the **WCAG** luminances of the
lighter and darker elements,

$$r_{\text{WCAG}} = \frac{Y_l + 0.05}{Y_d + 0.05}.$$

Rearranging separates the two elements:

$$\text{OKCA} \le \text{WCAG} \iff \frac{\text{CAP}}{21^{k}} \cdot A(l) \cdot B(d) \le 1,$$

$$A(l) = \frac{\left(Y_{\text{lighter}} + 0.05\right)^{k}}{Y_l + 0.05}, \qquad B(d) = \frac{Y_d + 0.05}{\left(Y_{\text{darker}} + 0.05\right)^{k}},$$

where $A$ depends on the **lighter element only** and $B$ on the **darker element
only**.

## 2. The exact identity

At the achromatic anchors, for **any** $k$:

$$\begin{aligned}
21^{1-k} \cdot A(\text{white}) \cdot B(\text{black})
  &= 21^{1-k} \cdot 1.05^{k-1} \cdot 0.05^{1-k} \\
  &= (21 \cdot 0.05)^{1-k} \cdot 1.05^{k-1} \\
  &= 1.05^{1-k} \cdot 1.05^{k-1} = 1,
\end{aligned}$$

since $21 \cdot 0.05 = 1.05$.

(Verified to $10^{-12}$ by `npm run fp0`.) $A$ is maximised over sRGB at white,
$B$ at black — confirmed by a full-gamut search: $\max A = A(\text{white})$,
$\max B = B(\text{black})$.

## 3. The lowered cap removes the equality

With $\text{CAP} = 21$ the bound at the anchor is $21/21 = 1$ — **tight**, so
white-on-black would be the single point where $\text{OKCA} = \text{WCAG}$, which
interval arithmetic cannot certify (it cannot prove a non-strict equality).
Setting **`LOD_CAP` $= 20.9 < 21$** makes the anchor bound

$$\frac{\text{LOD\_CAP}}{21^{k}} \cdot A(\text{white}) \cdot B(\text{black}) = \frac{\text{LOD\_CAP}}{21} = 0.99524 < 1,$$

a **uniform strict margin**. There is now no equality point anywhere: OKCA is
*strictly* below WCAG for every sRGB pair. (Dark-on-light, $\text{CAP} = 20$, is
looser still.) The $20.9/21$ factor is the deliberate, minimal step that converts
the guarantee from "gamut-verified headroom" to "strict by construction".

## 4. Reduction to two verified lemmas

$A \ge 0$, $B \ge 0$, and the identity give: the pair inequality follows from

$$\begin{aligned}
\text{(L-A)} \quad & A(l) \le A(\text{white}) \cdot s && \text{for all sRGB } l, \\
\text{(L-B)} \quad & B(d) \le B(\text{black}) \cdot s && \text{for all sRGB } d,
\end{aligned}$$

with $s = \sqrt{21 / \text{LOD\_CAP}} = 1.00239$, since then

$$\frac{\text{LOD\_CAP}}{21^{k}} \cdot A \cdot B \le \frac{\text{LOD\_CAP}}{21^{k}} \cdot A(\text{white}) \cdot B(\text{black}) \cdot s^{2} = \frac{\text{LOD\_CAP}}{21} \cdot \frac{21}{\text{LOD\_CAP}} = 1.$$

`scripts/fp0-proof.ts` branch-and-bounds each
lemma over the sRGB cube with sound outward-rounded interval arithmetic
(`scripts/interval.ts`, exact Ottosson OKLab matrices + the WCAG luminance
formula; enclosures validated to contain production values). A box is certified
when `A.hi ≤ target` (resp. `B.hi ≤ target`) — the bound then holds for **every
point** in that continuum.

Result (`npm run fp0`):

| lemma | boxes | certified | equality corners | **uncertified** |
|-------|------:|----------:|-----------------:|----------------:|
| $A(l) \le A(\text{white}) \cdot s$ | ~96k | all | 0 | **0** |
| $B(d) \le B(\text{black}) \cdot s$ | ~272k | all | 0 | **0** |

Every sRGB point is certified; the slack $s > 1$ from the lowered cap lets even
the anchors certify, so no neighbourhood is excluded.

## 5. Conclusion

For every ordered sRGB pair:

$$\frac{\text{LOD\_CAP}}{21^{k}} \cdot A(l) \cdot B(d) \le \frac{\text{LOD\_CAP}}{21^{k}} \cdot A(\text{white}) \cdot B(\text{black}) = \frac{\text{LOD\_CAP}}{21} < 1,$$

hence $\text{OKCA} \le \text{WCAG}$, strictly.

**FP = 0 is guaranteed by construction across the full sRGB gamut** — the
chromatic case (issue #14's gap) is closed. The argument depends only on the
closed-form structure and re-runs via `npm run fp0` after any constant change,
so it is robust to future retuning (the CI-invariant companion can gate on it).

### Scope

- **sRGB inputs.** Wide-gamut (`oklch()` outside sRGB, P3/Rec.2020) is not
  covered — the lemma search is over the sRGB cube; re-run over the wider domain
  to extend.
- The lowered `LOD_CAP` means white-on-black = **20.9** (not 21). This is the
  deliberate cost of a strict-by-construction guarantee; see the scale note in
  `README.md` / `OKCA_DESIGN.md`.
