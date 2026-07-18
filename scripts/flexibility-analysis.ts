/**
 * How much usable-colour space does the release (anchor 3.9 + CHROMA_K 0.65)
 * hand back vs the previous release (anchor 3.5 / POL_K 1.175, CHROMA_K 0.50)?
 * Read-only. Run: npm run flexibility
 */
import { hexToOklab, hexToOklch } from '../src/transforms';
import { TAILWIND, GOVUK, USWDS } from './palettes';

const OLD = { ct: 0.15, ck: 0.5, pk: 1.175 };
const NEW = { ct: 0.15, ck: 0.65, pk: 1.1 };
const AA = 4.5;
const AAA = 7.0;

function okca(fg: string, bg: string, p: { ct: number; ck: number; pk: number }): number {
  const t = hexToOklab(fg)!;
  const b = hexToOklab(bg)!;
  const tL = Math.max(0, t[0]);
  const bL = Math.max(0, b[0]);
  if (Math.abs(tL - bL) < 1e-6) return 1;
  const isBoW = bL >= tL;
  const lighterL = isBoW ? bL : tL;
  const darkerL = isBoW ? tL : bL;
  const lighter = isBoW ? b : t;
  const C = Math.sqrt(lighter[1] ** 2 + lighter[2] ** 2);
  const satW = Math.min(1, (C / p.ct) ** 2);
  const exp = 1 + p.ck * satW;
  const lY = Math.pow(Math.pow(lighterL, exp), 3);
  const dY = Math.pow(darkerL, 3);
  const isLoD = tL > bL;
  const raw = ((lY + 0.05) / (dY + 0.05));
  const cap = isLoD ? 20.9 : 20;
  return parseFloat(Math.max(1, Math.min(21, cap * Math.pow(raw / 21, p.pk))).toFixed(1));
}

const hx = (n: number) => n.toString(16).padStart(2, '0');
function grid(step: number): string[] {
  const vals: number[] = [];
  for (let v = 0; v <= 255; v += step) vals.push(v);
  if (vals[vals.length - 1] !== 255) vals.push(255);
  const out: string[] = [];
  for (const r of vals) for (const g of vals) for (const b of vals) out.push(`#${hx(r)}${hx(g)}${hx(b)}`);
  return out;
}

// ── 1. Gamut-wide: how many colours gain AA / AAA on white and on near-black ──
function gamut() {
  const pool = grid(6); // 43^3
  const WHITE = '#ffffff';
  const NEARBLACK = '#1a1a1a';
  const scen = [
    ['text on white', (c: string, p: any) => okca(c, WHITE, p)],
    ['white text on colour', (c: string, p: any) => okca(WHITE, c, p)],
    ['light text on near-black (colour as text)', (c: string, p: any) => okca(c, NEARBLACK, p)],
  ] as [string, (c: string, p: any) => number][];

  console.log(`Gamut grid: ${pool.length} colours\n`);
  for (const [name, f] of scen) {
    let oldPassAA = 0, newPassAA = 0, flipAA = 0, flipAAA = 0, marginal = 0, marginalRecovered = 0;
    for (const c of pool) {
      const o = f(c, OLD);
      const n = f(c, NEW);
      if (o >= AA) oldPassAA++;
      if (n >= AA) newPassAA++;
      if (o < AA && n >= AA) flipAA++;
      if (o < AAA && n >= AAA) flipAAA++;
      if (o >= 3.5 && o < AA) { marginal++; if (n >= AA) marginalRecovered++; }
    }
    const gain = ((newPassAA - oldPassAA) / oldPassAA) * 100;
    console.log(`${name}:`);
    console.log(`  AA-passing colours: ${oldPassAA} -> ${newPassAA}  (+${newPassAA - oldPassAA}, +${gain.toFixed(1)}% of the passing palette)`);
    console.log(`  newly AA (fail->pass): ${flipAA}    newly AAA: ${flipAAA}`);
    console.log(`  of colours in the marginal band (old 3.5-4.4): ${marginalRecovered}/${marginal} recovered (${((marginalRecovered / marginal) * 100).toFixed(0)}%)\n`);
  }
}

// ── 2. Which real design-system tokens flipped fail->pass ────────────────────
function tokens() {
  const WHITE = '#ffffff';
  const flips: string[] = [];
  const add = (sys: string, fams: Record<string, Record<string, string>>) => {
    for (const [family, shades] of Object.entries(fams))
      for (const [shade, hexRaw] of Object.entries(shades)) {
        const hex = hexRaw.toLowerCase();
        for (const [dir, fg, bg] of [['white on', WHITE, hex], ['on white', hex, WHITE]] as [string, string, string][]) {
          const o = okca(fg, bg, OLD);
          const n = okca(fg, bg, NEW);
          if (o < AA && n >= AA) flips.push(`${sys}:${family}-${shade} (${dir} ${dir === 'white on' ? bg : fg})  ${o} -> ${n}`);
        }
      }
  };
  add('tw', TAILWIND);
  add('govuk', GOVUK);
  add('uswds', USWDS);
  console.log(`Design-system tokens that flipped fail -> pass at AA (${flips.length} pairs):`);
  flips.forEach((f) => console.log(`  ${f}`));
}

// ── 3. Marginal-band lift by hue (where does the flexibility land?) ──────────
function byHue() {
  const pool = grid(8);
  const WHITE = '#ffffff';
  const NAME = (h: number) => ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'blue', 'purple', 'magenta', 'pink', 'red', 'red'][Math.floor(h / 30) % 12];
  const bins: Record<string, number> = {};
  for (const c of pool) {
    const [, C, H] = hexToOklch(c)!;
    if (C < 0.05) continue;
    const o = okca(c, WHITE, OLD), n = okca(c, WHITE, NEW);
    const o2 = okca(WHITE, c, OLD), n2 = okca(WHITE, c, NEW);
    let f = 0;
    if (o < AA && n >= AA) f++;
    if (o2 < AA && n2 >= AA) f++;
    if (f) bins[NAME(H)] = (bins[NAME(H)] || 0) + f;
  }
  console.log('\nNewly-passing chromatic pairs by hue family (text on white + white on colour):');
  Object.entries(bins).sort((a, b) => b[1] - a[1]).forEach(([h, n]) => console.log(`  ${h.padEnd(8)} ${n}`));
}

console.log('=== Flexibility handed back: previous release (3.5 / 1.175 / 0.50) -> current (3.9 / 1.100 / 0.65) ===\n');
gamut();
tokens();
byHue();
