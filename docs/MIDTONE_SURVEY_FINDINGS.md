# Mid-tone on Near-Black — Survey Findings

Research notes on whether OKCA scores mid-tone foregrounds on near-black
backgrounds too permissively. Section 5's candidate has since been **applied**
as Step 6 of the algorithm ([`OKCA_DESIGN.md`](OKCA_DESIGN.md) §7). The
decisions in §5 were taken as recommended: both polarities, $F = 0.10$, and a
major version.

> **Snapshot.** §2–§3 describe OKCA *before* Step 6, at `POL_K` $= 1.100$,
> `CHROMA_K` $= 0.65$, `LOD_CAP` $= 20.9$, `DOL_CAP` $= 20$, `C_THRESH`
> $= 0.15$. `npm run midtone` reimplements that version locally and prints it
> beside the live `contrast()`, so both columns reproduce.

Reproduce:

```
npm run midtone      # scripts/midtone-survey.ts
```

---

## 1. Method

OKCA cannot be its own judge, so each pair was also scored by yardsticks that
share none of its machinery:

| Yardstick | What it measures |
|---|---|
| CIEDE2000 | Colour difference (Sharma, Wu & Dalal 2005), CIELAB D65 |
| CIELAB lightness difference | Lightness gap. CIELAB has a linear segment near black, where Oklab's cube root is steepest |
| Colour-vision-deficiency simulation | Machado, Oliveira & Fernandes (2009), severity 1.0, protan, deutan and tritan, in linear sRGB. Worst case of CIEDE2000 and WCAG ratio across the three |
| Flare robustness | The WCAG ratio recomputed with a flare term of $0.10$ in place of $0.05$: how much contrast survives a brighter room |

**Pairs.** Two sets:

- **Grid.** Every colour on a 16-step sRGB cube (4,096 colours) on fifteen
  neutral backgrounds, from `#000000` to `#555555` and from `#bbbbbb` to
  `#ffffff`. Pairs below WCAG 2 are dropped, leaving 44,942.
- **Design systems.** The Tailwind, GOV.UK and USWDS palettes from
  `scripts/palettes.ts`, used as light text on nine real dark surfaces (black,
  `#121212`, `#1a1a1a`, Tailwind slate/gray/zinc-900, GOV.UK black, USWDS
  red-90 and gray-90). That gives 4,938 light-on-dark pairs.

The comparison that matters is **pairs at the same OKCA score**. If two
just-passing pairs score the same, the yardsticks should rate them about the
same whatever the background. A gap shows where OKCA's scale is uneven.

---

## 2. Colour difference and CVD do not find the problem

Medians for pairs scoring 4.5–5.4 (just passing AA):

| Foreground | Background | $n$ | CIEDE2000 | worst-CVD CIEDE2000 |
|---|---|---:|---:|---:|
| low chroma | near-black | 132 | 48.4 | 45.4 |
| low chroma | near-white | 92 | 47.2 | 43.9 |
| chromatic | near-black | 877 | 62.2 | 57.4 |
| chromatic | near-white | 695 | 53.9 | 46.6 |

By colour difference, near-black passes are **as well separated or better
separated** than near-white passes at the same score.

The CVD check finds no near-black problem either. Of 5,871 OKCA AA passes on
near-black backgrounds, **none** fall below WCAG 4.5 under any of the three
simulations. The CVD exposure that does exist is on *light* backgrounds:
41 passes, almost all saturated blue text (hue about 265°), which the protan
simulation lightens.

Chromatic mid-tones on near-black are **not** where OKCA is lenient. The chroma
penalty already scores them at about 0.5–0.7 of WCAG. For example,
`#3b82f6` on `#111827` scores 2.0 where WCAG gives 4.8.

---

## 3. Where the problem is: grey and near-grey text, and flare

The leniency is achromatic. It shows up on the two yardsticks that look at
lightness near black.

**The grey that first reaches 4.5** on each background:

| Background | Grey at 4.5 | WCAG | CIELAB lightness difference | Ratio at flare 0.10 |
|---|---|---:|---:|---:|
| `#000000` | `#7e7e7e` | 5.17 | 52.8 | 3.09 |
| `#121212` | `#878787` | 5.21 | 50.9 | 3.23 |
| `#1a1a1a` | `#8c8c8c` | 5.18 | 49.0 | 3.28 |
| `#333333` | `#a6a6a6` | 5.19 | 46.9 | 3.62 |
| `#ffffff` | `#6a6a6a` | 5.41 | 55.2 | 4.51 |
| `#e6e6e6` | `#5c5c5c` | 5.36 | 52.2 | 4.31 |
| `#c8c8c8` | `#494949` | 5.38 | 49.6 | 4.07 |

Two patterns:

1. **Lightness.** A just-passing grey on `#1a1a1a` is 49 CIELAB units from
   its background. A just-passing grey on white is 55.
2. **Flare robustness.** This is the large one. Add the same modest amount
   of stray light to both pairs. The white-background pass keeps its AA
   verdict (4.51). The black-background pass drops to 3.09, barely above
   the 3.0 large-text floor.

**Mechanism.** A ratio of the form
$(Y_{\text{lighter}} + 0.05)/(Y_{\text{darker}} + 0.05)$ gets most of its value
on a near-black background from the near-zero denominator. That is the term
stray light erodes first. On a light background the ratio is carried by the
numerator, which stray light barely moves. OKCA inherits this from WCAG for
achromatic pairs, because $L^3 = Y$ on the neutral axis. The chroma penalty
masks it for saturated colours, but greys get no protection.

The design-system survey matches. Typical lenient passes are a USWDS gray-40
(`#919191`) on Material dark (`#121212`) at 5.2, or USWDS gray-cool-40
(`#8d9297`) on black at 5.9.

**Coverage gap.** The curated light-on-dark battery barely samples this
region. That is why it went unnoticed: only one of its 53 pairs moves under
Step 6 (§5).

---

## 4. Relationship to viewing conditions

[`OKCA_DESIGN.md`](OKCA_DESIGN.md) §10 says OKCA does not model viewing
conditions, and that its floors should be conservative because of that. This
finding is consistent with that position.

A flare term does not model a room. It is a property of the pair: how much of
the pair's contrast depends on its darkest patch staying dark. Two pairs at
the same score can carry very different margins against the same, unknown
room. The case for tightening dark-background greys is the same variance case
§10 already makes. It is not a claim that those pairs look a particular way.

---

## 5. The change: a flare-robustness ceiling (applied as Step 6)

**Form.** Re-run OKCA's own polarity curve on the uncompressed $L^3$ proxies
with a flare term $F$ in place of $0.05$. Re-anchor it so white on black keeps
its cap, and take the lower of that and the steps 1–5 score:

$$
\text{ceiling} = \text{CAP} \times \left( \frac{(L_{\text{lighter}}^3 + F)/(L_{\text{darker}}^3 + F)}{(1 + F)/F} \right)^{k_F},
\qquad
\text{score} = \min(\text{OKCA}, \text{ceiling})
$$

with $F = 0.10$ (twice WCAG's flare allowance) and $k_F = 1.5$.

**Why these values.**

- $k_F = 1.5$ is the **largest exponent that leaves every white-on-grey and
  grey-on-white pair untouched** (scoring 2 or above). The ceiling never binds
  on the light side. The upper limits at other flare values are 1.31 at
  $F = 0.075$ and 1.695 at $F = 0.125$.
- $F = 0.10$ is the value at which the **just-passing grey has the same flare
  robustness on every dark background**, about 3.95. It also brings the
  `#1a1a1a` lightness gap to 55.5, level with white's 55.2.

**Grey that first reaches 4.5, with Step 6:**

| Background | Grey at 4.5 | WCAG | CIELAB lightness difference | Ratio at flare 0.10 |
|---|---|---:|---:|---:|
| `#000000` | `#949494` | 6.92 | 61.3 | 3.96 |
| `#121212` | `#999999` | 6.58 | 57.8 | 3.95 |
| `#1a1a1a` | `#9d9d9d` | 6.42 | 55.5 | 3.96 |
| `#333333` | `#aeaeae` | 5.69 | 49.8 | 3.93 |
| `#ffffff` | `#6a6a6a` | 5.41 | 55.2 | 4.51 |

**Properties.**

- **FP = 0 is inherited.** The score is a minimum with the steps 1–5 score, so
  it cannot exceed it. [`FP0_PROOF.md`](FP0_PROOF.md) would need one added
  line, not a new lemma.
- **Anchors unchanged.** White/black stays 20.9/20.0 and white/`#767676`
  stays 3.9/3.7. The hot-pink and dark-orange catches stay at 3.6 and 4.2.
  The 97 WCAG disagreements are unchanged, because all of those pairs use a
  white partner.
- **Clean-room and hue-blind.** It uses only $L$, the same curve shape and a
  flare constant. No hue branch, no third-party constants.
- **Chromatic pairs almost untouched.** The ceiling uses the uncompressed
  proxy, so it rarely binds where the chroma penalty already has. On the
  grid, chromatic near-black AA passes go from 4,754 to 4,748.

**What it changes.**

| | Before Step 6 | With Step 6 |
|---|---:|---:|
| `#888888` on `#000000` | 5.2 | 3.7 |
| `#9f9f9f` on `#1a1a1a` | 5.8 | 4.7 |
| `#000000` on `#767676` | 3.8 | 2.6 |

Design-system palettes on the nine dark surfaces: 1,742 of 4,938 scores move.
Verdicts lost: **AA 45, AAA 52, large-text 3.0 69**. Of the 45 AA losses,
29 are achromatic foregrounds, 15 are low chroma, and 1 is chromatic. In
practice, dark-mode grey text moves up about one grade. For example, USWDS
gray-40 on `#121212` goes from 5.2 to 3.9.

**Decisions taken** (all as recommended):

1. **Polarity: both.** The ceiling also tightens *dark text on mid-tone fills*
   (black on `#767676`: 3.8 to 2.6), because the flare exposure is the same.
   Black, `#111111` and `#1a1a1a` text on the design-system fills loses AA in
   15 of 1,713 pairs.
2. **Strength:** $F = 0.10$. The half step at $F = 0.075$, which would have
   kept more dark-mode passes, was not taken.
3. **Release: major version (3.0.0).** Scores change for a large class of real
   dark-mode pairs.

Accepted side effect: black on light tints moves at the top of the scale
(black on `#add8e6`: 12.0 to 10.8). No verdict changes, but five curated
probe values moved.

---

## 6. Scientific basis for the flare term (notes, 2026-10-30)

Research notes, not yet worked into the design doc. Every citation below was
re-checked on 2026-10-31 by an independent pass with no access to this
investigation's reasoning. Corrections from that pass are worked in, and what
could not be read directly is listed at the end.

**The term is WCAG's own.** The `0.05` in the WCAG ratio is a flare term. The
working group stated its source in a 2007 response to public comments: "The .05
value used is based on Typical Viewing Flare from IEC/4WD 61966-2-1 and the sRGB
paper by M. Stokes et al." The same response cites ANSI/HFS 100-1988 as calling
for "the contribution from ambient light to be included in the calculation" of
the two luminances
([W3C, LC-1235](https://lists.w3.org/Archives/Public/public-comments-wcag20/2007May/0070.html)).
Step 6 therefore re-uses a mechanism already in the formula at a second level.
It does not add a new concept.

**Display metrology uses the same structure.** An *ambient contrast ratio* adds
reflected room light to both the white and the black before dividing.
[Daktronics](https://www.daktronics.com/en-us/learning-and-resources/ambient-contrast-ratio)
points to the ICDM Information Display Measurements Standard (IDMS v1.2) and
IEC 62977-2-2:2020 for the measurement method. Barco's
["luminance ratio"](https://www.barco.com/en/support/knowledge-base/KB7981)
has the same add-to-both structure. The structure is confirmed only by these
vendor pages; neither standard was read.

**A physical reading of the value.** Stokes et al. (1996), the sRGB paper WCAG
cites, specify two environments in their own table
([W3C copy](https://www.w3.org/Graphics/Color/sRGB.html)): an encoding
environment of 64 lx with 1.0% viewing flare, and a typical office environment
of 200 lx with 5.0% "Typical Viewing Flare" ("specified to be 5.0% of the
maximum white-luminance level"). WCAG's $0.05$ is the latter. The final IEC
61966-2-1:1999 reference condition, as the
[ICC registry](https://registry.color.org/rgb-registry/srgb) summarises it,
keeps only the 64 lx condition and does not appear to carry the 200 lx / 5%
pair.

If reflected luminance scaled linearly with illuminance on a fixed display:

- $F = 0.10$ would correspond to about 400 lx;
- EN 12464-1 specifies a maintained **task-area** illuminance of 500 lx for
  writing, typing, reading and data processing
  ([vendor summary](https://www.performanceinlighting.com/ww/en/en-12464-1);
  the 2021 edition also lists a "modified" 1000 lx), which would correspond
  to about $F = 0.125$.

Two things weaken that mapping, so treat it as an order of magnitude, not a
derivation:

- **Stokes's own two conditions are not proportional.** From 64 lx to 200 lx
  the light rises 3.1 times but the flare 5 times. Linear scaling from
  200 lx / 5% predicts about 1.6% at 64 lx, not 1%.
- **EN 12464-1's figure is task-area illuminance**, normally on the horizontal
  work plane. Screen reflections depend on the vertical illuminance at the
  display, which is usually lower.

On that reading, Step 6 evaluates WCAG's own flare model at roughly office
lighting rather than a dim room. The survey shows $F = 0.125$ is also
feasible, with an exponent limit of 1.695, but stricter.

**Limits of the basis.**

- The **min() composition** and the **`FLARE_K` constraint** are OKCA
  engineering. No reference prescribes them. They are what it takes to apply a
  harsher flare level without disturbing the FP=0 proof or the anchors.
- Linear scaling with illuminance assumes fixed display luminance and
  reflectance.
- **Not read directly:** IEC 61966-2-1 and its 4WD draft, EN 12464-1, IDMS,
  IEC 62977-2-2 and ISO 9241-307. They are paywalled or were unreachable. The
  200 lx / 5% figures are primary-sourced to Stokes et al. Do not expect to
  find them in the final IEC standard.

**Open question raised along the way: polarity.** The reading literature finds
the opposite of OKCA's polarity ordering. All of these report better
performance with positive polarity, meaning dark text on a light background:

- Buchner & Baumgartner (2007), "Text–background polarity affects performance
  irrespective of ambient illumination and colour contrast," *Ergonomics*
  50, 1036–1063 (doi:10.1080/00140130701306413). Proofreading was
  "consistently better with positive polarity… independent of ambient
  lighting… and of chromaticity."
- Piepenbrock, Mayr, Mund & Buchner (2013), "Positive display polarity is
  advantageous for both younger and older adults," *Ergonomics* 56(7),
  1116–1124.
- Piepenbrock, Mayr & Buchner (2014a), "Positive display polarity is
  particularly advantageous for small character sizes: implications for
  display design," *Human Factors* 56(5), 942–951.
- Piepenbrock, Mayr & Buchner (2014b), "Smaller pupil size and better
  proofreading performance with positive than with negative polarity
  displays," *Ergonomics* 57(11), 1670–1677. It finds smaller pupils with
  positive polarity, and results "compatible with the hypothesis that the
  positive polarity advantage is an effect of display luminance."

Mathôt & Ivanov ([2019, PeerJ](https://doi.org/10.7717/peerj.8220)), "The effect
of pupil size and peripheral brightness on detection and discrimination
performance," *qualify* the pupil-size account rather than dispute it. Small
pupils help discrimination "only for very small stimuli that are at the
threshold of visual acuity," large pupils help detection, and "whether a
positive or a negative polarity is best depends on many factors."

These findings support tightening light-on-dark, but they question `LOD_CAP`
(20.9) sitting above `DOL_CAP` (20). Not addressed by this change.
