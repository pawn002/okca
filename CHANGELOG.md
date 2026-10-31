# Changelog

All notable changes to this project will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

**Breaking — release as 3.0.0.** Two changes on this line: CAM16 background induction ([#26](https://github.com/pawn002/okca/issues/26)) and opponent-axis chroma terms ([#28](https://github.com/pawn002/okca/issues/28)). Saturated warm colours and dark-background pairs score lower; saturated cool colours score higher. The four anchors are unchanged.

### Changed — opponent-axis chroma terms ([#28](https://github.com/pawn002/okca/issues/28))
- **Step 3's chroma ramp is weighted along Oklab's opponent axes.** It is driven by `w = (C + a·cos θ_L + b·sin θ_L) / 2` instead of chroma `C`. That is chroma in direction `θ_L`, half at 90° and zero opposite: linear in `a` and `b`, with no hue branch. `OPP_THETA_L` = 9.4°, essentially Oklab's +a axis, is the direction in which colour-vision deficiency loses the most contrast for light colours on dark backgrounds. Reds, oranges and magentas keep the full penalty; blues and greens, which dichromats see with little loss, carry much less of it.
- **Step 4 lifts the darker element along its own direction.** `OPP_THETA_D` = 313.7°, the direction of loss for dark colours on light backgrounds. Its strength `OPP_K_D` = 0.09 is the smallest at which no pair on a 262,144-pair grid scores above what a dichromat sees (Machado et al. 2009, severity 1.0). It only raises the darker proxy. Without it, easing the lighter penalty exposed dark saturated text on light fills, which the hue-uniform penalty had been covering by accident.
- **No constant is tuned.** Both directions are measured from CVD data, and `npm run opponent` re-derives them.
- **Effect against the line before this change:**
  - Pairs scoring above what a dichromat sees fall from 243 to 0, including 11 AA passes a dichromat fails.
  - Hot pink, pure red, dark orange and every anchor are unchanged.
  - Blue `#3b82f6` on black 2.4 → 4.4; green `#22c55e` on black 4.3 → 7.7; `#1d4ed8` on white 5.3 → 4.6.
- **Effect against 2.0.3, both changes together**, on the 262,144-pair grid: 103,953 pairs rise and 31,134 fall; 3,331 newly pass AA and 1,458 lose it.
- **WCAG disagreements 99 → 109** (Tailwind 45). The ten new ones are Tailwind saturated 600–700 shades in the purple–magenta–red range. 49 curated probe values moved: 37 down and 12 up. Nine crossed 7.0; none crossed 4.5.
- **Design principle changed.** The chroma terms are no longer rotationally symmetric in Oklab; they are weighted along its opponent axes (`docs/OKCA_DESIGN.md` §2.4).
- **FP = 0 re-verified.** Lemma A certifies under the opponent weight with 0 uncertified boxes; lemma B holds a fortiori. `npm run fp0` now runs the opponent weight by default; `OKCA_WEIGHT=chroma` re-runs the 2.x ramp.

### Changed — background induction ([#26](https://github.com/pawn002/okca/issues/26))

### Changed
- **Step 4 — background induction (CAM16).** On a background darker than the AA boundary grey, the darker element's proxy becomes `L^(3s)` instead of `L³`, with `s = min(1, (1.48 + L_bg^1.5) / (1.48 + L_ref^1.5))`. `L_bg` is the background's OKLab L and `L_ref` = 0.5658 is OKLab L of `#767676`. CAM16 shows a darker background flattens the lightness scale; at the AA line, a just-passing grey on `#1a1a1a` carried 25% less background-aware CAM16 lightness gap than one on white. The term uses CAM16's own constant and no tuned value. It applies only to the darker element, because CAM16's full form, lifting both, produced false passes.
- Examples: `#cccccc` on `#333333` 7.1 → 5.7; `#9f9f9f` on `#1a1a1a` 5.8 → 4.8; white on `#595959` 6.2 → 5.7; white on `#111111` 18.6 → 15.8; hot pink on `#1a1a1a` 3.6 → 3.0; dark orange on `#1a1a1a` 4.2 → 3.4. `#888888` on `#000000` is unchanged at 5.2: black's proxy is 0 for any `s`.
- **Hot pink and dark orange were not re-docked.** Restoring them by lowering `CHROMA_K` to 0.42 was tried and reverted: it loosened dark text on saturated fills, newly passing 1,338 pairs at AA on a 262,144-pair grid, and neither survey supports a weaker chroma penalty.
- On its own, against 2.0.3: no pair on that grid scores higher. 2,256 pairs lose AA and 915 lose AAA. Across Tailwind, GOV.UK and USWDS palettes as light text on 15 dark and mid-dark surfaces, 274 pairs lose AA and 490 lose AAA.
- WCAG disagreements 97 → 99: white on Tailwind lime-700 `#4d7c0f` and on GOV.UK blue `#1d70b8` each drop from 4.5 to 4.4.
- 42 curated probe values moved, all down. Eleven crossed 7.0 and one crossed 4.5 (white on `#3a7d44`, 4.6 → 4.4).
- FP = 0 needs no new lemma: induction only raises the darker proxy, so lemma B holds a fortiori (`docs/FP0_PROOF.md` §5). `npm run fp0` certifies with 0 uncertified boxes.

### Added
- `docs/CAM16_FINDINGS.md`, with `npm run cam16`, `npm run induction` and `scripts/cam16.ts`. The survey measures which viewing-condition factors Oklab fixes, and prototypes the term above. `OKCA_CAM=ciecam16` re-runs everything under CIECAM16 (CIE 248:2022), with identical results.
- `src/__tests__/background-induction.spec.ts` — pins mid-tones on dark backgrounds and asserts that the term is the identity on backgrounds at least as light as `#767676` and never raises a score.
- `docs/CVD_FINDINGS.md` (`npm run cvd`) and `docs/OPPONENT_AXIS_FINDINGS.md` (`npm run opponent`): the CVD survey and the derivation of the opponent-axis terms. `scripts/cvd.ts` is the shared CVD yardstick. It lives outside the algorithm.
- `src/__tests__/opponent-axis.spec.ts` — pins warm and cool behaviour, and asserts that the weight stays within [0, C] and that greys are untouched.

## [2.0.3] - 2026-08-13

Documentation only — no algorithm or API change. `contrast()` returns identical values to 2.0.0.

### Changed
- **Removed absolute claims about how a marginal pair looks.** The README and `docs/OKCA_DESIGN.md` said white on `#767676` "is not production-ready in most real designs"; `docs/WCAG_DISAGREEMENTS.md` said "a designer would generally not call any of these comfortable for body text on white". A threshold experiment ([#22](https://github.com/pawn002/okca/issues/22#issuecomment-5282357292)) measured the contrast at which body text was judged shippable at **5.2 under one display brightness and 2.8 under another** — same observer, same room, same session. OKCA scores that pair **3.9**, which falls between them, so the verdict on it inverts across ordinary viewing conditions. Replaced with the argument the measurement supports: a pair sitting on the AA line carries no margin against the conditions it will actually be read in, which is a case for a floor above the line on variance grounds rather than on appearance.
- `docs/CALIBRATION_EXPERIMENT.md` §1's constraint list is now signposted as the anchor values *as of the experiment's design*. Three of the four moved in 2.0.0 and its follow-on, and the prose had carried the stale figures through two recalibrations.

### Added
- `docs/OKCA_DESIGN.md` §10 — **"Does not model viewing conditions."** OKCA is a relative metric over sRGB with no access to absolute luminance, so it does not model the dependence above and no constant of its own could. The FP = 0 safety bound is unaffected, being a relation between two relative metrics.
- `src/__tests__/docs-lint.spec.ts` asserts any `ANCHORS:BEGIN`/`ANCHORS:END` table in `docs/` against the live `contrast()`, so quoted anchor values can no longer drift from the constants.

## [2.0.2] - 2026-07-27

No algorithm or API change — `contrast()` returns identical values to 2.0.0.

### Fixed
- **The ESM entry point now loads under native Node ESM.** `import { contrast } from '@pawn002/okca'` previously failed on a clean install. Two defects in the ESM build, either of which alone broke it: `dist/esm/*.js` emitted extensionless relative specifiers (`from './transforms'`), which Node ESM rejects; and nothing marked `dist/esm/` as ESM — no `package.json` with `{"type": "module"}` there and no `"type"` at the root — so Node treated the files `exports.import` points at as CommonJS. Failed on Node < 22.7 as `Cannot use import statement outside a module`, and on newer Node as a resolution error once syntax detection reparses the file. Present since at least 1.0.2; bundlers masked it by resolving extensionless specifiers themselves, and CommonJS consumers were never affected.

### Added
- `src/__tests__/package-entrypoints.spec.ts` — loads the built output in a real node process through both the `require` and `import` conditions. The suite otherwise only imports `src/`, which is the gap that let the above ship for three releases.
- `scripts/finalize-esm.mjs` — build step writing `dist/esm/package.json`. No new dependency.

## [2.0.1] - 2026-07-27

Documentation only — no algorithm or API change. `contrast()` returns identical values to 2.0.0.

### Fixed
- Maths in `docs/OKCA_DESIGN.md` that did not render on github.com: `\text{POL\_K}` / `\text{LOD\_CAP}` parse errors, `\approx 96\%` (the `%` started a comment and swallowed the span), a single-line `cases` block whose `\\` row break collapsed to `\`, and spans printed literally as `$...$`. Cause: GitHub runs its Markdown pass **before** handing the result to KaTeX, so Markdown rewrites the TeX first — validating the source with KaTeX locally does not catch this.

### Changed
- All maths across `docs/` is authored in LaTeX; remaining ASCII/Unicode formulas converted. `docs/FP0_PROOF.md` rewritten from code-fence ASCII to LaTeX, adopting the design-doc symbols.
- `src/__tests__/docs-lint.spec.ts` now covers every `docs/*.md` (was `OKCA_DESIGN.md` only) and gained rules for both GitHub-specific failure modes.
- `CLAUDE.md` documents the Markdown-before-KaTeX pipeline and how to verify rendered output.

## [2.0.0] - 2026-07-26

### Changed (breaking)
- Algorithm recalibrated — `contrast()` returns different ratios for the same inputs. Retuned constants: `CHROMA_K` = 0.65 (chroma-compression exponent, max 1.65), `POL_K` = 1.100 (shared polarity power curve), `LOD_CAP` = 20.9 (was 21), `DOL_CAP` = 20. Achromatic anchors: white/black = 20.9/20.0, white/#767676 = 3.9/3.7.
- Both polarities now share a single power curve `CAP × (rawRatio / 21) ^ POL_K` instead of a plain cap/clamp; `LOD_CAP < 21` keeps every score strictly below WCAG.

### Added
- **FP = 0 proven by construction** (`docs/FP0_PROOF.md`) — an exact identity plus two interval-verified single-color lemmas, with no calibration-dependent headroom. Verifier `npm run fp0` certifies with 0 uncertified boxes.
- CI invariant test (`src/__tests__/fp0-invariant.spec.ts`) asserting OKCA ≤ WCAG across the sRGB gamut (curated, random, grid, and green-band sweeps).
- Calibration/analysis tooling under `scripts/` (`npm run calibrate | hue | divergence | flexibility | fp0 | capcost`) plus `docs/CALIBRATION_EXPERIMENT.md` and `docs/GAMUT_SWEEP_FINDINGS.md`.
- `release:patch` / `release:minor` / `release:major` npm scripts.

## [1.0.2] - 2026-06-09

### Changed
- Documentation: clarified the scope of the FP = 0 claims (README, design doc, executive brief). "Zero false passes" holds **by construction on the achromatic axis** and is **verified across the sRGB gamut** for chromatic inputs — not a closed-form theorem. No algorithm change.
- npm package description scoped to "zero false passes **relative to WCAG**".

### Removed
- LaTeX/PDF design-doc twins (`docs/OKCA_DESIGN.tex`, `docs/OKCA_DESIGN.pdf`); `docs/OKCA_DESIGN.md` is now the single canonical design document.

## [1.0.1] - 2026-04-06

### Fixed
- README usage examples updated to `contrast()` — npm was serving the 1.0.0 tarball with the old `calculateContrast()` name

## [1.0.0] - 2026-04-06

### Changed (breaking)
- `calculateContrast` renamed to `contrast` on both `OkcaService` and the convenience function — consistent with chroma.js, culori, and other color library conventions
- Parameters renamed from `textColor`/`bgColor` to `foreground`/`background` — argument order documents polarity intent
- Algorithm: polarity-aware model replaces symmetric ratio — `contrast(fg, bg) ≠ contrast(bg, fg)` when lightness differs; L-o-D cap 21, D-o-L cap 20
- Algorithm: green-hue correction (`K_DARK`) removed — pure OKLCH/Oklab model with no hue-specific patches

### Added
- CSS `oklab()` and `oklch()` string inputs (all CSS angle units supported for hue)
- Dual CJS + ESM build output with `exports` field for bundler and Node ESM compatibility
- New transform exports: `oklchToOklab`, `oklabToOklch`, `cssOklabToOklab`, `cssOklchToOklch`

## [0.1.1] - 2026-03-16

### Fixed
- README install command and import examples now use the correct scoped package name `@pawn002/okca`

## [0.1.0] - 2026-03-15

### Added
- 3-digit hex shorthand support (`#fff`, `#f80`)
- GitHub Actions CI (Node 18/20/22) and npm publish on version tags

### Fixed
- README incorrectly claimed colorjs.io as a runtime dependency (it is zero-dependency)
- README incorrectly claimed support for CSS color strings beyond hex

## [0.0.1] - 2026-03-14

### Added
- Initial release
- `calculateContrast(a, b)` convenience function
- `OkcaService` class with `calculateContrast` method
- Zero-dependency sRGB → Oklab/OKLCH transforms (`hexToSrgb`, `srgbToOklab`, `srgbToOklch`, `hexToOklab`, `hexToOklch`)
- OKLCH-native contrast algorithm with chroma compression and green-hue correction
- FP = 0 guarantee against WCAG 2.x
- 2,228 tests across 4 test suites
