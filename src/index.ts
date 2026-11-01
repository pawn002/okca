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
 *   3. Lighter element — opponent-axis power compression:
 *        [_, a, b] = Oklab(lighter)
 *        w         = (C + a·cos θ_L + b·sin θ_L) / 2,  C = sqrt(a² + b²)
 *        satW      = min(1, (w / C_THRESH)²)    // quadratic ramp
 *        exp       = 1 + CHROMA_K × satW         // 1.0 … 1.65
 *        lighterY  = (lighterL ^ exp) ^ 3        // L → luminance proxy
 *      w is chroma weighted toward OPP_THETA_L ≈ Oklab's +a axis, the
 *      red–green opponent channel colour-vision deficiency loses
 *      (docs/OPPONENT_AXIS_FINDINGS.md). Reds keep the full penalty; cool
 *      colours, which dichromats see with little loss, are penalised less.
 *   4. Darker element — background induction and opponent-axis lift:
 *        s         = min(1, (IND_Z + bgL^1.5) / (IND_Z + IND_REF_L^1.5))
 *        eD        = 1 + OPP_K_D × w_D / C_THRESH,  w_D along θ_D (linear, uncapped)
 *        darkerY   = darkerL ^ (3 × s / eD)
 *      CAM16's background induction (docs/CAM16_FINDINGS.md): a background
 *      darker than the AA boundary grey lifts the darker element's effective
 *      lightness. eD lifts dark colours that dichromats see as lighter, in the
 *      direction and proportion OKCA needs (docs/DARKER_LIFT_FINDINGS.md).
 *      Both only raise the proxy; it stays L³ for greys on lighter backgrounds.
 *   5. Contrast ratio:
 *        rawRatio  = (lighterY + 0.05) / (darkerY + 0.05)
 *        ratio     = CAP × (rawRatio / 21) ^ POL_K
 *        CAP < 21 keeps OKCA strictly below WCAG. The same cap applies in both
 *        polarities: polarity differences come only from Steps 4 and 6, which
 *        tighten dark backgrounds (docs/POLARITY_FINDINGS.md).
 *   6. Flare-robustness ceiling — the same curve on the uncompressed proxies
 *      with a larger flare term, re-anchored to the same cap:
 *        flareRatio = (lighterL³ + FLARE) / (darkerL³ + FLARE)
 *        ceiling    = CAP × (flareRatio / ((1 + FLARE) / FLARE)) ^ FLARE_K
 *        score      = min(ratio, ceiling), clamped to [1, 21], rounded to 1 dp.
 *      Binds only where the ratio leans on a near-black darker element, which
 *      stray light erodes first (docs/MIDTONE_SURVEY_FINDINGS.md). Never binds
 *      on a white/grey pair.
 *
 * Luminance proxy: L³ (OKLCH L cubed ≈ WCAG Y for neutral grays). Step 4
 * raises the darker element's exponent to 3s/eD ≤ 3.
 *
 * Properties:
 *   - FP = 0 by construction (docs/FP0_PROOF.md): with CAP < 21 the step-5
 *     ratio is strictly ≤ WCAG for every sRGB pair — reduced to an exact identity
 *     plus two interval-verified single-color lemmas, no calibration-dependent
 *     headroom. Step 4 only raises the darker proxy (3s/eD ≤ 3, L ≤ 1) and Step 6
 *     takes a minimum; both can only lower the score.
 *   - Background-aware: on backgrounds darker than #767676 the darker element's
 *     lightness is corrected for the background, following CAM16.
 *   - Flare-robust: a pair scores no higher than the contrast it keeps when the
 *     flare allowance doubles, so dark-mode greys carry the same margin as
 *     light-mode ones at the same score.
 *   - Polarity-aware: foreground and background roles matter, because dark
 *     backgrounds measurably cost contrast (Steps 4 and 6). Dark-on-light never
 *     scores lower than the same pair reversed; there is no editorial bias.
 *   - Pure OKLCH/Oklab — no WCAG luminance formula, no hue branch. The chroma
 *     terms are weighted along Oklab's opponent axes, linearly in a and b.
 */
import { hexToOklab, cssOklabToOklab, cssOklchToOklch, oklchToOklab } from './transforms.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const C_THRESH = 0.15;  // Oklab chroma for full lighter-element penalty
const CHROMA_K = 0.65;  // Power-compression exponent at full saturation
const POL_K    = 1.100; // Shared polarity power exponent: CAP*(r/21)^k
const CAP      = 20.9;  // Max contrast, both polarities (< 21 keeps OKCA strictly below WCAG → FP=0 by construction)
const IND_Z     = 1.48;          // CAM16's lightness-exponent constant, z = 1.48 + sqrt(Yb)
const IND_REF_L = 0.5658363271;  // OKLab L of #767676: backgrounds at or above it keep s = 1
const OPP_THETA_L = 9.4;   // Direction of CVD contrast loss for lighter colours, degrees in (a, b)
const OPP_THETA_D = 267;   // Direction in (a, b) where darker colours need a lift (≈ Oklab −b)
const OPP_K_D     = 0.070; // Darker-lift strength: smallest with no grid pair above the CVD ratio
const FLARE     = 0.10;  // Flare allowance for the step-6 ceiling (2× WCAG's 0.05)
const FLARE_K   = 1.5;   // Ceiling exponent: the largest that leaves every white/grey pair untouched

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

    // Step 3 — lighter element: opponent-axis power compression → luminance proxy
    const exp      = 1 + CHROMA_K * this.ramp(this.opponentWeight(lighterOklab, OPP_THETA_L));
    const lighterY = Math.pow(Math.pow(lighterL, exp), 3);

    // Step 4 — darker element: luminance proxy with CAM16 background induction.
    // A darker background flattens the lightness scale, lifting the darker
    // element's effective lightness; s ≤ 1, so the proxy only rises.
    const s        = Math.min(1, (IND_Z + Math.pow(bL, 1.5)) / (IND_Z + Math.pow(IND_REF_L, 1.5)));
    // Opponent-axis lift: dark colours that dichromats see as lighter (≤ 1 → ≥ L³).
    const darkerOklab = isBoW ? tOklab : bOklab;
    const eD       = 1 + (OPP_K_D * this.opponentWeight(darkerOklab, OPP_THETA_D)) / C_THRESH;
    const darkerY  = Math.pow(darkerL, (3 * s) / eD);

    // Step 5 — power-curve scaling: CAP*(r/21)^POL_K, the same in both polarities.
    // CAP < 21 keeps every score strictly below WCAG (FP=0 by construction).
    const rawRatio = (lighterY + 0.05) / (darkerY + 0.05);
    const ratio = CAP * Math.pow(rawRatio / 21, POL_K);

    // Step 6 — flare-robustness ceiling: the same curve on the uncompressed L³
    // proxies with twice WCAG's flare allowance, re-anchored so white/black is
    // unchanged. A minimum, so it can only lower the score (FP=0 is inherited).
    // Flare is physical light added to both patches, so it acts on plain L³ —
    // not on Step 4's induced proxy, which is a perceptual correction.
    const flareRatio = (Math.pow(lighterL, 3) + FLARE) / (Math.pow(darkerL, 3) + FLARE);
    const ceiling    = CAP * Math.pow(flareRatio / ((1 + FLARE) / FLARE), FLARE_K);
    return parseFloat(Math.max(1, Math.min(21, ratio, ceiling)).toFixed(1));
  }

  /**
   * Opponent-axis weight: chroma C in direction θ, C/2 at 90° from it, 0 opposite.
   * Linear in a and b, no hue branch. Always in [0, C].
   */
  private opponentWeight(oklab: [number, number, number], thetaDeg: number): number {
    const a = oklab[1];
    const b = oklab[2];
    const t = (thetaDeg * Math.PI) / 180;
    return (Math.sqrt(a * a + b * b) + a * Math.cos(t) + b * Math.sin(t)) / 2;
  }

  /** Quadratic ramp to full strength at C_THRESH. */
  private ramp(w: number): number {
    return Math.min(1, (w / C_THRESH) ** 2);
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
} from './transforms.js';
