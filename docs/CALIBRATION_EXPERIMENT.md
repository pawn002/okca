# OKCA Calibration Experiment — Reducing Conservatism (sRGB)

**Status:** experiment complete **and follow-up applied.** The experiment
concluded that the only clean-room, FP=0-safe lever was the white/#767676
anchor; that anchor was subsequently raised **3.5 → 3.9** (`POL_K` 1.175 →
**1.100**), recovering **14** of the 111 WCAG disagreements (111 → **97**:
Tailwind 46→34, GOV.UK 15→13, USWDS 50→50) while preserving FP=0. Because the
global `POL_K` lift also loosened OKCA's saturated-colour catches, the chroma
penalty was strengthened in tandem (**`CHROMA_K` 0.50 → 0.65**) to re-dock vivid
foregrounds — a lever cleanly decoupled from the grey recovery. See
**§8 — Applied change** below. The body (§1–§7) records the method and data
that led there; the tables in §5–§6 use the pre-change baseline.

Reproduce all numbers below with:

```
npm run calibrate
```

(harness: `scripts/calibration-sweep.ts`, palettes: `scripts/palettes.ts`).

---

## 1. Question

OKCA is deliberately conservative: it under-rates contrast and produces false
*failures* (fails pairs WCAG passes). The 111 documented WCAG disagreements
(`docs/WCAG_DISAGREEMENTS.md`) are exactly these under-calls. Can we make it
less conservative **without** giving up its core safety property?

### Constraints (agreed up front)

1. **FP=0 stays hard** — OKCA must never score above WCAG for any sRGB pair
   (with production rounding). Non-negotiable (`OKCA_DESIGN.md` §2.1).
2. **All 4 achromatic anchors stay fixed** (white/black 21.0, black/white 20.0,
   white/#767676 3.5, #767676/white 3.3).
3. **Clean-room origin preserved** — no source, formula, or model from any
   external contrast library. The published WCAG 2.x relative-luminance formula
   is exempt (OKCA already references it and reimplements it inline in tests).
4. **Scope: chromatic only** — recover conservatism on chromatic colours; leave
   neutral/grey behaviour as-is.

### What the constraints leave free

The four constants (`src/index.ts:39-42`) are the only tunable surface. Fixing
the anchors pins two of them:

- white/#767676 → 3.5 (L-o-D) **pins `POL_K = 1.175`**.
- black/white → 20.0 (D-o-L) **pins `DOL_CAP = 20`** — that pair evaluates to
  `cap * (21/21)^POL_K = DOL_CAP`.

So under constraints (2)+(4) the only genuinely free knobs are **`C_THRESH` and
`CHROMA_K`** — the lighter-element chroma penalty (`chromaExp`,
`src/index.ts:90-96`). Because every anchor is achromatic (`C=0 → exp=1`),
retuning these two cannot move any anchor by construction.

---

## 2. Why "sample 95% of sRGB" is the wrong instrument

The original instinct was to calibrate against a broad uniform sample of sRGB.
Three corrections shaped the harness instead:

1. **Coverage is not the bottleneck — a ground-truth *label* is.** WCAG cannot
   be the calibration target (OKCA deliberately undercuts it; calibrating toward
   it just reproduces WCAG). With no external perceptual model allowed, the only
   legitimate signal is the WCAG ceiling used **one-sidedly**: "reduce the
   WCAG − OKCA gap wherever FP=0 does not require it."
2. **Uniform *RGB* is the wrong space.** The free knobs act on **chroma** in
   OKLCH; most of sRGB's volume sits far from the 4.5/7.0 decision boundary and
   carries ~no calibration information. The harness samples a gamut-valid sRGB
   grid tagged with OKLCH and concentrates on the regions that matter.
3. **One sample set can't do two jobs.** The FP=0 *constraint* is decided by
   rare adversarial pairs (chromatic-darker, the green-darker band); the
   conservatism *objective* is measured where scores actually change. The
   harness keeps a broad **FP corpus** (2.79M pairs) and a focused
   **light-chromatic corpus** (2.40M pairs whose lighter element is chromatic).

---

## 3. Harness and baseline fidelity

`scripts/calibration-sweep.ts` reuses only in-repo, clean-room pieces: the
forward transforms (`src/transforms.ts`), the seeded `randomHexPairs` PRNG
(mulberry32, as in the oracle test), and the inline WCAG formula. It
parameterises OKCA over `C_THRESH`/`CHROMA_K`/`POL_K` so candidates are scored
without editing source.

**Fidelity self-check:** at baseline constants the harness matches production
`contrast()` on all design-system pairs + 5,000 random pairs — **0 mismatches**.
It reproduces the documented baseline exactly:

- FP count (strong: OKCA_rounded > WCAG_rounded) over 2.79M pairs: **0**
- worst overshoot `max(OKCA_raw − WCAG_raw)`: **−0.0000** (the white/black anchor)
- design-system WCAG disagreements: **111** (matches `probe-design-systems.spec.ts`)

---

## 4. Result 1 — the free knobs cannot move the 111

Grid search over `C_THRESH ∈ {0.15…0.30}` × `CHROMA_K ∈ {0.20…0.50}` (POL_K,
DOL_CAP, anchors all fixed):

- **Every one of the 35 candidates holds FP=0** across all 2.79M pairs,
  including the green-darker stress band. Worst overshoot never leaves the
  white/black anchor.
- **Recovered disagreements: 0 in every candidate.** The count stays pinned at
  111.

**Why:** every design-system pair is a colour paired with **white**, and white
(L≈1) is always the *lighter* element. The chroma penalty acts only on the
lighter element, so it **never fires on any of the 111**. Those under-calls are
driven by the *darker* element's chroma through the global `POL_K` compression —
which the fixed anchors lock. The two in-scope knobs are orthogonal to the
documented conservatism.

## 5. Result 2 — the chroma penalty *can* relax, but FP-safety is the wrong test

Where the penalty **does** fire — light chromatic foregrounds (light
yellow/cyan/green text on dark UI, e.g. the `#ffff99 on #1a1a1a` probe case) —
relaxing it recovers large numbers of AA/AAA calls with **zero** FP:

| C_THRESH | CHROMA_K | FP | AA calls recovered | AAA recovered | mean lift |
|---:|---:|:--:|---:|---:|---:|
| 0.15 | 0.50 | 0 | 0 | 0 | 0.000 |
| 0.15 | 0.45 | 0 | 15,365 | 5,309 | 0.056 |
| 0.20 | 0.35 | 0 | 78,659 | 28,618 | 0.281 |
| 0.30 | 0.20 | 0 | 154,599 | 59,947 | 0.538 |

This overturns a natural assumption: the chroma penalty is **not** what
guarantees FP=0 for the green-darker overshoot — the `POL_K` compression is. The
penalty is OKCA's deliberate **perceptual correction** for WCAG over-rating
saturated colours (hot pink `#ff69b4` on `#1a1a1a`: WCAG 6.6 vs OKCA 3.7).

So FP-safety does **not** justify relaxing it. Moving it toward WCAG would
re-introduce exactly the saturated-colour over-rating OKCA exists to fix, and
deciding "how much is too much" requires a perceptual reference — which
constraints (3) rules out. **No defensible move exists for these two knobs under
the agreed constraints.**

## 6. Result 3 — the real lever is the grey anchor, and FP=0 bounds it

The 111 are governed by `POL_K`, pinned by the white/#767676 anchor. An
out-of-scope, **measurement-only** probe (changes no source) raised that anchor
and re-derived `POL_K = ln(target/21) / ln(raw₇₆₇/21)`, then re-checked FP=0
over the full 2.79M-pair corpus and disagreement recovery:

| white/#767676 | POL_K | FP=0 held? | of 111 recovered |
|---:|---:|:--:|---:|
| 3.50 (current) | 1.170 | ✅ | 0 |
| 3.60 | 1.152 | ✅ | 5 |
| 3.70 | 1.134 | ✅ | 8 |
| 3.80 | 1.117 | ✅ | 11 |
| **4.00** | **1.083** | **✅** | **17** |
| 4.25 | 1.043 | ❌ (76 FP) | 32 |
| 4.50 | 1.006 | ❌ (11,837 FP) | 64 |

Raising the anchor lowers `POL_K` → less global compression → less FP=0
headroom. The **FP=0 wall sits at ≈4.0–4.1**, and the first violation is
`#ffddff on #004400` (light magenta on dark green) — precisely the green-darker
overshoot region `OKCA_DESIGN.md` §4 documents. Unlike the chroma penalty, this
knob trades directly against FP=0, so FP=0 **itself** defines the safe range —
no perceptual oracle needed.

Raising white/#767676 from 3.5 → **~3.8–4.0** recovers **11–17** of the 111 —
including the practitioner-critical grey/dark zone — while provably holding FP=0
across the whole sRGB stress corpus.

---

## 7. Decision

Under the agreed constraints the two free knobs (`C_THRESH`, `CHROMA_K`) can't
touch the documented conservatism, and relaxing them is FP-safe but perceptually
unjustifiable without a reference the project ruled out. The single
high-leverage, clean-room, FP=0-preserving move is to raise the white/#767676
anchor — it directly de-conservatises the grey/dark under-calls, needs only the
WCAG ceiling and the FP=0 frontier to calibrate, and its safe ceiling (~4.0) is
discovered, not assumed. That move was chosen and applied (§8).

If instead the goal is to relax the saturated-colour penalty defensibly, that
requires a perceptual ground truth. The only clean-room path is a
project-owned perceptual dataset (a heavy, separate effort) — not a constant
retune.

## 8. Applied change — anchor 3.9 (`POL_K` 1.100) + chroma penalty (`CHROMA_K` 0.65)

Two coupled constant changes, applied together. `C_THRESH`, `DOL_CAP`, and the
L-o-D cap 21 are unchanged.

**(a) Anchor: white/#767676 → 3.9 (`POL_K` 1.175 → 1.100).** Raised to 3.9 (a
balanced point below the ~4.0–4.1 FP=0 wall). Exact derivation
`POL_K = ln(3.9/21)/ln(4.54/21) ≈ 1.0996`, rounded to **1.100** (the value at
which `contrast('#ffffff','#767676')` rounds to 3.9).

**(b) Chroma penalty: `CHROMA_K` 0.50 → 0.65.** `POL_K` is global, so lowering
it (step a) lifts *every* score — including OKCA's deliberate saturated-colour
catches. Dark orange/near-black crossed from 4.2 (fail) to 4.7 (pass) and hot
pink thinned from 3.7 to 4.1. Strengthening the chroma penalty re-docks vivid
foregrounds to their intended sub-AA scores. This lever is **cleanly decoupled**
from step (a): the penalty acts only on the *lighter* element, and every
design-system disagreement pairs a colour with white (white is the lighter
element), so the 97-count is untouched; achromatic anchors (C=0) are untouched;
and strengthening a penalty only *lowers* chromatic scores, so FP=0 is preserved
by construction. `CHROMA_K = 0.65` was chosen as the value that restores dark
orange to 4.2 and hot pink to 3.7 — their exact pre-recalibration scores — while
leaving light pastels (low chroma → small penalty) essentially unchanged.

**Result (measured, `npm run calibrate` + `npm test`):**

- New anchors: white/#767676 = **3.9** (L-o-D), #767676/white = **3.7** (D-o-L);
  white/black 21.0 and black/white 20.0 unchanged.
- WCAG disagreements: **111 → 97** (Tailwind 46→34, GOV.UK 15→13, USWDS 50→50) —
  14 mid-range grey/dark chromatics that sat just under 4.5 now clear AA;
  identical under both `CHROMA_K` values (the decoupling).
- Vivid saturated catches restored: hot pink/near-black **3.7**, dark
  orange/near-black **4.2** (both fail AA); luminous hues (green, cyan, yellow)
  and light pastels still pass, unchanged.
- **FP = 0 preserved**, verified at the final constants: the 2.79M-pair broad
  sweep (0 FP), a **106M-pair** dense green-darker adversarial scan (0 FP), and
  the design-system `probe-design-systems.spec.ts` FP=0 test. `POL_K ≥ 1` keeps
  the achromatic FP=0-by-construction proof intact.

All five synced docs, both probe specs, the oracle mirror, and this file were
updated per the `CLAUDE.md` checklist.

## 9. Follow-on — `LOD_CAP` 21 → 20.9 (issue #14, FP=0 by construction)

§8's values were at the light-on-dark cap of 21 (white/black = 21.0). As a
separate step to make FP=0 a **theorem** rather than a gamut-verified property,
the light-on-dark cap was lowered to **`LOD_CAP = 20.9`** (see `docs/FP0_PROOF.md`).
This removes the single white-on-black equality point, so OKCA is *strictly*
below WCAG everywhere and the interval verifier certifies the full gamut with 0
uncertified boxes.

Effect on the numbers above: all **light-on-dark** scores scale by 20.9/21
(dark-on-light, cap 20, is unchanged). So white/black = **20.9**, hot
pink/near-black **3.7 → 3.6**; dark orange stays 4.2. The **disagreement count is
unchanged at 97** (34/13/50), and no design-system pair flips. Cost measured by
`npm run capcost`: 0.58% of white-on-colour AA colours, light-mode untouched.
