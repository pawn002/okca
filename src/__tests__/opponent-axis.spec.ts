/**
 * Opponent-axis terms (#28, docs/OPPONENT_AXIS_FINDINGS.md).
 *
 * Step 3's chroma ramp is driven by w = (C + a cos θ_L + b sin θ_L) / 2, and
 * Step 4 lifts the darker element along θ_D. These pin the behaviour the terms
 * were derived for, and the properties that keep them safe and branch-free.
 */
import { contrast, hexToOklab } from '../index';

const w = (o: number[], th: number) =>
  (Math.hypot(o[1], o[2]) + o[1] * Math.cos((th * Math.PI) / 180) + o[2] * Math.sin((th * Math.PI) / 180)) / 2;

describe('opponent axis: warm hues stay strict, cool hues ease', () => {
  it.each([
    ['#ff69b4', '#1a1a1a', 3.0], // hot pink: unchanged
    ['#ff0000', '#000000', 2.5], // pure red: unchanged
    ['#ff8c00', '#1a1a1a', 3.4], // dark orange: unchanged
    ['#3b82f6', '#000000', 4.4], // blue: 2.4 under the hue-uniform ramp
    ['#22c55e', '#000000', 7.7], // green: 4.3 under the hue-uniform ramp
    ['#1d4ed8', '#ffffff', 4.6], // dark blue text on white: lifted, 5.3 before
    ['#0000ff', '#dddddd', 3.9], // a dichromat sees 4.0
  ])('%s on %s → %d', (fg, bg, expected) => {
    expect(contrast(fg, bg)).toBe(expected);
  });
});

describe('opponent axis: structure', () => {
  it('the weight is between 0 and chroma for every colour', () => {
    for (let r = 0; r < 256; r += 17) for (let g = 0; g < 256; g += 17) for (let b = 0; b < 256; b += 17) {
      const o = hexToOklab('#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join(''))!;
      for (const th of [9.4, 313.7]) {
        expect(w(o, th)).toBeGreaterThanOrEqual(-1e-12);
        expect(w(o, th)).toBeLessThanOrEqual(Math.hypot(o[1], o[2]) + 1e-12);
      }
    }
  });

  it('greys are untouched, so the achromatic anchors hold', () => {
    expect(contrast('#ffffff', '#000000')).toBe(20.9);
    expect(contrast('#000000', '#ffffff')).toBe(20);
    expect(contrast('#ffffff', '#767676')).toBe(3.9);
    expect(contrast('#767676', '#ffffff')).toBe(3.7);
  });

  it('red keeps the full lighter penalty: the weight equals chroma along θ_L', () => {
    const o = [0, Math.cos((9.4 * Math.PI) / 180), Math.sin((9.4 * Math.PI) / 180)];
    expect(w(o, 9.4)).toBeCloseTo(1, 12);
    expect(w([0, -o[1], -o[2]], 9.4)).toBeCloseTo(0, 12);
  });
});
