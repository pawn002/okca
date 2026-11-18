/**
 * #34: the scatter observer's two dials, and where it meets the default.
 * Read-only; no algorithm change. Run: npm run scatter-dials
 *
 * Age (straylight strength s = 10 (1 + (A/70)^4)) and the field of background
 * counted as a veil source (θ1 to θ2) act only through one number:
 *   k = s · 2π (π/180)² · ln(θ2/θ1).
 * k = 0 is the default observer; the shipped scatter observer uses 0.155
 * (age 80, 1°–20°). This sweeps k, scores each with the full algorithm, and
 * maps each k back to the ages and fields that produce it.
 */
import { hexToOklab } from '../src/transforms';
import { contrast } from '../src/index';
import { TAILWIND, GOVUK, USWDS } from './palettes';

const rad = (d: number) => (d * Math.PI) / 180;
const w = (o: number[], th: number) => (Math.hypot(o[1], o[2]) + o[1] * Math.cos(rad(th)) + o[2] * Math.sin(rad(th))) / 2;
const UNIT = 2 * Math.PI * (Math.PI / 180) ** 2;
const sAge = (A: number) => 10 * (1 + (A / 70) ** 4);

function score(fg: string, bg: string, k: number): number {
  const t = hexToOklab(fg)!, b = hexToOklab(bg)!;
  const tL = Math.max(0, t[0]), bL = Math.max(0, b[0]);
  if (Math.abs(tL - bL) < 1e-6) return 1;
  const lod = tL > bL, lL = Math.max(tL, bL), dL = Math.min(tL, bL), lt = lod ? t : b, dt = lod ? b : t;
  const lY = lL ** (3 * (1 + (0.22 * w(lt, 9.4)) / 0.15));
  const s = Math.min(1, (1.48 + bL ** 1.5) / (1.48 + 0.5658363271 ** 1.5));
  const dY = dL ** ((3 * s) / (1 + (0.065 * w(dt, 267)) / 0.15));
  const v = k * bL ** 3;
  const ratio = 20.9 * (((lY + 0.05 + v) / (dY + 0.05 + v)) / 21) ** 1.1;
  const ceiling = 20.9 * (((lL ** 3 + 0.1) / (dL ** 3 + 0.1)) / 11) ** 1.5;
  return parseFloat(Math.max(1, Math.min(21, ratio, ceiling)).toFixed(1));
}
const pad = (x: string | number, n: number) => String(x).padStart(n);
const hx = (n: number) => n.toString(16).padStart(2, '0');

{ // self-check against the live algorithm at both ends
  let mm = 0;
  for (const [f, b] of [['#123456', '#abcdef'], ['#ff69b4', '#1a1a1a'], ['#000000', '#ffffff'], ['#767676', '#ffffff'], ['#3366cc', '#eeeeee']]) {
    if (score(f, b, 0) !== contrast(f, b)) mm++;
    if (score(f, b, 0.155) !== contrast(f, b, { observer: 'scatter' })) mm++;
  }
  console.log(`reimplementation vs live (default and scatter): ${mm} mismatches in 10`);
}

const grid: string[] = [];
for (let r = 0; r < 256; r += 34) for (let g = 0; g < 256; g += 34) for (let b = 0; b < 256; b += 34) grid.push(`#${hx(r)}${hx(g)}${hx(b)}`);
const L = new Map(grid.map((h) => [h, hexToOklab(h)![0]]));
const palette: string[] = [];
for (const fams of [TAILWIND, GOVUK, USWDS]) for (const shades of Object.values(fams)) palette.push(...Object.values(shades));
const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const Y = (h: string) => { const c = [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const aaWcag = palette.filter((h) => parseFloat((1.05 / (Y(h) + 0.05)).toFixed(1)) >= 4.5);

console.log('\n=== Sweep: polarity (grid pairs where either direction reaches 3.0), anchors, disagreements ===');
console.log('     k   D-o-L higher  tie  L-o-D higher   wht/767 767/wht  blk/wht  disagree  AA lost vs default');
for (const k of [0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.10, 0.12, 0.155]) {
  let dol = 0, tie = 0, lodN = 0, lost = 0;
  for (const a of grid) for (const b of grid) {
    if (L.get(a)! <= L.get(b)!) continue; // a lighter
    const lo = score(a, b, k), dl = score(b, a, k);
    if (Math.max(lo, dl) < 3) continue;
    if (dl > lo) dol++; else if (lo > dl) lodN++; else tie++;
  }
  for (const a of grid) for (const b of grid) if (score(a, b, 0) >= 4.5 && score(a, b, k) < 4.5) lost++;
  let dis = 0;
  for (const h of aaWcag) { if (score('#ffffff', h, k) < 4.5) dis++; if (score(h, '#ffffff', k) < 4.5) dis++; }
  const n = dol + tie + lodN;
  const pc = (x: number) => `${((100 * x) / n).toFixed(0)}%`;
  console.log(`  ${k.toFixed(3)}  ${pad(pc(dol), 11)}  ${pad(pc(tie), 4)}  ${pad(pc(lodN), 11)}  ${pad(score('#ffffff', '#767676', k), 7)} ${pad(score('#767676', '#ffffff', k), 7)}  ${pad(score('#000000', '#ffffff', k), 7)}  ${pad(dis, 8)}  ${pad(lost, 8)}`);
}

console.log('\n=== Which dial settings give each k ===');
console.log('  k       age, 1°–20°   age, 1°–10°   age, 2°–10°   field at age 80 (from 1°)');
const ageFor = (k: number, th1: number, th2: number) => { const s = k / (UNIT * Math.log(th2 / th1)); return s <= 10 ? '< 0 (below a young eye)' : `${(70 * Math.pow(s / 10 - 1, 0.25)).toFixed(0)}`; };
for (const k of [0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.10, 0.155]) {
  const th2 = Math.exp(k / (UNIT * sAge(80)));
  console.log(`  ${k.toFixed(3)}  ${pad(ageFor(k, 1, 20), 12)}  ${pad(ageFor(k, 1, 10), 12)}  ${pad(ageFor(k, 2, 10), 12)}   1°–${th2.toFixed(1)}°`);
}
