# Changelog

All notable changes to this project will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
