# OKCA / WCAG Disagreements — Reference

**Total: 97 pairs** (Tailwind 34 · GOV.UK 13 · USWDS 50)

> **Calibration note.** Counts are as of the current calibration: white/#767676
> anchor at 3.9 (`POL_K = 1.100`) and the light-on-dark cap lowered to `LOD_CAP
> = 20.9` (which keeps OKCA strictly below WCAG — white-on-black = 20.9, not 21 —
> so FP=0 is guaranteed by construction; see `docs/FP0_PROOF.md`). The lowered
> cap scales light-on-dark scores by $20.9/21$ (dark-on-light is unaffected); the
> disagreement membership is unchanged from the 3.9 recalibration. FP=0 holds
> across the full sRGB gamut (interval-verified).

### Source versions

| System | Version | Source |
|--------|---------|--------|
| Tailwind CSS | v3.4 | `tailwindcss` npm package, default color palette |
| GOV.UK Design System | govuk-frontend (MIT) | [github.com/alphagov/govuk-frontend](https://github.com/alphagov/govuk-frontend) `_colours-palette.scss` |
| US Web Design System | USWDS v3.x (MIT) | [github.com/uswds/uswds](https://github.com/uswds/uswds) `packages/uswds-core/src/styles/tokens/color/` |

All 97 are pairs where OKCA scores below 4.5 AA but WCAG scores $\ge 4.5$. These are intentional — they represent colours in the marginal zone that WCAG's threshold passes but real-world practitioners routinely reject. Each colour is scored twice due to OKCA's polarity model — once as a L-o-D pair (white text on colour) and once as a D-o-L pair (colour on white) — and counted separately; a "D-o-L only" note marks colours where just one direction falls below 4.5.

WCAG score shown is symmetric. OKCA scores differ by polarity — L-o-D is always slightly higher than D-o-L for the same colour.

---

## Tailwind CSS v3.4 — 34 disagreements

The 500-level neutral greys are the most practically significant: designers reach for them as body text or icon colours on white. The remaining entries are mid-range chromatic shades (500–700) that WCAG passes and OKCA's chroma compression plus polarity model fail.

| Colour | Hex | WCAG | OKCA L-o-D | OKCA D-o-L | Note |
|--------|-----|-----:|----------:|----------:|------|
| slate-500 | `#64748b` | 4.8 | 4.1 | 3.9 |  |
| gray-500 | `#6b7280` | 4.8 | 4.2 | 4.0 |  |
| zinc-500 | `#71717a` | 4.8 | 4.1 | 4.0 |  |
| neutral-500 | `#737373` | 4.7 | 4.1 | 3.9 |  |
| stone-500 | `#78716c` | 4.8 | 4.1 | 3.9 |  |
| red-600 | `#dc2626` | 4.8 | 3.7 | 3.5 |  |
| orange-700 | `#c2410c` | 5.2 | 4.1 | 3.9 |  |
| amber-700 | `#b45309` | 5.0 | 4.1 | 3.9 |  |
| yellow-700 | `#a16207` | 4.9 | 4.1 | 3.9 |  |
| lime-700 | `#4d7c0f` | 5.0 | 4.5 | 4.3 | D-o-L only |
| green-700 | `#15803d` | 5.0 | 4.6 | 4.4 | D-o-L only |
| blue-600 | `#2563eb` | 5.2 | 4.2 | 4.1 |  |
| indigo-500 | `#6366f1` | 4.5 | 3.5 | 3.4 |  |
| violet-600 | `#7c3aed` | 5.7 | 4.3 | 4.2 |  |
| purple-600 | `#9333ea` | 5.4 | 4.0 | 3.9 |  |
| fuchsia-600 | `#c026d3` | 4.7 | 3.5 | 3.3 |  |
| pink-600 | `#db2777` | 4.6 | 3.5 | 3.3 |  |
| rose-600 | `#e11d48` | 4.7 | 3.5 | 3.4 |  |

**Pattern:** The Tailwind neutral 500 scale lands at WCAG ~4.7–4.8 but OKCA scores it 3.9–4.2 — a designer would generally not call any of these comfortable for body text on white. Magenta-adjacent hues (fuchsia-600, pink-600 at 3.5/3.3) carry the largest chroma-compression penalty. The deep-700 greens (lime, green) clear AA with white text on them (L-o-D) but still fall just short as text on white (D-o-L).

---

## GOV.UK Design System — 13 disagreements

GOV.UK makes explicit WCAG 2.2 AA claims and documents approved text pairings. These are mid-range chromatic primaries and shades near WCAG's threshold.

| Colour | Hex | WCAG | OKCA L-o-D | OKCA D-o-L | Note |
|--------|-----|-----:|----------:|----------:|------|
| blue-primary | `#1d70b8` | 5.2 | 4.5 | 4.3 | D-o-L only |
| teal-primary | `#158187` | 4.6 | 4.2 | 4.0 |  |
| purple-tint25 | `#7f65b7` | 4.7 | 3.8 | 3.7 |  |
| magenta-primary | `#ca357c` | 4.9 | 3.7 | 3.6 |  |
| red-primary | `#ca3535` | 5.2 | 4.0 | 3.8 |  |
| orange-shade25 | `#b7592a` | 4.7 | 3.8 | 3.6 |  |
| yellow-shade50 | `#806f00` | 5.0 | 4.3 | 4.2 |  |

**Pattern:** GOV.UK blue (the brand/link colour) passes as white-on-blue (L-o-D 4.5) but fails as blue-on-white (D-o-L 4.3). Purple tint-25 and magenta are penalised most by chroma compression; red sits in the same mid-range chromatic zone as Tailwind red-600.

---

## USWDS v3.x — 50 disagreements

USWDS makes explicit WCAG 2.x AA claims. The 50 disagreements are the grade-50 shade across every chromatic family plus all three gray families. Grade 50 is calibrated to land at WCAG $\approx 4.6$ system-wide — just above the 4.5 threshold.

| Family | Hex | WCAG | OKCA L-o-D | OKCA D-o-L |
|--------|-----|-----:|----------:|----------:|
| red-cool-50 | `#cd425b` | 4.6 | 3.6 | 3.4 |
| red-50 | `#d83933` | 4.6 | 3.5 | 3.4 |
| red-warm-50 | `#c3512c` | 4.6 | 3.7 | 3.5 |
| orange-warm-50 | `#bd5727` | 4.6 | 3.7 | 3.5 |
| orange-50 | `#a86437` | 4.6 | 3.8 | 3.6 |
| gold-50 | `#8e704f` | 4.6 | 3.9 | 3.7 |
| yellow-50 | `#8a7237` | 4.6 | 3.9 | 3.8 |
| green-warm-50 | `#6f7a41` | 4.6 | 4.0 | 3.9 |
| green-50 | `#607f35` | 4.6 | 4.1 | 3.9 |
| green-cool-50 | `#4d8055` | 4.6 | 4.1 | 4.0 |
| mint-50 | `#2e8367` | 4.6 | 4.2 | 4.0 |
| mint-cool-50 | `#40807e` | 4.6 | 4.0 | 3.9 |
| cyan-50 | `#168092` | 4.6 | 4.1 | 3.9 |
| blue-cool-50 | `#3a7d95` | 4.6 | 4.1 | 3.9 |
| blue-50 | `#2378c3` | 4.6 | 4.0 | 3.8 |
| blue-warm-50 | `#4a77b4` | 4.6 | 3.9 | 3.7 |
| indigo-cool-50 | `#496fd8` | 4.6 | 3.8 | 3.7 |
| indigo-50 | `#676cc8` | 4.6 | 3.8 | 3.6 |
| indigo-warm-50 | `#7665d1` | 4.6 | 3.7 | 3.5 |
| violet-50 | `#8168b3` | 4.6 | 3.7 | 3.6 |
| violet-warm-50 | `#b04abd` | 4.6 | 3.5 | 3.4 |
| magenta-50 | `#c84281` | 4.6 | 3.5 | 3.4 |
| gray-cool-50 | `#71767a` | 4.6 | 3.9 | 3.8 |
| gray-50 | `#757575` | 4.6 | 3.9 | 3.8 |
| gray-warm-50 | `#76766a` | 4.6 | 3.9 | 3.8 |

**Pattern:** USWDS grade 50 is calibrated to land at exactly WCAG 4.6 — 0.1 above threshold — across the entire palette. OKCA scores these at 3.4–4.2, consistently below AA. The uniformity (every family, same grade, same WCAG score) demonstrates that USWDS grade 50 sits at the same marginal position as white on `#767676`.

---

## Cross-system observations

### Where OKCA and WCAG agree most
- Deep darks (shade 700–950 in Tailwind, grade 60–90 in USWDS) generally pass both
- Lights and near-whites pass both trivially
- Achromatic pairs above USWDS grade 60 pass both
- The mid-range chromatic 700s (emerald, teal, cyan, fuchsia, pink, rose) clear AA in both directions

### Where OKCA consistently disagrees
1. **Gray 500 zone** — the entire Tailwind neutral scale at 500 (~4.7–4.8 WCAG, OKCA 3.9–4.2). The most important disagreements from a practitioner standpoint.
2. **USWDS grade 50 across all families** — calibrated to WCAG $\approx 4.6$ system-wide. A single threshold shift of 0.1 WCAG points separates these from USWDS grade 40 (which passes both).
3. **Saturated chromatics at medium depth** — high-chroma hues near the WCAG boundary (fuchsia, pink, magenta, red). The chroma compression penalty is largest here.
4. **Blue / indigo / purple hues** — perceptually darker than luminance alone predicts.

### The D-o-L asymmetry
Most colours appear as both a L-o-D and D-o-L failure. The polarity model means D-o-L scores are consistently 0.1–0.3 below L-o-D scores for the same colour, so a handful of colours near the line (lime-700, green-700, GOV.UK blue) fail only in the D-o-L direction.

### Practitioner benchmark
The canonical marginal pair — white on `#767676` — scores WCAG 4.5, OKCA 3.9 (L-o-D). Everything in this document is in the same zone or worse. A designer who accepts `#767676` as passing AA is accepting the same risk for every entry here.
