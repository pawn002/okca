/**
 * CAM16 survey: which viewing-condition factors does Oklab fix, and which of
 * them bear on contrast? Read-only; no algorithm change. Run: npm run cam16
 *
 * Oklab is a fixed-condition space: one white, one adaptation state, one
 * background, one surround, no absolute luminance. CAM16 (Li et al. 2017,
 * "Comprehensive color solutions: CAM16, CAT16, and CAM16-UCS", Color Res Appl
 * 42:703–718; basis of CIECAM16, CIE 248:2022) takes those as inputs. Varying them one at a time
 * shows what Oklab abstracts:
 *
 *   0. Validation against colorjs.io's cam16-jmh at its default conditions.
 *   1. Background (Yb): CAM16 lightness of a grey as a power of OKLab L, by
 *      background. Yb is the one condition OKCA can observe — it is an input.
 *   2. Just-passing pairs on each background: CAM16-UCS lightness gap with the
 *      real background as Yb, against the default Yb = 20.
 *   3. Absolute luminance (F_L) and surround: how the brightness gap of each
 *      background's just-passing pair scales with display white and surround.
 *   4. Chromatic lightness: CAM16 J versus OKLab L for saturated colours.
 *   5. Colourfulness: CAM16 M versus Oklab chroma, by hue.
 *   6. Background-dependent colourfulness of a fixed foreground.
 *
 * The CAM16 model itself is in scripts/cam16.ts.
 */
import Color from 'colorjs.io';
import { hexToOklab, hexToOklch } from '../src/transforms';
import { contrast } from '../src/index';

import { V3, lin, hx, grey, xyz, Ywcag, Surround, Env, DEFAULT, cam16, bgEnv , MODEL } from './cam16';

console.log(`colour appearance model: ${MODEL}`);

const pad = (s: string | number, n: number) => String(s).padStart(n);

// ── 0. Validation ────────────────────────────────────────────────────────────
{
  let dJ = 0, dM = 0, at = '';
  for (let i = 0; i < 2000; i++) {
    const hex = '#' + Math.floor(((i * 2654435761) >>> 0) % 0xffffff).toString(16).padStart(6, '0');
    const ref = new Color(hex).to('cam16-jmh').coords as number[];
    const mine = cam16(xyz(hex), DEFAULT);
    dJ = Math.max(dJ, Math.abs(mine.J - ref[0]));
    if (Math.abs(mine.M - ref[1]) > dM) { dM = Math.abs(mine.M - ref[1]); at = `${hex} mine ${mine.J.toFixed(3)}/${mine.M.toFixed(3)} ref ${(+ref[0]).toFixed(3)}/${(+ref[1]).toFixed(3)}`; }
  }
  console.log(`=== 0. Validation vs colorjs.io cam16-jmh (2000 colours): max |dJ| ${dJ.toExponential(2)}, max |dM| ${dM.toExponential(2)} (${at})`);
}

// ── 1. Background-dependent lightness, as a power of OKLab L ─────────────────
// CAM16 J/100 for greys, fitted as L^gamma by least squares in log space.
console.log('\n=== 1. CAM16 lightness of greys as J/100 = L^gamma, by background ===');
console.log('  bg grey   Yb     gamma   fit RMS (J units)');
const GAMMA: [number, number][] = [];
for (const bv of [0, 0x1a, 0x33, 0x55, 0x77, 0x99, 0xbb, 0xdd, 0xff]) {
  const env: Env = { ...DEFAULT, Yb: 100 * Ywcag(grey(bv)) };
  let sxy = 0, sxx = 0;
  const pts: [number, number][] = [];
  for (let v = 8; v <= 255; v += 4) {
    const L = hexToOklab(grey(v))![0], J = cam16(xyz(grey(v)), env).J / 100;
    pts.push([L, J]); sxy += Math.log(L) * Math.log(J); sxx += Math.log(L) ** 2;
  }
  const gamma = sxy / sxx;
  const rms = Math.sqrt(pts.reduce((s, [L, J]) => s + (100 * (L ** gamma - J)) ** 2, 0) / pts.length);
  GAMMA.push([hexToOklab(grey(bv))![0], gamma]);
  console.log(`  ${grey(bv)}  ${pad(env.Yb.toFixed(1), 5)}  ${pad(gamma.toFixed(3), 7)}   ${pad(rms.toFixed(2), 6)}`);
}
{ // gamma against background lightness: linear fit in L_bg
  const n = GAMMA.length, mx = GAMMA.reduce((s, g) => s + g[0], 0) / n, my = GAMMA.reduce((s, g) => s + g[1], 0) / n;
  const slope = GAMMA.reduce((s, g) => s + (g[0] - mx) * (g[1] - my), 0) / GAMMA.reduce((s, g) => s + (g[0] - mx) ** 2, 0);
  const icpt = my - slope * mx;
  const res = Math.max(...GAMMA.map(([x, y]) => Math.abs(icpt + slope * x - y)));
  console.log(`  gamma ~= ${icpt.toFixed(3)} + ${slope.toFixed(3)} * L_bg   (max residual ${res.toFixed(3)})`);
}

// ── 2. Just-passing greys: lightness gap with the real background ────────────
// The grey that first reaches 4.5 (OKCA 2.0.3 = steps 1-5, and live 3.x) on each
// grey background. CAM16-UCS J' gap, with Yb = the background vs fixed Yb = 20.
function step5(fg: string, bg: string): number {
  const tL = Math.max(0, hexToOklab(fg)![0]), bL = Math.max(0, hexToOklab(bg)![0]);
  if (Math.abs(tL - bL) < 1e-6) return 1;
  const r = (Math.max(tL, bL) ** 3 + 0.05) / (Math.min(tL, bL) ** 3 + 0.05);
  return parseFloat(Math.max(1, Math.min(21, (tL > bL ? 20.9 : 20) * (r / 21) ** 1.1)).toFixed(1));
}
const firstPass = (fn: (f: string, b: string) => number, bv: number) => {
  let fv = bv;
  while (fv >= 0 && fv <= 255 && fn(grey(fv), grey(bv)) < 4.5) fv += bv < 128 ? 1 : -1;
  return fv;
};
const BG = [0, 0x0a, 0x12, 0x1a, 0x22, 0x33, 0x44, 0xff, 0xf5, 0xe6, 0xc8];
const gapJp = (f: string, b: string, env: Env) => Math.abs(cam16(xyz(f), env).Jp - cam16(xyz(b), env).Jp);

console.log("\n=== 2. Just-passing grey, CAM16-UCS lightness gap dJ' ===");
console.log('  bg        | 2.0.3: fg   dJ\'(Yb=20) dJ\'(Yb=bg) | 3.x: fg    dJ\'(Yb=20) dJ\'(Yb=bg)');
for (const bv of BG) {
  const cells = [(f: string, b: string) => step5(f, b), (f: string, b: string) => contrast(f, b)!].map((fn) => {
    const f = grey(firstPass(fn, bv)), b = grey(bv);
    return `${f} ${pad(gapJp(f, b, DEFAULT).toFixed(1), 9)} ${pad(gapJp(f, b, bgEnv(b)).toFixed(1), 10)}`;
  });
  console.log(`  ${grey(bv)}   | ${cells[0]} | ${cells[1]}`);
}

// ── 3. Absolute luminance and surround ───────────────────────────────────────
// CAM16 brightness Q is scaled by the background's induction factor, so Q gaps
// are only comparable within one background. Report, per background, how the
// brightness gap of its 2.0.3 just-passing pair scales with display white
// (L_A = 20% of white) and surround, relative to 250 nits / average.
console.log('\n=== 3. Brightness gap dQ relative to 250 nits, average surround ===');
console.log('  pair                    80 nits  500 nits  | dim    dark   (at 250 nits)');
for (const bv of [0, 0x1a, 0x33, 0xff, 0xc8]) {
  const f = grey(firstPass(step5, bv)), b = grey(bv);
  const dQ = (nits: number, s: Surround) => {
    const env: Env = { LA: 0.2 * nits, Yb: 100 * Ywcag(b), surround: s };
    return Math.abs(cam16(xyz(f), env).Q - cam16(xyz(b), env).Q);
  };
  const ref = dQ(250, 'average'), r = (v: number) => pad((v / ref).toFixed(2), 6);
  console.log(`  ${f} on ${b}      ${r(dQ(80, 'average'))}   ${r(dQ(500, 'average'))}   | ${r(dQ(250, 'dim'))} ${r(dQ(250, 'dark'))}`);
}

// ── 4. Chromatic lightness: CAM16 J vs OKLab L ───────────────────────────────
// For saturated colours, J at Yb = 20 against the J of the grey with the same
// OKLab L. Positive = CAM16 reads the colour lighter than Oklab does.
console.log('\n=== 4. Saturated colours: CAM16 J minus J of the grey at the same OKLab L ===');
console.log('  hue band     n    median dJ   (C >= 0.12)');
const bands: [string, number, number][] = [['red', 0, 45], ['orange/yellow', 45, 110], ['green', 110, 170], ['cyan', 170, 230], ['blue', 230, 290], ['purple/magenta', 290, 360]];
const sat: { hex: string; L: number; C: number; H: number }[] = [];
for (let r = 0; r <= 255; r += 17) for (let g = 0; g <= 255; g += 17) for (let b = 0; b <= 255; b += 17) {
  const hex = `#${hx(r)}${hx(g)}${hx(b)}`; const [L, C, H] = hexToOklch(hex)!;
  if (C >= 0.12) sat.push({ hex, L, C, H });
}
const greyJAtL = (L: number) => { // bisection on grey level for matching OKLab L
  let lo = 0, hi = 255;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; const v = m / 255; const Y = lin(v); if (Math.cbrt(Y) < L) lo = m; else hi = m; }
  const Y = 100 * lin(lo / 255);
  return cam16([0.95047 * Y, Y, 1.08883 * Y], DEFAULT).J;
};
const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
for (const [name, lo, hi] of bands) {
  const s = sat.filter((c) => c.H >= lo && c.H < hi);
  const d = s.map((c) => cam16(xyz(c.hex), DEFAULT).J - greyJAtL(c.L));
  console.log(`  ${name.padEnd(14)} ${pad(s.length, 4)}   ${pad(median(d).toFixed(1), 8)}`);
}

// ── 5. Colourfulness: CAM16 M vs Oklab chroma, by hue ────────────────────────
console.log('\n=== 5. CAM16 colourfulness per unit Oklab chroma (M / C), by hue ===');
console.log('  hue band     median M/C   (C >= 0.12)');
for (const [name, lo, hi] of bands) {
  const s = sat.filter((c) => c.H >= lo && c.H < hi);
  console.log(`  ${name.padEnd(14)} ${pad(median(s.map((c) => cam16(xyz(c.hex), DEFAULT).M / c.C)).toFixed(0), 8)}`);
}

// ── 6. Background-dependent colourfulness ────────────────────────────────────
// The same foreground's CAM16 colourfulness M with the background as Yb.
console.log('\n=== 6. Colourfulness M of a fixed foreground, by background ===');
console.log('  fg        on #000000  on #1a1a1a  on #777777  on #ffffff   black/white');
for (const f of ['#ff69b4', '#ff8c00', '#3b82f6', '#22c55e', '#919191']) {
  const m = ['#000000', '#1a1a1a', '#777777', '#ffffff'].map((b) => cam16(xyz(f), bgEnv(b)).M);
  console.log(`  ${f}  ${m.map((v) => pad(v.toFixed(1), 10)).join('  ')}   ${pad((m[0] / m[3]).toFixed(2), 10)}`);
}
