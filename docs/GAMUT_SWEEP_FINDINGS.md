# Gamut Sweep Findings — Hue-Specific Behaviour & the L³/Y Divergence

Research notes from sweeping OKCA across the sRGB gamut and stratifying by
OKLCH hue and chroma. **Read-only analysis — no algorithm change.** Everything
here is reproducible:

```
npm run hue          # scripts/hue-analysis.ts       — conservatism & FP margin by hue
npm run divergence   # scripts/divergence-analysis.ts — L³ vs WCAG-Y divergence
```

All OKCA scores are at the current production constants (`POL_K = 1.100`,
`CHROMA_K = 0.65`, anchor white/#767676 = 3.9). WCAG values use the standard
relative-luminance formula, reimplemented inline (clean-room).

---

## 0. The core quantity: δ = L³ − Y

OKCA's darker-element luminance proxy is **L³** (OKLCH lightness cubed). WCAG
uses **relative luminance Y** = `0.2126 R + 0.7152 G + 0.0722 B` (linearised).
Their gap

> **δ = L³ − Y**

is the single quantity behind every hue-specific effect below. Sign convention:
`δ > 0` means OKCA's proxy reads a colour **lighter** than WCAG's luminance does
(so, as a background, *less* contrast with white → OKCA scores it **stricter**);
`δ < 0` means OKCA reads it **darker** → OKCA would score it **looser**.

**Achromatic validation.** Over greys (C < 0.02, n = 318): mean `|δ| = 0.0015`
≈ 0. On the neutral axis `L³ = Y` by construction — *all* divergence is
chromatic.

---

## 1. Divergence at the pure primaries/secondaries

(`npm run divergence`, sRGB grid step 8)

| colour | hex | OKLCH L | L³ (OKCA) | Y (WCAG) | δ = L³−Y | L³/Y |
|--------|-----|--------:|----------:|---------:|---------:|-----:|
| pure green   | `#00ff00` | 0.866 | 0.650 | 0.715 | **−0.065** | 0.91 |
| pure cyan    | `#00ffff` | 0.905 | 0.742 | 0.787 | −0.045 | 0.94 |
| pure yellow  | `#ffff00` | 0.968 | 0.907 | 0.928 | −0.021 | 0.98 |
| mid grey     | `#808080` | 0.600 | 0.216 | 0.216 | −0.000 | 1.00 |
| pure blue    | `#0000ff` | 0.452 | 0.092 | 0.072 | +0.020 | **1.28** |
| pure orange  | `#ff8000` | 0.732 | 0.392 | 0.367 | +0.025 | 1.07 |
| pure purple  | `#8000ff` | 0.530 | 0.149 | 0.118 | +0.031 | 1.26 |
| pure red     | `#ff0000` | 0.628 | 0.248 | 0.213 | +0.035 | 1.16 |
| pure magenta | `#ff00ff` | 0.702 | 0.345 | 0.285 | **+0.061** | 1.21 |

**Root cause.** WCAG's coefficients **under-weight blue** (0.0722) and
**over-weight green** (0.7152) relative to perceptual OKLCH lightness. So WCAG
treats pure blue as nearly black (Y = 0.072) and green as bright (Y = 0.715);
OKCA's perceptual lightness disagrees in both directions. Note pure blue has the
largest *ratio* (L³/Y = 1.28) because Y is tiny, while magenta has the largest
*absolute* δ (+0.061).

---

## 2. Divergence by hue (the hue-specific deltas)

Mean δ over saturated colours (C ≥ 0.10), 30° OKLCH hue bins, and the implied
white-on-colour raw bias `OKCA_raw / WCAG = (Y + 0.05)/(L³ + 0.05)`:

| hue | bin° | n | mean δ | OKCA_raw / WCAG | direction |
|-----|-----:|--:|-------:|----------------:|-----------|
| red        |   0–30  | 2545 | +0.022 | 0.911 | stricter |
| red-orange |  30–60  | 1628 | +0.018 | 0.937 | stricter |
| orange     |  60–90  |  965 | +0.008 | 0.981 | stricter |
| yellow     |  90–120 | 1929 | −0.010 | 1.017 | looser (crossover) |
| green      | 120–150 | 5905 | −0.032 | 1.063 | looser |
| green-teal | 150–180 | 2193 | **−0.034** | **1.064** | looser (max) |
| cyan       | 180–210 |  939 | −0.029 | 1.051 | looser |
| sky-blue   | 210–240 |  727 | −0.013 | 1.030 | looser (crossover) |
| blue       | 240–270 | 2531 | +0.006 | 0.959 | stricter |
| purple     | 270–300 | 2681 | +0.014 | 0.918 | stricter |
| magenta    | 300–330 | 2975 | +0.026 | **0.899** | stricter (max) |
| pink       | 330–360 | 2708 | +0.028 | 0.901 | stricter |

**Two neutral hues** where δ ≈ 0 (**~yellow, 105°** and **~sky-blue, 225°**)
split the wheel: a green/cyan lobe where OKCA runs up to **6% looser** than WCAG
(raw), and a blue→magenta→red arc where OKCA runs up to **10% stricter**.

### δ scales with chroma

δ is ≈ 0 for near-neutral colours and grows toward the primaries — the
conservatism is a **vivid-colour** phenomenon; pastels barely diverge:

| chroma band | GREEN (120–150°) | BLUE (240–270°) | MAGENTA (300–330°) |
|-------------|-----------------:|----------------:|-------------------:|
| 0.00–0.03 | −0.003 | −0.001 | +0.003 |
| 0.03–0.07 | −0.007 | −0.001 | +0.007 |
| 0.07–0.11 | −0.011 | −0.000 | +0.011 |
| 0.11–0.15 | −0.016 | +0.000 | +0.015 |
| 0.15–0.20 | −0.025 | +0.004 | +0.020 |
| 0.20–0.40 | −0.044 | +0.013 | +0.033 |

**Key consequence:** at *matched* chroma (C ≈ 0.17) the divergence is green
−0.025, blue +0.004, magenta +0.020 — **opposite signs at equal chroma.** No
function of chroma magnitude alone (`C = √(a²+b²)`) can flatten it; only the
*direction* of `a`/`b` (i.e. hue) distinguishes green from magenta.

---

## 3. Conservatism by hue (chromatic colours vs white)

(`npm run hue`, sRGB grid step 12) — mean WCAG − OKCA slack, and count of
disagreement-zone pairs (OKCA < 4.5 while WCAG ≥ 4.5):

| hue | bin° | n | mean slack (L-o-D) | mean slack (D-o-L) | disagreements (LoD / DoL) |
|-----|-----:|--:|-------------------:|-------------------:|--------------------------:|
| red        |   0–30  |  981 | 1.04 | 1.26 | 171 / 200 |
| red-orange |  30–60  |  679 | 0.85 | 1.04 |  82 / 88 |
| orange     |  60–90  |  336 | 0.61 | 0.78 |  23 / 28 |
| yellow     |  90–120 |  348 | 0.51 | 0.67 |  23 / 28 |
| green      | 120–150 | 1011 | **0.36** | 0.54 |  41 / 65 |
| green-teal | 150–180 |  459 | **0.36** | 0.54 |  24 / 29 |
| cyan       | 180–210 |  244 | 0.41 | 0.58 |  13 / 16 |
| sky-blue   | 210–240 |  336 | 0.47 | 0.64 |  15 / 22 |
| blue       | 240–270 | 1014 | 0.95 | 1.24 |  95 / 124 |
| purple     | 270–300 | 1021 | **1.22** | 1.51 | 135 / 170 |
| magenta    | 300–330 | 1127 | 1.11 | 1.33 | **215 / 242** |
| pink       | 330–360 |  977 | 1.04 | 1.23 | 148 / 171 |

OKCA is most conservative on the **purple / magenta / pink / red / blue** arc
(~1.0–1.2 points below WCAG) and least on **green / teal / cyan** (~0.36). The
disagreement zone — false failures — concentrates almost entirely in the former.
The per-hue slack ranks **identically** to the per-hue raw bias in §2, so δ is
the *mechanism*, not merely a correlate. D-o-L slack runs ~0.2 above L-o-D
(the polarity penalty).

---

## 4. FP=0 headroom by hue (the "green wall")

Tightest WCAG − OKCA margin when each hue is the **darker** element under
light-chromatic foregrounds (the overshoot-risk configuration). FP = 0 holds
everywhere — 0 false passes across ~14M pairs:

| darker-element hue | bin° | pairs | min WCAG−OKCA margin | tightest pair |
|--------------------|-----:|------:|---------------------:|---------------|
| green      | 120–150 | 1,114,112 | **0.2** | `#ffffd8` on `#001800` (OKCA 18.0 / WCAG 18.2) |
| green-teal | 150–180 |   491,776 | **0.2** | `#fcffd8` on `#00240c` (OKCA 16.0 / WCAG 16.2) |
| yellow     |  90–120 |   348,160 | 0.4 | |
| cyan       | 180–210 |   187,136 | 0.4 | |
| sky-blue   | 210–240 |   335,104 | 0.4 | |
| blue       | 240–270 | 2,637,312 | 0.4 | |
| red        |   0–30  | 1,566,720 | 0.5 | |
| orange     |  60–90  |   295,936 | 0.5 | |
| purple     | 270–300 | 2,950,656 | 0.5 | |
| magenta    | 300–330 | 1,840,896 | 0.5 | |
| pink       | 330–360 | 1,270,784 | 0.5 | |

The FP=0 safety margin is tightest at **green/green-teal (0.2)** — every other
hue keeps 0.4–0.5. The safety wall is effectively a *green* wall (consistent
with the light-magenta-on-dark-green worst case seen during calibration).

---

## 5. Synthesis

Findings §2–§4 are one fact viewed three ways. Because `L³` **undershoots** Y
for green and **overshoots** for blue/purple:

- **Green / cyan** land ≈ WCAG → least conservative (small slack) **and**
  tightest FP=0 margin (0.2). The FP=0 constraint is effectively *set by green*.
- **Blue → purple → magenta → red** land well below WCAG → most conservative
  (large slack), abundant FP margin, and nearly all the false failures.

### Two mechanistically distinct sources of OKCA's conservatism

1. **Achromatic compression** (`POL_K` / the anchor). δ = 0 on the grey axis, so
   the grey-500 / neutral over-conservatism is *pure calibration*, unrelated to
   luminance divergence. This is the legitimately tunable part (and what the
   white/#767676 → 3.9 anchor move targeted).
2. **Chromatic divergence** (δ). The blue/purple/magenta strictness is a
   *principled* correction of WCAG's blue-underweighting — arguably the most
   defensible part of OKCA's conservatism, not an error.

A global `POL_K` lever conflates the two: it relieves (1) but also erodes (2).

### OKCA is a one-sided detector of WCAG's luminance weakness

FP = 0 forces `OKCA ≤ WCAG` for every pair. So OKCA can only ever express
WCAG's **over-rating** (blue/purple/saturated, where δ > 0 makes OKCA stricter).
Where OKCA's own proxy says WCAG is **too harsh** (green, δ < 0, OKCA would score
*higher* than WCAG), FP = 0 clamps it — that signal is structurally hidden. The
0.2 green FP margin is OKCA straining against its own leash. **OKCA surfaces half
of WCAG's hue-luminance weakness by design.**

### Important limit

Calling δ a "weakness of WCAG" is a perceptual value judgement OKCA *supports*
but does not *prove*: `L³` is itself a proxy, not validated legibility ground
truth. What the sweep establishes rigorously is that the divergence is real,
hue-systematic, chroma-scaled, and centred on WCAG's known luminance blind spot.
Which model is *correct* needs empirical legibility data OKCA does not have.

---

## 6. Open direction — OKCA without the WCAG-2 tethers

The properties above are limited by tethers OKCA inherits from WCAG 2, not by
its OKLCH foundation:

- **FP = 0 (`OKCA ≤ WCAG`)** — the ceiling that makes OKCA one-sided.
- **`L³` calibrated to equal Y on the grey axis** — makes the chroma term an
  approximation of Y rather than a free perceptual model.
- **The 1–21 luminance-ratio scale** with the `+0.05` flare term.
- **Single size-independent AA/AAA thresholds.**
- **Polarity bolted on** as a cap (`DOL_CAP`) atop a symmetric ratio.

Removing them turns OKCA from a safety shim that sits *under* WCAG into a
perceptual contrast metric in its own right. Sketch of what that could be
(exponents/weights are placeholders requiring empirical fit):

1. **Effective perceptual lightness** that folds the Helmholtz–Kohlrausch effect
   (saturated colours appear brighter than their luminance) into lightness as a
   *smooth function of `(a, b)`* — no hue angle, no hue bands. Freed from
   matching Y, this chroma term becomes a legitimate appearance model rather than
   a "Y in disguise" correction:
   `Ł = L + f(a, b)`, with `f` smooth and ≈ 0 at `a = b = 0`.
2. **Polarity-native, difference-based contrast** on `Ł` (signed by direction,
   with distinct exponents per polarity and a soft clamp near black) instead of a
   luminance ratio.
3. **Usability thresholds decoupled from the metric** — a lookup on
   contrast × font-size × weight, rather than one fixed number.
4. **A perceptual scale** anchored to just-noticeable differences / measured
   legibility rather than to `white/black = 21`.

Such a metric would be **two-sided** — free to report that WCAG is too harsh
(green) as well as too lenient (blue/saturated), which FP = 0 currently forbids.

**The binding constraint flips.** Today WCAG is OKCA's only external anchor
(both its ceiling and its validation). Remove it and the math is unconstrained;
the replacement anchor can only be **empirical legibility data**. So this is not
an algorithm edit — it is a calibration-and-validation programme, and the first
deliverable is a data source, not code. The existing sweep / divergence / hue
tooling is the workbench for characterising any candidate formula across the
gamut before such data exists.

---

## Reproduce

| script | npm | produces |
|--------|-----|----------|
| `scripts/hue-analysis.ts` | `npm run hue` | §3 conservatism-by-hue, §4 FP-margin-by-hue |
| `scripts/divergence-analysis.ts` | `npm run divergence` | §0–§2 δ = L³ − Y landmarks, by-hue, chroma scaling |
| `scripts/calibration-sweep.ts` | `npm run calibrate` | full-gamut FP=0 verification |
