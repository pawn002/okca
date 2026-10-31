# CAM16 — What Oklab Abstracts

Research notes. The question: which viewing-condition factors does Oklab fix,
and which can OKCA pull back out using only OKLab/OKLCH coordinates? This is
*analysis*. Running it changed no algorithm code.

Reproduce:

```
npm run cam16        # scripts/cam16-survey.ts
```

---

## 1. Why CAM16

Oklab is a **fixed-condition** space. It assumes one white, one adaptation
state, one background, one surround and no absolute luminance. CAM16 (Li et
al. 2017, *Color Research & Application* 42:703–718; adopted by the CIE in
CIE 248:2022) takes each of those as an **input**:

| CAM16 input | Meaning | Visible to OKCA? |
|---|---|---|
| $Y_b$ | Relative luminance of the background next to the stimulus | **Yes.** The background is one of OKCA's two inputs |
| $L_A$ | Absolute luminance of the adapting field, in cd/m² | No. sRGB values carry no absolute level |
| Surround | Light outside the display: average, dim or dark | No. The room is not an input |
| White point and degree of adaptation | Chromatic adaptation | Fixed by sRGB (D65). Not relevant to OKCA |

Varying one input at a time shows what Oklab averages away. Factors OKCA can
observe are candidates to pull back out. The others can at most set margins,
which is the role Step 6 plays for flare.

CAM16 is reimplemented in `scripts/cam16-survey.ts` from the published
equations. It matches colorjs.io's `cam16-jmh` at that library's default
conditions to within 0.004 in both $J$ and $M$ over 2,000 colours. The model's
background-induction terms diverge as $Y_b \to 0$, so $Y_b$ is clamped at 1
(of 100). `#1a1a1a` has $Y_b = 1.0$, so near-black backgrounds sit at that
clamp.

---

## 2. The background sets the lightness scale (observable)

For greys, CAM16 lightness is very nearly a power of OKLab $L$, and the power
depends on the background. Fitting $J/100 = L^{\gamma}$ separately on each
background:

| Background | $Y_b$ | $\gamma$ | Fit RMS ($J$ units) |
|---|---:|---:|---:|
| `#000000` | 0.0 (clamped to 1) | 1.359 | 0.12 |
| `#1a1a1a` | 1.0 | 1.360 | 0.12 |
| `#333333` | 3.3 | 1.429 | 0.13 |
| `#555555` | 9.1 | 1.532 | 0.13 |
| `#777777` | 18.4 | 1.642 | 0.14 |
| `#999999` | 31.9 | 1.758 | 0.14 |
| `#bbbbbb` | 49.7 | 1.879 | 0.14 |
| `#dddddd` | 72.3 | 2.004 | 0.15 |
| `#ffffff` | 100.0 | 2.133 | 0.15 |

The fit is within about 0.15 $J$ on every background, so this is close to
exact. The exponent follows from CAM16's structure. Its cone compression is
roughly a $0.42$ power of luminance, lightness is $J = 100\thinspace(A/A_w)^{cz}$,
and $z = 1.48 + \sqrt{Y_b}$. With $Y = L^3$ and $Y_b = L_{\text{bg}}^3$:

$$
\gamma \approx 3 \times 0.42 \times c \times \left(1.48 + L_{\text{bg}}^{1.5}\right)
$$

with $c = 0.69$ for an average surround. That gives 2.15 on white and 1.55 on
`#555555`, against fitted values of 2.133 and 1.532. A linear fit over
background lightness is also close: $\gamma \approx 1.22 + 0.83 \thinspace L_{\text{bg}}$,
maximum residual 0.14.

**What this means.** CAM16 treats the background as setting the lightness
scale. Oklab's own $L$ corresponds to a single mid-grey background. This is
the classic background (crispening) effect, and it can be **written entirely
in OKLab coordinates**: an effective lightness $L^{\gamma(L_{\text{bg}})}$
where both $L$ and $L_{\text{bg}}$ are OKLab values.

---

## 3. What CAM16 says about OKCA's threshold

For each grey background, take the grey that first scores 4.5, and measure the
CAM16-UCS lightness gap $\Delta J'$. Do it twice: once with CAM16's default
$Y_b = 20$, which is in effect Oklab's fixed condition, and once with the real
background as $Y_b$.

| Background | 2.0.3 pass | $\Delta J'$, $Y_b = 20$ | $\Delta J'$, real $Y_b$ | 3.x pass | $\Delta J'$, $Y_b = 20$ | $\Delta J'$, real $Y_b$ |
|---|---|---:|---:|---|---:|---:|
| `#000000` | `#7e7e7e` | 55.4 | 62.3 | `#949494` | 64.1 | 70.0 |
| `#121212` | `#878787` | 49.4 | 49.9 | `#999999` | 56.4 | 56.0 |
| `#1a1a1a` | `#8c8c8c` | 48.2 | 47.6 | `#9d9d9d` | 54.7 | 53.3 |
| `#222222` | `#939393` | 47.6 | 46.3 | `#a1a1a1` | 52.9 | 50.9 |
| `#333333` | `#a6a6a6` | 47.5 | 45.1 | `#aeaeae` | 50.4 | 47.7 |
| `#444444` | `#bdbdbd` | 48.3 | 45.6 | `#bfbfbf` | 49.0 | 46.3 |
| `#c8c8c8` | `#494949` | 49.9 | 53.6 | `#494949` | 49.9 | 53.6 |
| `#e6e6e6` | `#5c5c5c` | 51.3 | 58.5 | `#5c5c5c` | 51.3 | 58.5 |
| `#ffffff` | `#6a6a6a` | 52.8 | 63.4 | `#6a6a6a` | 52.8 | 63.4 |

Three readings:

1. **Background-aware CAM16 widens the gap Step 6 was built for.** At the
   fixed condition, a just-passing grey on `#1a1a1a` is 9% short of the white
   pass (48.2 against 52.8). With the real background it is 25% short (47.6
   against 63.4). The direction of Step 6 now has support from a CIE colour
   appearance model as well as from flare.
2. **Step 6 closes it only at the near-black end.** After Step 6, `#1a1a1a`
   passes at 53.3, and pure black overshoots to 70.0. Mid-dark grounds
   (`#222222`–`#444444`) still sit at 46–51 against 63.4 on white. CAM16 sees
   the leniency as a **slope across background lightness**, steepest from
   about `#222222` to `#444444`. The flare term, which acts through the
   near-zero denominator, sees it only at the bottom.
3. **Light grounds slope too, more gently.** Passes on `#c8c8c8` carry 53.6
   against 63.4 on white. White is where OKCA is strictest in lightness-gap
   terms.

Pure black is a special case. Its $J$ is 0, and its $Y_b$ sits at the clamp,
so its row is the least trustworthy in the table.

---

## 4. Absolute luminance and surround (not observable)

Brightness $Q$ is scaled by the background's induction factor, so $Q$ gaps
are compared only within one background. For each background, the brightness
gap of its 2.0.3 just-passing pair, relative to a 250 cd/m² white in an
average surround:

| Pair | 80 cd/m² | 500 cd/m² | Dim surround | Dark surround |
|---|---:|---:|---:|---:|
| `#7e7e7e` on `#000000` | 0.79 | 1.16 | 1.23 | 1.43 |
| `#8c8c8c` on `#1a1a1a` | 0.79 | 1.16 | 1.09 | 1.16 |
| `#a6a6a6` on `#333333` | 0.79 | 1.16 | 1.07 | 1.12 |
| `#6a6a6a` on `#ffffff` | 0.80 | 1.15 | 1.04 | 1.08 |
| `#494949` on `#c8c8c8` | 0.80 | 1.15 | 1.07 | 1.12 |

- **Absolute luminance scales every background identically** (0.79 at
  80 cd/m², 1.16 at 500). In CAM16 it is not a dark-mode factor. This agrees
  with [`OKCA_DESIGN.md`](OKCA_DESIGN.md) §10, where a level-dependent term
  was measured for and not detected. It also means CAM16's luminance-level
  terms give no basis for Step 6. Flare (§6 of
  [`MIDTONE_SURVEY_FINDINGS.md`](MIDTONE_SURVEY_FINDINGS.md)) remains its
  basis.
- **Surround** matters little except against pure black, the clamped case.
  It is also unobservable.

---

## 5. Chromatic factors

**Lightness of saturated colours.** CAM16 $J$ for colours with Oklab chroma of
at least 0.12, minus $J$ of the grey at the same OKLab $L$, at $Y_b = 20$:

| Hue band | $n$ | Median $\Delta J$ |
|---|---:|---:|
| red | 379 | −0.2 |
| orange/yellow | 257 | −0.1 |
| green | 867 | +0.1 |
| cyan | 136 | +0.1 |
| blue | 484 | −0.7 |
| purple/magenta | 689 | −0.5 |

CAM16 and Oklab agree on the lightness of saturated colours to within one $J$.
Neither models the Helmholtz–Kohlrausch effect, in which saturated colours look
brighter than greys of equal luminance. So CAM16 offers **no basis, for or
against, Step 3's chroma penalty** as a lightness correction. If that penalty
needs a scientific basis, it has to come from legibility research, not from
appearance models.

**Colourfulness per unit Oklab chroma, by hue** ($M/C$, $Y_b = 20$, chroma at
least 0.12):

| Hue band | red | orange/yellow | green | cyan | blue | purple/magenta |
|---|---:|---:|---:|---:|---:|---:|
| Median $M/C$ | 292 | 255 | 268 | 281 | 234 | 253 |

At equal Oklab chroma, CAM16 sees blues as about 20% less colourful than reds.
This comes from CAM16's eccentricity factor. It is observable, but using it
would make OKCA's chroma penalty depend on hue, which the design has ruled out
(§2.4 and §10 of the design doc). Recorded, not recommended.

**Colourfulness depends on the background.** Colourfulness $M$ of a fixed
foreground, with the real background as $Y_b$:

| Foreground | on `#000000` | on `#1a1a1a` | on `#777777` | on `#ffffff` | Black / white |
|---|---:|---:|---:|---:|---:|
| `#ff69b4` | 75.6 | 75.2 | 51.7 | 49.7 | 1.52 |
| `#ff8c00` | 68.4 | 68.0 | 46.9 | 45.4 | 1.51 |
| `#3b82f6` | 69.5 | 69.1 | 46.4 | 42.9 | 1.62 |
| `#22c55e` | 75.1 | 74.7 | 51.3 | 49.3 | 1.53 |

CAM16 sees the same foreground as about 1.5 times as colourful on black as on
white. Step 3 already acts only on the lighter element, and on a dark
background the lighter element is the coloured text, so in practice Step 3
already applies mostly on dark grounds. CAM16 supports *where* it applies. It
does not settle whether more colourfulness should lower a contrast score.

---

## 6. Summary: factors and how to pull them out

| Factor Oklab fixes | Observable from the pair? | CAM16 finding | OKLab/OKLCH expression |
|---|---|---|---|
| Background luminance, as lightness | **Yes** | Exponent from about 1.36 (near-black) to 2.13 (white); at OKCA's threshold, darker grounds carry less lightness gap | $L^{\gamma(L_{\text{bg}})}$, with $\gamma \approx 1.26 \thinspace c \thinspace (1.48 + L_{\text{bg}}^{1.5})$ |
| Background luminance, as colourfulness | **Yes** | About 1.5 times on black versus white | Chroma weight as a function of $L_{\text{bg}}$ |
| Hue (eccentricity) | Yes | Blue about 20% below red per unit $C$ | Hue weight on $C$. Conflicts with OKCA's hue-blind design |
| Absolute luminance | No | Scales all backgrounds equally | None needed |
| Surround | No | Small, except at pure black | None |
| Helmholtz–Kohlrausch | Yes | Not in CAM16 | Out of scope |

**The candidate worth prototyping is the first row.** A background-dependent
lightness exponent is:

- **ok\*-native.** It uses only OKLab $L$ for both colours.
- **From a CIE-adopted model.** It is derived from CAM16, not fitted to OKCA's
  outputs.
- **A single term.** It addresses the cohesion concern raised about Step 6.

It could replace the flare ceiling, or sit beside it, since flare and
background induction are separate physical effects. It would also cover the
mid-dark grounds Step 6 leaves alone.

Before it could be adopted it needs the same work Step 6 had: a mapping from
lightness gap into OKCA's ratio scale, the four anchors held, and an FP=0
argument. Unlike Step 6, it would change scores on light grounds too, so the
97 disagreements would move.

**Caveats.**

- CAM16 describes the appearance of uniform patches, not the legibility of
  text. $\Delta J'$ is a lightness-gap measure, not a contrast threshold.
- $Y_b$ is defined as the background around a stimulus. For text, the
  background colour is the right reading, but the rest of a UI also
  contributes in practice.
- The model is fitted mostly to data near $Y_b = 20$. Its behaviour below
  $Y_b \approx 1$ is extrapolation, hence the clamp.
