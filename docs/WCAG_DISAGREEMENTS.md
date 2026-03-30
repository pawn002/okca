# OKCA / WCAG Disagreements — Reference

**Total: 111 pairs** (Tailwind 46 · GOV.UK 15 · USWDS 50)

### Source versions

| System | Version | Source |
|--------|---------|--------|
| Tailwind CSS | v3.4 | `tailwindcss` npm package, default color palette |
| GOV.UK Design System | govuk-frontend (MIT) | [github.com/alphagov/govuk-frontend](https://github.com/alphagov/govuk-frontend) `_colours-palette.scss` |
| US Web Design System | USWDS v3.x (MIT) | [github.com/uswds/uswds](https://github.com/uswds/uswds) `packages/uswds-core/src/styles/tokens/color/` |

All 111 are pairs where OKCA scores below 4.5 AA but WCAG scores ≥ 4.5. These are intentional — they represent colours in the marginal zone that WCAG's threshold passes but real-world practitioners routinely reject. Every entry appears as both a L-o-D pair (white text on colour) and a D-o-L pair (colour on white), each scored separately due to OKCA's polarity model, unless otherwise noted.

WCAG score shown is symmetric. OKCA scores differ by polarity — L-o-D is always slightly higher than D-o-L for the same colour.

---

## Tailwind CSS v3.4 — 46 disagreements

### Achromatic grays (10 pairs — 5 colours × 2 polarities)

All five neutral gray families hit the marginal zone at shade 500. These are the most practically significant disagreements: designers reach for 500-level grays as body text or icon colours on white backgrounds.

| Colour | Hex | WCAG | OKCA L-o-D | OKCA D-o-L |
|--------|-----|-----:|----------:|----------:|
| slate-500 | `#64748b` | 4.8 | 3.7 | 3.5 |
| gray-500 | `#6b7280` | 4.8 | 3.7 | 3.6 |
| zinc-500 | `#71717a` | 4.8 | 3.7 | 3.5 |
| neutral-500 | `#737373` | 4.7 | 3.7 | 3.5 |
| stone-500 | `#78716c` | 4.8 | 3.7 | 3.5 |

**Pattern:** The entire Tailwind neutral scale agrees with the WCAG boundary and OKCA disagrees — every 500 grey lands at WCAG ~4.7–4.8, but OKCA scores 3.5–3.7. This is the clearest argument for OKCA's stricter stance: a practitioner looking at any of these greys against white would generally not call it comfortable for body text.

---

### Warm chromatics (16 pairs — 8 colours × 2 polarities)

These are mid-range warm hues from red through to lime. WCAG passes them; OKCA's chroma compression and polarity model combine to fail them.

| Colour | Hex | WCAG | OKCA L-o-D | OKCA D-o-L |
|--------|-----|-----:|----------:|----------:|
| red-600 | `#dc2626` | 4.8 | 3.3 | 3.1 |
| orange-700 | `#c2410c` | 5.2 | 3.7 | 3.5 |
| amber-700 | `#b45309` | 5.0 | 3.7 | 3.5 |
| yellow-700 | `#a16207` | 4.9 | 3.7 | 3.5 |
| lime-700 | `#4d7c0f` | 5.0 | 4.0 | 3.8 |
| green-700 | `#15803d` | 5.0 | 4.0 | 3.8 |
| emerald-700 | `#047857` | 5.5 | 4.4 | 4.2 |
| teal-700 | `#0f766e` | 5.5 | 4.4 | 4.2 |

**Pattern:** WCAG passes these at 4.8–5.5 while OKCA scores 3.1–4.4. Red-600 is the starkest: WCAG 4.8, OKCA 3.3. Cyan-700 (below) falls in the cool zone but exhibits the same pattern.

---

### Cool chromatics (12 pairs — 6 colours × 2 polarities, minus 1 L-o-D only)

| Colour | Hex | WCAG | OKCA L-o-D | OKCA D-o-L |
|--------|-----|-----:|----------:|----------:|
| cyan-700 | `#0e7490` | 5.4 | 4.3 | 4.1 |
| blue-600 | `#2563eb` | 5.2 | 3.8 | 3.6 |
| indigo-500 | `#6366f1` | 4.5 | 3.2 | 3.0 |
| indigo-600 D-o-L only | `#4f46e5` | 6.3 | — | 4.4 |
| violet-600 | `#7c3aed` | 5.7 | 3.9 | 3.7 |
| purple-600 | `#9333ea` | 5.4 | 3.6 | 3.4 |

Blue and indigo hues are perceptually darker than their WCAG luminance suggests due to the eye's reduced blue sensitivity. Indigo-500 at WCAG 4.5 is the marginal case; OKCA scores 3.2 L-o-D, 3.0 D-o-L. Indigo-600 is noteworthy: it passes L-o-D (scores 4.5 exactly — outside the disagreement window) but fails D-o-L at 4.4.

---

### Magenta / pink / rose (10 pairs — 5 colours × 2 polarities)

| Colour | Hex | WCAG | OKCA L-o-D | OKCA D-o-L |
|--------|-----|-----:|----------:|----------:|
| fuchsia-600 | `#c026d3` | 4.7 | 3.1 | 2.9 |
| fuchsia-700 | `#a21caf` | 6.3 | 4.4 | 4.2 |
| pink-600 | `#db2777` | 4.6 | 3.1 | 2.9 |
| pink-700 | `#be185d` | 6.0 | 4.3 | 4.1 |
| rose-600 | `#e11d48` | 4.7 | 3.2 | 3.0 |
| rose-700 D-o-L only | `#be123c` | 6.3 | — | 4.3 |

**Pattern:** Magenta-adjacent hues are penalised heavily by chroma compression. Fuchsia-600 and pink-600 score 3.1/2.9 despite WCAG 4.6–4.7 — among the largest gaps in Tailwind.

---

## GOV.UK Design System — 15 disagreements

The GOV.UK Design System makes explicit WCAG 2.2 AA compliance claims and documents approved text-on-background pairings. These 15 disagreements are mid-range chromatic primaries and shades that sit near WCAG's threshold.

### Blue / teal (4 pairs)

| Colour | Token | Hex | WCAG | OKCA L-o-D | OKCA D-o-L |
|--------|-------|-----|-----:|----------:|----------:|
| blue | primary | `#1d70b8` | 5.2 | 4.1 | 3.9 |
| teal | primary | `#158187` | 4.6 | 3.7 | 3.6 |

Both directions fail for both colours (2 × 2 = 4 pairs total). GOV.UK blue is the brand/link colour; GOV.UK teal is a secondary brand hue.

---

### Green (1 pair — D-o-L only)

| Colour | Token | Hex | WCAG | OKCA L-o-D | OKCA D-o-L |
|--------|-------|-----|-----:|----------:|----------:|
| green | primary | `#0f7a52` | 5.3 | 4.5 | 4.3 |

Green-primary scores exactly 4.5 L-o-D (passes) but 4.3 D-o-L (fails). The single disagreement is the dark-on-light direction only.

---

### Purple / magenta / red (6 pairs)

| Colour | Token | Hex | WCAG | OKCA L-o-D | OKCA D-o-L |
|--------|-------|-----|-----:|----------:|----------:|
| purple | tint-25 | `#7f65b7` | 4.7 | 3.4 | 3.3 |
| magenta | primary | `#ca357c` | 4.9 | 3.3 | 3.2 |
| red | primary | `#ca3535` | 5.2 | 3.6 | 3.4 |

Both directions for all three (3 × 2 = 6 pairs). Purple tint-25 and magenta are penalised heavily by chroma compression; red sits in the same mid-range chromatic zone as Tailwind red-600.

---

### Orange / yellow (4 pairs)

| Colour | Token | Hex | WCAG | OKCA L-o-D | OKCA D-o-L |
|--------|-------|-----|-----:|----------:|----------:|
| orange | shade-25 | `#b7592a` | 4.7 | 3.4 | 3.2 |
| yellow | shade-50 | `#806f00` | 5.0 | 3.9 | 3.7 |

Both directions for both colours (2 × 2 = 4 pairs).

---

## USWDS v3.x — 50 disagreements

USWDS makes explicit WCAG 2.x AA compliance claims and provides pre-approved accessible colour combinations via its theme token system. The 50 disagreements are uniformly the grade-50 shade across every chromatic family plus all three gray families. Grade 50 is designed to be the "mid-point" of each scale and sits at WCAG ≈ 4.6 for every family — just above the 4.5 threshold.

### Pattern: grade-50 across all 25 chromatic + gray families (50 pairs — 25 colours × 2 polarities)

All entries are at grade 50 (the mid-range shade in the USWDS scale), paired with white in both directions.

| Family | Hex | WCAG | OKCA L-o-D | OKCA D-o-L |
|--------|-----|-----:|----------:|----------:|
| red-cool | `#cd425b` | 4.6 | 3.2 | 3.0 |
| red | `#d83933` | 4.6 | 3.2 | 3.0 |
| red-warm | `#c3512c` | 4.6 | 3.3 | 3.1 |
| orange-warm | `#bd5727` | 4.6 | 3.3 | 3.1 |
| orange | `#a86437` | 4.6 | 3.4 | 3.2 |
| gold | `#8e704f` | 4.6 | 3.5 | 3.3 |
| yellow | `#8a7237` | 4.6 | 3.5 | 3.4 |
| green-warm | `#6f7a41` | 4.6 | 3.6 | 3.5 |
| green | `#607f35` | 4.6 | 3.7 | 3.5 |
| green-cool | `#4d8055` | 4.6 | 3.7 | 3.5 |
| mint | `#2e8367` | 4.6 | 3.7 | 3.6 |
| mint-cool | `#40807e` | 4.6 | 3.6 | 3.5 |
| cyan | `#168092` | 4.6 | 3.7 | 3.5 |
| blue-cool | `#3a7d95` | 4.6 | 3.6 | 3.5 |
| blue | `#2378c3` | 4.6 | 3.6 | 3.4 |
| blue-warm | `#4a77b4` | 4.6 | 3.5 | 3.3 |
| indigo-cool | `#496fd8` | 4.6 | 3.4 | 3.3 |
| indigo | `#676cc8` | 4.6 | 3.4 | 3.2 |
| indigo-warm | `#7665d1` | 4.6 | 3.3 | 3.2 |
| violet | `#8168b3` | 4.6 | 3.4 | 3.2 |
| violet-warm | `#b04abd` | 4.6 | 3.1 | 3.0 |
| magenta | `#c84281` | 4.6 | 3.2 | 3.0 |
| gray-cool | `#71767a` | 4.6 | 3.5 | 3.4 |
| gray | `#757575` | 4.6 | 3.5 | 3.4 |
| gray-warm | `#76766a` | 4.6 | 3.5 | 3.4 |

**Pattern:** USWDS grade 50 is calibrated to land at exactly WCAG 4.6 — 0.1 above the threshold — across the entire palette. This is by design: grade 50 is intended as a background or accent colour, not a text colour. OKCA scores these at 3.0–3.7, consistently below AA. The uniformity here (every family, same grade, same WCAG score) demonstrates that USWDS grade 50 sits at the same marginal position as white on `#767676`.

---

## Cross-system observations

### Where OKCA and WCAG agree most
- Deep darks (shade 700–950 in Tailwind, grade 60–90 in USWDS) generally pass both
- Lights and near-whites pass both trivially
- Achromatic pairs above USWDS grade 60 pass both

### Where OKCA consistently disagrees
1. **Gray 500 zone** — the entire Tailwind neutral scale at 500 (~4.7–4.8 WCAG). These are the most important disagreements from a practitioner standpoint.
2. **USWDS grade 50 across all families** — calibrated to WCAG ≈ 4.6 system-wide. A single threshold shift of 0.1 WCAG points separates these from USWDS grade 40 (which passes both).
3. **Saturated chromatics at medium depth** — any hue with high chroma at a luminance level that puts it near the WCAG boundary. The chroma compression penalty is largest here.
4. **Blue / indigo / purple hues** — perceptually darker than luminance alone predicts; OKCA's chroma penalty compounds with perceived weight, producing gaps of 1.5–2.0 points against WCAG.

### The D-o-L asymmetry
Every colour in this document appears as both a L-o-D and D-o-L failure (with rare exceptions where one direction scores exactly 4.5). The polarity model means D-o-L scores are consistently 0.1–0.3 below L-o-D scores for the same colour. White-on-colour fails for the same reason colour-on-white fails — these pairs are marginal in either direction.

### Practitioner benchmark
The canonical marginal pair — white on `#767676` — scores WCAG 4.5, OKCA 3.5 (L-o-D). Everything in this document is in the same zone or worse. A designer who accepts `#767676` as passing AA is accepting the same risk for every entry here.
