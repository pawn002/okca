# Changelog

All notable changes to this project will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

**Breaking — release as 3.0.0.** Against 2.0.3, OKCA adds two corrections for dark backgrounds, weights its colour terms by hue, scores both polarities on one scale, and derives every strength from data except the boundary anchor, which is stated as policy. The four achromatic anchors change only where the polarity scaling did. How each change was reached, including what was tried and dropped, is in `docs/HISTORY.md`.

### Changed
- **Opponent-axis colour terms, Steps 3–4 ([#28](https://github.com/pawn002/okca/issues/28), [#31](https://github.com/pawn002/okca/issues/31), [#33](https://github.com/pawn002/okca/issues/33)).** Both colour terms weight a colour by `w = (C + a·cos θ + b·sin θ) / 2`, linear in `a` and `b`, with no hue branch. The lighter colour's penalty runs along `OPP_THETA_L` = 9.4° (essentially Oklab's red–green axis), `exp = 1 + CHROMA_K·w_L/C_THRESH` with `CHROMA_K` = 0.22. A lift for the darker colour runs along `OPP_THETA_D` = 267° (blue), `eD = 1 + OPP_K_D·w_D/C_THRESH` with `OPP_K_D` = 0.065. Directions and strengths are fitted to one rule: the least correction at which no pair on a 262,144-pair grid scores above what a dichromat sees (Machado et al. 2009, severity 1.0). That is the rationale for the calibration, not a promise. Reds and magentas carry the most penalty; blues and greens much less. The chroma terms are no longer rotationally symmetric (`docs/OKCA_DESIGN.md` §2.4).
- **Step 4, background induction ([#26](https://github.com/pawn002/okca/issues/26)).** On a background darker than `#767676`, the darker colour's proxy becomes `L^(3s)` with `s = min(1, (1.48 + L_bg^1.5) / (1.48 + L_ref^1.5))`, using CAM16's own constant: a darker background flattens the lightness scale. It reaches mid-dark surfaces the flare ceiling leaves alone, and only ever lowers a score.
- **One cap for both polarities ([#30](https://github.com/pawn002/okca/issues/30)).** `LOD_CAP` 20.9 / `DOL_CAP` 20 become a single `CAP` = 20.9. Light-on-dark never outscores the same pair reversed, and every polarity difference comes from Steps 4 and 6, in the direction reading research supports.
- **Step 6, flare-robustness ceiling ([#25](https://github.com/pawn002/okca/issues/25)).** Each score is capped at what the pair keeps when WCAG's flare allowance doubles (`FLARE` = 0.10, `FLARE_K` = 1.5), computed on plain L³ and re-anchored to the same cap. On a near-black background a pair's ratio rests mostly on the near-zero denominator, which stray light erodes first. Text on dark surfaces needs about one palette grade more lightness to pass.
- **The boundary anchor is stated as policy.** White on `#767676` scores 3.9, which sets `POL_K` = 1.100. It is OKCA's one calibration input not set by measurement.

### Effect against 2.0.3
- On a 262,144-pair sRGB grid, 121,356 pairs rise and 21,344 fall; 3,867 newly pass AA and 1,287 lose it. No pair scores above WCAG.
- Examples: `#888888` on `#000000` 5.2 → 3.7; `#cccccc` on `#333333` 7.1 → 5.7; `#9f9f9f` on `#1a1a1a` 5.8 → 4.7; hot pink on `#1a1a1a` 3.6 → 4.1 (still fails AA); dark orange on `#1a1a1a` 4.2 → 4.8 (now passes); blue `#3b82f6` on black 2.4 → 3.6; green `#22c55e` on black 4.3 → 6.0; `#1d4ed8` on white 5.3 → 4.8; black on white 20.0 → 20.9; `#767676` on white 3.7 → 3.9.
- WCAG disagreements 97 → 107 (Tailwind 43, GOV.UK 14, USWDS 50).
- 92 curated probe values moved, 58 down and 34 up. Seventeen crossed 7.0; three crossed 4.5: white on `#3a7d44` 4.6 → 4.3, `#3a7d44` on white 4.4 → 4.5, and dark orange on `#1a1a1a` 4.2 → 4.8.
- **FP = 0 holds.** Steps 4 and 6 can only lower a score and need no new lemma (`docs/FP0_PROOF.md` §5–§6); lemma A is re-verified under Step 3's penalty. `npm run fp0` certifies with 0 uncertified boxes.

### Added
- `docs/HISTORY.md` — how OKCA reached its current state, including dead ends, and what is open.
- Research records, each with its script: `docs/MIDTONE_SURVEY_FINDINGS.md` (`npm run midtone`), `docs/CAM16_FINDINGS.md` (`npm run cam16`, `npm run induction`; `OKCA_CAM=ciecam16` re-runs under CIECAM16), `docs/CVD_FINDINGS.md` (`npm run cvd`), `docs/OPPONENT_AXIS_FINDINGS.md` (`npm run opponent`), `docs/POLARITY_FINDINGS.md` (`npm run polarity`), `docs/DARKER_LIFT_FINDINGS.md` (`npm run darker-lift`) and `docs/CHROMA_K_FINDINGS.md` (`npm run chroma-k`). `scripts/cvd.ts` is the shared colour-vision yardstick; it lives outside the algorithm.
- Tests: `flare-ceiling.spec.ts`, `background-induction.spec.ts` and `opponent-axis.spec.ts` pin each step's behaviour and assert its structural properties. "Hot pink on near-black fails AA" is pinned as a check on the derived penalty, not an input to it.

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
