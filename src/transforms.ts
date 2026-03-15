/**
 * Zero-dependency sRGB → Oklab / OKLCH transforms.
 *
 * Math: Björn Ottosson, "A perceptual color space for image processing" (2020).
 * https://bottosson.github.io/posts/oklab/
 */

// ── sRGB gamma ───────────────────────────────────────────────────────────────

/** sRGB component → linear (inverse electro-optical transfer function). */
function linearize(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// ── Hex parsing ──────────────────────────────────────────────────────────────

/**
 * Parse a 6-digit hex color string to sRGB [0-1] triplet.
 * Returns null for invalid input.
 */
export function hexToSrgb(hex: string): [number, number, number] | null {
  if (!hex.startsWith('#')) return null;
  let h = hex.slice(1);
  if (/^[0-9A-Fa-f]{3}$/.test(h)) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

// ── sRGB → Oklab ─────────────────────────────────────────────────────────────

/** Convert sRGB [0-1] triplet to Oklab [L, a, b]. */
export function srgbToOklab(rgb: [number, number, number]): [number, number, number] {
  const [r, g, b] = rgb.map(linearize);

  // Linear sRGB → LMS (Ottosson 2020 M1 matrix)
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  // Cube root (non-linearity)
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  // LMS^(1/3) → Oklab (Ottosson 2020 M2 matrix)
  return [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  ];
}

// ── sRGB → OKLCH ─────────────────────────────────────────────────────────────

/** Convert sRGB [0-1] triplet to OKLCH [L, C, H]. H in degrees. */
export function srgbToOklch(rgb: [number, number, number]): [number, number, number] {
  const [L, a, b] = srgbToOklab(rgb);
  const C = Math.sqrt(a * a + b * b);
  let H = Math.atan2(b, a) * (180 / Math.PI);
  if (H < 0) H += 360;
  return [L, C, H];
}

// ── Convenience: hex → Oklab / OKLCH ─────────────────────────────────────────

/** Parse hex string and return Oklab [L, a, b], or null if invalid. */
export function hexToOklab(hex: string): [number, number, number] | null {
  const rgb = hexToSrgb(hex);
  return rgb ? srgbToOklab(rgb) : null;
}

/** Parse hex string and return OKLCH [L, C, H], or null if invalid. */
export function hexToOklch(hex: string): [number, number, number] | null {
  const rgb = hexToSrgb(hex);
  return rgb ? srgbToOklch(rgb) : null;
}
