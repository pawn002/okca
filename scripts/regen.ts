/**
 * Ground-truth regenerator for the white/#767676 -> 3.9 anchor move.
 *
 * Modes (argv[2]):
 *   derive   — find the 3-decimal POL_K that rounds white/#767676 to 3.9,
 *              print the resulting achromatic anchors.
 *   curated  — codemod src/__tests__/probe-curated.spec.ts: recompute every
 *              pinned expected score with the current production contrast().
 *   counts   — print design-system WCAG-disagreement counts (total + per system).
 *   disagree — emit the regenerated WCAG_DISAGREEMENTS.md tables + counts.
 *
 * `derive` uses a local parameterised OKCA; the other modes use the REAL
 * production contrast() from ../src/index (so set POL_K there first).
 */
import * as fs from 'fs';
import * as path from 'path';
import { hexToOklab } from '../src/transforms';
import { contrast } from '../src/index';
import { TAILWIND, GOVUK, USWDS } from './palettes';

const DOL_CAP = 20;

function okcaWithPolK(fg: string, bg: string, polK: number): number {
  const t = hexToOklab(fg)!;
  const b = hexToOklab(bg)!;
  const tL = Math.max(0, t[0]);
  const bL = Math.max(0, b[0]);
  if (Math.abs(tL - bL) < 1e-6) return 1;
  const isBoW = bL >= tL;
  const lighterL = isBoW ? bL : tL;
  const darkerL = isBoW ? tL : bL;
  const lighter = isBoW ? b : t;
  const C = Math.sqrt(lighter[1] * lighter[1] + lighter[2] * lighter[2]);
  const satW = Math.min(1, (C / 0.15) ** 2);
  const exp = 1 + 0.65 * satW; // production CHROMA_K
  const lighterY = Math.pow(Math.pow(lighterL, exp), 3);
  const darkerY = Math.pow(darkerL, 3);
  const isLightOnDark = tL > bL;
  const rawRatio = (lighterY + 0.05) / (darkerY + 0.05);
  const cap = isLightOnDark ? 20.9 : DOL_CAP;
  const raw = Math.max(1, Math.min(21, cap * Math.pow(rawRatio / 21, polK)));
  return parseFloat(raw.toFixed(1));
}

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

function derive() {
  const L767 = hexToOklab('#767676')![0];
  const rawRatio = (1 + 0.05) / (Math.pow(L767, 3) + 0.05);
  const exact = Math.log(3.9 / 21) / Math.log(rawRatio / 21);
  console.log(`#767676 Oklab L = ${L767.toFixed(6)}, raw ratio = ${rawRatio.toFixed(4)}`);
  console.log(`exact POL_K for white/#767676 = 3.9: ${exact.toFixed(6)}`);
  console.log('');
  console.log('candidate  white/#767676  #767676/white  white/black  black/white');
  for (const k of [1.101, 1.102, 1.103, 1.104, 1.105, 1.106, 1.107]) {
    console.log(
      `  ${k.toFixed(3)}       ${okcaWithPolK('#ffffff', '#767676', k).toFixed(1)}` +
        `            ${okcaWithPolK('#767676', '#ffffff', k).toFixed(1)}` +
        `            ${okcaWithPolK('#ffffff', '#000000', k).toFixed(1)}` +
        `          ${okcaWithPolK('#000000', '#ffffff', k).toFixed(1)}`,
    );
  }
}

function curated() {
  const file = path.resolve(process.cwd(), 'src/__tests__/probe-curated.spec.ts');
  const text = fs.readFileSync(file, 'utf8');
  let changed = 0;
  // Match:  ['#fg', '#bg', <number>, 'note'],
  const re = /(\[\s*'(#[0-9a-fA-F]{3,8})'\s*,\s*'(#[0-9a-fA-F]{3,8})'\s*,\s*)(\d+(?:\.\d+)?)(\s*,\s*')/g;
  const out = text.replace(re, (m, pre, fg, bg, oldVal, post) => {
    const val = contrast(fg, bg)!;
    const newVal = val.toFixed(1);
    if (newVal !== oldVal) changed++;
    return `${pre}${newVal}${post}`;
  });
  fs.writeFileSync(file, out);
  console.log(`curated: rewrote ${changed} pinned values`);
}

interface Row {
  system: string;
  family: string;
  shade: string;
  hex: string;
  wcag: number;
  lod: number; // white on color
  dol: number; // color on white
}

function collectDisagreements(): Row[] {
  const rows: Row[] = [];
  const WHITE = '#ffffff';
  const add = (system: string, fams: Record<string, Record<string, string>>) => {
    for (const [family, shades] of Object.entries(fams))
      for (const [shade, hexRaw] of Object.entries(shades)) {
        const hex = hexRaw.toLowerCase();
        const w = wcag(WHITE, hex);
        const lod = contrast(WHITE, hex)!; // white on color (L-o-D)
        const dol = contrast(hex, WHITE)!; // color on white (D-o-L)
        // disagreement = OKCA < 4.5 while WCAG >= 4.5, per polarity
        if ((lod < 4.5 || dol < 4.5) && w >= 4.5) {
          rows.push({ system, family, shade, hex, wcag: w, lod, dol });
        }
      }
  };
  add('tw', TAILWIND);
  add('govuk', GOVUK);
  add('uswds', USWDS);
  return rows;
}

function counts() {
  const rows = collectDisagreements();
  // The spec counts a pair per polarity: white/color and color/white separately.
  const perSystem: Record<string, number> = {};
  let total = 0;
  const WHITE = '#ffffff';
  const tally = (system: string, fams: Record<string, Record<string, string>>) => {
    for (const shades of Object.values(fams))
      for (const hexRaw of Object.values(shades)) {
        const hex = hexRaw.toLowerCase();
        const w = wcag(WHITE, hex);
        if (contrast(WHITE, hex)! < 4.5 && w >= 4.5) { perSystem[system] = (perSystem[system] || 0) + 1; total++; }
        if (contrast(hex, WHITE)! < 4.5 && w >= 4.5) { perSystem[system] = (perSystem[system] || 0) + 1; total++; }
      }
  };
  tally('tw', TAILWIND);
  tally('govuk', GOVUK);
  tally('uswds', USWDS);
  console.log(`WCAG disagreements (per-polarity, matches spec definition):`);
  console.log(`  total: ${total}`);
  console.log(`  tw: ${perSystem['tw'] || 0}  govuk: ${perSystem['govuk'] || 0}  uswds: ${perSystem['uswds'] || 0}`);
  console.log(`  distinct colors with >=1 disagreeing polarity: ${rows.length}`);
}

// Dense adversarial FP=0 check around the green-darker overshoot wall — the
// region (light magenta/pink foreground on dark green) where FP first appears
// as POL_K drops. Full-resolution scan at the production POL_K.
function fpcheck() {
  const hx = (n: number) => n.toString(16).padStart(2, '0');
  // dark greens/teals as the darker element (fine grid, hue ~green)
  const darkers: string[] = [];
  for (let r = 0; r <= 100; r += 4)
    for (let g = 16; g <= 160; g += 4)
      for (let b = 0; b <= 100; b += 4) {
        const hex = `#${hx(r)}${hx(g)}${hx(b)}`;
        const lch = hexToOklab(hex)!;
        if (Math.max(0, lch[0]) <= 0.6) darkers.push(hex);
      }
  // light chromatic foregrounds (pinks/magentas/yellows/cyans/whites) — fine
  const lighters: string[] = [];
  for (let r = 200; r <= 255; r += 5)
    for (let g = 180; g <= 255; g += 5)
      for (let b = 200; b <= 255; b += 5) lighters.push(`#${hx(Math.min(255, r))}${hx(Math.min(255, g))}${hx(Math.min(255, b))}`);
  let pairs = 0;
  let fp = 0;
  let worst = -Infinity;
  let worstPair = '';
  for (const L of lighters)
    for (const D of darkers) {
      for (const [fg, bg] of [[L, D], [D, L]] as [string, string][]) {
        pairs++;
        const o = contrast(fg, bg)!;
        const w = wcag(fg, bg);
        if (o > w) fp++;
        const margin = w - o;
        if (-margin > worst) {
          worst = -margin;
          worstPair = `${fg} on ${bg} (OKCA ${o} vs WCAG ${w})`;
        }
      }
    }
  console.log(`dense green-darker FP check @ production POL_K:`);
  console.log(`  lighters ${lighters.length} x darkers ${darkers.length}, pairs ${pairs.toLocaleString()}`);
  console.log(`  FP (rounded OKCA > rounded WCAG): ${fp}`);
  console.log(`  smallest WCAG-OKCA margin: ${(-worst).toFixed(1)} @ ${worstPair}`);
}

// Emit markdown disagreement tables per system, grouped by family, plus the
// per-system/total counts and the list of pairs that DROPPED OUT vs the old
// 111 baseline (POL_K 1.175). Source of truth for docs/WCAG_DISAGREEMENTS.md.
function disagree() {
  const WHITE = '#ffffff';
  const systems: [string, Record<string, Record<string, string>>][] = [
    ['Tailwind CSS v3.4', TAILWIND],
    ['GOV.UK Design System', GOVUK],
    ['USWDS v3.x', USWDS],
  ];
  for (const [name, fams] of systems) {
    let sysPairs = 0;
    const lines: string[] = [];
    lines.push(`\n## ${name}\n`);
    lines.push('| Colour | Hex | WCAG | OKCA L-o-D | OKCA D-o-L | Note |');
    lines.push('|--------|-----|-----:|----------:|----------:|------|');
    for (const [family, shades] of Object.entries(fams))
      for (const [shade, hexRaw] of Object.entries(shades)) {
        const hex = hexRaw.toLowerCase();
        const w = wcag(WHITE, hex);
        if (w < 4.5) continue;
        const lod = contrast(WHITE, hex)!;
        const dol = contrast(hex, WHITE)!;
        const lodDis = lod < 4.5;
        const dolDis = dol < 4.5;
        if (!lodDis && !dolDis) continue;
        const n = (lodDis ? 1 : 0) + (dolDis ? 1 : 0);
        sysPairs += n;
        const note = lodDis && dolDis ? '' : lodDis ? 'L-o-D only' : 'D-o-L only';
        lines.push(
          `| ${family}-${shade} | \`${hex}\` | ${w.toFixed(1)} | ${lod.toFixed(1)} | ${dol.toFixed(1)} | ${note} |`,
        );
      }
    console.log(lines.join('\n'));
    console.log(`\n_${name}: ${sysPairs} disagreement pairs (per polarity)._\n`);
  }
}

// Print WCAG + OKCA (both polarities) for a pair across POL_K / anchor choices.
function pair() {
  const fg = process.argv[3];
  const bg = process.argv[4];
  console.log(`${fg} on ${bg}:  WCAG = ${wcag(fg, bg).toFixed(1)}`);
  console.log('anchor  POL_K    OKCA(fg on bg)   OKCA(bg on fg)');
  for (const [anchor, k] of [
    ['3.5', 1.175],
    ['3.8', 1.117],
    ['3.9', 1.1],
    ['4.0', 1.083],
  ] as [string, number][]) {
    console.log(
      `  ${anchor}   ${k.toFixed(3)}      ${okcaWithPolK(fg, bg, k).toFixed(1)}` +
        `              ${okcaWithPolK(bg, fg, k).toFixed(1)}`,
    );
  }
}

// Sweep the chroma penalty (C_THRESH, CHROMA_K) at the CURRENT POL_K to find
// values that re-dock vivid saturated foregrounds below AA without hurting
// light pastels. Also confirms the design-system disagreement count is
// unchanged (those pairs have a white lighter element -> penalty never fires)
// and that a chromatic-lighter FP scan stays at 0.
function okcaChroma(fg: string, bg: string, cThresh: number, chromaK: number, polK = 1.1): number {
  const t = hexToOklab(fg)!;
  const b = hexToOklab(bg)!;
  const tL = Math.max(0, t[0]);
  const bL = Math.max(0, b[0]);
  if (Math.abs(tL - bL) < 1e-6) return 1;
  const isBoW = bL >= tL;
  const lighterL = isBoW ? bL : tL;
  const darkerL = isBoW ? tL : bL;
  const lighter = isBoW ? b : t;
  const C = Math.sqrt(lighter[1] * lighter[1] + lighter[2] * lighter[2]);
  const satW = Math.min(1, (C / cThresh) ** 2);
  const exp = 1 + chromaK * satW;
  const lighterY = Math.pow(Math.pow(lighterL, exp), 3);
  const darkerY = Math.pow(darkerL, 3);
  const isLightOnDark = tL > bL;
  const rawRatio = (lighterY + 0.05) / (darkerY + 0.05);
  const cap = isLightOnDark ? 20.9 : DOL_CAP;
  return parseFloat(Math.max(1, Math.min(21, cap * Math.pow(rawRatio / 21, polK))).toFixed(1));
}

function chroma() {
  const probes: [string, string, string][] = [
    ['dark orange', '#ff8c00', '#1a1a1a'],
    ['hot pink', '#ff69b4', '#1a1a1a'],
    ['pure green', '#00ff00', '#1a1a1a'],
    ['cyan', '#00ffff', '#1a1a1a'],
    ['yellow', '#ffff00', '#1a1a1a'],
    ['light yellow (pastel)', '#ffff99', '#1a1a1a'],
    ['light green (pastel)', '#ccffcc', '#004d00'],
    ['light cyan (pastel)', '#ccffff', '#004c4c'],
  ];
  // design-system disagreement total (should stay 97 for all penalties)
  const dsTotal = (ct: number, ck: number) => {
    let total = 0;
    const WHITE = '#ffffff';
    for (const fams of [TAILWIND, GOVUK, USWDS])
      for (const shades of Object.values(fams))
        for (const hexRaw of Object.values(shades)) {
          const hex = hexRaw.toLowerCase();
          const w = wcag(WHITE, hex);
          if (okcaChroma(WHITE, hex, ct, ck) < 4.5 && w >= 4.5) total++;
          if (okcaChroma(hex, WHITE, ct, ck) < 4.5 && w >= 4.5) total++;
        }
    return total;
  };

  const grid: [number, number][] = [
    [0.15, 0.5], [0.15, 0.6], [0.15, 0.65], [0.15, 0.7], [0.15, 0.75], [0.15, 0.8],
    [0.13, 0.65], [0.13, 0.7], [0.12, 0.6],
  ];
  console.log('WCAG for reference:');
  for (const [name, fg, bg] of probes) console.log(`  ${name.padEnd(24)} ${fg} on ${bg}: ${wcag(fg, bg).toFixed(1)}`);
  console.log('');
  const header = 'C_THRESH CHROMA_K  ' + probes.map(([n]) => n.split(' ')[0].slice(0, 6).padStart(7)).join('') + '   DS';
  console.log(header);
  for (const [ct, ck] of grid) {
    const cells = probes.map(([, fg, bg]) => okcaChroma(fg, bg, ct, ck).toFixed(1).padStart(7)).join('');
    console.log(`  ${ct.toFixed(2)}    ${ck.toFixed(2)}   ${cells}   ${dsTotal(ct, ck)}`);
  }
  console.log('\n(columns: dark-orange hot-pink green cyan yellow lightYel lightGrn lightCyn; all on near-black/dark)');
}

// Compare OLD (POL_K 1.175, CHROMA_K 0.50) vs NEW (POL_K 1.100, CHROMA_K 0.65)
// across representative chromatic pairs, to show the net effect of both changes.
function compare() {
  const O = (fg: string, bg: string) => okcaChroma(fg, bg, 0.15, 0.5, 1.175);
  const N = (fg: string, bg: string) => okcaChroma(fg, bg, 0.15, 0.65, 1.1);
  const groups: [string, [string, string, string][]][] = [
    ['Chromatic as DARKER element (lighter = white — penalty does NOT fire)', [
      ['blue-600 on white', '#2563eb', '#ffffff'],
      ['white on blue-600', '#ffffff', '#2563eb'],
      ['red-600 on white', '#dc2626', '#ffffff'],
      ['green-700 on white', '#15803d', '#ffffff'],
      ['teal-700 on white', '#0f766e', '#ffffff'],
      ['emerald-700 on white', '#047857', '#ffffff'],
    ]],
    ['Chromatic as LIGHTER element, FULLY saturated (penalty fires hard)', [
      ['hot pink / near-black', '#ff69b4', '#1a1a1a'],
      ['dark orange / near-black', '#ff8c00', '#1a1a1a'],
      ['pure red / black', '#ff0000', '#000000'],
      ['pure green / near-black', '#00ff00', '#1a1a1a'],
    ]],
    ['Chromatic as LIGHTER element, PARTIAL / low chroma (penalty weak)', [
      ['light blue / navy', '#add8e6', '#000080'],
      ['light pink / dark red', '#ffcccc', '#8b0000'],
      ['light yellow / dark green', '#ffff99', '#006400'],
      ['light lavender pastel / indigo', '#e6ccff', '#4b0082'],
    ]],
  ];
  for (const [title, pairs] of groups) {
    console.log(`\n${title}`);
    console.log('  pair                          WCAG   OLD   NEW   Δ(new-old)');
    for (const [name, fg, bg] of pairs) {
      const old = O(fg, bg);
      const nw = N(fg, bg);
      const d = (nw - old >= 0 ? '+' : '') + (nw - old).toFixed(1);
      console.log(`  ${name.padEnd(28)}  ${wcag(fg, bg).toFixed(1).padStart(4)}  ${old.toFixed(1).padStart(4)}  ${nw.toFixed(1).padStart(4)}   ${d}`);
    }
  }
}

const mode = process.argv[2] || 'derive';
if (mode === 'compare') compare();
else if (mode === 'chroma') chroma();
else if (mode === 'pair') pair();
else if (mode === 'derive') derive();
else if (mode === 'curated') curated();
else if (mode === 'counts') counts();
else if (mode === 'fpcheck') fpcheck();
else if (mode === 'disagree') disagree();
else console.log(`unknown mode: ${mode}`);
