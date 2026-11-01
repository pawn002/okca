# OKCA / WCAG Disagreements — Reference

**Total: 108 pairs** (Tailwind 44 · GOV.UK 14 · USWDS 50)

> **Calibration note.** Counts are as of the current calibration: white/#767676
> anchor at 3.9 (`POL_K = 1.100`) and the cap lowered to `CAP
> = 20.9` (which keeps OKCA strictly below WCAG — white-on-black = 20.9, not 21 —
> so FP=0 is guaranteed by construction; see `docs/FP0_PROOF.md`). Since 3.0
> the same cap applies to both polarities. FP=0 holds
> across the full sRGB gamut (interval-verified).
>
> **Background induction (Step 4)** adds two disagreements, 97 → 99: white on
> Tailwind lime-700 and white on GOV.UK blue each drop from 4.5 to 4.4. Every
> colour here is darker than `#767676`, so the light-on-dark column carries a
> small induction correction (most values move by 0.1 or not at all). The
> dark-on-light column is unchanged.
>
> **Opponent-axis terms (Steps 3 and 4)** add ten more, 99 → 109, all Tailwind
> saturated 600–700 shades in the purple–magenta–red range: indigo-600,
> purple-700, fuchsia-700, pink-700, rose-700 and red-700. Their darker-element
> lift applies in the hues where dichromats see dark colours as lighter. See
> `docs/OPPONENT_AXIS_FINDINGS.md`.
>
> **Step 6 (flare-robustness ceiling) changes none of these rows.** Every pair
> here has a white partner, and the ceiling's exponent is the largest that never
> binds on such pairs at these scores. Its effect is on dark backgrounds, which
> this battery does not sample: see `docs/MIDTONE_SURVEY_FINDINGS.md`.
>
> **One cap for both polarities** (#30, `docs/POLARITY_FINDINGS.md`) removes
> two, 109 → 107. The dark-on-light column rises by 20.9/20 (about 4.5%):
> green-700 now passes as text on white, and lime-700 passes as text on white
> while still failing as white on lime-700.
>
> **The linear darker lift** (#31, `docs/DARKER_LIFT_FINDINGS.md`) nets one
> more, 107 → 108. Four Tailwind 700 shades now fall just short as white on the
> colour: green-700, cyan-700, blue-700 and violet-700. Red-700 and rose-700 now
> pass in both directions. The lift now points at blue rather than between blue
> and magenta, so warm and magenta shades ease slightly and blues tighten.

### Source versions

| System | Version | Source |
|--------|---------|--------|
| Tailwind CSS | v3.4 | `tailwindcss` npm package, default color palette |
| GOV.UK Design System | govuk-frontend (MIT) | [github.com/alphagov/govuk-frontend](https://github.com/alphagov/govuk-frontend) `_colours-palette.scss` |
| US Web Design System | USWDS v3.x (MIT) | [github.com/uswds/uswds](https://github.com/uswds/uswds) `packages/uswds-core/src/styles/tokens/color/` |

All 108 are pairs where OKCA scores below 4.5 AA but WCAG scores $\ge 4.5$. These are intentional — they represent colours in the marginal zone that WCAG's threshold passes but real-world practitioners routinely reject. Each colour is scored twice due to OKCA's polarity model — once as a L-o-D pair (white text on colour) and once as a D-o-L pair (colour on white) — and counted separately; a "D-o-L only" note marks colours where just one direction falls below 4.5.

WCAG score shown is symmetric. OKCA scores can differ by polarity, but light-on-dark never scores above dark-on-light for the same colour. Here, where the colour is the darker partner, the two columns differ mainly through Step 4's corrections to the darker background.

---

## Tailwind CSS v3.4 — 44 disagreements

The 500-level neutral greys are the most practically significant: designers reach for them as body text or icon colours on white. The remaining entries are mid-range chromatic shades (500–700) that WCAG passes and OKCA's chroma compression plus polarity model fail.

| Colour | Hex | WCAG | OKCA L-o-D | OKCA D-o-L | Note |
|--------|-----|-----:|----------:|----------:|------|
| slate-500 | `#64748b` | 4.8 | 3.9 | 4.0 |  |
| gray-500 | `#6b7280` | 4.8 | 4.0 | 4.1 |  |
| zinc-500 | `#71717a` | 4.8 | 4.0 | 4.1 |  |
| neutral-500 | `#737373` | 4.7 | 4.0 | 4.1 |  |
| stone-500 | `#78716c` | 4.8 | 4.1 | 4.1 |  |
| red-600 | `#dc2626` | 4.8 | 3.6 | 3.6 |  |
| orange-700 | `#c2410c` | 5.2 | 4.0 | 4.0 |  |
| amber-700 | `#b45309` | 5.0 | 4.0 | 4.0 |  |
| yellow-700 | `#a16207` | 4.9 | 4.0 | 4.1 |  |
| lime-700 | `#4d7c0f` | 5.0 | 4.3 | 4.5 | L-o-D only |
| green-700 | `#15803d` | 5.0 | 4.4 | 4.5 | L-o-D only |
| cyan-700 | `#0e7490` | 5.4 | 4.3 | 4.5 | L-o-D only |
| blue-600 | `#2563eb` | 5.2 | 3.6 | 3.7 |  |
| blue-700 | `#1d4ed8` | 6.7 | 4.4 | 4.8 | L-o-D only |
| indigo-500 | `#6366f1` | 4.5 | 3.1 | 3.1 |  |
| indigo-600 | `#4f46e5` | 6.3 | 4.1 | 4.3 |  |
| violet-600 | `#7c3aed` | 5.7 | 3.6 | 3.7 |  |
| violet-700 | `#6d28d9` | 7.1 | 4.4 | 4.7 | L-o-D only |
| purple-600 | `#9333ea` | 5.4 | 3.5 | 3.5 |  |
| purple-700 | `#7e22ce` | 7.0 | 4.3 | 4.6 | L-o-D only |
| fuchsia-600 | `#c026d3` | 4.7 | 3.1 | 3.1 |  |
| fuchsia-700 | `#a21caf` | 6.3 | 4.1 | 4.3 |  |
| pink-600 | `#db2777` | 4.6 | 3.2 | 3.2 |  |
| pink-700 | `#be185d` | 6.0 | 4.2 | 4.4 |  |
| rose-600 | `#e11d48` | 4.7 | 3.4 | 3.4 |  |

**Pattern:** The Tailwind neutral 500 scale lands at WCAG ~4.7–4.8 but OKCA scores it 3.9–4.1 — squarely in the zone where whether a pair reads comfortably as body text turns on the viewing conditions rather than on the pair (see *Practitioner benchmark* below). Indigo-500 and fuchsia-600 (3.1/3.1) carry the largest penalty: indigo from the darker lift, fuchsia from the lighter penalty. Six 700 shades (lime, green, cyan, blue, violet, purple) fall short only with white text on them; as text on white they pass.

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

**Pattern:** GOV.UK blue (the brand/link colour) now falls just short in both directions: white-on-blue (L-o-D 4.0) and blue-on-white (D-o-L 4.1). Purple tint-25 and magenta are penalised most by chroma compression; red sits in the same mid-range chromatic zone as Tailwind red-600.

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
| mint-50 | `#2e8367` | 4.6 | 4.0 | 4.0 |
| mint-cool-50 | `#40807e` | 4.6 | 3.9 | 3.9 |
| cyan-50 | `#168092` | 4.6 | 3.9 | 3.9 |
| blue-cool-50 | `#3a7d95` | 4.6 | 3.8 | 3.9 |
| blue-50 | `#2378c3` | 4.6 | 3.6 | 3.6 |
| blue-warm-50 | `#4a77b4` | 4.6 | 3.6 | 3.6 |
| indigo-cool-50 | `#496fd8` | 4.6 | 3.4 | 3.4 |
| indigo-50 | `#676cc8` | 4.6 | 3.5 | 3.5 |
| indigo-warm-50 | `#7665d1` | 4.6 | 3.4 | 3.4 |
| violet-50 | `#8168b3` | 4.6 | 3.5 | 3.5 |
| violet-warm-50 | `#b04abd` | 4.6 | 3.2 | 3.2 |
| magenta-50 | `#c84281` | 4.6 | 3.3 | 3.3 |
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
2. **USWDS grade 50 across all families** — calibrated to WCAG $\approx 4.6$ system-wide. A single threshold shift of 0.1 WCAG points separates these from USWDS grade 40 (which passes both).
3. **Saturated chromatics at medium depth** — high-chroma hues near the WCAG boundary (fuchsia, pink, magenta, red). The chroma compression penalty is largest here.
4. **Blue / indigo / purple hues** — perceptually darker than luminance alone predicts.

### The D-o-L asymmetry
Most colours appear as both a L-o-D and D-o-L failure. With one cap for both polarities, D-o-L scores sit at or slightly above L-o-D scores for the same colour, because Step 4 corrects the darker background in the L-o-D direction. A colour near the line can therefore fail only in the L-o-D direction; six Tailwind 700 shades do.

### Practitioner benchmark
The canonical marginal pair — white on `#767676` — scores WCAG 4.5, OKCA 3.9 (L-o-D). Everything in this document is in the same zone or worse. A designer who accepts `#767676` as passing AA is accepting the same risk for every entry here.

That risk is not a matter of taste. In a threshold experiment reported in [#22](https://github.com/pawn002/okca/issues/22#issuecomment-5282357292), the contrast at which body text was judged shippable measured **5.2 at one display brightness and 2.8 at another** — same observer, same room, same session. OKCA 3.9 falls between those two figures, so the verdict on this exact pair inverts across ordinary viewing conditions.

That is n = 1 and a single datum, not a population estimate, and it is quoted here for direction rather than magnitude. The direction is the point: a pair sitting on the AA line carries no margin against the conditions it will actually be read in. That is an argument for a floor above the line rather than at it — and it is a stronger argument for OKCA's conservatism than any claim about how a given pair looks, because it does not depend on anyone agreeing about appearance.
