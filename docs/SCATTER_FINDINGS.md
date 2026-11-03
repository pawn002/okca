# Intraocular Scatter and Polarity — Exploration Findings

> **Research record** for [#34](https://github.com/pawn002/okca/issues/34),
> November 2026. Outcome: the default observer is kept, and the veil is implemented as an
> experimental opt-in scatter observer for release candidates. Figures
> describe OKCA as it stood then and are not kept current. Current algorithm:
> [`OKCA_DESIGN.md`](OKCA_DESIGN.md). How this work fits the project's path:
> [`HISTORY.md`](HISTORY.md).

Reproduce:

```
npm run scatter      # scripts/scatter-prototype.ts
```

---

## 1. The question

OKCA scores the two arrangements of a pair differently only through Step 4's
background induction, taken from CAM16, a model of a typical observer. It makes
a dark background cost contrast. An eye that scatters light inside it should do
the opposite: a bright background spreads a veil of light over dark text.
WCAG's 4.5:1 is calculated for 20/40 acuity, which WCAG calls typical at about
age 80, when lens scatter is common. Should OKCA's polarity follow that eye?

---

## 2. Evidence from reading studies

- **Typical readers** proofread better with dark text on a light background
  (Buchner & Baumgartner, 2007; Piepenbrock, Mayr & Buchner, 2014a). One
  proposed mechanism is pupil size: a bright background constricts the pupil,
  which sharpens the image (Piepenbrock, Mayr & Buchner, 2014b).
- **Older adults.** Piepenbrock, Mayr, Mund & Buchner (2013) tested exactly
  this hypothesis: that lens and vitreous scatter in older eyes might reverse
  the advantage. It did not. Dark-on-light was better for both age groups, and
  the authors recommend it for all ages. The age ranges and sample sizes were
  not checked for this note.
- **Cloudy ocular media.** Rubin & Legge (1989), *Vision Research* 29(1),
  79–91: of 19 low-vision readers, five read white-on-black faster at both
  high and low contrast, and four of the five had cloudy ocular media. The
  authors attribute the effect to light scatter in the eye.

The reversal is documented for eyes with media opacity, not for normal ageing.

---

## 3. Size of the veil

Veil size uses the age-adjusted Stiles–Holladay equation, valid from 1° to 30°:

$$
\frac{L_{\text{veil}}}{E_{\text{glare}}} = \frac{s}{\theta^{2}}, \qquad s = 10\left(1 + \left(\frac{A}{70}\right)^{4}\right)
$$

with $A$ the observer's age and $\theta$ in degrees. Integrated over a uniform
background from $\theta_1$ to $\theta_2$ around the text, the veil is a fixed
fraction $k$ of the background's luminance:

$$
k = s \cdot 2\pi \left(\frac{\pi}{180}\right)^{2} \ln\frac{\theta_2}{\theta_1}
$$

Light from closer than $1°$ is treated as blur, which acuity covers, not as
veil. The outer limit is the edge of the display.

| Eye | $s$ | $k$, 1–20° | $k$, 1–10° |
|---|---:|---:|---:|
| age 25 | 10.2 | 0.058 | 0.045 |
| age 60 | 15.4 | 0.088 | 0.068 |
| age 80 | 27.1 | 0.155 | 0.119 |
| cataract (assumed $s = 60$) | 60.0 | 0.344 | 0.264 |

For a young eye the veil is close to WCAG's own flare allowance of 0.05, but
it scales with the background instead of being fixed.

---

## 4. What the veil does to the ratio

The veil $k \cdot Y_{\text{bg}}$ is added to both patches of the WCAG ratio.
Light-on-dark / dark-on-light, against OKCA:

| Pair | WCAG | age 25 | age 80 | cataract | OKCA |
|---|---:|---:|---:|---:|---:|
| `#ffffff` / `#767676` | 4.54 | 4.39 / 3.83 | 4.16 / 3.12 | 3.79 / 2.42 | 3.9 / 3.9 |
| `#ffffff` / `#595959` | 7.00 | 6.78 / 5.32 | 6.44 / 3.95 | 5.88 / 2.82 | 5.7 / 6.2 |
| `#cccccc` / `#333333` | 7.87 | 7.71 / 5.82 | 7.47 / 4.23 | 7.04 / 2.96 | 5.7 / 7.0 |
| `#ffffff` / `#000000` | 21.00 | 21.00 / 10.24 | 21.00 / 5.87 | 21.00 / 3.54 | 20.9 / 20.9 |

---

## 5. Readings

1. **The optics favour light-on-dark for every eye.** Even at age 25 the veil
   makes dark-on-light the lower ratio for every pair, and the gap grows with
   age and cataract.
2. **The reading evidence does not.** Typical and older readers still read
   dark-on-light better, so something outweighs scatter for them; pupil size is
   the proposed candidate. A veil term on its own would predict the opposite of
   what those readers do.
3. **The ratio scale exaggerates the veil.** Black on white falls to 5.9 for
   an age-80 eye, though its Weber contrast stays above 80%. WCAG's ratio is
   dominated by the darker patch, so any veil on that patch reads as a large
   loss. A veil term in the ratio would push high-contrast dark-on-light pairs
   far down for no reading benefit.
4. **Only media opacity reverses the behaviour.** That is a minority of the
   readers WCAG's threshold targets, and the eye that most needs a different
   answer.

**Likely direction.** Keep OKCA's default polarity direction, and ground it in
the reading evidence for older adults (Piepenbrock et al., 2013) as well as in
CAM16. The 80-year-old reader WCAG's threshold assumes is the population that
study tested. Treat eyes with media opacity as the documented exception. A
separate scoring mode for them is possible, but it first needs a way to apply a
veil that does not collapse high-contrast dark-on-light pairs on the ratio
scale.

**Open before adopting:**

- the ages and sample sizes in Piepenbrock et al. (2013), and how near 80 the
  older group was;
- the cataract value of $s$, which is assumed here;
- the geometry: the inner limit of $1°$ and the display edge.

---

## 6. The two dials

Reproduce: `npm run scatter-dials` (`scripts/scatter-dials.ts`).

The eye's age (through $s$) and the field of background that veils the text
($\theta_1$ to $\theta_2$) act only through the veil fraction $k$. Sweeping $k$
from the default ($k = 0$) to the shipped observer ($k = 0.155$), over grid
pairs where either direction reaches 3.0:

| $k$ | D-o-L higher | tie | L-o-D higher | white / `#767676` | `#767676` / white | black / white | Disagreements | AA lost vs default |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 95% | 5% | 0% | 3.9 | 3.9 | 20.9 | 107 | 0 |
| 0.02 | 88% | 7% | 5% | 3.8 | 3.6 | 14.7 | 118 | 1,427 |
| 0.03 | 72% | 14% | 14% | 3.8 | 3.5 | 12.9 | 122 | 2,184 |
| 0.04 | 45% | 21% | 34% | 3.8 | 3.4 | 11.4 | 130 | 2,898 |
| 0.05 | 24% | 17% | 59% | 3.8 | 3.3 | 10.3 | 135 | 3,606 |
| 0.06 | 12% | 11% | 77% | 3.7 | 3.2 | 9.3 | 152 | 4,333 |
| 0.08 | 1% | 4% | 95% | 3.7 | 3.0 | 7.9 | 172 | 5,711 |
| 0.155 | 0% | 0% | 100% | 3.5 | 2.6 | 5.2 | 247 | 9,053 |

Dial settings that give each $k$:

| $k$ | age, field 1°–20° | age, 1°–10° | age, 2°–10° | field at age 80 |
|---:|---:|---:|---:|---|
| 0.04 | below a young eye | below a young eye | 52 | 1°–2.2° |
| 0.05 | below a young eye | 42 | 62 | 1°–2.6° |
| 0.06 | 32 | 54 | 69 | 1°–3.2° |
| 0.08 | 56 | 67 | 79 | 1°–4.7° |
| 0.155 | 80 | 88 | 99 | 1°–20° |

**Readings.**

1. **Polarity tips over a narrow band.** Between $k = 0.02$ and $0.08$ the
   majority swings from dark-on-light (88%) to light-on-dark (95%). The two
   arrangements are balanced near $k pprox 0.044$.
2. **No realistic eye reproduces the default.** The default's behaviour, which
   matches the reading studies, needs $k \le 0.02$. Even a young eye gives
   $0.058$ over a 1°–20° field. Whatever outweighs scatter for typical readers,
   such as pupil size, acts like a negative veil that the model does not have.
3. **The field is the uncertain dial.** An 80-year-old eye reaches the balance
   point if only the background within about 2° of the text veils it, and the
   shipped value if the whole display does. No source here pins the effective
   field for reading.
4. **Every setting costs dark-on-light passes.** The veil only lowers scores,
   so even the balance point loses 2,898 grid AA verdicts.

