/**
 * Mid-tone-on-near-black survey. Read-only; no algorithm change.
 * Run: npm run midtone
 *
 * Question: is OKCA too liberal for mid-tone foregrounds on near-black
 * backgrounds? OKCA cannot be its own judge, so every pair is also scored by
 * yardsticks that share none of its machinery:
 *
 *   dE00     CIEDE2000 (Sharma, Wu & Dalal 2005), CIELAB D65.
 *   dL*      CIELAB lightness difference (linear toe near black).
 *   CVD      Machado, Oliveira & Fernandes (2009) severity-1.0 protan, deutan
 *            and tritan simulations in linear sRGB; worst-case dE00 and WCAG
 *            ratio across the three.
 *   flare    WCAG ratio recomputed with a 0.10 flare term instead of 0.05:
 *            how much of the pair's contrast survives a brighter room.
 *
 * Sections:
 *   1. Yardsticks for just-passing pairs (score 4.5–5.4), by background band.
 *   2. Achromatic continuum: the grey that first reaches 4.5 on each grey bg.
 *   3. CVD check: OKCA AA passes that fall below WCAG 4.5 under simulation.
 *   4. Candidate: a flare-robustness ceiling, and what it changes.
 *
 * All formulas are reimplemented from their published specifications.
 */
import { hexToOklab } from '../src/transforms';
import { contrast } from '../src/index';
import { TAILWIND, GOVUK, USWDS } from './palettes';

type V3 = [number, number, number];

// ── Colour maths ──────────────────────────────────────────────────────────────
const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const gam = (v: number) => {
  v = Math.min(1, Math.max(0, v));
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
};
const hx = (n: number) => n.toString(16).padStart(2, '0');
const toLin = (hex: string): V3 => [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255)) as V3;
const toHex = (l: V3) => '#' + l.map((v) => hx(Math.round(gam(v) * 255))).join('');
const lumY = (l: V3) => 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
const ratio = (a: number, b: number, flare: number) => (Math.max(a, b) + flare) / (Math.min(a, b) + flare);

function lab(l: V3): V3 {
  const X = 0.4124564 * l[0] + 0.3575761 * l[1] + 0.1804375 * l[2];
  const Y = 0.2126729 * l[0] + 0.7151522 * l[1] + 0.0721750 * l[2];
  const Z = 0.0193339 * l[0] + 0.1191920 * l[1] + 0.9503041 * l[2];
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const fx = f(X / 0.95047), fy = f(Y), fz = f(Z / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function de2000([L1, a1, b1]: V3, [L2, a2, b2]: V3): number {
  const rad = Math.PI / 180;
  const Cb = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1 = Math.hypot(a1p, b1), C2 = Math.hypot(a2p, b2);
  const hue = (b: number, a: number) => (a === 0 && b === 0 ? 0 : (Math.atan2(b, a) / rad + 360) % 360);
  const h1 = hue(b1, a1p), h2 = hue(b2, a2p);
  let dh = 0;
  if (C1 * C2 !== 0) { dh = h2 - h1; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; }
  const dH = 2 * Math.sqrt(C1 * C2) * Math.sin((dh * rad) / 2);
  const Lm = (L1 + L2) / 2, Cm = (C1 + C2) / 2;
  let hm = h1 + h2;
  if (C1 * C2 !== 0) { if (Math.abs(h1 - h2) > 180) hm += hm < 360 ? 360 : -360; hm /= 2; }
  const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad)
    + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
  const RC = 2 * Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7));
  const RT = -Math.sin(2 * 30 * Math.exp(-(((hm - 275) / 25) ** 2)) * rad) * RC;
  const SL = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2);
  const SC = 1 + 0.045 * Cm, SH = 1 + 0.015 * Cm * T;
  const l = (L2 - L1) / SL, c = (C2 - C1) / SC, h = dH / SH;
  return Math.sqrt(l * l + c * c + h * h + RT * c * h);
}

// Machado, Oliveira & Fernandes (2009), severity 1.0.
const CVD: Record<string, number[][]> = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};
const simulate = (M: number[][], l: V3) =>
  M.map((r) => Math.min(1, Math.max(0, r[0] * l[0] + r[1] * l[1] + r[2] * l[2]))) as V3;

// ── Candidate: flare-robustness ceiling ───────────────────────────────────────
// The polarity curve re-run on the uncompressed L^3 proxies with a flare term
// of FLARE instead of 0.05, re-anchored so white/black is unchanged. The final
// score is min(OKCA, ceiling), so FP=0 is inherited, not re-proved.
const FLARE = 0.10;
const FLARE_K = 1.5; // largest exponent that leaves every white/grey pair untouched (see section 4)

function ceiling(fg: string, bg: string, flare = FLARE, k = FLARE_K): number {
  const tL = Math.max(0, hexToOklab(fg)![0]), bL = Math.max(0, hexToOklab(bg)![0]);
  if (Math.abs(tL - bL) < 1e-6) return 1;
  const cap = tL > bL ? 20.9 : 20;
  const r = (Math.max(tL, bL) ** 3 + flare) / (Math.min(tL, bL) ** 3 + flare);
  return cap * Math.pow(r / ((1 + flare) / flare), k);
}
const candidate = (fg: string, bg: string) =>
  parseFloat(Math.max(1, Math.min(contrast(fg, bg)!, ceiling(fg, bg))).toFixed(1));

// ── Survey rows ───────────────────────────────────────────────────────────────
interface Row {
  fg: string; bg: string; okca: number; cand: number; wcag: number; Lb: number; Cf: number;
  dE00: number; dLs: number; flare10: number; cvdDE00: number; cvdWcag: number;
}

function measure(fg: string, bg: string): Row {
  const lf = toLin(fg), lb = toLin(bg), labF = lab(lf), labB = lab(lb);
  const okF = hexToOklab(fg)!, okB = hexToOklab(bg)!;
  const yf = lumY(lf), yb = lumY(lb);
  let cvdDE00 = de2000(labF, labB), cvdWcag = ratio(yf, yb, 0.05);
  for (const M of Object.values(CVD)) {
    const sf = simulate(M, lf), sb = simulate(M, lb);
    cvdDE00 = Math.min(cvdDE00, de2000(lab(sf), lab(sb)));
    cvdWcag = Math.min(cvdWcag, ratio(lumY(sf), lumY(sb), 0.05));
  }
  return {
    fg, bg, okca: contrast(fg, bg)!, cand: candidate(fg, bg), wcag: ratio(yf, yb, 0.05),
    Lb: okB[0], Cf: Math.hypot(okF[1], okF[2]),
    dE00: de2000(labF, labB), dLs: Math.abs(labF[0] - labB[0]), flare10: ratio(yf, yb, 0.10), cvdDE00, cvdWcag,
  };
}

const grey = (v: number) => '#' + hx(v).repeat(3);
const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const pct = (n: number, d: number) => `${n} (${((100 * n) / d).toFixed(1)}%)`;

const vals: number[] = [];
for (let v = 0; v <= 255; v += 17) vals.push(v);
const BGS = ['#000000', '#0a0a0a', '#121212', '#1a1a1a', '#222222', '#2b2b2b', '#333333', '#444444', '#555555',
  '#bbbbbb', '#cccccc', '#dddddd', '#eeeeee', '#f5f5f5', '#ffffff'];
const rows: Row[] = [];
for (const bg of BGS)
  for (const r of vals) for (const g of vals) for (const b of vals) {
    const m = measure(`#${hx(r)}${hx(g)}${hx(b)}`, bg);
    if (m.wcag >= 2) rows.push(m);
  }

const BANDS: [string, (r: Row) => boolean][] = [
  ['near-black (L<0.25)', (r) => r.Lb < 0.25],
  ['dark (0.25-0.45)', (r) => r.Lb >= 0.25 && r.Lb < 0.45],
  ['light (0.75-0.9)', (r) => r.Lb >= 0.75 && r.Lb < 0.9],
  ['near-white (>=0.9)', (r) => r.Lb >= 0.9],
];
const CHROMA: [string, (r: Row) => boolean][] = [
  ['achromatic', (r) => r.Cf < 0.02], ['low chroma', (r) => r.Cf >= 0.02 && r.Cf < 0.08], ['chromatic', (r) => r.Cf >= 0.08],
];

// ── 1. Yardsticks at the AA line ──────────────────────────────────────────────
for (const [label, score] of [['current OKCA', (r: Row) => r.okca], ['candidate', (r: Row) => r.cand]] as const) {
  console.log(`\n=== 1. Just-passing pairs (${label} 4.5-5.4): medians ===`);
  console.log('fg chroma   background band        n    dL*   dE00  cvdE00  flare.10   AA passes');
  for (const [cn, cf] of CHROMA)
    for (const [bn, bf] of BANDS) {
      const all = rows.filter((r) => cf(r) && bf(r));
      const s = all.filter((r) => score(r) >= 4.5 && score(r) < 5.5);
      const passes = all.filter((r) => score(r) >= 4.5).length;
      const cols = s.length < 5 ? '   (n<5)'.padEnd(37)
        : [String(s.length).padStart(4), median(s.map((r) => r.dLs)).toFixed(1).padStart(6), median(s.map((r) => r.dE00)).toFixed(1).padStart(6),
          median(s.map((r) => r.cvdDE00)).toFixed(1).padStart(7), median(s.map((r) => r.flare10)).toFixed(2).padStart(9)].join(' ');
      console.log(cn.padEnd(11), bn.padEnd(20), cols, String(passes).padStart(10));
    }
}

// ── 2. Achromatic continuum ───────────────────────────────────────────────────
console.log('\n=== 2. Grey that first reaches 4.5, per grey background ===');
console.log('bg       | current: fg       WCAG    dL*  flare.10 | candidate: fg     WCAG    dL*  flare.10');
for (const bv of [0, 10, 18, 26, 34, 51, 68, 255, 245, 230, 200]) {
  const cells = [contrast, candidate].map((fn) => {
    let fv = bv;
    while (fv >= 0 && fv <= 255 && fn(grey(fv), grey(bv))! < 4.5) fv += bv < 128 ? 1 : -1;
    const m = measure(grey(fv), grey(bv));
    return `${grey(fv)} ${m.wcag.toFixed(2).padStart(6)} ${m.dLs.toFixed(1).padStart(6)} ${m.flare10.toFixed(2).padStart(8)}`;
  });
  console.log(grey(bv), '|', ' '.repeat(8), cells[0], '|', ' '.repeat(10), cells[1]);
}

// ── 3. CVD check ──────────────────────────────────────────────────────────────
console.log('\n=== 3. Current OKCA AA passes whose worst CVD simulation drops WCAG below 4.5 ===');
for (const [bn, bf] of BANDS) {
  const p = rows.filter((r) => bf(r) && r.okca >= 4.5);
  console.log(bn.padEnd(20), 'passes', String(p.length).padStart(5), '  CVD WCAG<4.5:', pct(p.filter((r) => r.cvdWcag < 4.5).length, p.length));
}

// ── 4. Candidate ceiling ──────────────────────────────────────────────────────
console.log(`\n=== 4. Candidate flare ceiling (FLARE=${FLARE}, k=${FLARE_K}) ===`);
const kMax = (flare: number) => {
  let k = 1;
  const binds = (kk: number) => {
    for (let v = 0; v < 256; v++)
      for (const [f, b] of [['#ffffff', grey(v)], [grey(v), '#ffffff']]) {
        const o = contrast(f, b)!;
        if (o >= 2 && ceiling(f, b, flare, kk) < o - 0.05) return true;
      }
    return false;
  };
  while (!binds(k + 0.005)) k += 0.005;
  return k.toFixed(3);
};
for (const f of [0.075, 0.1, 0.125]) console.log(`largest k leaving white/grey pairs untouched at FLARE=${f}: ${kMax(f)}`);

console.log('\nanchors and calibration pairs (current -> candidate):');
for (const [f, b] of [['#ffffff', '#000000'], ['#000000', '#ffffff'], ['#ffffff', '#767676'], ['#767676', '#ffffff'],
  ['#ff69b4', '#1a1a1a'], ['#ff8c00', '#1a1a1a'], ['#9f9f9f', '#1a1a1a'], ['#888888', '#000000'], ['#000000', '#767676']])
  console.log(`  ${f} on ${b}: ${contrast(f, b)} -> ${candidate(f, b)}`);

const SURFACES = ['#000000', '#121212', '#1a1a1a', '#0f172a', '#111827', '#18181b', '#0b0c0c', '#1b1616', '#1c1d1f'];
const palette: { hex: string; label: string }[] = [];
for (const [sys, fams] of Object.entries({ Tailwind: TAILWIND, 'GOV.UK': GOVUK, USWDS }))
  for (const [fam, shades] of Object.entries(fams))
    for (const [k, hex] of Object.entries(shades)) palette.push({ hex, label: `${sys} ${fam}-${k}` });

let n = 0, changed = 0;
const lost = { aa: 0, aaa: 0, large: 0 };
const flips: Row[] = [];
for (const bg of SURFACES)
  for (const { hex } of palette) {
    if (hexToOklab(hex)![0] <= hexToOklab(bg)![0]) continue;
    const m = measure(hex, bg);
    n++;
    if (m.okca !== m.cand) changed++;
    if (m.okca >= 4.5 && m.cand < 4.5) { lost.aa++; flips.push(m); }
    if (m.okca >= 7 && m.cand < 7) lost.aaa++;
    if (m.okca >= 3 && m.cand < 3) lost.large++;
  }
console.log(`\ndesign-system palettes on ${SURFACES.length} dark surfaces: ${n} light-on-dark pairs, ${changed} change`);
console.log(`verdicts lost: AA ${lost.aa}, AAA ${lost.aaa}, large-text 3.0 ${lost.large}`);
for (const [cn, cf] of CHROMA) console.log(`  AA losses, ${cn} fg: ${flips.filter(cf).length}`);

let fills = 0, fillsLost = 0;
for (const text of ['#000000', '#111111', '#1a1a1a'])
  for (const { hex } of palette) {
    fills++;
    if (contrast(text, hex)! >= 4.5 && candidate(text, hex) < 4.5) fillsLost++;
  }
console.log(`dark text (#000000, #111111, #1a1a1a) on palette fills: ${fills} pairs, AA lost ${fillsLost}`);
