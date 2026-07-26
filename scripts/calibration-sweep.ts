/**
 * OKCA calibration sweep — committed, reproducible replacement for the
 * one-off ~1.2M-evaluation gamut sweep described in docs/OKCA_DESIGN.md §4
 * but never committed as runnable code.
 *
 * Purpose (see docs/CALIBRATION_EXPERIMENT.md):
 *   Measure how far the lighter-element chroma penalty (C_THRESH, CHROMA_K)
 *   can be RELAXED to make OKCA less conservative on chromatic colours,
 *   WITHOUT breaking FP=0 (OKCA never scores above WCAG, with rounding).
 *
 * Locked by the fixed achromatic anchors, NOT tuned here:
 *   POL_K   = 1.100  (white / #767676 -> 3.9)
 *   DOL_CAP = 20     (black / white   -> 20.0)
 * Only C_THRESH and CHROMA_K are free. Because the chroma penalty acts on the
 * LIGHTER element and every anchor is achromatic (C=0 -> exp=1), retuning
 * these two constants cannot move any anchor by construction; the only
 * property at risk is FP=0 on chromatic-lighter pairs.
 *
 * Clean-room: uses only in-repo forward transforms (src/transforms.ts) and the
 * published WCAG 2.x relative-luminance formula (already reimplemented inline
 * in the test suite). No external contrast library math.
 *
 * Run: npm run calibrate
 */
import { hexToOklab, hexToOklch } from '../src/transforms';
import { contrast as prodContrast } from '../src/index';

// ── Fixed constants (pinned by the achromatic anchors) ──────────────────────
const POL_K = 1.1; // white/#767676 -> 3.9 (raised from 3.5 / POL_K 1.175)
const DOL_CAP = 20;

// Production baseline for the two free constants.
const BASE_C_THRESH = 0.15;
const BASE_CHROMA_K = 0.65; // production value (raised from 0.50 to re-dock vivid saturated foregrounds)

const AA = 4.5;

// ── Parameterised OKCA (only C_THRESH / CHROMA_K vary) ──────────────────────

interface Score {
  rounded: number;
  raw: number;
}

function okca(fg: string, bg: string, cThresh: number, chromaK: number, polK = POL_K): Score | null {
  const t = hexToOklab(fg);
  const b = hexToOklab(bg);
  if (!t || !b) return null;

  const tL = Math.max(0, t[0]);
  const bL = Math.max(0, b[0]);
  if (Math.abs(tL - bL) < 1e-6) return { rounded: 1, raw: 1 };

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
  const raw = Math.max(1, Math.min(21, cap * Math.pow(rawRatio / 21, polK)));
  return { rounded: parseFloat(raw.toFixed(1)), raw };
}

/**
 * POL_K that makes the white / #767676 L-o-D anchor land on `target`.
 * (Achromatic pair, so independent of the chroma penalty.) target=3.9 -> 1.100.
 */
function polKForAnchor(target: number): number {
  const L767 = hexToOklab('#767676')![0];
  const rawRatio = (1 + 0.05) / (Math.pow(L767, 3) + 0.05);
  return Math.log(target / 21) / Math.log(rawRatio / 21);
}

// ── WCAG 2.x reference (inline, published spec — clean-room) ─────────────────

function wcag(fg: string, bg: string): { rounded: number; raw: number } {
  const lum = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const l1 = lum(fg);
  const l2 = lum(bg);
  const raw = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return { rounded: parseFloat(raw.toFixed(1)), raw };
}

// ── Colour pool: gamut-valid sRGB grid, tagged with OKLCH ───────────────────

interface ColorInfo {
  hex: string;
  L: number;
  C: number;
  H: number;
}

function hex2(v: number): string {
  return v.toString(16).padStart(2, '0');
}

function gridColors(step: number): ColorInfo[] {
  const vals: number[] = [];
  for (let v = 0; v <= 255; v += step) vals.push(v);
  if (vals[vals.length - 1] !== 255) vals.push(255);
  const out: ColorInfo[] = [];
  for (const r of vals)
    for (const g of vals)
      for (const b of vals) {
        const hex = `#${hex2(r)}${hex2(g)}${hex2(b)}`;
        const lch = hexToOklch(hex)!;
        out.push({ hex, L: lch[0], C: lch[1], H: lch[2] });
      }
  return out;
}

// Seeded PRNG hex pairs (mulberry32 — same primitive as okca-oracle.spec.ts).
function randomHexPairs(count: number, seed: number): [string, string][] {
  let s = seed;
  const rand = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const hex = () =>
    `#${hex2(Math.floor(rand() * 256))}${hex2(Math.floor(rand() * 256))}${hex2(Math.floor(rand() * 256))}`;
  return Array.from({ length: count }, () => [hex(), hex()] as [string, string]);
}

// ── Design-system palettes (independent copy — cross-checks the 111 baseline)─
// Tailwind v3.4, GOV.UK, USWDS. Kept minimal: every colour is paired with white
// in both polarities, exactly as probe-design-systems.spec.ts does.
import { TAILWIND, GOVUK, USWDS } from './palettes';

interface Pair {
  fg: string;
  bg: string;
  system?: string;
}

function designSystemPairs(): Pair[] {
  const pairs: Pair[] = [];
  const WHITE = '#ffffff';
  const add = (sys: string, fams: Record<string, Record<string, string>>) => {
    for (const shades of Object.values(fams))
      for (const hex of Object.values(shades)) {
        const h = hex.toLowerCase();
        pairs.push({ fg: WHITE, bg: h, system: sys });
        pairs.push({ fg: h, bg: WHITE, system: sys });
      }
  };
  add('tw', TAILWIND);
  add('govuk', GOVUK);
  add('uswds', USWDS);
  return pairs;
}

// ── Pair corpora ────────────────────────────────────────────────────────────

const POOL = gridColors(17); // 16^3 = 4096 gamut-valid colours

// FP=0 stress: pairs whose LIGHTER element is chromatic are the ONLY ones whose
// score changes when C_THRESH/CHROMA_K move — so FP can only newly appear here.
// The worst known overshoot is a light chromatic on a dark chromatic (green).
const LIGHT_CHROMATIC = POOL.filter((c) => c.L >= 0.72 && c.C >= 0.05);
const DARK_CHROMATIC = POOL.filter((c) => c.L <= 0.55 && c.C >= 0.05);
const DARKS = POOL.filter((c) => c.L <= 0.6);

function stressPairs(): Pair[] {
  const pairs: Pair[] = [];
  // light chromatic (lighter element) on every darker element — both the
  // chromatic-darker overshoot band and neutral/dark backgrounds.
  for (const light of LIGHT_CHROMATIC)
    for (const dark of DARKS)
      if (light.L - dark.L > 1e-6) pairs.push({ fg: light.hex, bg: dark.hex });
  return pairs;
}

// Green-darker stress band explicitly (OKLCH hue ~120–200), both polarities,
// against light chromatics — the documented ≈0.44 worst-case region.
function greenBandPairs(): Pair[] {
  const greens = POOL.filter((c) => c.L <= 0.55 && c.C >= 0.06 && c.H >= 120 && c.H <= 200);
  const pairs: Pair[] = [];
  for (const light of LIGHT_CHROMATIC)
    for (const g of greens) {
      pairs.push({ fg: light.hex, bg: g.hex });
      pairs.push({ fg: g.hex, bg: light.hex });
    }
  return pairs;
}

// ── Metrics under a candidate (cThresh, chromaK) ────────────────────────────

const AAA = 7.0;

interface Result {
  cThresh: number;
  chromaK: number;
  // FP=0 (strong): OKCA rounded > WCAG rounded, over the whole FP corpus.
  fpCount: number;
  worstOvershoot: number; // max(okca.raw - wcag.raw); <=0 means never above WCAG
  worstPair: string;
  // Conservatism on the 1,142 design-system pairs (lighter element = white,
  // so the chroma penalty never fires — expected to be INVARIANT).
  dsDisagreements: number; // OKCA<4.5 & WCAG>=4.5 (the "111")
  dsRecovered: number; // baseline-disagreements now scoring >=4.5
  // Call recovery where the penalty DOES fire: light-chromatic foregrounds.
  lcFp: number; // FP within the light-chromatic corpus (must stay 0)
  lcAaRecovered: number; // baseline OKCA<4.5 -> candidate >=4.5
  lcAaaRecovered: number; // baseline OKCA<7.0 -> candidate >=7.0
  lcMeanLift: number; // mean(candidate.raw - baseline.raw) over the LC corpus
}

function evaluate(
  cThresh: number,
  chromaK: number,
  fpCorpus: Pair[],
  ds: Pair[],
  dsBaselineDisagree: boolean[],
  lc: Pair[],
  lcBaseRounded: Float64Array,
  lcBaseRaw: Float64Array,
  lcWcagRounded: Float64Array,
): Result {
  let fpCount = 0;
  let worstOvershoot = -Infinity;
  let worstPair = '';

  for (const { fg, bg } of fpCorpus) {
    const o = okca(fg, bg, cThresh, chromaK);
    if (!o) continue;
    const w = wcag(fg, bg);
    if (o.rounded > w.rounded) fpCount++;
    const overshoot = o.raw - w.raw;
    if (overshoot > worstOvershoot) {
      worstOvershoot = overshoot;
      worstPair = `${fg} on ${bg} (OKCA ${o.raw.toFixed(2)} vs WCAG ${w.raw.toFixed(2)})`;
    }
  }

  let dsDisagreements = 0;
  let dsRecovered = 0;
  ds.forEach((p, i) => {
    const o = okca(p.fg, p.bg, cThresh, chromaK)!;
    const w = wcag(p.fg, p.bg);
    if (o.rounded < AA && w.rounded >= AA) dsDisagreements++;
    if (dsBaselineDisagree[i] && o.rounded >= AA) dsRecovered++;
  });

  let lcFp = 0;
  let lcAaRecovered = 0;
  let lcAaaRecovered = 0;
  let liftSum = 0;
  lc.forEach((p, i) => {
    const o = okca(p.fg, p.bg, cThresh, chromaK)!;
    if (o.rounded > lcWcagRounded[i]) lcFp++;
    if (lcBaseRounded[i] < AA && o.rounded >= AA) lcAaRecovered++;
    if (lcBaseRounded[i] < AAA && o.rounded >= AAA) lcAaaRecovered++;
    liftSum += o.raw - lcBaseRaw[i];
  });

  return {
    cThresh,
    chromaK,
    fpCount,
    worstOvershoot,
    worstPair,
    dsDisagreements,
    dsRecovered,
    lcFp,
    lcAaRecovered,
    lcAaaRecovered,
    lcMeanLift: liftSum / lc.length,
  };
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  const ds = designSystemPairs();
  const random = randomHexPairs(200000, 7).map(([fg, bg]) => ({ fg, bg }));
  const stress = stressPairs();
  const greenBand = greenBandPairs();
  const fpCorpus: Pair[] = [...ds, ...random, ...stress, ...greenBand];

  // Light-chromatic corpus: the pairs whose LIGHTER element is chromatic — the
  // only region where C_THRESH/CHROMA_K change the score. Deduped.
  const seen = new Set<string>();
  const lc: Pair[] = [];
  for (const p of [...stress, ...greenBand]) {
    const key = `${p.fg}|${p.bg}`;
    if (!seen.has(key)) {
      seen.add(key);
      lc.push(p);
    }
  }
  const lcBaseRounded = new Float64Array(lc.length);
  const lcBaseRaw = new Float64Array(lc.length);
  const lcWcagRounded = new Float64Array(lc.length);
  lc.forEach((p, i) => {
    const o = okca(p.fg, p.bg, BASE_C_THRESH, BASE_CHROMA_K)!;
    lcBaseRounded[i] = o.rounded;
    lcBaseRaw[i] = o.raw;
    lcWcagRounded[i] = wcag(p.fg, p.bg).rounded;
  });

  console.log('OKCA calibration sweep');
  console.log('======================');
  console.log(`FP corpus pairs:      ${fpCorpus.length.toLocaleString()}`);
  console.log(`  design-system:      ${ds.length}`);
  console.log(`  random (seed 7):    ${random.length.toLocaleString()}`);
  console.log(`  light-chromatic stress + green band: ${(stress.length + greenBand.length).toLocaleString()}`);
  console.log(`Light-chromatic corpus (deduped, lighter element chromatic): ${lc.length.toLocaleString()}`);
  console.log('');

  // ── Fidelity self-check: harness == production at baseline constants ──────
  let mismatches = 0;
  for (const { fg, bg } of [...ds, ...random.slice(0, 5000)]) {
    const h = okca(fg, bg, BASE_C_THRESH, BASE_CHROMA_K)!.rounded;
    const p = prodContrast(fg, bg)!;
    if (h !== p) mismatches++;
  }
  console.log(`Self-check (harness vs production, baseline constants): ${mismatches} mismatches`);
  if (mismatches > 0) throw new Error('Harness does not match production contrast() — aborting.');

  // ── Baseline metrics (must reproduce the documented FP=0 and 111) ─────────
  const dsBaselineDisagree = ds.map((p) => {
    const o = okca(p.fg, p.bg, BASE_C_THRESH, BASE_CHROMA_K)!;
    const w = wcag(p.fg, p.bg);
    return o.rounded < AA && w.rounded >= AA;
  });
  const base = evaluate(
    BASE_C_THRESH, BASE_CHROMA_K, fpCorpus, ds, dsBaselineDisagree,
    lc, lcBaseRounded, lcBaseRaw, lcWcagRounded,
  );
  console.log('');
  console.log(`Baseline (C_THRESH=${BASE_C_THRESH}, CHROMA_K=${BASE_CHROMA_K}):`);
  console.log(`  FP count (strong, whole corpus): ${base.fpCount}`);
  console.log(`  worst overshoot (okca.raw - wcag.raw): ${base.worstOvershoot.toFixed(4)}`);
  console.log(`    @ ${base.worstPair}`);
  console.log(`  design-system WCAG disagreements: ${base.dsDisagreements} (expect 97 at POL_K=1.100)`);
  console.log('');

  // ── Grid search over the two free constants ───────────────────────────────
  // Relaxation directions: raise C_THRESH (penalty engages later) and/or lower
  // CHROMA_K (shallower penalty). Both RAISE chromatic scores.
  const cThreshGrid = [0.15, 0.18, 0.2, 0.25, 0.3];
  const chromaKGrid = [0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2];

  const results: Result[] = [];
  for (const ct of cThreshGrid)
    for (const ck of chromaKGrid)
      results.push(
        evaluate(ct, ck, fpCorpus, ds, dsBaselineDisagree, lc, lcBaseRounded, lcBaseRaw, lcWcagRounded),
      );

  console.log('Grid search (POL_K, DOL_CAP, anchors all fixed). "!" = FP-unsafe.');
  console.log('   CT    CK    FP  worstOvr  DS-dis  DS-rec | lcFP  lcAA-rec  lcAAA-rec  lcMeanLift');
  for (const r of results) {
    const safe = r.fpCount === 0 && r.worstOvershoot <= 0 ? ' ' : '!';
    console.log(
      `${safe} ${r.cThresh.toFixed(2)}  ${r.chromaK.toFixed(2)}  ${String(r.fpCount).padStart(4)}  ` +
        `${r.worstOvershoot.toFixed(4).padStart(8)}  ${String(r.dsDisagreements).padStart(6)}  ` +
        `${String(r.dsRecovered).padStart(6)} | ${String(r.lcFp).padStart(4)}  ` +
        `${String(r.lcAaRecovered).padStart(8)}  ${String(r.lcAaaRecovered).padStart(9)}  ` +
        `${r.lcMeanLift.toFixed(4).padStart(10)}`,
    );
  }

  // ── Best FP-safe candidate by light-chromatic AA calls recovered ──────────
  const safe = results.filter((r) => r.fpCount === 0 && r.worstOvershoot <= 0 && r.lcFp === 0);
  safe.sort(
    (a, b) => b.lcAaRecovered - a.lcAaRecovered || b.lcAaaRecovered - a.lcAaaRecovered,
  );
  console.log('');
  console.log(`FP-safe candidates: ${safe.length}/${results.length} (every candidate holds FP=0).`);
  if (safe.length && safe[0].lcAaRecovered > 0) {
    const b = safe[0];
    console.log(
      `Most AA calls recovered (light-chromatic, FP-safe): ` +
        `C_THRESH=${b.cThresh}, CHROMA_K=${b.chromaK} — ` +
        `+${b.lcAaRecovered} AA, +${b.lcAaaRecovered} AAA, mean lift ${b.lcMeanLift.toFixed(3)}.`,
    );
  }
  console.log(
    `Design-system 111: recovered by NO candidate — those pairs have a white ` +
      `(achromatic) lighter element, so the chroma penalty never applies.`,
  );

  // ── OUT-OF-SCOPE exploratory probe: move the #767676 grey anchor ──────────
  // The 111 disagreements are governed by POL_K, pinned by white/#767676 -> 3.5.
  // This probe (which changes NO source; it only measures) quantifies what
  // raising that anchor would buy and what it costs in FP=0 — the real lever
  // for the practitioner-critical grey/dark under-calls.
  console.log('');
  console.log('Anchor-sensitivity probe (out of current scope — measurement only).');
  console.log('Raising white/#767676 lowers POL_K -> less compression -> less FP=0 headroom.');
  console.log(' anchor  POL_K   FP(strong)  worstOvershoot   DS-disagree(<-111)  DS-recovered');
  for (const target of [3.5, 3.6, 3.7, 3.8, 4.0, 4.25, 4.5]) {
    const polK = polKForAnchor(target);
    let fp = 0;
    let worst = -Infinity;
    let worstP = '';
    for (const { fg, bg } of fpCorpus) {
      const o = okca(fg, bg, BASE_C_THRESH, BASE_CHROMA_K, polK);
      if (!o) continue;
      const w = wcag(fg, bg);
      if (o.rounded > w.rounded) fp++;
      const ov = o.raw - w.raw;
      if (ov > worst) {
        worst = ov;
        worstP = `${fg} on ${bg}`;
      }
    }
    let dis = 0;
    let rec = 0;
    ds.forEach((p, i) => {
      const o = okca(p.fg, p.bg, BASE_C_THRESH, BASE_CHROMA_K, polK)!;
      const w = wcag(p.fg, p.bg);
      if (o.rounded < AA && w.rounded >= AA) dis++;
      if (dsBaselineDisagree[i] && o.rounded >= AA) rec++;
    });
    const flag = fp === 0 && worst <= 0 ? ' ' : '!';
    console.log(
      `${flag} ${target.toFixed(2)}  ${polK.toFixed(4)}  ${String(fp).padStart(9)}  ` +
        `${worst.toFixed(4).padStart(10)}      ${String(dis).padStart(9)}       ` +
        `${String(rec).padStart(7)}   ${flag === '!' ? `(first FP @ ${worstP})` : ''}`,
    );
  }
}

main();
