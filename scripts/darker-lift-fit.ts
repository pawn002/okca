/**
 * #31: fit Step 4's darker-element lift to what OKCA actually needs.
 * Read-only; no algorithm change. Run: npm run darker-lift
 * Research record: "current" below is the pre-#31 algorithm (capped, 313.7°,
 * K_D 0.09). The linear lift it recommends is now live, so the self-check
 * against contrast() reports mismatches on later commits.
 *
 * #28 set the lift's direction from the loss-weighted direction of raw CVD
 * loss (313.7°), capped its ramp at C_THRESH, and set K_D as the smallest
 * strength with no grid pair above a dichromat's ratio. Under #30's single cap
 * that rule fails for saturated blue text, and no K_D along 313.7° restores it.
 *
 * Here the rule is applied to the requirement directly:
 *   1. For every dark colour on the grid, the smallest darker exponent e_D at
 *      which no pair with a lighter grid colour, in either polarity, scores
 *      above the dichromat's ratio, with all other steps as they are.
 *   2. θ_D is the requirement-weighted direction of those colours in (a, b).
 *   3. Capped, quadratic and linear lifts along θ_D, each with K_D the smallest
 *      strength meeting the rule, compared for collateral against the current
 *      branch.
 */
import { hexToOklab } from '../src/transforms';
import { contrast } from '../src/index';
import { measure, oklchHex, gridPairs, Measured } from './cvd';

const rad = (d: number) => (d * Math.PI) / 180;
const w = (o: number[], th: number) => (Math.hypot(o[1], o[2]) + o[1] * Math.cos(rad(th)) + o[2] * Math.sin(rad(th))) / 2;
const RAMPS: Record<string, (x: number) => number> = {
  capped: (x) => Math.min(1, (x / 0.15) ** 2),
  quadratic: (x) => (x / 0.15) ** 2,
  linear: (x) => x / 0.15,
};

/** The full 3.0 algorithm with the darker exponent e_D supplied. */
function scoreE(fg: string, bg: string, eDof: (dark: number[]) => number): number {
  const t = hexToOklab(fg)!, b = hexToOklab(bg)!;
  const tL = Math.max(0, t[0]), bL = Math.max(0, b[0]);
  if (Math.abs(tL - bL) < 1e-6) return 1;
  const lod = tL > bL, lL = Math.max(tL, bL), dL = Math.min(tL, bL), lt = lod ? t : b, dt = lod ? b : t;
  const lY = (lL ** (1 + 0.65 * Math.min(1, (w(lt, 9.4) / 0.15) ** 2))) ** 3;
  const s = Math.min(1, (1.48 + bL ** 1.5) / (1.48 + 0.5658363271 ** 1.5));
  const eD = eDof(dt);
  const ratio = 20.9 * (((lY + 0.05) / (dL ** ((3 * s) / eD) + 0.05)) / 21) ** 1.1;
  const ceiling = 20.9 * (((lL ** 3 + 0.1) / (dL ** 3 + 0.1)) / 11) ** 1.5;
  return parseFloat(Math.max(1, Math.min(21, ratio, ceiling)).toFixed(1));
}
const lift = (form: string, K: number, th: number) => (o: number[]) => 1 + K * RAMPS[form](w(o, th));
const pad = (x: string | number, n: number) => String(x).padStart(n);

const pairs = gridPairs();
const cvd = new Map<string, number>();
for (const [f, b] of pairs) cvd.set(f + b, measure(f, b).cvdMin);
{
  let mism = 0;
  for (const [f, b] of pairs.slice(0, 20000)) if (scoreE(f, b, lift('capped', 0.09, 313.7)) !== contrast(f, b)) mism++;
  console.log(`reimplementation vs live contrast() (capped, 313.7°, K_D 0.09): ${mism} mismatches in 20000`);
}

// ── 1. Requirement per dark colour ────────────────────────────────────────────
const grid = [...new Set(pairs.map(([f]) => f))];
interface Req { hex: string; a: number; b: number; C: number; H: number; req: number }
const reqs: Req[] = [];
for (const d of grid) {
  const Ld = hexToOklab(d)![0];
  const partners = grid.filter((l) => hexToOklab(l)![0] > Ld + 1e-6);
  const bad = (e: number) => partners.some((l) => scoreE(d, l, () => e) > cvd.get(d + l)! + 0.05 || scoreE(l, d, () => e) > cvd.get(l + d)! + 0.05);
  let req = 1;
  if (bad(1)) { let lo = 1, hi = 4; for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (bad(m)) lo = m; else hi = m; } req = hi; }
  const o = hexToOklab(d)!;
  reqs.push({ hex: d, a: o[1], b: o[2], C: Math.hypot(o[1], o[2]), H: ((Math.atan2(o[2], o[1]) * 180) / Math.PI + 360) % 360, req });
}
const need = reqs.filter((r) => r.req > 1).sort((p, q) => q.req - p.req);
console.log(`\n=== 1. ${need.length} of ${grid.length} dark colours need a lift (e_D > 1) ===`);
for (const r of need.slice(0, 8)) console.log(`  ${r.hex}  hue ${pad(r.H.toFixed(0), 3)}°  C ${r.C.toFixed(3)}  e_D needed ${r.req.toFixed(3)}`);
console.log(`  ... hue range ${Math.min(...need.map((r) => r.H)).toFixed(0)}–${Math.max(...need.map((r) => r.H)).toFixed(0)}°; greens need at most ${Math.max(...need.filter((r) => r.H > 100 && r.H < 200).map((r) => r.req)).toFixed(3)}`);

// ── 2. Requirement-weighted direction ─────────────────────────────────────────
let sx = 0, sy = 0;
for (const r of need) { sx += (r.req - 1) * r.a; sy += (r.req - 1) * r.b; }
const thD = Math.round(((Math.atan2(sy, sx) * 180) / Math.PI + 360) % 360);
console.log(`\n=== 2. Requirement-weighted direction θ_D = ${thD}° (was 313.7°, from raw CVD loss) ===`);

// ── 3. Forms, K_D by the rule, collateral ─────────────────────────────────────
const aboveCount = (eDof: (o: number[]) => number) => { let n = 0; for (const [f, b] of pairs) if (scoreE(f, b, eDof) > cvd.get(f + b)! + 0.05) n++; return n; };
console.log('\n=== 3. Lift forms along θ_D, K_D = smallest with no grid pair above the dichromat ratio ===');
console.log('  form        K_D     above  lowered  raised  AA lost  AA gained');
const chosen: [string, number][] = [];
for (const form of Object.keys(RAMPS)) {
  let lo = 0, hi = 2;
  if (aboveCount(lift(form, hi, thD))) { console.log(`  ${form.padEnd(10)}  not reachable`); continue; }
  for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (aboveCount(lift(form, m, thD))) lo = m; else hi = m; }
  const K = Math.ceil(hi * 1000) / 1000;
  let dn = 0, up = 0, aa = 0, ga = 0;
  for (const [f, b] of pairs) {
    const s = scoreE(f, b, lift(form, K, thD)), s0 = contrast(f, b)!;
    if (s < s0) dn++; if (s > s0) up++; if (s0 >= 4.5 && s < 4.5) aa++; if (s0 < 4.5 && s >= 4.5) ga++;
  }
  console.log(`  ${form.padEnd(10)}  ${K.toFixed(3)}  ${pad(aboveCount(lift(form, K, thD)), 5)}  ${pad(dn, 7)}  ${pad(up, 6)}  ${pad(aa, 7)}  ${pad(ga, 9)}`);
  chosen.push([form, K]);
}

// ── 4. Dark text on white by hue ──────────────────────────────────────────────
const BANDS: [string, number, number][] = [['red', 0, 45], ['orange', 45, 80], ['yellow', 80, 115], ['green', 115, 165], ['blue', 220, 280], ['purple', 280, 320], ['magenta', 320, 360]];
const pts: Measured[] = [];
for (let H = 0; H < 360; H += 3) for (let L = 0.2; L <= 0.601; L += 0.025) for (let C = 0.12; C <= 0.371; C += 0.015) {
  const h = oklchHex(L, C, H); if (!h) continue; const m = measure(h, '#ffffff'); if (m.wcag >= 3) pts.push(m);
}
const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const row = (f: (m: Measured) => number) => BANDS.map(([, lo, hi]) => pad(median(pts.filter((m) => m.H >= lo && m.H < hi).map(f)).toFixed(2), 8)).join('');
console.log('\n=== 4. Dark text on white: median score / WCAG by hue (C >= 0.12) ===');
console.log('  ' + 'variant'.padEnd(20) + BANDS.map(([n]) => pad(n.slice(0, 7), 8)).join(''));
console.log('  ' + '[CVD / WCAG]'.padEnd(20) + row((m) => m.cvdMin / m.wcag));
console.log('  ' + 'current'.padEnd(20) + row((m) => contrast(m.fg, '#ffffff')! / m.wcag));
for (const [form, K] of chosen) console.log('  ' + `${form} ${K}`.padEnd(20) + row((m) => scoreE(m.fg, '#ffffff', lift(form, K, thD)) / m.wcag));
