/**
 * OK Contrast Algorithm (OKCA)
 *
 * Clean-room implementation.  No third-party contrast algorithm source code.
 * IP status: clear.  Clean-room implementation.
 * Zero runtime dependencies.
 *
 * Algorithm overview (pure OKLCH/Oklab — no WCAG luminance formula):
 *   1. Extract OKLCH L for each color (perceptually uniform lightness).
 *   2. Identify lighter element (higher L) and darker element.
 *      Determine polarity: light-on-dark (text is lighter) vs dark-on-light.
 *   3. Lighter element — chroma-weighted power compression:
 *        [_, a, b] = Oklab(lighter)
 *        C         = sqrt(a² + b²)
 *        satW      = min(1, (C / C_THRESH)²)    // quadratic ramp
 *        exp       = 1 + CHROMA_K × satW         // 1.0 … 1.5
 *        lighterY  = (lighterL ^ exp) ^ 3        // L → luminance proxy
 *   4. Darker element — pure luminance proxy:
 *        darkerY   = darkerL ^ 3
 *   5. Polarity-aware contrast ratio:
 *        rawRatio  = (lighterY + 0.05) / (darkerY + 0.05)
 *        L-o-D:    ratio = 21       × (rawRatio / 21) ^ POL_K
 *        D-o-L:    ratio = DOL_CAP  × (rawRatio / 21) ^ POL_K
 *        Same power curve; DOL_CAP < 21 applies a proportional polarity penalty.
 *        clamped to [1, 21], rounded to 1 decimal place.
 *
 * Luminance proxy: L³ (OKLCH L cubed ≈ WCAG Y for neutral grays).
 *
 * Properties:
 *   - FP = 0 guaranteed (chroma compression reduces lighter element; polarity
 *     model applies power factor < 1 so OKCA ≤ WCAG for all inputs)
 *   - Polarity-aware: light-on-dark scores higher than dark-on-light for the
 *     same color pair; direction is a design input, not a symmetric quantity
 *   - Pure OKLCH/Oklab — no WCAG luminance formula, no hue-specific patches
 */
import { hexToOklab, cssOklabToOklab, cssOklchToOklch, oklchToOklab } from './transforms';

// ── Constants ─────────────────────────────────────────────────────────────────
const C_THRESH = 0.15;  // Oklab chroma for full lighter-element penalty
const CHROMA_K = 0.50;  // Power-compression exponent at full saturation
const POL_K    = 1.175; // Shared polarity power exponent: CAP*(r/21)^k
const DOL_CAP  = 20;    // D-o-L max contrast (vs 21 for L-o-D); proportional polarity penalty

/** Parse any supported color string to Oklab [L, a, b], or null if unrecognised. */
function parseToOklab(color: string): [number, number, number] | null {
  return hexToOklab(color)
    ?? cssOklabToOklab(color)
    ?? (() => { const lch = cssOklchToOklch(color); return lch ? oklchToOklab(lch) : null; })();
}

export class OkcaService {
  contrast(foreground: string, background: string): number | null {
    const tOklab = parseToOklab(foreground);
    const bOklab = parseToOklab(background);
    if (!tOklab || !bOklab) return null;

    // L is identical in Oklab and OKLCH — no separate OKLCH parse needed.
    const tL = Math.max(0, tOklab[0]);
    const bL = Math.max(0, bOklab[0]);

    // Identical lightness → no contrast
    if (Math.abs(tL - bL) < 1e-6) return 1;

    const isBoW        = bL >= tL;
    const lighterL     = isBoW ? bL : tL;
    const darkerL      = isBoW ? tL : bL;
    const lighterOklab = isBoW ? bOklab : tOklab;

    // Step 3 — lighter element: chroma-weighted power compression → luminance proxy
    const exp      = this.chromaExp(lighterOklab);
    const lighterY = Math.pow(Math.pow(lighterL, exp), 3);

    // Step 4 — darker element: pure luminance proxy (L³)
    const darkerY  = Math.pow(darkerL, 3);

    // Step 5 — polarity-aware scaling: light-on-dark has higher perceived contrast.
    // Both polarities use the same power curve CAP*(r/21)^POL_K; DOL_CAP < 21
    // applies a proportional penalty at every contrast level.
    const isLightOnDark = tL > bL;
    const rawRatio = (lighterY + 0.05) / (darkerY + 0.05);
    const cap = isLightOnDark ? 21 : DOL_CAP;
    const ratio = cap * Math.pow(rawRatio / 21, POL_K);
    return parseFloat(Math.max(1, Math.min(21, ratio)).toFixed(1));
  }

  /**
   * Chroma-weighted power exponent for the lighter element.
   * Returns 1.0 for achromatic colors, up to 1.5 for fully saturated (C ≥ C_THRESH).
   */
  private chromaExp(oklab: [number, number, number]): number {
    const a = oklab[1];
    const b = oklab[2];
    const C    = Math.sqrt(a * a + b * b);
    const satW = Math.min(1, (C / C_THRESH) ** 2);
    return 1 + CHROMA_K * satW;
  }
}

/**
 * Convenience function — calculates OKCA contrast ratio between two colors.
 *
 * Accepts hex strings (`#rrggbb`, `#rgb`), CSS `oklab()`, and CSS `oklch()`.
 *
 * **Argument order matters.** OKCA is polarity-aware: the same color pair scores
 * differently depending on which element is foreground and which is background.
 * For text this is unambiguous. For other visual elements (icons, borders, fills)
 * the caller determines which role each color plays.
 *
 * @param foreground - The element being evaluated (text, icon, or other visual element)
 * @param background - The surface it sits on
 * @returns Contrast ratio in [1, 21] rounded to 1 decimal place, or null if either color is invalid
 */
export function contrast(foreground: string, background: string): number | null {
  return new OkcaService().contrast(foreground, background);
}

export {
  hexToOklab, hexToOklch, hexToSrgb, srgbToOklab, srgbToOklch,
  oklchToOklab, oklabToOklch,
  cssOklabToOklab, cssOklchToOklch,
} from './transforms';
