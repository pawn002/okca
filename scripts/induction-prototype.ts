/**
 * Prototype: CAM16 background induction as an OKLab-native term.
 * Read-only; no algorithm change. Run: npm run induction
 *
 * CAM16 lightness of a grey is J/100 ~= L^gamma, with
 * gamma = 1.26 c (1.48 + L_bg^1.5) (docs/CAM16_FINDINGS.md §2). Relative to a
 * reference background, the lightness scale is a power s of OKLab L:
 *
 *   s(L_bg) = min(1, (1.48 + L_bg^1.5) / (1.48 + L_ref^1.5))
 *
 * The constants 1.26 and c cancel. 1.48 is CAM16's z constant, and L_ref is
 * OKLab L of the AA boundary grey #767676, the background of OKCA's
 * white/#767676 anchor. So s has no tuned constants. Backgrounds lighter than
 * the reference keep s = 1.
 *
 * Variants, all scored on the same pairs:
 *   V0  2.0.3: steps 1-5
 *   V1  3.x as committed: steps 1-5 + flare ceiling (live contrast())
 *   V2  steps 1-5, darker proxy L_d^(3s): induction replaces the flare ceiling
 *   V3  V2 + flare ceiling
 *   V4  steps 1-5, both proxies raised to s (CAM16's full form)
 *
 * Sections 6–7 compare V2 with 2.0.3 in detail and sweep CHROMA_K, since
 * lifting the darker proxy also tightens chromatic pairs.
 *
 * Yardsticks: CAM16-UCS lightness gap with the real background as Yb, at the
 * grey that first scores 4.5 on each background (parity across backgrounds);
 * ratio under doubled flare; anchors; chromatic catches; sampled FP=0;
 * design-system disagreement and dark-surface counts.
 */
import { hexToOklab } from '../src/transforms';
import { contrast } from '../src/index';
import { TAILWIND, GOVUK, USWDS } from './palettes';
import { hx, grey, xyz, Ywcag, cam16, bgEnv , MODEL } from './cam16';

console.log(`colour appearance model: ${MODEL}`);

const L_REF = hexToOklab('#767676')![0];
const FLARE = 0.10, FLARE_K = 1.5;
const s = (Lbg: number) => Math.min(1, (1.48 + Lbg ** 1.5) / (1.48 + L_REF ** 1.5));

type Variant = 'V0' | 'V1' | 'V2' | 'V3' | 'V4';
const VARIANTS: Variant[] = ['V0', 'V1', 'V2', 'V3', 'V4'];
const LABEL: Record<Variant, string> = {
  V0: '2.0.3', V1: '3.x flare', V2: 'induction', V3: 'induction+flare', V4: 'induction, both',
};

function score(fg: string, bg: string, v: Variant, chromaK = 0.65): number {
  if (v === 'V1') return contrast(fg, bg)!;
  const t = hexToOklab(fg)!, b = hexToOklab(bg)!;
  const tL = Math.max(0, t[0]), bL = Math.max(0, b[0]);
  if (Math.abs(tL - bL) < 1e-6) return 1;
  const lod = tL > bL, lL = Math.max(tL, bL), dL = Math.min(tL, bL), lt = lod ? t : b;
  const exp = 1 + chromaK * Math.min(1, (Math.hypot(lt[1], lt[2]) / 0.15) ** 2);
  const sb = v === 'V0' ? 1 : s(bL);
  const Yl = lL ** (3 * exp * (v === 'V4' ? sb : 1));
  const Yd = dL ** (3 * sb);
  const cap = lod ? 20.9 : 20;
  let r = cap * ((Yl + 0.05) / (Yd + 0.05) / 21) ** 1.1;
  if (v === 'V3') r = Math.min(r, cap * (((lL ** 3 + FLARE) / (dL ** 3 + FLARE)) / ((1 + FLARE) / FLARE)) ** FLARE_K);
  return parseFloat(Math.max(1, Math.min(21, r)).toFixed(1));
}

const wcag = (f: string, b: string) => {
  const a = Ywcag(f), c = Ywcag(b);
  return (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05);
};
const pad = (x: string | number, n: number) => String(x).padStart(n);
const gapJp = (f: string, b: string) => Math.abs(cam16(xyz(f), bgEnv(b)).Jp - cam16(xyz(b), bgEnv(b)).Jp);
const firstPass = (v: Variant, bv: number) => {
  let fv = bv;
  while (fv >= 0 && fv <= 255 && score(grey(fv), grey(bv), v) < 4.5) fv += bv < 128 ? 1 : -1;
  return fv;
};

// ── 1. Threshold parity ──────────────────────────────────────────────────────
console.log(`L_ref = ${L_REF.toFixed(4)}; s(0) = ${s(0).toFixed(3)}, s(#1a1a1a) = ${s(hexToOklab('#1a1a1a')![0]).toFixed(3)}, s(#444444) = ${s(hexToOklab('#444444')![0]).toFixed(3)}`);
console.log("\n=== 1. Background-aware CAM16-UCS gap dJ' of the grey that first reaches 4.5 ===");
console.log('  bg       ' + VARIANTS.map((v) => LABEL[v].padStart(16)).join(''));
const BG = [0, 0x0a, 0x12, 0x1a, 0x22, 0x33, 0x44, 0x55, 0xc8, 0xe6, 0xff];
const gaps: Record<Variant, number[]> = { V0: [], V1: [], V2: [], V3: [], V4: [] };
for (const bv of BG) {
  const cells = VARIANTS.map((v) => {
    const fv = firstPass(v, bv);
    const g = gapJp(grey(fv), grey(bv));
    if (bv > 0) gaps[v].push(g); // pure black excluded: J=0 and Yb at the clamp
    return `${grey(fv)} ${pad(g.toFixed(1), 5)}`;
  });
  console.log(`  ${grey(bv)}  ${cells.map((c) => pad(c, 16)).join('')}`);
}
const spread = (a: number[]) => Math.max(...a) - Math.min(...a);
console.log('  spread (excl. #000000)' + VARIANTS.map((v) => pad(spread(gaps[v]).toFixed(1), 16)).join('').slice(6));

// ── 2. Flare robustness of the same passes ───────────────────────────────────
console.log('\n=== 2. WCAG ratio at flare 0.10 of the grey that first reaches 4.5 ===');
console.log('  bg       ' + VARIANTS.map((v) => LABEL[v].padStart(16)).join(''));
for (const bv of [0, 0x1a, 0x33, 0x44, 0xff]) {
  const cells = VARIANTS.map((v) => {
    const a = Ywcag(grey(firstPass(v, bv))), c = Ywcag(grey(bv));
    return pad(((Math.max(a, c) + 0.1) / (Math.min(a, c) + 0.1)).toFixed(2), 16);
  });
  console.log(`  ${grey(bv)}  ${cells.join('')}`);
}

// ── 3. Anchors and calibration pairs ─────────────────────────────────────────
console.log('\n=== 3. Anchors and calibration pairs ===');
console.log('  pair                   ' + VARIANTS.map((v) => LABEL[v].padStart(16)).join(''));
for (const [f, b] of [['#ffffff', '#000000'], ['#000000', '#ffffff'], ['#ffffff', '#767676'], ['#767676', '#ffffff'],
  ['#ff69b4', '#1a1a1a'], ['#ff8c00', '#1a1a1a'], ['#888888', '#000000'], ['#919191', '#121212'], ['#9f9f9f', '#1a1a1a'],
  ['#cccccc', '#333333'], ['#000000', '#767676'], ['#ffffff', '#595959']])
  console.log(`  ${f} on ${b}  ${VARIANTS.map((v) => pad(score(f, b, v), 16)).join('')}`);

// ── 4. FP=0, sampled ─────────────────────────────────────────────────────────
console.log('\n=== 4. FP=0 (sampled): pairs scoring above WCAG ===');
let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pairs: [string, string][] = [];
for (let a = 0; a < 256; a += 3) for (let b = 0; b < 256; b += 3) pairs.push([grey(a), grey(b)]);
for (let i = 0; i < 60000; i++) {
  const c = () => '#' + [0, 0, 0].map(() => hx(rnd() * 255)).join('');
  pairs.push([c(), c()]);
}
console.log('  ' + VARIANTS.map((v) => {
  let fp = 0;
  for (const [f, b] of pairs) if (score(f, b, v) > parseFloat(wcag(f, b).toFixed(1))) fp++;
  return `${LABEL[v]}: ${fp}`;
}).join('   ') + `   (of ${pairs.length})`);

// ── 5. Design systems ────────────────────────────────────────────────────────
const palette: string[] = [];
for (const fams of [TAILWIND, GOVUK, USWDS]) for (const shades of Object.values(fams)) palette.push(...Object.values(shades));
console.log('\n=== 5. Design systems ===');
console.log('  measure                          ' + VARIANTS.map((v) => LABEL[v].padStart(16)).join(''));
const disagree = VARIANTS.map((v) => {
  let n = 0;
  for (const h of palette) for (const [f, b] of [['#ffffff', h], [h, '#ffffff']]) if (score(f, b, v) < 4.5 && parseFloat(wcag(f, b).toFixed(1)) >= 4.5) n++; // regen.ts definition
  return n;
});
console.log('  WCAG disagreements (white pairs) ' + disagree.map((n) => pad(n, 16)).join(''));
const SURFACES = ['#000000', '#121212', '#1a1a1a', '#0f172a', '#111827', '#18181b', '#0b0c0c', '#1b1616', '#1c1d1f'];
const darkPass = VARIANTS.map((v) => {
  let n = 0;
  for (const bg of SURFACES) for (const h of palette) if (hexToOklab(h)![0] > hexToOklab(bg)![0] && score(h, bg, v) >= 4.5) n++;
  return n;
});
console.log('  AA passes, palette on dark       ' + darkPass.map((n) => pad(n, 16)).join(''));
const MID = ['#222222', '#333333', '#374151', '#334155', '#444444', '#3f3f46'];
const midPass = VARIANTS.map((v) => {
  let n = 0;
  for (const bg of MID) for (const h of palette) if (hexToOklab(h)![0] > hexToOklab(bg)![0] && score(h, bg, v) >= 4.5) n++;
  return n;
});
console.log('  AA passes, palette on mid-dark   ' + midPass.map((n) => pad(n, 16)).join(''));

// ── 6. V2 against 2.0.3, in detail ───────────────────────────────────────────
console.log('\n=== 6. Induction (V2) vs 2.0.3 ===');
for (const h of palette)
  for (const [f, b] of [['#ffffff', h], [h, '#ffffff']]) {
    const w = parseFloat(wcag(f, b).toFixed(1));
    if (w >= 4.5 && score(f, b, 'V2') < 4.5 && score(f, b, 'V0') >= 4.5)
      console.log(`  new disagreement: ${f} on ${b}  WCAG ${w}  ${score(f, b, 'V0')} -> ${score(f, b, 'V2')}`);
  }
const lost = { achromatic: 0, 'low chroma': 0, chromatic: 0 };
for (const bg of [...SURFACES, ...MID])
  for (const h of palette) {
    if (hexToOklab(h)![0] <= hexToOklab(bg)![0]) continue;
    if (score(h, bg, 'V0') >= 4.5 && score(h, bg, 'V2') < 4.5) {
      const [, a, b] = hexToOklab(h)!; const C = Math.hypot(a, b);
      lost[C < 0.02 ? 'achromatic' : C < 0.08 ? 'low chroma' : 'chromatic']++;
    }
  }
console.log(`  AA lost on dark + mid-dark surfaces, by foreground: ${JSON.stringify(lost)}`);

// ── 7. V2 with CHROMA_K retuned to hold hot pink at 3.6 ──────────────────────
console.log('\n=== 7. V2 with CHROMA_K retuned ===');
for (const k of [0.65, 0.5, 0.45, 0.44, 0.43, 0.42, 0.41, 0.4]) {
  const pink = score('#ff69b4', '#1a1a1a', 'V2', k), orange = score('#ff8c00', '#1a1a1a', 'V2', k);
  const lostK = { achromatic: 0, 'low chroma': 0, chromatic: 0 };
  for (const bg of [...SURFACES, ...MID])
    for (const h of palette) {
      if (hexToOklab(h)![0] <= hexToOklab(bg)![0]) continue;
      if (score(h, bg, 'V0') >= 4.5 && score(h, bg, 'V2', k) < 4.5) {
        const [, a, b] = hexToOklab(h)!; const C = Math.hypot(a, b);
        lostK[C < 0.02 ? 'achromatic' : C < 0.08 ? 'low chroma' : 'chromatic']++;
      }
    }
  let dis = 0, fp = 0;
  for (const h of palette) for (const [f, b] of [['#ffffff', h], [h, '#ffffff']])
    if (score(f, b, 'V2', k) < 4.5 && parseFloat(wcag(f, b).toFixed(1)) >= 4.5) dis++;
  for (const [f, b] of pairs) if (score(f, b, 'V2', k) > parseFloat(wcag(f, b).toFixed(1))) fp++;
  console.log(`  CHROMA_K ${k.toFixed(2)}: hot pink ${pink}, orange ${orange}, disagreements ${dis}, FP ${fp}, AA lost ${JSON.stringify(lostK)}`);
}
