/**
 * OK Contrast Algorithm (OKCA)
 *
 * Clean-room implementation.  No third-party contrast algorithm source code.
 * IP status: clear.  Clean-room implementation.
 * Zero runtime dependencies.
 *
 * Algorithm overview (OKLCH-native with green correction and polarity scaling):
 *   1. Extract OKLCH L for each color (perceptually uniform lightness).
 *   2. Identify lighter element (higher L) and darker element.
 *      Determine polarity: light-on-dark (text is lighter) vs dark-on-light.
 *   3. Lighter element — chroma-weighted power compression:
 *        [_, a, b] = Oklab(lighter)
 *        C         = sqrt(a² + b²)
 *        satW      = min(1, (C / C_THRESH)²)    // quadratic ramp
 *        exp       = 1 + CHROMA_K × satW         // 1.0 … 1.75
 *        lighterY  = (lighterL ^ exp) ^ 3        // L → luminance proxy
 *   4. Darker element — green-hue correction:
 *        da        = Oklab(darker).a
 *        Fires only when da < -A_THRESH (true greens, not blues).
 *        darkLeff  = darkerL + K_DARK × (-da - A_THRESH)
 *        darkerY   = darkLeff ^ 3
 *   5. Polarity-aware contrast ratio:
 *        rawRatio  = (lighterY + 0.05) / (darkerY + 0.05)
 *        L-o-D:    ratio = rawRatio × LOD_SCALE
 *        D-o-L:    ratio = rawRatio × DOL_MULT − DOL_OFFSET  (linear model)
 *        clamped to [1, 21], rounded to 1 decimal place.
 *
 * Luminance proxy: L³ (OKLCH L cubed ≈ WCAG Y for neutral grays).
 *
 * Properties:
 *   - FP = 0 guaranteed (steps 3–4 reduce raw ratio; step 5 applies factor < 1
 *     so OKCA ≤ WCAG for all inputs)
 *   - Polarity-aware: light-on-dark scores higher than dark-on-light for the
 *     same color pair, reflecting the perceptual advantage of negative polarity
 *   - Low false-failure rate across design-system palettes
 */
import { hexToOklab, hexToOklch } from './transforms';

// ── Constants ─────────────────────────────────────────────────────────────────
const C_THRESH = 0.15;  // Oklab chroma for full lighter-element penalty
const CHROMA_K = 0.50;  // Power-compression exponent at full saturation
const K_DARK   = 0.155; // Green correction strength on darker element
const A_THRESH = 0.05;  // Oklab a gate: correction fires only when a < -A_THRESH
const LOD_SCALE  = 0.81; // Polarity scale for light-on-dark (text is lighter)
const DOL_MULT   = 0.78; // Dark-on-light multiplier component
const DOL_OFFSET = 0.36; // Dark-on-light additive offset (compresses high-contrast gap)

export class OkcaService {
  calculateContrast(textColor: string, bgColor: string): number | null {
    const tOklab = hexToOklab(textColor);
    const bOklab = hexToOklab(bgColor);
    if (!tOklab || !bOklab) return null;

    const tOklch = hexToOklch(textColor)!;
    const bOklch = hexToOklch(bgColor)!;

    const tL = Math.max(0, tOklch[0]);
    const bL = Math.max(0, bOklch[0]);

    // Identical lightness → no contrast
    if (Math.abs(tL - bL) < 1e-6) return 1;

    const isBoW    = bL >= tL;
    const lighterL = isBoW ? bL : tL;
    const darkerL  = isBoW ? tL : bL;
    const lighterOklab = isBoW ? bOklab : tOklab;
    const darkerOklab  = isBoW ? tOklab : bOklab;

    // Step 3 — lighter element: chroma-weighted power compression → luminance proxy
    const exp      = this.chromaExp(lighterOklab);
    const lighterY = Math.pow(Math.pow(lighterL, exp), 3);

    // Step 4 — darker element: green correction → luminance proxy
    const darkerY  = this.darkerLuminance(darkerOklab, darkerL);

    // Step 5 — polarity-aware scaling: light-on-dark has higher perceived contrast.
    // D-o-L uses a linear model (mult + offset) to compress the gap at high contrast
    // while preserving the achromatic grey anchor: #767676/white ≈ 3.2.
    const isLightOnDark = tL > bL;
    const rawRatio = (lighterY + 0.05) / (darkerY + 0.05);
    const ratio = isLightOnDark
      ? rawRatio * LOD_SCALE
      : rawRatio * DOL_MULT - DOL_OFFSET;
    return parseFloat(Math.max(1, Math.min(21, ratio)).toFixed(1));
  }

  /**
   * Chroma-weighted power exponent for the lighter element.
   * Returns 1.0 for achromatic colors, up to 1.75 for fully saturated (C ≥ C_THRESH).
   */
  private chromaExp(oklab: [number, number, number]): number {
    const a = oklab[1];
    const b = oklab[2];
    const C    = Math.sqrt(a * a + b * b);
    const satW = Math.min(1, (C / C_THRESH) ** 2);
    return 1 + CHROMA_K * satW;
  }

  /**
   * Darker element luminance proxy (L³) with optional green-hue correction.
   * Correction fires only for true greens (Oklab a < -A_THRESH), preventing
   * false passes where L³ undershoots WCAG Y due to green's high WCAG weight.
   */
  private darkerLuminance(oklab: [number, number, number], L: number): number {
    const da = oklab[1];
    const correction = da < -A_THRESH
      ? K_DARK * (-da - A_THRESH)
      : 0;
    const Leff = Math.min(1, L + correction);
    return Math.pow(Leff, 3);
  }
}

/**
 * Convenience function — calculates OKCA contrast ratio between two colors.
 *
 * @param a - First color (6-digit hex string, e.g. "#ff0000")
 * @param b - Second color (6-digit hex string)
 * @returns Contrast ratio in [1, 21] rounded to 1 decimal place, or null if either color is invalid
 */
export function calculateContrast(a: string, b: string): number | null {
  return new OkcaService().calculateContrast(a, b);
}

export { hexToOklab, hexToOklch, hexToSrgb, srgbToOklab, srgbToOklch } from './transforms';
