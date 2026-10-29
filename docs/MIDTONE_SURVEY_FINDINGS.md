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
