/**
 * Colour-vision-deficiency survey: should colourfulness lower contrast?
 * Read-only; no algorithm change. Run: npm run cvd
 *
 * The CAM16 survey (docs/CAM16_FINDINGS.md) showed where OKCA's chroma penalty
 * applies, not whether colourfulness should lower contrast at all. Dichromacy
 * gives a physiological route: a colour that loses cone signal loses luminance
 * for that viewer. Starting from red on black:
 *
 *   1. Red family on black: what a protan keeps, against OKCA.
 *   2. Hue circle: how much contrast the worst-case dichromat keeps, whether it
 *      tracks chroma, and OKCA / WCAG against CVD / WCAG.
 *   3. A dichromat computed inside Oklab's own LMS stage, against Machado.
 *   4. Scoring variants that use dichromat lightness, on a 262,144-pair grid.
 *
 * Simulation: Machado, Oliveira & Fernandes (2009), severity 1.0, on linear
 * sRGB. "CVD ratio" is the WCAG ratio of the simulated pair, worst of protan,
 * deutan and tritan.
 */
import { hexToOklab } from '../src/transforms';
import { contrast } from '../src/index';

type V3 = [number, number, number];
const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const gam = (v: number) => { v = Math.min(1, Math.max(0, v)); return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055; };
const hx = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 255).toString(16).padStart(2, '0');
const toLin = (h: string): V3 => [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255)) as V3;
const lumY = (l: V3) => 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const mul = (M: number[][], v: V3) => M.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]) as V3;
const clamp01 = (v: V3) => v.map((x) => Math.min(1, Math.max(0, x))) as V3;

const MACHADO: Record<string, number[][]> = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};
const KINDS = ['protan', 'deutan', 'tritan'];

// Oklab's first matrix (linear sRGB -> its LMS-like stage) and L from that stage.
const M1 = [[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]];
const lOf = (lms: V3) => 0.2104542553 * Math.cbrt(Math.max(0, lms[0])) + 0.7936177850 * Math.cbrt(Math.max(0, lms[1])) - 0.0040720468 * Math.cbrt(Math.max(0, lms[2]));

function oklchHex(L: number, C: number, H: number): string | null {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
  if (rgb.some((v) => v < -1e-6 || v > 1 + 1e-6)) return null;
  return '#' + rgb.map((v) => hx(gam(v))).join('');
}

interface M { fg: string; bg: string; wcag: number; cvd: Record<string, number>; cvdMin: number; C: number; H: number }
function measure(fg: string, bg: string): M {
  const lf = toLin(fg), lb = toLin(bg), [, a, b] = hexToOklab(fg)!;
  const cvd: Record<string, number> = {};
  for (const k of KINDS) cvd[k] = ratio(lumY(clamp01(mul(MACHADO[k], lf))), lumY(clamp01(mul(MACHADO[k], lb))));
  return { fg, bg, wcag: ratio(lumY(lf), lumY(lb)), cvd, cvdMin: Math.min(...KINDS.map((k) => cvd[k])), C: Math.hypot(a, b), H: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
}

// ── Dichromat lightness ───────────────────────────────────────────────────────
// Machado: simulate in linear sRGB, then OKLab L of the result.
const machadoL = (hex: string) => KINDS.map((k) => lOf(mul(M1, clamp01(mul(MACHADO[k], toLin(hex))))));
// Oklab-native: replace one channel of Oklab's LMS stage with the plane through
// black, white and the blue primary (protan, deutan) or red primary (tritan).
// Anchoring on yellow or green gives the same planes, since yellow = white - blue.
function nativePlane(lost: number, i: number, j: number, anchor: V3) {
  const A = mul(M1, anchor), a = (A[lost] - A[j]) / (A[i] - A[j]);
  return (lms: V3) => { const d = [...lms] as V3; d[lost] = Math.max(0, a * lms[i] + (1 - a) * lms[j]); return d; };
}
const NATIVE = [nativePlane(0, 1, 2, [0, 0, 1]), nativePlane(1, 0, 2, [0, 0, 1]), nativePlane(2, 0, 1, [1, 0, 0])];
const nativeL = (hex: string) => NATIVE.map((p) => lOf(p(mul(M1, toLin(hex)))));

// ── Scoring variants: steps 1-5 of this branch with selectable proxies ────────
type Src = 'chroma' | 'machado' | 'native';
interface Variant { lighter: Src; darker?: 'machado' }
function score(fg: string, bg: string, v: Variant): number {
  const t = hexToOklab(fg)!, b = hexToOklab(bg)!;
  const tL = Math.max(0, t[0]), bL = Math.max(0, b[0]);
  if (Math.abs(tL - bL) < 1e-6) return 1;
  const lod = tL > bL, lHex = lod ? fg : bg, dHex = lod ? bg : fg, lL = Math.max(tL, bL), dL = Math.min(tL, bL), lt = lod ? t : b;
  const s = Math.min(1, (1.48 + bL ** 1.5) / (1.48 + 0.5658363271 ** 1.5));
  const lY = v.lighter === 'chroma'
    ? (lL ** (1 + 0.65 * Math.min(1, (Math.hypot(lt[1], lt[2]) / 0.15) ** 2))) ** 3
    : Math.min(lL, ...(v.lighter === 'machado' ? machadoL : nativeL)(lHex)) ** 3;
  const dBase = v.darker ? Math.max(dL, ...machadoL(dHex)) : dL;
  const r = (lY + 0.05) / (dBase ** (3 * s) + 0.05);
  return parseFloat(Math.max(1, Math.min(21, (lod ? 20.9 : 20) * (r / 21) ** 1.1)).toFixed(1));
}
const VARIANTS: [string, Variant][] = [
  ['current', { lighter: 'chroma' }],
  ['current + CVD darker', { lighter: 'chroma', darker: 'machado' }],
  ['CVD both (replaces chroma)', { lighter: 'machado', darker: 'machado' }],
  ['CVD lighter only', { lighter: 'machado' }],
  ['native CVD lighter', { lighter: 'native' }],
];

const pad = (x: string | number, n: number) => String(x).padStart(n);
const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const corr = (xs: number[], ys: number[]) => {
  const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
};
const BANDS: [string, number, number][] = [['red', 0, 45], ['orange', 45, 80], ['yellow', 80, 115], ['green', 115, 165], ['cyan', 165, 220], ['blue', 220, 280], ['purple', 280, 320], ['magenta', 320, 360]];
const band = (h: number) => BANDS.find(([, lo, hi]) => h >= lo && h < hi)![0];

// ── 1. Red family on black ───────────────────────────────────────────────────
console.log('=== 1. Red family on #000000 ===');
console.log('  fg        WCAG  protan  kept   OKCA');
for (const fg of ['#ff0000', '#e00000', '#cc0000', '#ff3333', '#ff5555', '#ff7777', '#ff9999', '#ffbbbb', '#888888']) {
  const m = measure(fg, '#000000');
  console.log(`  ${fg}  ${pad(m.wcag.toFixed(2), 5)}  ${pad(m.cvd.protan.toFixed(2), 6)}  ${pad(((100 * (m.cvd.protan - 1)) / (m.wcag - 1)).toFixed(0), 3)}%  ${pad(contrast(fg, '#000000')!, 5)}`);
}

// ── 2. Hue circle ────────────────────────────────────────────────────────────
const sweep: M[] = [];
for (let H = 0; H < 360; H += 3) for (let L = 0.45; L <= 0.951; L += 0.025) for (let C = 0.02; C <= 0.371; C += 0.015) {
  const h = oklchHex(L, C, H); if (!h) continue;
  for (const bg of ['#000000', '#ffffff']) { const m = measure(h, bg); if (m.wcag >= 3) sweep.push(m); }
}
const kept = (m: M) => (m.cvdMin - 1) / (m.wcag - 1);
for (const bg of ['#000000', '#ffffff']) {
  console.log(`\n=== 2. ${bg === '#000000' ? 'Light text on black' : 'Dark text on white'}: worst-CVD contrast kept (C >= 0.12) ===`);
  console.log('  hue       median  min  | corr(kept, C) | worst  | OKCA/WCAG  CVD/WCAG');
  for (const [name, lo, hi] of BANDS) {
    const all = sweep.filter((m) => m.bg === bg && m.H >= lo && m.H < hi), sat = all.filter((m) => m.C >= 0.12);
    if (sat.length < 5) continue;
    const worst: Record<string, number> = {};
    for (const m of sat) { const k = KINDS.reduce((a, b) => (m.cvd[b] < m.cvd[a] ? b : a)); worst[k] = (worst[k] || 0) + 1; }
    console.log(`  ${name.padEnd(8)} ${pad((100 * median(sat.map(kept))).toFixed(0), 5)}% ${pad((100 * Math.min(...sat.map(kept))).toFixed(0), 4)}% | ${pad(corr(all.map((m) => m.C), all.map(kept)).toFixed(2), 13)} | ${Object.entries(worst).sort((a, b) => b[1] - a[1])[0][0]} | ${pad(median(sat.map((m) => contrast(m.fg, bg)! / m.wcag)).toFixed(2), 9)} ${pad(median(sat.map((m) => m.cvdMin / m.wcag)).toFixed(2), 9)}`);
  }
}

// ── 3. Oklab-native dichromat against Machado ────────────────────────────────
console.log('\n=== 3. Oklab-native dichromat vs Machado, light text on black (log-ratio error) ===');
const pts: string[] = [];
for (let H = 0; H < 360; H += 6) for (let L = 0.4; L <= 0.951; L += 0.05) for (let C = 0.03; C <= 0.37; C += 0.03) { const h = oklchHex(L, C, H); if (h) pts.push(h); }
const r3 = (a: number) => (a ** 3 + 0.05) / 0.05;
KINDS.forEach((k, i) => {
  const errs = pts.map((h) => Math.log(r3(nativeL(h)[i]) / measure(h, '#000000').cvd[k]));
  const byBand = BANDS.map(([n]) => { const e = errs.filter((_, j) => band(measure(pts[j], '#000000').H) === n); return e.length ? `${n} ${(e.reduce((a, b) => a + b, 0) / e.length).toFixed(2)}` : ''; }).filter(Boolean).join('  ');
  console.log(`  ${k}: mean |err| ${(errs.reduce((a, b) => a + Math.abs(b), 0) / errs.length).toFixed(3)}, max ${Math.max(...errs.map(Math.abs)).toFixed(3)}; signed by hue (+ = more contrast than Machado): ${byBand}`);
});

// ── 4. Scoring variants on the grid ──────────────────────────────────────────
console.log('\n=== 4. Variants on a 262,144-pair sRGB grid (against the current branch) ===');
const grid: string[] = [];
for (let r = 0; r < 256; r += 34) for (let g = 0; g < 256; g += 34) for (let b = 0; b < 256; b += 34) grid.push(`#${hx(r / 255)}${hx(g / 255)}${hx(b / 255)}`);
const pairs: { f: string; b: string; m: M; s0: number }[] = [];
for (const f of grid) for (const b of grid) pairs.push({ f, b, m: measure(f, b), s0: score(f, b, VARIANTS[0][1]) });
console.log('  variant                       above WCAG  above CVD  AA a CVD viewer fails  raised  AA gained  AA lost');
for (const [name, v] of VARIANTS) {
  let fp = 0, cvd = 0, cvdAA = 0, up = 0, gain = 0, lost = 0;
  for (const { f, b, m, s0 } of pairs) {
    const s = score(f, b, v);
    if (s > parseFloat(m.wcag.toFixed(1))) fp++;
    if (s > m.cvdMin + 0.05) cvd++;
    if (s >= 4.5 && m.cvdMin < 4.5) cvdAA++;
    if (s > s0) up++; if (s0 < 4.5 && s >= 4.5) gain++; if (s0 >= 4.5 && s < 4.5) lost++;
  }
  console.log(`  ${name.padEnd(28)} ${pad(fp, 10)} ${pad(cvd, 10)} ${pad(cvdAA, 22)} ${pad(up, 7)} ${pad(gain, 10)} ${pad(lost, 8)}`);
}
console.log('\n  pair                 WCAG   CVD | ' + VARIANTS.map(([n]) => n.slice(0, 12).padStart(13)).join(''));
for (const [f, b] of [['#ff69b4', '#1a1a1a'], ['#ff0000', '#000000'], ['#3b82f6', '#000000'], ['#8b5cf6', '#000000'], ['#0000ff', '#dddddd'], ['#1d4ed8', '#ffffff'], ['#ffffff', '#767676']]) {
  const m = measure(f, b);
  console.log(`  ${f} on ${b}  ${pad(m.wcag.toFixed(1), 4)}  ${pad(m.cvdMin.toFixed(1), 4)} | ` + VARIANTS.map(([, v]) => pad(score(f, b, v), 13)).join(''));
}
