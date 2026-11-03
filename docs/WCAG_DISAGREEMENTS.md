# OKCA / WCAG Disagreements — Reference

**Total: 107 pairs** (Tailwind 43 · GOV.UK 14 · USWDS 50)

> **What these counts cover.** Every pair here has white as one partner, so
> the battery samples light backgrounds and the light-on-dark direction on
> mid-tone fills. Step 6's flare ceiling never binds on these pairs; its effect
> is on dark backgrounds, which this battery does not sample (see
> `docs/MIDTONE_SURVEY_FINDINGS.md`). OKCA never scores above WCAG, so every row
> is a pair WCAG passes and OKCA does not.
>
> All counts are for the default observer. Under the experimental scatter
> observer the total is 247 (Tailwind 108 · GOV.UK 32 · USWDS 107), 182 of them
> colour text on white, because a white background veils dark text.

### Source versions

| System | Version | Source |
|--------|---------|--------|
| Tailwind CSS | v3.4 | `tailwindcss` npm package, default color palette |
| GOV.UK Design System | govuk-frontend (MIT) | [github.com/alphagov/govuk-frontend](https://github.com/alphagov/govuk-frontend) `_colours-palette.scss` |
| US Web Design System | USWDS v3.x (MIT) | [github.com/uswds/uswds](https://github.com/uswds/uswds) `packages/uswds-core/src/styles/tokens/color/` |

All 107 are pairs where OKCA scores below 4.5 AA but WCAG scores $\ge 4.5$. These are intentional. 97 sit within about one point of WCAG's line (WCAG 4.5–5.4), where a pair has little margin against the conditions it will be read in. The other ten are saturated purples, violets and pinks (WCAG 5.7–7.1) that Oklab rates lighter than WCAG's luminance does. Each colour is scored twice due to OKCA's polarity model — once as a L-o-D pair (white text on colour) and once as a D-o-L pair (colour on white) — and counted separately; an "L-o-D only" note marks colours where only the white-text direction falls below 4.5.

WCAG score shown is symmetric. OKCA scores can differ by polarity, but light-on-dark never scores above dark-on-light for the same colour. Here, where the colour is the darker partner, the two columns differ mainly through Step 4's corrections to the darker background.

---

## Tailwind CSS v3.4 — 43 disagreements

The 500-level neutral greys are the most practically significant: designers reach for them as body text or icon colours on white. The remaining entries are mid-range chromatic shades (500–700). Oklab rates saturated colours lighter than WCAG's luminance does, so against white they carry less contrast in OKCA than in WCAG.

| Colour | Hex | WCAG | OKCA L-o-D | OKCA D-o-L | Note |
|--------|-----|-----:|----------:|----------:|------|
| slate-500 | `#64748b` | 4.8 | 3.9 | 4.0 |  |
| gray-500 | `#6b7280` | 4.8 | 4.0 | 4.1 |  |
| zinc-500 | `#71717a` | 4.8 | 4.1 | 4.1 |  |
| neutral-500 | `#737373` | 4.7 | 4.0 | 4.1 |  |
| stone-500 | `#78716c` | 4.8 | 4.1 | 4.1 |  |
| red-600 | `#dc2626` | 4.8 | 3.6 | 3.6 |  |
| orange-700 | `#c2410c` | 5.2 | 4.0 | 4.0 |  |
| amber-700 | `#b45309` | 5.0 | 4.0 | 4.0 |  |
| yellow-700 | `#a16207` | 4.9 | 4.0 | 4.1 |  |
| lime-700 | `#4d7c0f` | 5.0 | 4.3 | 4.5 | L-o-D only |
| green-700 | `#15803d` | 5.0 | 4.4 | 4.5 | L-o-D only |
| cyan-700 | `#0e7490` | 5.4 | 4.4 | 4.5 | L-o-D only |
| blue-600 | `#2563eb` | 5.2 | 3.7 | 3.7 |  |
| indigo-500 | `#6366f1` | 4.5 | 3.2 | 3.2 |  |
| indigo-600 | `#4f46e5` | 6.3 | 4.1 | 4.3 |  |
| violet-600 | `#7c3aed` | 5.7 | 3.7 | 3.8 |  |
| violet-700 | `#6d28d9` | 7.1 | 4.4 | 4.7 | L-o-D only |
| purple-600 | `#9333ea` | 5.4 | 3.5 | 3.5 |  |
| purple-700 | `#7e22ce` | 7.0 | 4.4 | 4.7 | L-o-D only |
| fuchsia-600 | `#c026d3` | 4.7 | 3.1 | 3.1 |  |
| fuchsia-700 | `#a21caf` | 6.3 | 4.1 | 4.3 |  |
| pink-600 | `#db2777` | 4.6 | 3.3 | 3.3 |  |
| pink-700 | `#be185d` | 6.0 | 4.3 | 4.4 |  |
| rose-600 | `#e11d48` | 4.7 | 3.4 | 3.4 |  |

**Pattern:** The Tailwind neutral 500 scale lands at WCAG ~4.7–4.8 but OKCA scores it 3.9–4.1 — squarely in the zone where whether a pair reads comfortably as body text turns on the viewing conditions rather than on the pair (see *The boundary benchmark* below). Fuchsia-600 (3.1) and indigo-500 (3.2) score lowest. Five 700 shades (lime, green, cyan, violet, purple) fall short only with white text on them; as text on white they pass.

---

## GOV.UK Design System — 14 disagreements

GOV.UK makes explicit WCAG 2.2 AA claims and documents approved text pairings. These are mid-range chromatic primaries and shades near WCAG's threshold.

| Colour | Hex | WCAG | OKCA L-o-D | OKCA D-o-L | Note |
|--------|-----|-----:|----------:|----------:|------|
| blue-primary | `#1d70b8` | 5.2 | 4.0 | 4.1 |  |
| teal-primary | `#158187` | 4.6 | 3.9 | 4.0 |  |
| purple-tint25 | `#7f65b7` | 4.7 | 3.6 | 3.6 |  |
| magenta-primary | `#ca357c` | 4.9 | 3.5 | 3.5 |  |
| red-primary | `#ca3535` | 5.2 | 3.9 | 3.9 |  |
| orange-shade25 | `#b7592a` | 4.7 | 3.7 | 3.7 |  |
| yellow-shade50 | `#806f00` | 5.0 | 4.2 | 4.3 |  |

**Pattern:** GOV.UK blue (the brand/link colour) falls just short in both directions: white-on-blue (L-o-D 4.0) and blue-on-white (D-o-L 4.1). Purple tint-25 and magenta score lowest; red sits in the same mid-range chromatic zone as Tailwind red-600.

---

## USWDS v3.x — 50 disagreements

USWDS makes explicit WCAG 2.x AA claims. The 50 disagreements are the grade-50 shade across every chromatic family plus all three gray families. Grade 50 is calibrated to land at WCAG $\approx 4.6$ system-wide — just above the 4.5 threshold.

| Family | Hex | WCAG | OKCA L-o-D | OKCA D-o-L |
|--------|-----|-----:|----------:|----------:|
| red-cool-50 | `#cd425b` | 4.6 | 3.5 | 3.5 |
| red-50 | `#d83933` | 4.6 | 3.4 | 3.4 |
| red-warm-50 | `#c3512c` | 4.6 | 3.6 | 3.6 |
| orange-warm-50 | `#bd5727` | 4.6 | 3.6 | 3.6 |
| orange-50 | `#a86437` | 4.6 | 3.8 | 3.8 |
| gold-50 | `#8e704f` | 4.6 | 3.9 | 3.9 |
| yellow-50 | `#8a7237` | 4.6 | 3.9 | 3.9 |
| green-warm-50 | `#6f7a41` | 4.6 | 4.0 | 4.0 |
| green-50 | `#607f35` | 4.6 | 4.0 | 4.0 |
| green-cool-50 | `#4d8055` | 4.6 | 4.0 | 4.1 |
| mint-50 | `#2e8367` | 4.6 | 4.0 | 4.1 |
| mint-cool-50 | `#40807e` | 4.6 | 3.9 | 3.9 |
| cyan-50 | `#168092` | 4.6 | 3.9 | 3.9 |
| blue-cool-50 | `#3a7d95` | 4.6 | 3.9 | 3.9 |
| blue-50 | `#2378c3` | 4.6 | 3.6 | 3.6 |
| blue-warm-50 | `#4a77b4` | 4.6 | 3.6 | 3.7 |
| indigo-cool-50 | `#496fd8` | 4.6 | 3.5 | 3.5 |
| indigo-50 | `#676cc8` | 4.6 | 3.5 | 3.5 |
| indigo-warm-50 | `#7665d1` | 4.6 | 3.4 | 3.4 |
| violet-50 | `#8168b3` | 4.6 | 3.5 | 3.5 |
| violet-warm-50 | `#b04abd` | 4.6 | 3.2 | 3.2 |
| magenta-50 | `#c84281` | 4.6 | 3.4 | 3.4 |
| gray-cool-50 | `#71767a` | 4.6 | 3.9 | 3.9 |
| gray-50 | `#757575` | 4.6 | 3.9 | 3.9 |
| gray-warm-50 | `#76766a` | 4.6 | 3.9 | 3.9 |

**Pattern:** USWDS grade 50 is calibrated to land at exactly WCAG 4.6 — 0.1 above threshold — across the entire palette. OKCA scores these at 3.2–4.1, consistently below AA. The uniformity (every family, same grade, same WCAG score) demonstrates that USWDS grade 50 sits at the same marginal position as white on `#767676`.

---

## Cross-system observations

### Where OKCA and WCAG agree most
- Deep darks (shade 700–950 in Tailwind, grade 60–90 in USWDS) generally pass both
- Lights and near-whites pass both trivially
- Achromatic pairs above USWDS grade 60 pass both
- Several mid-range chromatic 700s (emerald, teal, red, rose) clear AA in both directions

### Where OKCA consistently disagrees
1. **Gray 500 zone** — the entire Tailwind neutral scale at 500 (~4.7–4.8 WCAG, OKCA 3.9–4.1). The most important disagreements from a practitioner standpoint.
2. **USWDS grade 50 across all families** — calibrated to WCAG $\approx 4.6$ system-wide. One grade darker, grade 60 passes both WCAG and OKCA in every family; one grade lighter, grade 40 fails both.
3. **Saturated chromatics at medium depth** — high-chroma hues near the WCAG boundary (fuchsia, pink, magenta, red). Oklab rates these lighter than WCAG's luminance does, so they lose the most contrast against white.
4. **Blue / indigo / violet hues** — Oklab also rates these lighter than WCAG's luminance does, and as darker colours they carry OKCA's blue lift, which lowers their score further.

### The D-o-L asymmetry
Most colours appear as both a L-o-D and D-o-L failure. With one cap for both polarities, D-o-L scores sit at or slightly above L-o-D scores for the same colour, because Step 4 corrects the darker background in the L-o-D direction. A colour near the line can therefore fail only in the L-o-D direction; five Tailwind 700 shades do.

### The boundary benchmark
The canonical marginal pair — white on `#767676` — scores WCAG 4.5, OKCA 3.9 (L-o-D). The 97 entries within a point of the line are in the same zone. A designer who accepts `#767676` as passing AA is accepting the same risk for each of them.

That risk is not a matter of taste. In a threshold experiment reported in [#22](https://github.com/pawn002/okca/issues/22#issuecomment-5282357292), the contrast at which body text was judged shippable measured **5.2 at one display brightness and 2.8 at another** — same observer, same room, same session. OKCA 3.9 falls between those two figures, so the verdict on this exact pair inverts across ordinary viewing conditions.

That is n = 1 and a single datum, not a population estimate, and it is quoted here for direction rather than magnitude. The direction is the point: a pair sitting on the AA line carries no margin against the conditions it will actually be read in. That is an argument for a floor above the line rather than at it — and it is a stronger argument for OKCA's conservatism than any claim about how a given pair looks, because it does not depend on anyone agreeing about appearance.
