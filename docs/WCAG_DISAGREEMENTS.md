# OKCA / WCAG Disagreements — Reference

**Total: 225 pairs** (Tailwind 46 · Material 54 · Radix-light 61 · Radix-dark 64)

### Source versions

| System | Version | Source |
|--------|---------|--------|
| Tailwind CSS | v3.4 | `tailwindcss` npm package, default color palette |
| Material Design | MD2 named palette | [m2.material.io/design/color/the-color-system](https://m2.material.io/design/color/the-color-system.html) — palette unchanged in MD3 |
| Radix UI Colors | @radix-ui/colors ≥3.0.0 (Oct 2023 rework) | Hex values hardcoded in `probe-design-systems.spec.ts`; cross-reference against that file for exact values |

All 225 are pairs where OKCA scores below 4.5 AA but WCAG scores ≥ 4.5. These are intentional — they represent colours in the marginal zone that WCAG's threshold passes but real-world practitioners routinely reject. Every entry appears as both a L-o-D pair (white text on colour) and a D-o-L pair (colour on white), each scored separately due to OKCA's polarity model.

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

## Material Design 2 named palette — 54 disagreements

Scale runs 50–900 plus accent variants (A100–A700). The disagreements cluster around 700–800 for most hues, and A-level accents (which are often highly saturated).

### Red / orange family (12 pairs — 6 colours × 2 polarities)

| Colour | Hex | WCAG | OKCA L-o-D | OKCA D-o-L |
|--------|-----|-----:|----------:|----------:|
| red-700 | `#d32f2f` | 5.0 | 3.4 | 3.3 |
| red-800 | `#c62828` | 5.6 | 4.0 | 3.8 |
| red-A700 | `#d50000` | 5.5 | 3.8 | 3.6 |
| deepOrange-900 | `#bf360c` | 5.6 | 4.0 | 3.8 |
| deepOrange-A700 | `#dd2c00` | 4.7 | 3.2 | 3.1 |
| lime-900 | `#827717` | 4.6 | 3.5 | 3.4 |

---

### Pink / magenta family (8 pairs — 4 colours × 2 polarities)

| Colour | Hex | WCAG | OKCA L-o-D | OKCA D-o-L |
|--------|-----|-----:|----------:|----------:|
| pink-600 | `#d81b60` | 4.9 | 3.3 | 3.2 |
| pink-700 | `#c2185b` | 5.9 | 4.1 | 3.9 |
| pink-A700 | `#c51162` | 5.8 | 4.0 | 3.8 |
| purple-A700 | `#aa00ff` | 5.1 | 3.2 | 3.1 |

---

### Purple / indigo / blue family (16 pairs — 8 colours × 2 polarities, minus 1 L-o-D only)

| Colour | Hex | WCAG | OKCA L-o-D | OKCA D-o-L |
|--------|-----|-----:|----------:|----------:|
| purple-400 | `#ab47bc` | 4.8 | 3.3 | 3.1 |
| purple-500 | `#9c27b0` | 6.3 | 4.4 | 4.2 |
| deepPurple-400 | `#7e57c2` | 5.2 | 3.8 | 3.6 |
| deepPurple-A200 | `#7c4dff` | 4.8 | 3.3 | 3.1 |
| deepPurple-A400 D-o-L only | `#651fff` | 6.6 | — | 4.3 |
| indigo-400 | `#5c6bc0` | 4.9 | 3.6 | 3.5 |
| indigo-A400 | `#3d5afe` | 5.1 | 3.7 | 3.5 |
| indigo-A700 | `#304ffe` | 5.7 | 4.1 | 3.9 |
| blue-700 | `#1976d2` | 4.6 | 3.5 | 3.3 |
| blue-800 D-o-L only | `#1565c0` | 5.7 | — | 4.3 |
| blue-A700 | `#2962ff` | 4.9 | 3.5 | 3.4 |
| lightBlue-800 | `#0277bd` | 4.8 | 3.7 | 3.5 |

---

### Teal / cyan / green (10 pairs — 5 colours × 2 polarities)

| Colour | Hex | WCAG | OKCA L-o-D | OKCA D-o-L |
|--------|-----|-----:|----------:|----------:|
| cyan-800 | `#00838f` | 4.5 | 3.5 | 3.4 |
| teal-700 | `#00796b` | 5.3 | 4.3 | 4.1 |
| green-800 | `#2e7d32` | 5.1 | 4.1 | 3.9 |
| brown-400 | `#8d6e63` | 4.6 | 3.5 | 3.3 |
| grey-600 | `#757575` | 4.6 | 3.5 | 3.4 |
| blueGrey-600 | `#546e7a` | 5.4 | 4.3 | 4.1 |

---

## Radix UI Colors ≥3.0.0 — 61 (light) + 64 (dark) disagreements

Radix uses APCA as its contrast standard, not WCAG. Published accessibility guarantees cover only steps 11–12 for text on step-2 backgrounds within the same family. Steps 9–10 are solid-fill and interactive-state colours intended for backgrounds, borders, and non-text uses — not for text on white.

The 61 light and 64 dark Radix disagreements are almost entirely step-9 and step-10 entries paired against white. They are included in the disagreement count for completeness but carry less practitioner weight: Radix itself does not claim these are accessible text combinations.

---

## Cross-system observations

### Where OKCA and WCAG agree most
- Deep darks (shade 700–950 in Tailwind, 700–900 in Material) generally pass both
- Lights and near-whites pass both trivially
- Achromatic pairs above shade 600 pass both

### Where OKCA consistently disagrees
1. **Gray 500 zone** — the entire Tailwind neutral scale at 500 (~4.7–4.8 WCAG). These are the most important disagreements from a practitioner standpoint.
2. **Saturated chromatics at medium depth** — any hue with high chroma at a luminance level that puts it near the WCAG boundary. The chroma compression penalty is largest here.
3. **Blue / indigo / purple hues** — perceptually darker than luminance alone predicts; OKCA's chroma penalty compounds with perceived weight, producing gaps of 1.5–2.0 points against WCAG.
4. **Warm accent saturates** — Material's A-level accents (A400, A700) are highly saturated; chroma compression hits them hard regardless of their nominal luminance.

### The D-o-L asymmetry
Every colour in this document appears as both a L-o-D and D-o-L failure. The polarity model means D-o-L scores are consistently 0.1–0.3 below L-o-D scores for the same colour. White-on-colour fails for the same reason colour-on-white fails — these pairs are marginal in either direction.

### Practitioner benchmark
The canonical marginal pair — white on `#767676` — scores WCAG 4.5, OKCA 3.5 (L-o-D). Everything in this document is in the same zone or worse. A designer who accepts `#767676` as passing AA is accepting the same risk for every entry here.
