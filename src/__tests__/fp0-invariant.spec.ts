/**
 * FP=0 CI invariant (issue #15).
 *
 * Enforces `OKCA ≤ WCAG` directly across the sRGB gamut on every push/PR, so a
 * future constant retune can't silently introduce a false pass in a hue region
 * the design-system batteries miss. Runs on the TS source via ts-jest (never a
 * stale `dist/`), and includes a replication check (in-test formula == public
 * `contrast()`) to fail fast on a wrong/stale build.
 *
 * Asserts, in both polarities, at full precision AND at production rounding:
 *   - full 256×256 grey×grey grid
 *   - 120k seeded random sRGB pairs
 *   - an OKLCH L/C/H grid (generated via colorjs.io)
 *   - a green-darker stress band (where the worst overshoot lives)
 *
 * The interval proof (`npm run fp0`) is the by-construction guarantee; this test
 * is the deterministic regression guard that guards it in CI.
 */
import Color from 'colorjs.io';
import { contrast, hexToOklab } from '../index';

// Production constants, mirrored here for the full-precision / replication check.
const POL_K = 1.1, CHROMA_K = 0.65, C_THRESH = 0.15, LOD_CAP = 20.9, DOL_CAP = 20;

interface Score { raw: number; rounded: number }

/** In-test OKCA (replication reference): returns unrounded + toFixed(1). */
function okca(fg: string, bg: string): Score | null {
  const t = hexToOklab(fg), b = hexToOklab(bg);
  if (!t || !b) return null;
  const tL = Math.max(0, t[0]), bL = Math.max(0, b[0]);
  if (Math.abs(tL - bL) < 1e-6) return { raw: 1, rounded: 1 };
  const isBoW = bL >= tL;
  const lL = isBoW ? bL : tL, dL = isBoW ? tL : bL, lt = isBoW ? b : t;
  const C = Math.hypot(lt[1], lt[2]);
  const exp = 1 + CHROMA_K * Math.min(1, (C / C_THRESH) ** 2);
  const lY = (lL ** exp) ** 3, dY = dL ** 3;
  const isLoD = tL > bL;
  const rawRatio = (lY + 0.05) / (dY + 0.05);
  const cap = isLoD ? LOD_CAP : DOL_CAP;
  const raw = Math.max(1, Math.min(21, cap * (rawRatio / 21) ** POL_K));
  return { raw, rounded: parseFloat(raw.toFixed(1)) };
}

function wcag(fg: string, bg: string): Score {
  const lum = (hex: string) => {
    const c = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255;
    const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(c(1)) + 0.7152 * lin(c(3)) + 0.0722 * lin(c(5));
  };
  const l1 = lum(fg), l2 = lum(bg);
  const raw = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return { raw, rounded: parseFloat(raw.toFixed(1)) };
}

const hx = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
const grey = (v: number) => `#${hx(v)}${hx(v)}${hx(v)}`;

/** OKLCH (L in [0,1], C, H in deg) -> in-gamut sRGB hex, via colorjs.io. */
function oklchHex(L: number, C: number, H: number): string {
  const g = new Color('oklch', [L, C, H]).to('srgb').toGamut({ space: 'srgb' });
  return g.toString({ format: 'hex' }).slice(0, 7);
}

// Seeded PRNG (mulberry32) for reproducible random pairs.
function rng(seed: number) {
  let s = seed;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Assert OKCA ≤ WCAG (raw AND rounded) over the given pairs; report worst margin. */
function assertInvariant(label: string, pairs: Iterable<[string, string]>) {
  let n = 0, worst = Infinity, worstPair = '';
  const violations: string[] = [];
  for (const [fg, bg] of pairs) {
    const o = okca(fg, bg);
    if (!o) continue;
    n++;
    const w = wcag(fg, bg);
    const margin = w.raw - o.raw;
    if (margin < worst) { worst = margin; worstPair = `${fg} on ${bg} (OKCA ${o.raw.toFixed(3)} vs WCAG ${w.raw.toFixed(3)})`; }
    // full precision AND production rounding, both must hold
    if (o.raw > w.raw + 1e-9 || o.rounded > w.rounded) {
      if (violations.length < 10) violations.push(`${fg} on ${bg}: OKCA ${o.raw.toFixed(4)}/${o.rounded} > WCAG ${w.raw.toFixed(4)}/${w.rounded}`);
    }
  }
  // eslint-disable-next-line no-console
  console.log(`[${label}] ${n.toLocaleString()} pairs, worst WCAG−OKCA margin ${worst.toFixed(3)} @ ${worstPair}`);
  expect(violations).toEqual([]);
}

describe('FP=0 invariant — OKCA ≤ WCAG across the sRGB gamut (issue #15)', () => {
  it('replication: in-test formula matches the public contrast() build', () => {
    const rand = rng(99);
    const pairs: [string, string][] = [];
    for (let i = 0; i < 3000; i++) {
      const h = () => `#${hx(rand() * 255)}${hx(rand() * 255)}${hx(rand() * 255)}`;
      pairs.push([h(), h()]);
    }
    pairs.push(['#ffffff', '#000000'], ['#000000', '#ffffff'], ['#ffffff', '#767676'], ['#ff69b4', '#1a1a1a']);
    const mismatches = pairs.filter(([fg, bg]) => okca(fg, bg)!.rounded !== contrast(fg, bg)!);
    expect(mismatches).toEqual([]);
  });

  it('grey × grey — full 256×256 grid', () => {
    function* pairs(): Generator<[string, string]> {
      for (let i = 0; i <= 255; i++) for (let j = 0; j <= 255; j++) yield [grey(i), grey(j)];
    }
    assertInvariant('grey×grey', pairs());
  }, 120000);

  it('120k seeded random sRGB pairs', () => {
    const rand = rng(7);
    function* pairs(): Generator<[string, string]> {
      const h = () => `#${hx(rand() * 255)}${hx(rand() * 255)}${hx(rand() * 255)}`;
      for (let i = 0; i < 120000; i++) yield [h(), h()];
    }
    assertInvariant('random', pairs());
  }, 120000);

  it('OKLCH L/C/H grid (via colorjs.io), both polarities vs white/black/grey', () => {
    const surfaces = ['#ffffff', '#000000', '#808080'];
    function* pairs(): Generator<[string, string]> {
      for (let L = 0.1; L <= 0.95; L += 0.1)
        for (let C = 0; C <= 0.31; C += 0.05)
          for (let H = 0; H < 360; H += 30) {
            const hex = oklchHex(L, C, H);
            for (const s of surfaces) { yield [hex, s]; yield [s, hex]; }
          }
    }
    assertInvariant('oklch-grid', pairs());
  }, 120000);

  it('green-darker stress band (worst-overshoot region)', () => {
    function* pairs(): Generator<[string, string]> {
      // dark greens/teals as the darker element (OKLCH hue ~120–200)
      for (let L = 0.2; L <= 0.55; L += 0.02)
        for (let C = 0.04; C <= 0.18; C += 0.02)
          for (let H = 120; H <= 200; H += 8) {
            const dark = oklchHex(L, C, H);
            // light chromatic + white foregrounds (the overshoot pairing)
            for (const lL of [0.85, 0.92, 0.98])
              for (const lH of [0, 330, 30, 60]) {
                const light = oklchHex(lL, 0.06, lH);
                yield [light, dark];
                yield [dark, light];
              }
            yield ['#ffffff', dark];
          }
    }
    assertInvariant('green-band', pairs());
  }, 120000);
});
