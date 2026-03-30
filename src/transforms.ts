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

// ── Oklab ↔ OKLCH ─────────────────────────────────────────────────────────────

/** Convert OKLCH [L, C, H] to Oklab [L, a, b]. H in degrees. */
export function oklchToOklab([L, C, H]: [number, number, number]): [number, number, number] {
  const hRad = H * (Math.PI / 180);
  return [L, C * Math.cos(hRad), C * Math.sin(hRad)];
}

/** Convert Oklab [L, a, b] to OKLCH [L, C, H]. H in degrees. */
export function oklabToOklch([L, a, b]: [number, number, number]): [number, number, number] {
  const C = Math.sqrt(a * a + b * b);
  let H = Math.atan2(b, a) * (180 / Math.PI);
  if (H < 0) H += 360;
  return [L, C, H];
}

// ── CSS Color Level 4 parsers ─────────────────────────────────────────────────

/** Parse a numeric CSS token with optional percentage. pctRef is the value 100% maps to. */
function parseCssValue(token: string, pctRef: number): number | null {
  if (token.endsWith('%')) {
    const n = parseFloat(token);
    return isNaN(n) ? null : (n / 100) * pctRef;
  }
  const n = parseFloat(token);
  return isNaN(n) ? null : n;
}

/** Parse a CSS angle token. Defaults to degrees if no unit. */
function parseCssAngle(token: string): number | null {
  if (token.endsWith('grad')) return parseFloat(token) * (360 / 400);
  if (token.endsWith('turn')) return parseFloat(token) * 360;
  if (token.endsWith('rad'))  return parseFloat(token) * (180 / Math.PI);
  if (token.endsWith('deg'))  return parseFloat(token);
  const n = parseFloat(token);
  return isNaN(n) ? null : n;
}

/**
 * Parse a CSS oklab() string to Oklab [L, a, b].
 *
 * Accepts: `oklab(L a b)` or `oklab(L a b / alpha)` (alpha ignored).
 * L: number 0–1, or percentage 0%–100%.
 * a, b: number, or percentage where 100% = 0.4 (CSS Color Level 4).
 * Returns null for invalid input.
 */
export function cssOklabToOklab(str: string): [number, number, number] | null {
  const m = str.trim().match(/^oklab\(\s*([\s\S]+?)\s*\)$/i);
  if (!m) return null;
  const parts = m[1].split('/')[0].trim().split(/[\s,]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const L = parseCssValue(parts[0], 1);
  const a = parseCssValue(parts[1], 0.4);
  const b = parseCssValue(parts[2], 0.4);
  if (L === null || a === null || b === null) return null;
  return [L, a, b];
}

/**
 * Parse a CSS oklch() string to OKLCH [L, C, H].
 *
 * Accepts: `oklch(L C H)` or `oklch(L C H / alpha)` (alpha ignored).
 * L: number 0–1, or percentage 0%–100%.
 * C: number, or percentage where 100% = 0.4 (CSS Color Level 4).
 * H: angle in deg (default), rad, turn, or grad.
 * Returns null for invalid input.
 */
export function cssOklchToOklch(str: string): [number, number, number] | null {
  const m = str.trim().match(/^oklch\(\s*([\s\S]+?)\s*\)$/i);
  if (!m) return null;
  const parts = m[1].split('/')[0].trim().split(/[\s,]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const L = parseCssValue(parts[0], 1);
  const C = parseCssValue(parts[1], 0.4);
  const H = parseCssAngle(parts[2]);
  if (L === null || C === null || H === null) return null;
  return [L, C, H];
}
