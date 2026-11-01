/**
 * #33: validate or eliminate CHROMA_K by fitting Step 3's lighter penalty to
 * the same rule #31 used for the darker lift. Read-only; no algorithm change.
 * Run: npm run chroma-k
 *
 * CHROMA_K = 0.65 was set so hot pink on near-black fails AA. Here the rule is
 * applied instead: no grid pair may score above a dichromat's ratio (Machado
 * et al. 2009, severity 1.0), with every correction as small as that allows.
 *
 *   1. Requirement per light colour: the smallest lighter exponent e_L at which
 *      no pair with a darker grid colour, in either polarity, scores above the
 *      dichromat's ratio, with every other step as it is.
 *   2. θ_L as the requirement-weighted direction of those colours in (a, b).
 *   3. Ramp shapes along θ_L. The two strengths trade off: a weaker lighter
 *      penalty needs a stronger darker lift. For each shape, every lighter
 *      strength K_L is paired with the smallest K_D meeting the rule, and the
 *      pair that keeps scores closest beneath the dichromat ratio (largest mean
 *      score / CVD ratio) is chosen: the least correction the rule allows.
 *   4. Collateral against the current branch.
 */
import { hexToOklab } from '../src/transforms';
import { contrast } from '../src/index';
import { measure, gridPairs } from './cvd';
import { TAILWIND, GOVUK, USWDS } from './palettes';

const C_THRESH = 0.15, POL_K = 1.1, CAP = 20.9, IND_Z = 1.48, IND_REF_L = 0.5658363271, FLARE = 0.10, FLARE_K = 1.5;
const TH_L = 9.4, TH_D = 267, K_L0 = 0.65, K_D0 = 0.070;
const rad = (d: number) => (d * Math.PI) / 180;
const w = (o: number[], th: number) => (Math.hypot(o[1], o[2]) + o[1] * Math.cos(rad(th)) + o[2] * Math.sin(rad(th))) / 2;
const SHAPES: Record<string, (x: number) => number> = {
  capped: (x) => Math.min(1, (x / C_THRESH) ** 2),
  quadratic: (x) => (x / C_THRESH) ** 2,
  linear: (x) => x / C_THRESH,
};

interface Fit { eL: (o: number[]) => number; eD: (o: number[]) => number }
const fit = (shape: string, KL: number, thL: number, KD: number): Fit => ({
  eL: (o) => 1 + KL * SHAPES[shape](w(o, thL)),
  eD: (o) => 1 + (KD * w(o, TH_D)) / C_THRESH,
});
const CURRENT = fit('capped', K_L0, TH_L, K_D0);

/** The full 3.0 algorithm on Oklab inputs, with both exponents supplied. */
function scoreO(t: number[], b: number[], p: Fit): number {
  const tL = Math.max(0, t[0]), bL = Math.max(0, b[0]);
  if (Math.abs(tL - bL) < 1e-6) return 1;
  const lod = tL > bL, lL = Math.max(tL, bL), dL = Math.min(tL, bL), lt = lod ? t : b, dt = lod ? b : t;
  const lY = lL ** (3 * p.eL(lt));
  const s = Math.min(1, (IND_Z + bL ** 1.5) / (IND_Z + IND_REF_L ** 1.5));
  const ratio = CAP * (((lY + 0.05) / (dL ** ((3 * s) / p.eD(dt)) + 0.05)) / 21) ** POL_K;
  const ceiling = CAP * (((lL ** 3 + FLARE) / (dL ** 3 + FLARE)) / ((1 + FLARE) / FLARE)) ** FLARE_K;
  return parseFloat(Math.max(1, Math.min(21, ratio, ceiling)).toFixed(1));
}
const score = (fg: string, bg: string, p: Fit) => scoreO(hexToOklab(fg)!, hexToOklab(bg)!, p);
const pad = (x: string | number, n: number) => String(x).padStart(n);

// ── Grid, with Oklab and dichromat ratios cached ──────────────────────────────
const pairs = gridPairs();
const hexes = [...new Set(pairs.map(([f]) => f))];
const N = hexes.length;
const O = hexes.map((h) => hexToOklab(h)!);
const CVD = new Float64Array(N * N);
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) CVD[i * N + j] = measure(hexes[i], hexes[j]).cvdMin;
const TOL = 0.05; // scores are rounded to 0.1

{
  let mism = 0;
  for (const [f, b] of pairs.slice(0, 20000)) if (score(f, b, CURRENT) !== contrast(f, b)) mism++;
  console.log(`reimplementation vs live contrast(): ${mism} mismatches in 20000`);
}

function sweep(p: Fit) {
  let above = 0, closeness = 0, n = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const s = scoreO(O[i], O[j], p), c = CVD[i * N + j];
    if (s > c + TOL) above++;
    if (c > 1.05) { closeness += Math.min(s, c) / c; n++; }
  }
  return { above, closeness: closeness / n };
}

function anyAbove(p: Fit): boolean {
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (scoreO(O[i], O[j], p) > CVD[i * N + j] + TOL) return true;
  return false;
}

// ── 1. Requirement per light colour ───────────────────────────────────────────
interface Req { hex: string; a: number; b: number; C: number; H: number; req: number }
const reqs: Req[] = [];
for (let i = 0; i < N; i++) {
  const partners: number[] = [];
  for (let j = 0; j < N; j++) if (O[j][0] < O[i][0] - 1e-6) partners.push(j);
  const bad = (e: number) => {
    const p: Fit = { eL: () => e, eD: CURRENT.eD };
    return partners.some((j) => scoreO(O[i], O[j], p) > CVD[i * N + j] + TOL || scoreO(O[j], O[i], p) > CVD[j * N + i] + TOL);
  };
  let req = 1;
  if (bad(1)) { let lo = 1, hi = 4; for (let k = 0; k < 20; k++) { const m = (lo + hi) / 2; if (bad(m)) lo = m; else hi = m; } req = hi; }
  const o = O[i];
  reqs.push({ hex: hexes[i], a: o[1], b: o[2], C: Math.hypot(o[1], o[2]), H: ((Math.atan2(o[2], o[1]) * 180) / Math.PI + 360) % 360, req });
}
const need = reqs.filter((r) => r.req > 1).sort((p, q) => q.req - p.req);
console.log(`\n=== 1. ${need.length} of ${N} light colours need a lighter penalty (e_L > 1), with the current darker lift ===`);
for (const r of need.slice(0, 10)) console.log(`  ${r.hex}  hue ${pad(r.H.toFixed(0), 3)}°  C ${r.C.toFixed(3)}  e_L needed ${r.req.toFixed(3)}  (current ${CURRENT.eL([0, r.a, r.b]).toFixed(3)})`);
const byHue: [string, number, number][] = [['red', 0, 45], ['orange', 45, 80], ['yellow', 80, 115], ['green', 115, 165], ['cyan', 165, 220], ['blue', 220, 280], ['purple', 280, 320], ['magenta', 320, 360]];
console.log('  hue band   colours needing  max e_L needed  current e_L there');
for (const [name, lo, hi] of byHue) {
  const band = need.filter((r) => r.H >= lo && r.H < hi);
  const max = band.length ? Math.max(...band.map((r) => r.req)) : 1;
  const cur = band.length ? Math.max(...band.map((r) => CURRENT.eL([0, r.a, r.b]))) : 1;
  console.log(`  ${name.padEnd(9)}  ${pad(band.length, 15)}  ${pad(max.toFixed(3), 14)}  ${pad(cur.toFixed(3), 17)}`);
}

// Shape: requirement against weight along θ_L
console.log('\n  requirement vs weight along θ_L (colours needing a penalty):');
console.log('  w_L band       n   median e_L − 1');
for (const [lo, hi] of [[0, 0.05], [0.05, 0.1], [0.1, 0.15], [0.15, 0.2], [0.2, 0.3]]) {
  const band = need.filter((r) => { const x = w([0, r.a, r.b], TH_L); return x >= lo && x < hi; }).map((r) => r.req - 1).sort((p, q) => p - q);
  if (band.length) console.log(`  ${lo.toFixed(2)}–${hi.toFixed(2)}  ${pad(band.length, 6)}  ${pad(band[Math.floor(band.length / 2)].toFixed(3), 14)}`);
}

// ── 2. Requirement-weighted direction ─────────────────────────────────────────
let sx = 0, sy = 0;
for (const r of need) { sx += (r.req - 1) * r.a; sy += (r.req - 1) * r.b; }
const thReq = Math.round(((Math.atan2(sy, sx) * 180) / Math.PI + 360) % 360);
console.log(`\n=== 2. Requirement-weighted direction θ_L = ${thReq}° (current ${TH_L}°, from raw CVD loss) ===`);

// ── 3. Shapes and strengths ───────────────────────────────────────────────────
const minKD = (shape: string, KL: number, thL: number): number | null => {
  if (anyAbove(fit(shape, KL, thL, 0.5))) return null;
  let lo = 0, hi = 0.5;
  if (!anyAbove(fit(shape, KL, thL, 0))) return 0;
  for (let k = 0; k < 11; k++) { const m = (lo + hi) / 2; if (anyAbove(fit(shape, KL, thL, m))) lo = m; else hi = m; }
  return Math.ceil(hi * 1000) / 1000;
};
interface Cand { shape: string; thL: number; KL: number; KD: number; closeness: number }
const best: Cand[] = [];
const directions = [...new Set([TH_L, thReq])];
console.log('\n=== 3. Shapes along θ_L: each K_L with the smallest K_D meeting the rule ===');
console.log(`  current (capped, ${TH_L}°, K_L ${K_L0}, K_D ${K_D0}): closeness ${sweep(CURRENT).closeness.toFixed(4)}, above ${sweep(CURRENT).above}`);
for (const thL of directions) for (const shape of Object.keys(SHAPES)) {
  let top: Cand | null = null;
  const row: string[] = [];
  for (let KL = 0; KL <= 1.0001; KL += 0.05) {
    const KD = minKD(shape, KL, thL);
    if (KD === null) { row.push(`${KL.toFixed(2)}:—`); continue; }
    const c = sweep(fit(shape, KL, thL, KD)).closeness;
    row.push(`${KL.toFixed(2)}:${KD.toFixed(3)}`);
    if (!top || c > top.closeness) top = { shape, thL, KL, KD, closeness: c };
  }
  console.log(`  ${shape.padEnd(9)} ${pad(thL, 5)}°  K_L:K_D  ${row.join(' ')}`);
  if (top) {
    // refine K_L around the best coarse value
    for (let KL = Math.max(0, top.KL - 0.05); KL <= top.KL + 0.0501; KL += 0.01) {
      const KD = minKD(shape, KL, thL); if (KD === null) continue;
      const c = sweep(fit(shape, KL, thL, KD)).closeness;
      if (c > top.closeness) top = { shape, thL, KL, KD, closeness: c };
    }
    console.log(`    best: K_L ${top.KL.toFixed(2)}, K_D ${top.KD.toFixed(3)}, closeness ${top.closeness.toFixed(4)}`);
    best.push(top);
  }
}

// ── 4. Collateral ─────────────────────────────────────────────────────────────
const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const Y = (h: string) => { const c = [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const wcag = (f: string, b: string) => { const a = Y(f), c = Y(b); return (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05); };
const palette: string[] = [];
for (const fams of [TAILWIND, GOVUK, USWDS]) for (const shades of Object.values(fams)) palette.push(...Object.values(shades));
const disagreements = (p: Fit) => {
  let n = 0;
  for (const h of palette) {
    if (parseFloat(wcag('#ffffff', h).toFixed(1)) < 4.5) continue;
    if (score('#ffffff', h, p) < 4.5) n++;
    if (score(h, '#ffffff', p) < 4.5) n++;
  }
  return n;
};
const EX: [string, string, string][] = [
  ['#ff69b4', '#1a1a1a', 'hot pink'], ['#ff8c00', '#1a1a1a', 'dark orange'], ['#ff0000', '#000000', 'red on black'],
  ['#000000', '#ff69b4', 'black on hot pink'], ['#3b82f6', '#000000', 'blue on black'], ['#1d4ed8', '#ffffff', 'dark blue on white'],
  ['#ffffff', '#767676', 'white / #767676'],
];
console.log('\n=== 4. Collateral against the current branch ===');
const variants: [string, Fit][] = [['current', CURRENT], ...best.map((c): [string, Fit] => [`${c.shape} ${c.thL}° ${c.KL.toFixed(2)}/${c.KD.toFixed(3)}`, fit(c.shape, c.KL, c.thL, c.KD)])];
console.log('  ' + 'variant'.padEnd(26) + EX.map(([, , n]) => pad(n.slice(0, 11), 12)).join('') + '  disagree');
console.log('  ' + '[WCAG]'.padEnd(26) + EX.map(([f, b]) => pad(wcag(f, b).toFixed(1), 12)).join(''));
console.log('  ' + '[dichromat]'.padEnd(26) + EX.map(([f, b]) => pad(measure(f, b).cvdMin.toFixed(1), 12)).join(''));
for (const [name, p] of variants) console.log('  ' + name.padEnd(26) + EX.map(([f, b]) => pad(score(f, b, p), 12)).join('') + pad(disagreements(p), 10));

console.log('\n  grid (262,144 pairs) against current:   raised  lowered  AA gained  AA lost  above WCAG  above CVD');
for (const [name, p] of variants.slice(1)) {
  let up = 0, dn = 0, ga = 0, lo = 0, fp = 0, cv = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const s = scoreO(O[i], O[j], p), s0 = scoreO(O[i], O[j], CURRENT);
    if (s > s0) up++; if (s < s0) dn++; if (s0 < 4.5 && s >= 4.5) ga++; if (s0 >= 4.5 && s < 4.5) lo++;
    if (s > parseFloat(wcag(hexes[i], hexes[j]).toFixed(1))) fp++;
    if (s > CVD[i * N + j] + TOL) cv++;
  }
  console.log(`  ${name.padEnd(38)} ${pad(up, 7)}  ${pad(dn, 7)}  ${pad(ga, 9)}  ${pad(lo, 7)}  ${pad(fp, 10)}  ${pad(cv, 9)}`);
}
