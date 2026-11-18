/**
 * #30: revisit the polarity caps. Read-only; no algorithm change.
 * Run: npm run polarity
 *
 * OKCA's Step 5 scales light-on-dark to LOD_CAP = 20.9 and dark-on-light to
 * DOL_CAP = 20: an editorial asymmetry that scores light-on-dark higher. The
 * evidence-based steps (4: induction and opponent lift; 6: flare) push the
 * other way on dark backgrounds. The full 3.0 algorithm is reimplemented with
 * both caps as parameters, checked against the live contrast() at the current
 * values, and compared across:
 *
 *   current   LOD 20.9, DOL 20
 *   equal     LOD 20.9, DOL 20.9   asymmetry left to the evidence-based steps
 *   inverted  LOD 20,   DOL 20.9   editorial asymmetry in the literature's direction
 *
 * Sections: which polarity scores higher, by darker-colour lightness; anchors;
 * design-system disagreements; grid verdicts and false passes against WCAG.
 */
import { hexToOklab } from '../src/transforms';
import { contrast } from '../src/index';
import { TAILWIND, GOVUK, USWDS } from './palettes';

const CHROMA_K = 0.65, C_THRESH = 0.15, POL_K = 1.1, IND_Z = 1.48, IND_REF_L = 0.5658363271;
const OPP_L = 9.4, OPP_D = 313.7, OPP_K_D = 0.09, FLARE = 0.10, FLARE_K = 1.5;
const rad = (d: number) => (d * Math.PI) / 180;
const w = (o: number[], th: number) => (Math.hypot(o[1], o[2]) + o[1] * Math.cos(rad(th)) + o[2] * Math.sin(rad(th))) / 2;
const ramp = (x: number) => Math.min(1, (x / C_THRESH) ** 2);

interface Caps { lod: number; dol: number }
function score(fg: string, bg: string, caps: Caps): number {
  const t = hexToOklab(fg)!, b = hexToOklab(bg)!;
  const tL = Math.max(0, t[0]), bL = Math.max(0, b[0]);
  if (Math.abs(tL - bL) < 1e-6) return 1;
  const lod = tL > bL, lL = Math.max(tL, bL), dL = Math.min(tL, bL), lt = lod ? t : b, dt = lod ? b : t;
  const lY = (lL ** (1 + CHROMA_K * ramp(w(lt, OPP_L)))) ** 3;
  const s = Math.min(1, (IND_Z + bL ** 1.5) / (IND_Z + IND_REF_L ** 1.5));
  const eD = 1 + OPP_K_D * ramp(w(dt, OPP_D));
  const cap = lod ? caps.lod : caps.dol;
  const ratio = cap * (((lY + 0.05) / (dL ** ((3 * s) / eD) + 0.05)) / 21) ** POL_K;
  const ceiling = cap * (((lL ** 3 + FLARE) / (dL ** 3 + FLARE)) / ((1 + FLARE) / FLARE)) ** FLARE_K;
  return parseFloat(Math.max(1, Math.min(21, ratio, ceiling)).toFixed(1));
}

const VARIANTS: [string, Caps][] = [
  ['current', { lod: 20.9, dol: 20 }],
  ['equal', { lod: 20.9, dol: 20.9 }],
  ['inverted', { lod: 20, dol: 20.9 }],
];
const pad = (x: string | number, n: number) => String(x).padStart(n);
const hx = (n: number) => n.toString(16).padStart(2, '0');
const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const Y = (h: string) => { const c = [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const wcag = (f: string, b: string) => { const a = Y(f), c = Y(b); return (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05); };

{
  let mism = 0;
  for (let i = 0; i < 4000; i++) {
    const f = '#' + (((i * 2654435761) >>> 0) % 0xffffff).toString(16).padStart(6, '0');
    const b = '#' + (((i * 40503 + 12345) >>> 0) % 0xffffff).toString(16).padStart(6, '0');
    if (score(f, b, VARIANTS[0][1]) !== contrast(f, b)) mism++;
  }
  console.log(`reimplementation vs live contrast() at current caps: ${mism} mismatches in 4000 pairs`);
}

// ── 1. Which polarity scores higher ───────────────────────────────────────────
const cube: string[] = [];
for (let r = 0; r < 256; r += 17) for (let g = 0; g < 256; g += 17) for (let b = 0; b < 256; b += 17) cube.push(`#${hx(r)}${hx(g)}${hx(b)}`);
const pairs: [string, string, number][] = [];
for (let i = 0; i < cube.length; i += 3) for (let j = 0; j < cube.length; j += 3) {
  const a = cube[i], b = cube[j], La = hexToOklab(a)![0], Lb = hexToOklab(b)![0];
  if (La > Lb + 0.05) pairs.push([a, b, Lb]); // a lighter, b darker
}
const BANDS: [number, number][] = [[0, 0.3], [0.3, 0.5], [0.5, 0.5658], [0.5658, 1.01]];
console.log('\n=== 1. Which polarity scores higher (pairs where either direction reaches 3.0) ===');
console.log('  variant    ' + BANDS.map(([a, b]) => pad(`dark L ${a}-${b > 1 ? 1 : b}`, 22)).join(''));
for (const [name, caps] of VARIANTS) {
  const cells = BANDS.map(([lo, hi]) => {
    let n = 0, l = 0, d = 0;
    for (const [a, b, Lb] of pairs) {
      if (Lb < lo || Lb >= hi) continue;
      const sl = score(a, b, caps), sd = score(b, a, caps);
      if (sl < 3 && sd < 3) continue;
      n++; if (sl > sd) l++; else if (sd > sl) d++;
    }
    return pad(`L-o-D ${((100 * l) / n).toFixed(0)}% D-o-L ${((100 * d) / n).toFixed(0)}%`, 22);
  });
  console.log(`  ${name.padEnd(9)}  ${cells.join('')}`);
}

// ── 2. Anchors ────────────────────────────────────────────────────────────────
console.log('\n=== 2. Anchors and calibration pairs (light-on-dark / dark-on-light) ===');
console.log('  pair                 WCAG  ' + VARIANTS.map(([n]) => pad(n, 14)).join(''));
for (const [a, b] of [['#ffffff', '#000000'], ['#ffffff', '#767676'], ['#ffffff', '#595959'], ['#cccccc', '#333333'], ['#ff69b4', '#1a1a1a'], ['#3b82f6', '#ffffff']]) {
  const [l, d] = hexToOklab(a)![0] > hexToOklab(b)![0] ? [a, b] : [b, a];
  console.log(`  ${l} / ${d}  ${pad(wcag(l, d).toFixed(2), 5)}  ` + VARIANTS.map(([, c]) => pad(`${score(l, d, c)} / ${score(d, l, c)}`, 14)).join(''));
}

// ── 3. Disagreements ──────────────────────────────────────────────────────────
const palette: string[] = [];
for (const fams of [TAILWIND, GOVUK, USWDS]) for (const shades of Object.values(fams)) palette.push(...Object.values(shades));
console.log('\n=== 3. Design-system WCAG disagreements (white partner, per polarity) ===');
for (const [name, caps] of VARIANTS) {
  let lodN = 0, dolN = 0;
  for (const h of palette) {
    const wv = parseFloat(wcag('#ffffff', h).toFixed(1));
    if (wv < 4.5) continue;
    if (score('#ffffff', h, caps) < 4.5) lodN++;
    if (score(h, '#ffffff', caps) < 4.5) dolN++;
  }
  console.log(`  ${name.padEnd(9)} total ${pad(lodN + dolN, 3)}  (white on colour ${lodN}, colour on white ${dolN})`);
}

// ── 4. Grid ───────────────────────────────────────────────────────────────────
const grid: string[] = [];
for (let r = 0; r < 256; r += 34) for (let g = 0; g < 256; g += 34) for (let b = 0; b < 256; b += 34) grid.push(`#${hx(r)}${hx(g)}${hx(b)}`);
console.log('\n=== 4. 262,144-pair grid, against current caps ===');
console.log('  variant    above WCAG   raised  lowered  AA gained  AA lost  AAA gained  AAA lost');
for (const [name, caps] of VARIANTS) {
  let fp = 0, up = 0, dn = 0, ga = 0, lo = 0, ga7 = 0, lo7 = 0;
  for (const f of grid) for (const b of grid) {
    const s = score(f, b, caps), s0 = score(f, b, VARIANTS[0][1]);
    if (s > parseFloat(wcag(f, b).toFixed(1))) fp++;
    if (s > s0) up++; if (s < s0) dn++;
    if (s0 < 4.5 && s >= 4.5) ga++; if (s0 >= 4.5 && s < 4.5) lo++;
    if (s0 < 7 && s >= 7) ga7++; if (s0 >= 7 && s < 7) lo7++;
  }
  console.log(`  ${name.padEnd(9)}  ${pad(fp, 10)}  ${pad(up, 7)}  ${pad(dn, 7)}  ${pad(ga, 9)}  ${pad(lo, 7)}  ${pad(ga7, 10)}  ${pad(lo7, 8)}`);
}
