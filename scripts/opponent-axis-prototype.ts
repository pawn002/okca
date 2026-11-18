/**
 * Prototype for #28: opponent-axis terms in place of the hue-uniform chroma
 * penalty. Read-only; no algorithm change. Run: npm run opponent
 *
 * Both terms weight a colour by a smooth projection in Oklab's (a, b) plane,
 *
 *   w(a, b) = (C + a·cos θ + b·sin θ) / 2
 *
 * which is C in direction θ, C/2 at 90° from it and 0 opposite: linear in a and
 * b, with no hue branch.
 *
 *   Lighter element: Step 3's chroma ramp is driven by w_L instead of C.
 *   Darker element:  its proxy is lifted, L^(3s / e_D) with
 *                    e_D = 1 + K_D·ramp(w_D), so it can only lower a score.
 *
 * Nothing is tuned:
 *   θ_L, θ_D  the loss-weighted directions of CVD contrast loss for lighter
 *             colours on dark backgrounds and darker colours on light ones.
 *   K_D       the smallest strength at which no grid pair scores above the
 *             CVD ratio (scripts/cvd.ts), found by bisection.
 */
import { hexToOklab } from '../src/transforms';
import { contrast } from '../src/index';
import { measure, oklchHex, gridPairs, Measured } from './cvd';

const CHROMA_K = 0.65, C_THRESH = 0.15, IND_Z = 1.48, IND_REF_L = 0.5658363271;
const rad = (d: number) => (d * Math.PI) / 180;
const proj = (th: number, a: number, b: number) => (Math.hypot(a, b) + a * Math.cos(rad(th)) + b * Math.sin(rad(th))) / 2;
const ramp = (w: number) => Math.min(1, (w / C_THRESH) ** 2);

interface Variant { lighter: 'chroma' | 'warm'; thL?: number; thD?: number; kD?: number }
function score(fg: string, bg: string, v: Variant): number {
  const t = hexToOklab(fg)!, b = hexToOklab(bg)!;
  const tL = Math.max(0, t[0]), bL = Math.max(0, b[0]);
  if (Math.abs(tL - bL) < 1e-6) return 1;
  const lod = tL > bL, lL = Math.max(tL, bL), dL = Math.min(tL, bL), lt = lod ? t : b, dt = lod ? b : t;
  const wL = v.lighter === 'chroma' ? Math.hypot(lt[1], lt[2]) : proj(v.thL!, lt[1], lt[2]);
  const eL = 1 + CHROMA_K * ramp(wL);
  const eD = v.kD ? 1 + v.kD * ramp(proj(v.thD!, dt[1], dt[2])) : 1;
  const s = Math.min(1, (IND_Z + bL ** 1.5) / (IND_Z + IND_REF_L ** 1.5));
  const r = ((lL ** eL) ** 3 + 0.05) / (dL ** ((3 * s) / eD) + 0.05);
  return parseFloat(Math.max(1, Math.min(21, (lod ? 20.9 : 20) * (r / 21) ** 1.1)).toFixed(1));
}

const pad = (x: string | number, n: number) => String(x).padStart(n);
const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const BANDS: [string, number, number][] = [['red', 0, 45], ['orange', 45, 80], ['yellow', 80, 115], ['green', 115, 165], ['cyan', 165, 220], ['blue', 220, 280], ['purple', 280, 320], ['magenta', 320, 360]];

// ── 1. Directions of CVD loss ─────────────────────────────────────────────────
function sweep(bgs: string[], Lmin: number, Lmax: number, Cmin: number): Measured[] {
  const out: Measured[] = [];
  for (let H = 0; H < 360; H += 3) for (let L = Lmin; L <= Lmax + 1e-9; L += 0.025) for (let C = Cmin; C <= 0.371; C += 0.015) {
    const h = oklchHex(L, C, H); if (!h) continue;
    for (const bg of bgs) { const m = measure(h, bg); if (m.wcag >= 3) out.push(m); }
  }
  return out;
}
function lossDirection(ms: Measured[]): number {
  let x = 0, y = 0;
  for (const m of ms) { const loss = 1 - (m.cvdMin - 1) / (m.wcag - 1); x += loss * m.a; y += loss * m.b; }
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
const lightOnDark = sweep(['#000000', '#1a1a1a', '#333333'], 0.45, 0.95, 0.06);
const darkOnLight = sweep(['#ffffff', '#f0f0f0', '#dddddd'], 0.2, 0.6, 0.06);
const thL = lossDirection(lightOnDark), thD = lossDirection(darkOnLight);
console.log('=== 1. Loss-weighted direction of CVD contrast loss in (a, b) ===');
console.log(`  lighter colours on dark backgrounds: θ_L = ${thL.toFixed(1)}°  (n = ${lightOnDark.length})`);
console.log(`  darker colours on light backgrounds: θ_D = ${thD.toFixed(1)}°  (n = ${darkOnLight.length})`);

// ── 2. K_D from the CVD-safety constraint ─────────────────────────────────────
const grid = gridPairs().map(([f, b]) => ({ f, b, m: measure(f, b), s0: contrast(f, b)!, lod: hexToOklab(f)![0] > hexToOklab(b)![0] }));
const unsafe = (v: Variant) => grid.some(({ f, b, m }) => score(f, b, v) > m.cvdMin + 0.05);
let lo = 0, hi = 0.65;
for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (unsafe({ lighter: 'warm', thL, thD, kD: mid })) lo = mid; else hi = mid; }
const kD = Math.ceil(hi * 100) / 100;
console.log(`\n=== 2. Smallest K_D with no grid pair above the CVD ratio: ${hi.toFixed(4)} -> ${kD.toFixed(2)} ===`);

// ── 3. Variants on the grid ───────────────────────────────────────────────────
const VARIANTS: [string, Variant][] = [
  ['current', { lighter: 'chroma' }],
  ['warm lighter only', { lighter: 'warm', thL }],
  [`paired, K_D = ${kD.toFixed(2)}`, { lighter: 'warm', thL, thD, kD }],
  ['paired, K_D = CHROMA_K', { lighter: 'warm', thL, thD, kD: CHROMA_K }],
];
console.log('\n=== 3. 262,144-pair grid, against the current branch ===');
console.log('  variant                    above WCAG  above CVD  AA a CVD viewer fails | raised L-o-D  D-o-L | lowered | AA gained  AA lost');
for (const [name, v] of VARIANTS) {
  let fp = 0, cv = 0, cva = 0, uL = 0, uD = 0, dn = 0, ga = 0, ls = 0;
  for (const { f, b, m, s0, lod } of grid) {
    const s = score(f, b, v);
    if (s > parseFloat(m.wcag.toFixed(1))) fp++;
    if (s > m.cvdMin + 0.05) cv++;
    if (s >= 4.5 && m.cvdMin < 4.5) cva++;
    if (s > s0) { if (lod) uL++; else uD++; }
    if (s < s0) dn++;
    if (s0 < 4.5 && s >= 4.5) ga++;
    if (s0 >= 4.5 && s < 4.5) ls++;
  }
  console.log(`  ${name.padEnd(26)} ${pad(fp, 10)} ${pad(cv, 10)} ${pad(cva, 22)} | ${pad(uL, 12)} ${pad(uD, 6)} | ${pad(dn, 7)} | ${pad(ga, 9)} ${pad(ls, 8)}`);
}

// ── 4. By hue ─────────────────────────────────────────────────────────────────
for (const [label, bg, Lmin, Lmax] of [['light text on black', '#000000', 0.45, 0.95], ['dark text on white', '#ffffff', 0.2, 0.6]] as const) {
  const pts = sweep([bg], Lmin, Lmax, 0.12);
  console.log(`\n=== 4. ${label}: median score / WCAG by hue (C >= 0.12) ===`);
  console.log('  ' + 'variant'.padEnd(26) + BANDS.map(([n]) => n.slice(0, 7).padStart(8)).join(''));
  const row = (f: (m: Measured) => number) => BANDS.map(([, lo2, hi2]) => { const s = pts.filter((m) => m.H >= lo2 && m.H < hi2); return s.length ? pad(median(s.map(f)).toFixed(2), 8) : pad('-', 8); }).join('');
  console.log('  ' + '[CVD / WCAG]'.padEnd(26) + row((m) => m.cvdMin / m.wcag));
  for (const [name, v] of VARIANTS.slice(0, 3)) console.log('  ' + name.padEnd(26) + row((m) => score(m.fg, bg, v) / m.wcag));
}

// ── 5. Calibration pairs ──────────────────────────────────────────────────────
console.log('\n=== 5. Calibration pairs ===');
const paired = VARIANTS[2][1];
for (const [f, b] of [['#ffffff', '#000000'], ['#ffffff', '#767676'], ['#767676', '#ffffff'], ['#ff69b4', '#1a1a1a'], ['#ff8c00', '#1a1a1a'], ['#ff0000', '#000000'], ['#3b82f6', '#000000'], ['#22c55e', '#000000'], ['#8b5cf6', '#000000'], ['#0000cc', '#cccc66'], ['#0000ff', '#dddddd'], ['#1d4ed8', '#ffffff'], ['#dc2626', '#ffffff'], ['#000000', '#00cc00'], ['#000000', '#60a5fa']]) {
  const m = measure(f, b);
  console.log(`  ${f} on ${b}  WCAG ${pad(m.wcag.toFixed(1), 4)}  CVD ${pad(m.cvdMin.toFixed(1), 4)} | current ${pad(contrast(f, b)!, 4)}  paired ${pad(score(f, b, paired), 4)}`);
}
