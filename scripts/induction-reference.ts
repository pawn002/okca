/**
 * #29: what happens if Step 4's induction reference moves from #767676 toward
 * white? Read-only; no algorithm change. Run: npm run induction-ref
 *
 * The full 3.0 algorithm is reimplemented with the reference lightness L_ref and
 * POL_K as parameters, and checked against the live contrast() at the current
 * values. For each reference:
 *
 *   1. Anchors and calibration pairs.
 *   2. CAM16 threshold parity: background-aware CAM16-UCS lightness gap of the
 *      grey that first scores 4.5, on dark and light backgrounds.
 *   3. Design-system disagreements and grid verdicts against the current branch,
 *      plus false passes against WCAG (expected 0 while s <= 1).
 *   4. Whether re-deriving POL_K can hold the white/#767676 anchor at 3.9, and
 *      what that does to the other polarity and to FP=0.
 */
import { hexToOklab } from '../src/transforms';
import { contrast } from '../src/index';
import { TAILWIND, GOVUK, USWDS } from './palettes';
import { grey, xyz, Ywcag, cam16, bgEnv } from './cam16';

const CHROMA_K = 0.65, C_THRESH = 0.15, IND_Z = 1.48;
const OPP_L = 9.4, OPP_D = 313.7, OPP_K_D = 0.09, FLARE = 0.10, FLARE_K = 1.5;
const rad = (d: number) => (d * Math.PI) / 180;
const w = (o: number[], th: number) => (Math.hypot(o[1], o[2]) + o[1] * Math.cos(rad(th)) + o[2] * Math.sin(rad(th))) / 2;
const ramp = (x: number) => Math.min(1, (x / C_THRESH) ** 2);

function score(fg: string, bg: string, refL: number, polK = 1.1, round = true): number {
  const t = hexToOklab(fg)!, b = hexToOklab(bg)!;
  const tL = Math.max(0, t[0]), bL = Math.max(0, b[0]);
  if (Math.abs(tL - bL) < 1e-6) return 1;
  const lod = tL > bL, lL = Math.max(tL, bL), dL = Math.min(tL, bL), lt = lod ? t : b, dt = lod ? b : t;
  const lY = (lL ** (1 + CHROMA_K * ramp(w(lt, OPP_L)))) ** 3;
  const s = Math.min(1, (IND_Z + bL ** 1.5) / (IND_Z + refL ** 1.5));
  const eD = 1 + OPP_K_D * ramp(w(dt, OPP_D));
  const cap = lod ? 20.9 : 20;
  const ratio = cap * (((lY + 0.05) / (dL ** ((3 * s) / eD) + 0.05)) / 21) ** polK;
  const ceiling = cap * (((lL ** 3 + FLARE) / (dL ** 3 + FLARE)) / ((1 + FLARE) / FLARE)) ** FLARE_K;
  const v = Math.max(1, Math.min(21, ratio, ceiling));
  return round ? parseFloat(v.toFixed(1)) : v;
}

const L_767676 = hexToOklab('#767676')![0];
const REFS: [string, number][] = [['#767676', L_767676], ['#999999', hexToOklab('#999999')![0]], ['#bbbbbb', hexToOklab('#bbbbbb')![0]], ['#dddddd', hexToOklab('#dddddd')![0]], ['#ffffff', 1]];
const pad = (x: string | number, n: number) => String(x).padStart(n);
const wcag = (f: string, b: string) => { const a = Ywcag(f), c = Ywcag(b); return (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05); };

// Reimplementation check against the live algorithm.
{
  let mism = 0;
  for (let i = 0; i < 4000; i++) {
    const c = () => '#' + Math.floor(((i * 2654435761 + 7919 * (i % 13)) >>> 0) % 0xffffff).toString(16).padStart(6, '0');
    const f = c(), b = '#' + Math.floor(((i * 40503 + 12345) >>> 0) % 0xffffff).toString(16).padStart(6, '0');
    if (score(f, b, L_767676) !== contrast(f, b)) mism++;
  }
  console.log(`reimplementation vs live contrast() at L_ref = #767676: ${mism} mismatches in 4000 pairs`);
}

// ── 1. Anchors ────────────────────────────────────────────────────────────────
console.log('\n=== 1. Anchors and calibration pairs (POL_K = 1.1) ===');
console.log('  pair                  ' + REFS.map(([n]) => pad(`ref ${n}`, 13)).join(''));
for (const [f, b] of [['#ffffff', '#000000'], ['#000000', '#ffffff'], ['#ffffff', '#767676'], ['#767676', '#ffffff'], ['#ff69b4', '#1a1a1a'], ['#ffffff', '#595959'], ['#333333', '#cccccc'], ['#000000', '#c8c8c8'], ['#595959', '#e6e6e6']])
  console.log(`  ${f} on ${b}  ` + REFS.map(([, L]) => pad(score(f, b, L), 13)).join(''));

// ── 2. CAM16 threshold parity ─────────────────────────────────────────────────
const firstPass = (bv: number, refL: number) => {
  let fv = bv;
  while (fv >= 0 && fv <= 255 && score(grey(fv), grey(bv), refL) < 4.5) fv += bv < 128 ? 1 : -1;
  return fv;
};
const gap = (f: string, b: string) => Math.abs(cam16(xyz(f), bgEnv(b)).Jp - cam16(xyz(b), bgEnv(b)).Jp);
const BGS = [0x1a, 0x33, 0x55, 0x76, 0x99, 0xbb, 0xc8, 0xdd, 0xe6, 0xff];
console.log("\n=== 2. Background-aware CAM16-UCS gap dJ' of the grey that first reaches 4.5 ===");
console.log('  bg       ' + REFS.map(([n]) => pad(`ref ${n}`, 13)).join(''));
const gaps: number[][] = REFS.map(() => []);
for (const bv of BGS) {
  const cells = REFS.map(([, L], i) => { const fv = firstPass(bv, L); if (fv < 0 || fv > 255) return pad('-', 13); const g = gap(grey(fv), grey(bv)); gaps[i].push(g); return pad(g.toFixed(1), 13); });
  console.log(`  ${grey(bv)}  ${cells.join('')}`);
}
console.log('  spread   ' + gaps.map((g) => pad((Math.max(...g) - Math.min(...g)).toFixed(1), 13)).join(''));
console.log('  light    ' + gaps.map((g) => pad((Math.max(...g.slice(-5)) - Math.min(...g.slice(-5))).toFixed(1), 13)).join('') + '   (spread over #999999-#ffffff)');

// ── 3. Disagreements, grid verdicts, false passes ────────────────────────────
const palette: string[] = [];
for (const fams of [TAILWIND, GOVUK, USWDS]) for (const shades of Object.values(fams)) palette.push(...Object.values(shades));
const grid: string[] = [];
const hx = (n: number) => n.toString(16).padStart(2, '0');
for (let r = 0; r < 256; r += 34) for (let g = 0; g < 256; g += 34) for (let b = 0; b < 256; b += 34) grid.push(`#${hx(r)}${hx(g)}${hx(b)}`);
const base = new Map<string, number>();
for (const f of grid) for (const b of grid) base.set(f + b, score(f, b, L_767676));
console.log('\n=== 3. Disagreements and the 262,144-pair grid, against ref #767676 ===');
console.log('  ref        disagreements  above WCAG  lowered  AA lost  AAA lost');
for (const [n, L] of REFS) {
  let dis = 0;
  for (const h of palette) for (const [f, b] of [['#ffffff', h], [h, '#ffffff']])
    if (score(f, b, L) < 4.5 && parseFloat(wcag(f, b).toFixed(1)) >= 4.5) dis++;
  let fp = 0, dn = 0, aa = 0, aaa = 0;
  for (const f of grid) for (const b of grid) {
    const s = score(f, b, L), s0 = base.get(f + b)!;
    if (s > parseFloat(wcag(f, b).toFixed(1))) fp++;
    if (s < s0) dn++; if (s0 >= 4.5 && s < 4.5) aa++; if (s0 >= 7 && s < 7) aaa++;
  }
  console.log(`  ${n}  ${pad(dis, 13)}  ${pad(fp, 10)}  ${pad(dn, 7)}  ${pad(aa, 7)}  ${pad(aaa, 8)}`);
}

// ── 4. Re-deriving POL_K to hold the white/#767676 anchor ─────────────────────
console.log('\n=== 4. POL_K re-derived so white on #767676 rounds to 3.9 ===');
console.log('  ref        POL_K   white/#767676  #767676/white  WCAG  above WCAG (grid)');
for (const [n, L] of REFS) {
  let lo = 0.5, hi = 1.6;
  for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (score('#ffffff', '#767676', L, mid, false) > 3.9) lo = mid; else hi = mid; }
  const k = (lo + hi) / 2;
  let fp = 0;
  for (const f of grid) for (const b of grid) if (score(f, b, L, k) > parseFloat(wcag(f, b).toFixed(1))) fp++;
  console.log(`  ${n}  ${pad(k.toFixed(3), 6)}  ${pad(score('#ffffff', '#767676', L, k), 13)}  ${pad(score('#767676', '#ffffff', L, k), 13)}  ${pad(wcag('#767676', '#ffffff').toFixed(2), 5)}  ${pad(fp, 17)}`);
}
