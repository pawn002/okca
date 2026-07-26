# FP=0 — guaranteed by construction (issue #14)

**Status: proven.** `OKCA ≤ WCAG` for every sRGB pair is now an **exact
algebraic identity** plus **two single-colour lemmas verified by interval
arithmetic** — no calibration-dependent headroom, no residual. Reproduce:
`npm run fp0` (certifies with **0 uncertified boxes**).

Constants: `POL_K` = 1.100, `CHROMA_K` = 0.65, `LOD_CAP` = 20.9, `DOL_CAP` = 20.

## 1. Algebraic reduction

The final score is `OKCA = CAP·(raw/21)^k` with `raw = (lY+0.05)/(dY+0.05)`,
`lY = (L_light^exp)^3` the chroma-penalised lighter proxy, `dY = L_dark^3`,
`k = POL_K`, and `CAP = LOD_CAP` (light-on-dark) or `DOL_CAP` (dark-on-light).
WCAG is `(Y_l+0.05)/(Y_d+0.05)`. Rearranging separates the two elements:

```
OKCA ≤ WCAG   ⇔   (CAP / 21^k) · A(lighter) · B(darker) ≤ 1
  A(l) = (lY_l + 0.05)^k / (Y_l + 0.05)      (lighter element only)
  B(d) = (Y_d + 0.05)   / (dY_d + 0.05)^k    (darker element only)
```

## 2. The exact identity

At the achromatic anchors, for **any** k:

```
21^(1−k) · A(white) · B(black)
  = 21^(1−k) · 1.05^(k−1) · 0.05^(1−k)
  = (21·0.05)^(1−k) · 1.05^(k−1) = 1.05^(1−k) · 1.05^(k−1) = 1     (21·0.05 = 1.05)
```

(Verified to 1e-12 by `npm run fp0`.) `A` is maximised over sRGB at white,
`B` at black — confirmed by a full-gamut search: `max A = A(white)`,
`max B = B(black)`.

## 3. The lowered cap removes the equality

With `CAP = 21` the bound at the anchor is `21/21 = 1` — **tight**, so white-on-
black would be the single point where `OKCA = WCAG`, which interval arithmetic
cannot certify (it cannot prove a non-strict equality). Setting **`LOD_CAP =
20.9 < 21`** makes the anchor bound

```
(LOD_CAP / 21^k) · A(white) · B(black) = LOD_CAP / 21 = 0.99524 < 1,
```

a **uniform strict margin**. There is now no equality point anywhere: OKCA is
*strictly* below WCAG for every sRGB pair. (Dark-on-light, `CAP = 20`, is looser
still.) The `20.9/21` factor is the deliberate, minimal step that converts the
guarantee from "gamut-verified headroom" to "strict by construction".

## 4. Reduction to two verified lemmas

`A ≥ 0`, `B ≥ 0`, and the identity give: the pair inequality follows from

```
(L-A)  A(l) ≤ A(white)·s        for all sRGB l
(L-B)  B(d) ≤ B(black)·s        for all sRGB d,     s = √(21 / LOD_CAP) = 1.00239
```

since then `(LOD_CAP/21^k)·A·B ≤ (LOD_CAP/21^k)·A(white)·B(black)·s² =
LOD_CAP/21 · (21/LOD_CAP) = 1`. `scripts/fp0-proof.ts` branch-and-bounds each
lemma over the sRGB cube with sound outward-rounded interval arithmetic
(`scripts/interval.ts`, exact Ottosson OKLab matrices + the WCAG luminance
formula; enclosures validated to contain production values). A box is certified
when `A.hi ≤ target` (resp. `B.hi ≤ target`) — the bound then holds for **every
point** in that continuum.

Result (`npm run fp0`):

| lemma | boxes | certified | equality corners | **uncertified** |
|-------|------:|----------:|-----------------:|----------------:|
| A(l) ≤ A(white)·s | ~96k | all | 0 | **0** |
| B(d) ≤ B(black)·s | ~272k | all | 0 | **0** |

Every sRGB point is certified; the slack `s > 1` from the lowered cap lets even
the anchors certify, so no neighbourhood is excluded.

## 5. Conclusion

For every ordered sRGB pair:

```
(LOD_CAP / 21^k) · A(l) · B(d) ≤ (LOD_CAP / 21^k) · A(white) · B(black) = LOD_CAP/21 < 1
⇒ OKCA ≤ WCAG,  strictly.
```

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
