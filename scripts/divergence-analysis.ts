/**
 * Quantify the luminance-proxy divergence that drives OKCA's hue-specific
 * conservatism. Read-only; no algorithm change. Run: npm run divergence
 *
 * OKCA's darker-element luminance proxy is L^3 (OKLCH lightness cubed).
 * WCAG uses relative luminance Y = 0.2126 R + 0.7152 G + 0.0722 B (linearised).
 * On the achromatic axis L^3 = Y (by construction). Off-axis they diverge by
 * hue+chroma, and the SIGN of delta = L^3 - Y predicts conservatism direction:
 *
 *   For white-on-colour, OKCA_raw / WCAG = (Y + 0.05) / (L^3 + 0.05).
 *   delta < 0  (L^3 < Y, e.g. green): denom smaller -> OKCA_raw ABOVE WCAG
 *              -> least conservative, tightest FP=0 margin.
 *   delta > 0  (L^3 > Y, e.g. blue/purple/magenta): OKCA_raw BELOW WCAG
 *              -> most conservative, large slack.
 */
import { hexToOklab, hexToOklch } from '../src/transforms';

function linY(hex: string): number {
  const c = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255;
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(c(1)) + 0.7152 * lin(c(3)) + 0.0722 * lin(c(5));
}

const hx = (n: number) => n.toString(16).padStart(2, '0');
interface C { hex: string; L: number; C: number; H: number; L3: number; Y: number; d: number }
function make(hex: string): C {
  const [L] = hexToOklab(hex)!;
  const [, chroma, H] = hexToOklch(hex)!;
  const L3 = Math.pow(Math.max(0, L), 3);
  const Y = linY(hex);
  return { hex, L, C: chroma, H, L3, Y, d: L3 - Y };
}
function grid(step: number): C[] {
  const vals: number[] = [];
  for (let v = 0; v <= 255; v += step) vals.push(v);
  if (vals[vals.length - 1] !== 255) vals.push(255);
  const out: C[] = [];
  for (const r of vals) for (const g of vals) for (const b of vals) out.push(make(`#${hx(r)}${hx(g)}${hx(b)}`));
  return out;
}

const NBINS = 12;
const BIN = 360 / NBINS;
const NAME = (h: number) => {
  const names: [number, string][] = [
    [29, 'red'], [70, 'orange'], [110, 'yellow'], [142, 'green'], [168, 'green-teal'],
    [195, 'cyan'], [230, 'sky-blue'], [264, 'blue'], [300, 'purple'], [328, 'magenta'], [350, 'pink'],
  ];
  let best = names[0], bd = 999;
  for (const n of names) { const dd = Math.min(Math.abs(h - n[0]), 360 - Math.abs(h - n[0])); if (dd < bd) { bd = dd; best = n; } }
  return best[1];
};

// ── 1. Landmark primaries / secondaries ─────────────────────────────────────
function landmarks() {
  const pts: [string, string][] = [
    ['pure red', '#ff0000'], ['pure orange', '#ff8000'], ['pure yellow', '#ffff00'],
    ['pure green', '#00ff00'], ['pure cyan', '#00ffff'], ['pure blue', '#0000ff'],
    ['pure purple', '#8000ff'], ['pure magenta', '#ff00ff'], ['mid grey', '#808080'],
  ];
  console.log('\n=== 1. Landmarks: L^3 (OKCA proxy) vs Y (WCAG) ===');
  console.log('colour        hex       OKLCH-L   L^3      Y_WCAG   delta=L^3-Y   L^3/Y');
  for (const [name, hex] of pts) {
    const c = make(hex);
    console.log(
      `${name.padEnd(13)} ${hex}  ${c.L.toFixed(3).padStart(6)}  ${c.L3.toFixed(3).padStart(6)}  ${c.Y.toFixed(3).padStart(6)}   ` +
        `${(c.d >= 0 ? '+' : '') + c.d.toFixed(3)}       ${(c.L3 / c.Y).toFixed(2)}`,
    );
  }
}

// ── 2. Divergence + conservatism bias by hue (saturated colours) ────────────
function byHue(pool: C[]) {
  interface A { n: number; d: number; bias: number; adL: number } // bias = mean (Y+.05)/(L3+.05) = OKCA_raw/WCAG for white-on-colour
  const bins: A[] = Array.from({ length: NBINS }, () => ({ n: 0, d: 0, bias: 0, adL: 0 }));
  for (const c of pool) {
    if (c.C < 0.10) continue; // saturated only (delta scales with chroma)
    const bi = Math.min(NBINS - 1, Math.floor(c.H / BIN));
    const a = bins[bi];
    a.n++; a.d += c.d; a.bias += (c.Y + 0.05) / (c.L3 + 0.05);
  }
  console.log('\n=== 2. Divergence by hue (C >= 0.10) — mean delta and white-on-colour raw bias ===');
  console.log('hue         bin°      n    mean delta   OKCA_raw/WCAG   direction');
  bins.forEach((a, i) => {
    if (!a.n) return;
    const lo = Math.round(i * BIN);
    const md = a.d / a.n, bias = a.bias / a.n;
    const dir = bias > 1.01 ? 'OKCA looser (green-like)' : bias < 0.99 ? 'OKCA stricter (conservative)' : '~neutral';
    console.log(
      `${NAME(i * BIN + BIN / 2).padEnd(11)} ${String(lo).padStart(3)}-${String(Math.round(lo + BIN)).padStart(3)}  ${String(a.n).padStart(4)}   ` +
        `${(md >= 0 ? '+' : '') + md.toFixed(3)}       ${bias.toFixed(3)}       ${dir}`,
    );
  });
}

// ── 3. Divergence grows with chroma (green vs blue) ─────────────────────────
function byChroma(pool: C[]) {
  const bands = [[0.0, 0.03], [0.03, 0.07], [0.07, 0.11], [0.11, 0.15], [0.15, 0.20], [0.20, 0.40]];
  const inHue = (c: C, lo: number, hi: number) => c.H >= lo && c.H < hi;
  const show = (label: string, lo: number, hi: number) => {
    console.log(`\n  ${label} (hue ${lo}-${hi}°):`);
    console.log('   chroma band     n    mean delta=L^3-Y');
    for (const [clo, chi] of bands) {
      const sel = pool.filter((c) => inHue(c, lo, hi) && c.C >= clo && c.C < chi);
      if (!sel.length) continue;
      const md = sel.reduce((s, c) => s + c.d, 0) / sel.length;
      console.log(`   ${clo.toFixed(2)}-${chi.toFixed(2)}      ${String(sel.length).padStart(4)}      ${(md >= 0 ? '+' : '') + md.toFixed(3)}`);
    }
  };
  console.log('\n=== 3. Delta scales with chroma (0 at achromatic, grows saturated) ===');
  show('GREEN', 120, 150);
  show('BLUE', 240, 270);
  show('MAGENTA', 300, 330);
}

const pool = grid(8);
console.log(`sRGB grid: ${pool.length} colours (step 8)`);
// achromatic validation
const grey = pool.filter((c) => c.C < 0.02);
const meanGrey = grey.reduce((s, c) => s + Math.abs(c.d), 0) / grey.length;
console.log(`Achromatic check (C<0.02, n=${grey.length}): mean |L^3 - Y| = ${meanGrey.toFixed(4)}  (≈0 confirms L^3=Y on the neutral axis)`);
landmarks();
byHue(pool);
byChroma(pool);
