/**
 * Hue-stratified analysis of the OKCA vs WCAG relationship across the sRGB
 * gamut. Read-only exploration; no algorithm change. Run: npm run hue
 *
 * Bins every sRGB grid colour by its OKLCH hue and reports, per hue:
 *   A. Conservatism — WCAG - OKCA slack for white-on-colour and colour-on-white
 *      (the practitioner case), plus how many pairs land in the disagreement
 *      zone (OKCA<4.5 & WCAG>=4.5).
 *   B. FP=0 headroom — the tightest WCAG - OKCA margin when that hue is the
 *      DARKER element under light-chromatic foregrounds (the overshoot risk).
 */
import { hexToOklab, hexToOklch } from '../src/transforms';
import { contrast } from '../src/index';

function wcag(fg: string, bg: string): number {
  const lum = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const l1 = lum(fg);
  const l2 = lum(bg);
  return parseFloat(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(1));
}

const hx = (n: number) => n.toString(16).padStart(2, '0');
interface C { hex: string; L: number; C: number; H: number }
function grid(step: number): C[] {
  const vals: number[] = [];
  for (let v = 0; v <= 255; v += step) vals.push(v);
  if (vals[vals.length - 1] !== 255) vals.push(255);
  const out: C[] = [];
  for (const r of vals)
    for (const g of vals)
      for (const b of vals) {
        const hex = `#${hx(r)}${hx(g)}${hx(b)}`;
        const lch = hexToOklch(hex)!;
        out.push({ hex, L: lch[0], C: lch[1], H: lch[2] });
      }
  return out;
}

const NBINS = 12;
const BIN = 360 / NBINS;
// rough OKLCH hue landmark names for labelling
const NAME = (h: number) => {
  const names: [number, string][] = [
    [29, 'red'], [70, 'orange'], [110, 'yellow'], [142, 'green'],
    [168, 'green-teal'], [195, 'cyan'], [230, 'sky-blue'], [264, 'blue'],
    [300, 'purple'], [328, 'magenta'], [350, 'pink'],
  ];
  let best = names[0];
  let bd = 999;
  for (const n of names) {
    const d = Math.min(Math.abs(h - n[0]), 360 - Math.abs(h - n[0]));
    if (d < bd) { bd = d; best = n; }
  }
  return best[1];
};

function analysisA(pool: C[]) {
  // white-on-colour and colour-on-white, per hue. Only chromatic colours (C>=0.04).
  interface Acc { n: number; slackLoD: number; slackDoL: number; disLoD: number; disDoL: number; maxSlack: number; maxPair: string }
  const bins: Acc[] = Array.from({ length: NBINS }, () => ({ n: 0, slackLoD: 0, slackDoL: 0, disLoD: 0, disDoL: 0, maxSlack: -Infinity, maxPair: '' }));
  const WHITE = '#ffffff';
  for (const c of pool) {
    if (c.C < 0.04 || c.L > 0.85) continue; // skip near-grey and near-white (they're not "a hue on white")
    const w = wcag(WHITE, c.hex);
    if (w < 2) continue;
    const lod = contrast(WHITE, c.hex)!; // white on colour
    const dol = contrast(c.hex, WHITE)!; // colour on white
    const bi = Math.min(NBINS - 1, Math.floor(c.H / BIN));
    const a = bins[bi];
    a.n++;
    a.slackLoD += w - lod;
    a.slackDoL += w - dol;
    if (lod < 4.5 && w >= 4.5) a.disLoD++;
    if (dol < 4.5 && w >= 4.5) a.disDoL++;
    if (w - lod > a.maxSlack) { a.maxSlack = w - lod; a.maxPair = `white/${c.hex} WCAG ${w} OKCA ${lod}`; }
  }
  console.log('\n=== A. Conservatism by hue (chromatic colours vs white) ===');
  console.log('hue         bin°      n   meanSlack(LoD)  meanSlack(DoL)  disagree(LoD/DoL)  worst-slack pair');
  bins.forEach((a, i) => {
    if (!a.n) return;
    const lo = Math.round(i * BIN);
    console.log(
      `${NAME(i * BIN + BIN / 2).padEnd(11)} ${String(lo).padStart(3)}-${String(Math.round(lo + BIN)).padStart(3)}  ${String(a.n).padStart(4)}   ` +
        `${(a.slackLoD / a.n).toFixed(2).padStart(10)}     ${(a.slackDoL / a.n).toFixed(2).padStart(10)}       ${String(a.disLoD).padStart(4)}/${String(a.disDoL).padEnd(4)}   ${a.maxPair}`,
    );
  });
}

function analysisB(pool: C[]) {
  // FP=0 headroom: tightest WCAG-OKCA margin when this hue is the DARKER element,
  // under light-chromatic foregrounds (the overshoot-risk configuration).
  const lights = pool.filter((c) => c.L >= 0.72 && c.C >= 0.05);
  const darks = pool.filter((c) => c.L <= 0.55 && c.C >= 0.05);
  interface Acc { minMargin: number; pair: string; fp: number; n: number }
  const bins: Acc[] = Array.from({ length: NBINS }, () => ({ minMargin: Infinity, pair: '', fp: 0, n: 0 }));
  for (const d of darks) {
    const bi = Math.min(NBINS - 1, Math.floor(d.H / BIN));
    const a = bins[bi];
    for (const l of lights) {
      if (l.L - d.L <= 1e-6) continue;
      a.n++;
      for (const [fg, bg] of [[l.hex, d.hex], [d.hex, l.hex]] as [string, string][]) {
        const o = contrast(fg, bg)!;
        const w = wcag(fg, bg);
        const margin = w - o;
        if (o > w) a.fp++;
        if (margin < a.minMargin) { a.minMargin = margin; a.pair = `${fg} on ${bg} (OKCA ${o} vs WCAG ${w})`; }
      }
    }
  }
  console.log('\n=== B. FP=0 headroom by DARKER-element hue (light-chromatic foregrounds) ===');
  console.log('hue         bin°      pairs   min WCAG-OKCA margin   FP   tightest pair');
  bins.forEach((a, i) => {
    if (!a.n) return;
    const lo = Math.round(i * BIN);
    console.log(
      `${NAME(i * BIN + BIN / 2).padEnd(11)} ${String(lo).padStart(3)}-${String(Math.round(lo + BIN)).padStart(3)}  ${String(a.n).padStart(7)}   ${a.minMargin.toFixed(1).padStart(8)}             ${String(a.fp).padStart(3)}   ${a.pair}`,
    );
  });
}

const pool = grid(12);
console.log(`sRGB grid: ${pool.length} colours (step 12), binned into ${NBINS} hue sectors of ${BIN}°`);
analysisA(pool);
analysisB(pool);
