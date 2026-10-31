/**
 * Step 6 — flare-robustness ceiling (docs/MIDTONE_SURVEY_FINDINGS.md).
 *
 * The curated battery barely samples mid-tone foregrounds on near-black, which
 * is how their leniency went unnoticed. These pin the region the ceiling exists
 * for, and the property its exponent was chosen by: it never binds on a
 * white/grey pair scoring 2 or above, so the light side and the achromatic
 * anchors are untouched. (Below 2 it can shave 0.1 — no threshold lives there.)
 */
import { contrast, hexToOklab } from '../index';

const FLARE = 0.10, FLARE_K = 1.5;
const grey = (v: number) => '#' + v.toString(16).padStart(2, '0').repeat(3);

/** Steps 1-5 of 2.x, without induction: the basis FLARE_K was derived on. */
function step5(fg: string, bg: string): number {
  const t = hexToOklab(fg)!, b = hexToOklab(bg)!;
  const tL = Math.max(0, t[0]), bL = Math.max(0, b[0]);
  const lL = Math.max(tL, bL), dL = Math.min(tL, bL);
  const r = (lL ** 3 + 0.05) / (dL ** 3 + 0.05);
  return parseFloat(Math.max(1, Math.min(21, (tL > bL ? 20.9 : 20) * (r / 21) ** 1.1)).toFixed(1));
}

/** Steps 1-5 including Step 4's background induction: the score Step 6 caps. */
function steps1to5(fg: string, bg: string): number {
  const t = hexToOklab(fg)!, b = hexToOklab(bg)!;
  const tL = Math.max(0, t[0]), bL = Math.max(0, b[0]);
  const lL = Math.max(tL, bL), dL = Math.min(tL, bL);
  const s = Math.min(1, (1.48 + bL ** 1.5) / (1.48 + 0.5658363271 ** 1.5));
  const r = (lL ** 3 + 0.05) / (dL ** (3 * s) + 0.05);
  return parseFloat(Math.max(1, Math.min(21, (tL > bL ? 20.9 : 20) * (r / 21) ** 1.1)).toFixed(1));
}

describe('flare ceiling: mid-tones on near-black', () => {
  it.each([
    ['#888888', '#000000', 3.7],
    ['#7e7e7e', '#000000', 3.1],
    ['#949494', '#000000', 4.5],
    ['#919191', '#121212', 3.9],
    ['#9f9f9f', '#1a1a1a', 4.7],
    ['#8d9297', '#000000', 4.3],
    ['#000000', '#767676', 2.6],
  ])('%s on %s → %d', (fg, bg, expected) => {
    expect(contrast(fg, bg)).toBe(expected);
  });
});

describe('flare ceiling: never binds on the light side', () => {
  it('white on every grey and every grey on white score as steps 1-5 alone (from 2.0 up)', () => {
    for (let v = 0; v < 256; v++)
      for (const [f, b] of [['#ffffff', grey(v)], [grey(v), '#ffffff']])
        if (steps1to5(f, b) >= 2) expect(contrast(f, b)).toBe(steps1to5(f, b));
  });

  it('the just-passing grey keeps at least 3.9 under doubled flare on every dark background', () => {
    const Y = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    for (const bv of [0, 0x0a, 0x12, 0x1a, 0x22, 0x33, 0x44]) {
      let fv = bv;
      while (contrast(grey(fv), grey(bv))! < 4.5) fv++;
      const kept = (Y(fv) + FLARE) / (Y(bv) + FLARE);
      expect(kept).toBeGreaterThan(3.9); // Step 4 can only make the pass stricter
    }
  });

  it('FLARE_K is the largest exponent with that property (to 0.01)', () => {
    const ceil = (fg: string, bg: string, k: number) => {
      const t = hexToOklab(fg)![0], b = hexToOklab(bg)![0];
      const r = (Math.max(t, b) ** 3 + FLARE) / (Math.min(t, b) ** 3 + FLARE);
      return (t > b ? 20.9 : 20) * (r / ((1 + FLARE) / FLARE)) ** k;
    };
    const binds = (k: number) => {
      for (let v = 0; v < 256; v++)
        for (const [f, b] of [['#ffffff', grey(v)], [grey(v), '#ffffff']]) {
          const s = step5(f, b);
          if (s >= 2 && ceil(f, b, k) < s - 0.05) return true;
        }
      return false;
    };
    expect(binds(FLARE_K)).toBe(false);
    expect(binds(FLARE_K + 0.01)).toBe(true);
  });
});
