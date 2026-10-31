# Colour-Vision Deficiency — Should Colourfulness Lower Contrast?

Research notes for [#26](https://github.com/pawn002/okca/issues/26). The CAM16
survey left one question open. CAM16 supports *where* OKCA's chroma penalty
applies, on the lighter element and mostly on dark backgrounds. It says nothing
about *whether* colourfulness should lower a contrast score. Dichromacy gives a
physiological route into that question, starting from red on black. This is
*analysis*. Running it changed no algorithm code.

Reproduce:

```
npm run cvd          # scripts/cvd-survey.ts
```

Simulation is Machado, Oliveira & Fernandes (2009), severity 1.0, applied to
linear sRGB. The "CVD ratio" is the WCAG ratio of the simulated pair, taking the
worst of protan, deutan and tritan. "OKCA" here is this branch's algorithm
(Step 4 induction, no flare ceiling).

---

## 1. Red on black

| Text on `#000000` | WCAG | Protan sees | Protan keeps | OKCA |
|---|---:|---:|---:|---:|
| `#ff0000` | 5.25 | 3.29 | 54% | 2.5 |
| `#ff3333` | 5.77 | 3.87 | 60% | 2.8 |
| `#ff5555` | 6.68 | 4.89 | 68% | 3.4 |
| `#ff7777` | 8.16 | 6.55 | 78% | 4.5 |
| `#ff9999` | 10.27 | 8.92 | 85% | 7.4 |
| `#ffbbbb` | 13.08 | 12.09 | 92% | 11.8 |
| `#888888` | 5.92 | 5.92 | 100% | 5.2 |

- **WCAG passes pure red on black at AA.** A protan sees 3.29, which fails.
- **Within the red family, what a protan keeps tracks saturation almost
  perfectly**, from 54% for pure red to 92% for a pale pink (correlation with
  chroma −0.97). For reds, colourfulness is a direct proxy for lost luminance
  contrast.
- **OKCA already scores every red here below what a protan sees.**

---

## 2. Around the hue circle

Colours with Oklab chroma of at least 0.12. "Kept" is the share of contrast
above 1:1 that the worst-case dichromat retains.

**Light text on black:**

| Hue | Median kept | Worst | Tracks chroma? | Worst type | OKCA / WCAG | CVD / WCAG |
|---|---:|---:|---:|---|---:|---:|
| red | 74% | 55% | −0.97 | protan | 0.46 | 0.79 |
| orange | 84% | 72% | −0.91 | protan | 0.54 | 0.86 |
| yellow | 95% | 89% | −0.57 | protan | 0.66 | 0.96 |
| green | 96% | 93% | −0.66 | deutan | 0.57 | 0.96 |
| cyan | 93% | 91% | −0.89 | deutan | 0.66 | 0.93 |
| blue | 93% | 89% | −0.21 | deutan | 0.43 | 0.95 |
| purple | 98% | 89% | 0.12 | protan | 0.44 | 0.98 |
| magenta | 84% | 61% | −0.84 | protan | 0.49 | 0.87 |

**Dark text on white:**

| Hue | Median kept | Worst | Tracks chroma? | Worst type | OKCA / WCAG | CVD / WCAG |
|---|---:|---:|---:|---|---:|---:|
| red | 84% | 75% | −1.00 | deutan | 0.75 | 0.87 |
| orange | 88% | 83% | −0.97 | deutan | 0.77 | 0.91 |
| yellow | 97% | 92% | −0.63 | deutan | 0.81 | 0.98 |
| green | 93% | 87% | −0.64 | protan | 0.86 | 0.95 |
| blue | 86% | 61% | −0.92 | protan | 0.79 | 0.89 |
| purple | 94% | 68% | −0.78 | tritan | 0.75 | 0.95 |
| magenta | 88% | 76% | −0.89 | deutan | 0.74 | 0.91 |

**Readings.**

1. **Colourfulness does cost contrast, but by hue.** The loss is large for hues
   that lean on the long-wavelength cones (red, orange, magenta, mostly to
   protans) and small for green, blue and purple. A hue-uniform penalty cannot
   express that.
2. **On dark backgrounds, OKCA is already CVD-safe.** OKCA / WCAG sits below
   CVD / WCAG at every hue.
3. **But the penalty is mostly not CVD.** Blue and purple are penalised as hard
   as red (OKCA / WCAG about 0.44) though dichromats keep 95–98% of their
   contrast there. Even for red, OKCA cuts about twice what protans lose.
4. **Dark text on light backgrounds loses contrast too, and OKCA has no term for
   it.** The chroma penalty applies only to the lighter element. Saturated blue
   text on white keeps as little as 61% for protans.

**Context from reading research.** Legge, Parish, Luebker & Wurm (1990),
"Psychophysics of reading. XI. Comparing color contrast and luminance contrast,"
*JOSA A* 7(10), 2002–2010
([PDF](https://legge.dl8.umn.edu/sites/legge.psych.umn.edu/files/files/media/legge90_psychophysics_of_reading._xi._comparing_luminance_and_color_contrast.pdf)).
Colour and luminance contrast did not add: reading speed followed whichever was
stronger. Low-vision readers did better with luminance contrast. Knoblauch,
Arditi & Szlyk (1991), *JOSA A* 8(2), 428–439, is cited for a similar result;
it was seen secondhand only. Neither suggests saturated colours of equal
luminance are *less* legible to normal vision. CVD is the measurable mechanism
by which colourfulness lowers contrast.

---

## 3. A dichromat inside Oklab

Dichromacy simulation projects one cone channel onto the other two. Oklab's
first stage is itself an LMS-like space, so the projection can be made there,
before the cube root. Each lost channel is replaced by the plane through black,
white and the blue primary (protan, deutan) or red primary (tritan). Anchoring
on yellow or green gives the same planes, since yellow is white minus blue in
linear light, so there is nothing to tune.

Against Machado, light text on black (log-ratio error):

| Deficiency | Mean error | Worst | Bias on reds |
|---|---:|---:|---:|
| protan | 0.069 | 0.447 | +0.15 |
| deutan | 0.079 | 0.318 | +0.12 |
| tritan | 0.033 | 0.195 | +0.05 |

**Rejected as a safety term.** The average error is close to what OKCA already
carries between $L^3$ and WCAG luminance (about 0.036). But the error is
largest, and generous, exactly where it matters: on saturated reds. For
`#ee092f` on black it predicts 4.77 where Machado gives 3.05. Oklab's LMS
matrix was optimised for perceptual uniformity, so its first channel is not the
physiological L cone, and removing it does not remove what a protan loses. The
working form below simulates with Machado's matrices and takes OKLab $L$ of the
result. That is a fixed linear step on linear sRGB, like Oklab's own first
matrix, and the output stays in OKLab lightness.

---

## 4. Scoring with dichromat lightness

Variants of this branch's Steps 1–5. "CVD lighter" uses the smallest of the
normal and three dichromat OKLab lightnesses for the lighter element, in place
of the chroma penalty. "CVD darker" uses the largest for the darker element.
The counts are on a 262,144-pair sRGB grid, against the current branch.

| Variant | Above WCAG | Above the CVD ratio | AA a CVD viewer fails | Raised | AA gained | AA lost |
|---|---:|---:|---:|---:|---:|---:|
| current | 0 | 243 | 11 | — | — | — |
| **current + CVD darker** | 0 | **0** | **0** | **0** | 0 | 1,819 |
| CVD both (replaces chroma) | 0 | 0 | 0 | 126,137 | 4,951 | 727 |
| CVD lighter only | 0 | 816 | 67 | 155,874 | 7,404 | 25 |
| Oklab-native CVD lighter | 0 | 8,906 | 203 | 153,420 | 5,132 | 56 |

| Pair | WCAG | CVD | current | + CVD darker | CVD both |
|---|---:|---:|---:|---:|---:|
| `#ff69b4` on `#1a1a1a` | 6.6 | 5.3 | 3.0 | 3.0 | 3.8 |
| `#ff0000` on `#000000` | 5.3 | 3.3 | 2.5 | 2.5 | 2.7 |
| `#3b82f6` on `#000000` | 5.7 | 5.3 | 2.4 | 2.4 | 4.6 |
| `#0000ff` on `#dddddd` | 6.3 | 4.0 | 4.5 | 3.0 | 3.0 |
| `#1d4ed8` on `#ffffff` | 6.7 | 5.4 | 5.3 | 4.3 | 4.3 |
| `#ffffff` on `#767676` | 4.5 | 4.5 | 3.9 | 3.9 | 3.9 |

**Two candidates.**

- **Add CVD to the darker element (keep the chroma penalty).** It closes every
  gap between OKCA and what a dichromat sees, and it only ever lowers scores. It
  has the same structure as Step 4's induction: it raises the darker proxy, so
  FP=0 holds by the same argument. Achromatic colours are unaffected, so the
  anchors are exact. Cost: 1,819 grid pairs lose AA, mostly saturated dark text
  on light backgrounds.
- **Replace the chroma penalty with CVD on both elements.** This is the
  evidence-based form of "colourfulness lowers contrast". It is CVD-safe
  everywhere and hue-dependent through physiology, not a hue branch. But it
  raises 126,137 pairs and newly passes 4,951 at AA: blue on black goes from 2.4
  to 4.6, and hot pink from 3.0 to 3.8. It would give up most of OKCA's
  saturated-colour strictness, and replacing lemma A's proxy would need a fresh
  interval proof.

Both are decisions, not findings. Neither is applied.

**Limits.**

- Severity 1.0 models dichromacy. Anomalous trichromacy, the more common form,
  loses less.
- Machado's matrices are a model, and the authors do not state the input
  encoding. Linear sRGB is the physically consistent choice.
- Grid sampling found no false passes against WCAG for any variant. That is not
  a proof.
