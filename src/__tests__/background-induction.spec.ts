/**
 * Step 4 — CAM16 background induction (docs/CAM16_FINDINGS.md §7).
 *
 * The curated battery barely samples mid-tones on dark backgrounds, which is
 * how their leniency went unnoticed. These pin that region, and assert the two
 * properties the term was built on: it is the identity on backgrounds at least
 * as light as #767676, and it can only lower a score (the FP=0 argument).
 */
import { contrast, hexToOklab } from '../index';

const IND_Z = 1.48, IND_REF_L = 0.5658363271;
const hx = (n: number) => n.toString(16).padStart(2, '0');
const grey = (v: number) => '#' + hx(v).repeat(3);

/** Steps 1-5 with a chosen darker-proxy exponent multiplier s. */
function scoreWith(fg: string, bg: string, useInduction: boolean): number {
  const t = hexToOklab(fg)!, b = hexToOklab(bg)!;
  const tL = Math.max(0, t[0]), bL = Math.max(0, b[0]);
  if (Math.abs(tL - bL) < 1e-6) return 1;
  const lod = tL > bL, lL = Math.max(tL, bL), dL = Math.min(tL, bL), lt = lod ? t : b;
  const exp = 1 + 0.42 * Math.min(1, (Math.hypot(lt[1], lt[2]) / 0.15) ** 2);
  const s = useInduction ? Math.min(1, (IND_Z + bL ** 1.5) / (IND_Z + IND_REF_L ** 1.5)) : 1;
  const r = ((lL ** exp) ** 3 + 0.05) / (dL ** (3 * s) + 0.05);
  return parseFloat(Math.max(1, Math.min(21, (lod ? 20.9 : 20) * (r / 21) ** 1.1)).toFixed(1));
}

describe('background induction: mid-tones on dark backgrounds', () => {
  it.each([
    ['#919191', '#121212', 4.4],
    ['#9f9f9f', '#1a1a1a', 4.8],
    ['#cccccc', '#333333', 5.7],
    ['#ffffff', '#595959', 5.7],
    ['#888888', '#000000', 5.2], // pure black: proxy is 0 for any s
    ['#ff69b4', '#1a1a1a', 3.6], // hot-pink calibration, held by CHROMA_K = 0.42
    ['#ff8c00', '#1a1a1a', 4.1],
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

  it('never raises a score (the FP=0 argument)', () => {
    let seed = 11;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const c = () => '#' + [0, 0, 0].map(() => hx(Math.floor(rnd() * 256))).join('');
    for (let i = 0; i < 20000; i++) {
      const f = c(), b = c();
      expect(contrast(f, b)!).toBeLessThanOrEqual(scoreWith(f, b, false));
    }
  });
});
