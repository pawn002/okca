/**
 * Flexibility cost of lowering the light-on-dark cap below 21 (issue #14
 * complete-proof option). Read-only comparison. Run: npm run capcost
 *
 * Lowering the L-o-D cap scales every light-on-dark score by cap/21 (dark-on-
 * light, cap 20, is untouched). This quantifies how many doors that closes.
 */
import { hexToOklab, hexToOklch } from '../src/transforms';
import { TAILWIND, GOVUK, USWDS } from './palettes';

const POL_K = 1.1, CHROMA_K = 0.65, C_THRESH = 0.15, DOL_CAP = 20, AA = 4.5;

function okca(fg: string, bg: string, lodCap: number): number {
  const t = hexToOklab(fg)!, b = hexToOklab(bg)!;
  const tL = Math.max(0, t[0]), bL = Math.max(0, b[0]);
  if (Math.abs(tL - bL) < 1e-6) return 1;
  const isBoW = bL >= tL;
  const lighterL = isBoW ? bL : tL, darkerL = isBoW ? tL : bL, lighter = isBoW ? b : t;
  const C = Math.hypot(lighter[1], lighter[2]);
  const exp = 1 + CHROMA_K * Math.min(1, (C / C_THRESH) ** 2);
  const lY = (lighterL ** exp) ** 3, dY = darkerL ** 3;
  const isLoD = tL > bL;
  const raw = (lY + 0.05) / (dY + 0.05);
  const cap = isLoD ? lodCap : DOL_CAP;
  return parseFloat(Math.max(1, Math.min(21, cap * (raw / 21) ** POL_K)).toFixed(1));
}
function wcag(fg: string, bg: string): number {
  const lum = (hex: string) => {
    const c = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255;
    const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(c(1)) + 0.7152 * lin(c(3)) + 0.0722 * lin(c(5));
  };
  const l1 = lum(fg), l2 = lum(bg);
  return parseFloat(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(1));
}

const hx = (n: number) => n.toString(16).padStart(2, '0');
function grid(step: number): string[] {
  const v: number[] = [];
  for (let x = 0; x <= 255; x += step) v.push(x);
  const out: string[] = [];
  for (const r of v) for (const g of v) for (const b of v) out.push(`#${hx(r)}${hx(g)}${hx(b)}`);
  return out;
}

const CAPS = [21, 20.9, 20.5, 20];

// 1. Anchor value white/black at each cap
console.log('white-on-black anchor by cap:');
for (const c of CAPS) console.log(`  cap ${c}: white/black = ${okca('#ffffff', '#000000', c).toFixed(1)}`);

// 2. Gamut: light-on-dark doors closed (white text on colour flips pass->fail)
console.log('\nWhite-text-on-colour (L-o-D) — AA pairs lost vs cap 21:');
const pool = grid(6);
const baseWoC = pool.map((c) => okca('#ffffff', c, 21));
for (const cap of CAPS) {
  if (cap === 21) { console.log(`  cap 21: baseline`); continue; }
  let lost = 0, basePass = 0;
  pool.forEach((c, i) => {
    if (baseWoC[i] >= AA) { basePass++; if (okca('#ffffff', c, cap) < AA) lost++; }
  });
  console.log(`  cap ${cap}: ${lost} of ${basePass} AA colours lost (${((lost / basePass) * 100).toFixed(2)}%)`);
}

// 3. Design-system WCAG disagreements (should FP=0 still hold; count may rise)
console.log('\nDesign-system WCAG disagreements (was 97 at cap 21):');
function dsCounts(cap: number) {
  let total = 0, fp = 0;
  const per: Record<string, number> = {};
  const WHITE = '#ffffff';
  for (const [sys, fams] of [['tw', TAILWIND], ['govuk', GOVUK], ['uswds', USWDS]] as [string, any][])
    for (const shades of Object.values(fams) as Record<string, string>[])
      for (const hexRaw of Object.values(shades)) {
        const hex = (hexRaw as string).toLowerCase();
        for (const [fg, bg] of [[WHITE, hex], [hex, WHITE]] as [string, string][]) {
          const o = okca(fg, bg, cap), w = wcag(fg, bg);
          if (o < AA && w >= AA) { total++; per[sys] = (per[sys] || 0) + 1; }
          if (o > w) fp++;
        }
      }
  return { total, per, fp };
}
for (const cap of CAPS) {
  const { total, per, fp } = dsCounts(cap);
  console.log(`  cap ${cap}: ${total} total (tw ${per.tw || 0}, govuk ${per.govuk || 0}, uswds ${per.uswds || 0})   FP=${fp}`);
}

// 4. The 14 recovered tokens — which flip back at cap 20.9?
console.log('\nRecovered-14 tokens that were L-o-D (white on colour) — status at cap 20.9:');
const recovered: [string, string][] = [
  ['lime-700', '#4d7c0f'], ['green-700', '#15803d'], ['emerald-700', '#047857'],
  ['teal-700', '#0f766e'], ['cyan-700', '#0e7490'], ['fuchsia-700', '#a21caf'],
  ['govuk-blue', '#1d70b8'],
];
for (const [name, hex] of recovered) {
  const o21 = okca('#ffffff', hex, 21), o209 = okca('#ffffff', hex, 20.9);
  const flip = o21 >= AA && o209 < AA ? '  <-- flips back to FAIL' : '';
  console.log(`  white / ${name.padEnd(11)} ${o21.toFixed(1)} -> ${o209.toFixed(1)}${flip}`);
}
