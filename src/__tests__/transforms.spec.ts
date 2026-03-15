/**
 * Oracle tests: validate custom sRGB→Oklab/OKLCH transforms against colorjs.io.
 *
 * colorjs.io is the reference implementation. These tests ensure our zero-dep
 * transforms produce identical results (within floating-point tolerance).
 */
import Color from 'colorjs.io';
import { hexToSrgb, srgbToOklab, srgbToOklch, hexToOklab, hexToOklch } from '../transforms';

const EPSILON = 1e-10;

// ── Test color sets ──────────────────────────────────────────────────────────

/** Hand-picked edge cases. */
const EDGE_CASES = [
  '#000000', '#ffffff', '#808080',
  '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff',
  '#010101', '#fefefe',
  '#767676', // WCAG AA boundary gray
  '#228b22', // forest green (green correction target)
  '#006400', '#008000', '#00ff00', // greens at various lightness
  '#000080', '#0000ff', '#1d4ed8', // blues
  '#4b0082', '#800080',            // purples
  '#8b0000', '#ff0000', '#b22222', // reds
  '#008080', '#006666',            // teals
  '#ff69b4', '#ff8c00',            // hot pink, dark orange
  '#add8e6', '#90ee90', '#ffff99', // light blue, light green, light yellow
];

/** Generate random hex colors for broader coverage. */
function randomHexColors(count: number, seed: number): string[] {
  // Simple seeded PRNG (mulberry32)
  let s = seed;
  const rand = () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const r = Math.floor(rand() * 256).toString(16).padStart(2, '0');
    const g = Math.floor(rand() * 256).toString(16).padStart(2, '0');
    const b = Math.floor(rand() * 256).toString(16).padStart(2, '0');
    colors.push(`#${r}${g}${b}`);
  }
  return colors;
}

const RANDOM_COLORS = randomHexColors(500, 42);
const ALL_COLORS = [...EDGE_CASES, ...RANDOM_COLORS];

// ── Helpers ──────────────────────────────────────────────────────────────────

function refOklab(hex: string): [number, number, number] {
  const c = new Color(hex).to('oklab');
  return [c.coords[0], c.coords[1], c.coords[2]];
}

function refOklch(hex: string): [number, number, number] {
  const c = new Color(hex).to('oklch');
  return [c.coords[0], c.coords[1], c.coords[2]];
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('hexToSrgb', () => {
  it('parses valid 6-digit hex', () => {
    expect(hexToSrgb('#ff8000')).toEqual([1, 128 / 255, 0]);
  });

  it('parses valid 3-digit hex shorthand', () => {
    expect(hexToSrgb('#fff')).toEqual([1, 1, 1]);
    expect(hexToSrgb('#000')).toEqual([0, 0, 0]);
    expect(hexToSrgb('#f80')).toEqual([1, 136 / 255, 0]);
  });

  it('returns null for invalid input', () => {
    expect(hexToSrgb('not-a-color')).toBeNull();
    expect(hexToSrgb('#gggggg')).toBeNull();
    expect(hexToSrgb('#gg')).toBeNull();
    expect(hexToSrgb('')).toBeNull();
  });
});

describe('srgbToOklab — oracle vs colorjs.io', () => {
  it.each(ALL_COLORS)('%s', (hex) => {
    const rgb = hexToSrgb(hex)!;
    const [L, a, b] = srgbToOklab(rgb);
    const [refL, refA, refB] = refOklab(hex);

    expect(L).toBeCloseTo(refL, 7);
    expect(a).toBeCloseTo(refA, 7);
    expect(b).toBeCloseTo(refB, 7);
  });
});

describe('srgbToOklch — oracle vs colorjs.io', () => {
  it.each(ALL_COLORS)('%s', (hex) => {
    const rgb = hexToSrgb(hex)!;
    const [L, C, H] = srgbToOklch(rgb);
    const [refL, refC, refH] = refOklch(hex);

    expect(L).toBeCloseTo(refL, 7);
    expect(C).toBeCloseTo(refC, 7);
    // Hue is unstable for near-achromatic colors (low chroma amplifies
    // tiny Oklab a/b differences via atan2). Skip when C < 0.01.
    if (C > 0.02 && refC > 0.02) {
      expect(H).toBeCloseTo(refH, 3);
    }
  });
});

describe('hexToOklab — convenience wrapper', () => {
  it('matches srgbToOklab for valid hex', () => {
    for (const hex of EDGE_CASES) {
      const direct = hexToOklab(hex)!;
      const ref = refOklab(hex);
      expect(direct[0]).toBeCloseTo(ref[0], 7);
      expect(direct[1]).toBeCloseTo(ref[1], 7);
      expect(direct[2]).toBeCloseTo(ref[2], 7);
    }
  });

  it('returns null for invalid hex', () => {
    expect(hexToOklab('bad')).toBeNull();
  });
});

describe('hexToOklch — convenience wrapper', () => {
  it('matches srgbToOklch for valid hex', () => {
    for (const hex of EDGE_CASES) {
      const direct = hexToOklch(hex)!;
      const ref = refOklch(hex);
      expect(direct[0]).toBeCloseTo(ref[0], 7);
      expect(direct[1]).toBeCloseTo(ref[1], 7);
    }
  });

  it('returns null for invalid hex', () => {
    expect(hexToOklch('nope')).toBeNull();
  });
});
