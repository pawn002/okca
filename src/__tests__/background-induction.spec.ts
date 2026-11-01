/**
 * Step 4 — CAM16 background induction (docs/CAM16_FINDINGS.md §7).
 *
 * The curated battery barely samples mid-tones on dark backgrounds, which is
 * how their leniency went unnoticed. These pin that region, and assert the two
 * properties the term was built on: it is the identity on backgrounds at least
 * as light as #767676, and it can only lower a score (the FP=0 argument, and
 * the reason no pair scores higher than in 2.0.3).
 */
import { contrast, hexToOklab } from '../index';

const IND_Z = 1.48, IND_REF_L = 0.5658363271;
const hx = (n: number) => n.toString(16).padStart(2, '0');
const grey = (v: number) => '#' + hx(v).repeat(3);

/** The full score, with or without Step 4's induction factor s (opponent-axis terms and Step 6's flare ceiling always on). */
const w = (o: number[], th: number) => (Math.hypot(o[1], o[2]) + o[1] * Math.cos(th * Math.PI / 180) + o[2] * Math.sin(th * Math.PI / 180)) / 2;
function scoreWith(fg: string, bg: string, useInduction: boolean): number {
  const t = hexToOklab(fg)!, b = hexToOklab(bg)!;
  const tL = Math.max(0, t[0]), bL = Math.max(0, b[0]);
  if (Math.abs(tL - bL) < 1e-6) return 1;
  const lod = tL > bL, lL = Math.max(tL, bL), dL = Math.min(tL, bL), lt = lod ? t : b, dt = lod ? b : t;
  const exp = 1 + 0.65 * Math.min(1, (w(lt, 9.4) / 0.15) ** 2);
  const eD = 1 + 0.09 * Math.min(1, (w(dt, 313.7) / 0.15) ** 2);
  const s = useInduction ? Math.min(1, (IND_Z + bL ** 1.5) / (IND_Z + IND_REF_L ** 1.5)) : 1;
  const r = ((lL ** exp) ** 3 + 0.05) / (dL ** ((3 * s) / eD) + 0.05);
  const cap = 20.9;
  const ceiling = cap * (((lL ** 3 + 0.1) / (dL ** 3 + 0.1)) / 11) ** 1.5;
  return parseFloat(Math.max(1, Math.min(21, cap * (r / 21) ** 1.1, ceiling)).toFixed(1));
}

describe('background induction: mid-tones on dark backgrounds', () => {
  it.each([
    ['#919191', '#121212', 3.9], // 4.4 from induction alone; Step 6's ceiling binds
    ['#9f9f9f', '#1a1a1a', 4.7], // 4.8 from induction alone; Step 6's ceiling binds
    ['#cccccc', '#333333', 5.7],
    ['#ffffff', '#595959', 5.7],
    ['#888888', '#000000', 3.7], // pure black: induction leaves it at 5.2; Step 6 sets it
    ['#ff69b4', '#1a1a1a', 3.0], // was 3.6: induction also lifts its near-black background
    ['#ff8c00', '#1a1a1a', 3.4],
  ])('%s on %s → %d', (fg, bg, expected) => {
    expect(contrast(fg, bg)).toBe(expected);
  });
});

describe('background induction: structure', () => {
  it('reference is OKLab L of #767676', () => {
    expect(hexToOklab('#767676')![0]).toBeCloseTo(IND_REF_L, 9);
  });

  it('is the identity on backgrounds at least as light as #767676', () => {
    for (let b = 0x76; b < 256; b += 3)
      for (let f = 0; f < 256; f += 5) {
        expect(contrast(grey(f), grey(b))).toBe(scoreWith(grey(f), grey(b), false));
        expect(contrast('#ff69b4', grey(b))).toBe(scoreWith('#ff69b4', grey(b), false));
      }
  });

  it('never raises a score above the same pair without induction', () => {
    let seed = 11;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const c = () => '#' + [0, 0, 0].map(() => hx(Math.floor(rnd() * 256))).join('');
    for (let i = 0; i < 20000; i++) {
      const f = c(), b = c();
      expect(contrast(f, b)!).toBeLessThanOrEqual(scoreWith(f, b, false));
    }
  });
});
