/**
 * Design-system probe battery — pairs from real-world palettes.
 *
 * Palettes: Tailwind CSS v3.4, GOV.UK Design System (govuk-frontend MIT),
 *           US Web Design System v3.x (USWDS, MIT)
 *
 * Tests the critical invariant: OKCA must never produce a false pass
 * (OKCA ≥ 4.5 when WCAG < 4.5). Also pins WCAG-disagreement counts per
 * system to detect unexpected shifts.
 *
 * "WCAG disagreements" (pairs where OKCA < 4.5 but WCAG ≥ 4.5) are
 * intentional: WCAG's 4.5:1 AA threshold is widely considered too
 * permissive. White on #767676 — WCAG's own AA boundary anchor — is not
 * production-ready in practice. The disagreements below identify colours
 * that sit in the same marginal zone.
 *
 * Disagreement character varies by system:
 *
 * - Tailwind presents mid-range chromatic shades (500–700) as general-purpose
 *   colours without pairing restrictions. Its disagreements are the most
 *   practitioner-relevant: these are colours a designer might reach for as
 *   text or icon colour.
 *
 * - GOV.UK and USWDS disagreements are mid-range chromatic shades that land
 *   in WCAG's marginal zone. Both systems make explicit WCAG 2.x AA claims
 *   and document approved text pairings; disagreements here identify shades
 *   that pass WCAG's threshold but sit close to its boundary.
 *
 * WCAG 2.x relative luminance is computed inline (no colorjs dependency)
 * so we can cross-check OKCA scores independently.
 */
import { contrast } from '../index';

// ── WCAG 2.x reference (inline, zero-dep) ───────────────────────────────────

function wcagContrast(hex1: string, hex2: string): number {
  const lum = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const lin = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const l1 = lum(hex1), l2 = lum(hex2);
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
  return parseFloat(((lighter + 0.05) / (darker + 0.05)).toFixed(1));
}

// ── Palette data ─────────────────────────────────────────────────────────────

const TAILWIND: Record<string, Record<string, string>> = {
  slate:   { 50:'#f8fafc',100:'#f1f5f9',200:'#e2e8f0',300:'#cbd5e1',400:'#94a3b8',500:'#64748b',600:'#475569',700:'#334155',800:'#1e293b',900:'#0f172a',950:'#020617' },
  gray:    { 50:'#f9fafb',100:'#f3f4f6',200:'#e5e7eb',300:'#d1d5db',400:'#9ca3af',500:'#6b7280',600:'#4b5563',700:'#374151',800:'#1f2937',900:'#111827',950:'#030712' },
  zinc:    { 50:'#fafafa',100:'#f4f4f5',200:'#e4e4e7',300:'#d4d4d8',400:'#a1a1aa',500:'#71717a',600:'#52525b',700:'#3f3f46',800:'#27272a',900:'#18181b',950:'#09090b' },
  neutral: { 50:'#fafafa',100:'#f5f5f5',200:'#e5e5e5',300:'#d4d4d4',400:'#a3a3a3',500:'#737373',600:'#525252',700:'#404040',800:'#262626',900:'#171717',950:'#0a0a0a' },
  stone:   { 50:'#fafaf9',100:'#f5f5f4',200:'#e7e5e4',300:'#d6d3d1',400:'#a8a29e',500:'#78716c',600:'#57534e',700:'#44403c',800:'#292524',900:'#1c1917',950:'#0c0a09' },
  red:     { 50:'#fef2f2',100:'#fee2e2',200:'#fecaca',300:'#fca5a5',400:'#f87171',500:'#ef4444',600:'#dc2626',700:'#b91c1c',800:'#991b1b',900:'#7f1d1d',950:'#450a0a' },
  orange:  { 50:'#fff7ed',100:'#ffedd5',200:'#fed7aa',300:'#fdba74',400:'#fb923c',500:'#f97316',600:'#ea580c',700:'#c2410c',800:'#9a3412',900:'#7c2d12',950:'#431407' },
  amber:   { 50:'#fffbeb',100:'#fef3c7',200:'#fde68a',300:'#fcd34d',400:'#fbbf24',500:'#f59e0b',600:'#d97706',700:'#b45309',800:'#92400e',900:'#78350f',950:'#451a03' },
  yellow:  { 50:'#fefce8',100:'#fef9c3',200:'#fef08a',300:'#fde047',400:'#facc15',500:'#eab308',600:'#ca8a04',700:'#a16207',800:'#854d0e',900:'#713f12',950:'#422006' },
  lime:    { 50:'#f7fee7',100:'#ecfccb',200:'#d9f99d',300:'#bef264',400:'#a3e635',500:'#84cc16',600:'#65a30d',700:'#4d7c0f',800:'#3f6212',900:'#365314',950:'#1a2e05' },
  green:   { 50:'#f0fdf4',100:'#dcfce7',200:'#bbf7d0',300:'#86efac',400:'#4ade80',500:'#22c55e',600:'#16a34a',700:'#15803d',800:'#166534',900:'#14532d',950:'#052e16' },
  emerald: { 50:'#ecfdf5',100:'#d1fae5',200:'#a7f3d0',300:'#6ee7b7',400:'#34d399',500:'#10b981',600:'#059669',700:'#047857',800:'#065f46',900:'#064e3b',950:'#022c22' },
  teal:    { 50:'#f0fdfa',100:'#ccfbf1',200:'#99f6e4',300:'#5eead4',400:'#2dd4bf',500:'#14b8a6',600:'#0d9488',700:'#0f766e',800:'#115e59',900:'#134e4a',950:'#042f2e' },
  cyan:    { 50:'#ecfeff',100:'#cffafe',200:'#a5f3fc',300:'#67e8f9',400:'#22d3ee',500:'#06b6d4',600:'#0891b2',700:'#0e7490',800:'#155e75',900:'#164e63',950:'#083344' },
  sky:     { 50:'#f0f9ff',100:'#e0f2fe',200:'#bae6fd',300:'#7dd3fc',400:'#38bdf8',500:'#0ea5e9',600:'#0284c7',700:'#0369a1',800:'#075985',900:'#0c4a6e',950:'#082f49' },
  blue:    { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a',950:'#172554' },
  indigo:  { 50:'#eef2ff',100:'#e0e7ff',200:'#c7d2fe',300:'#a5b4fc',400:'#818cf8',500:'#6366f1',600:'#4f46e5',700:'#4338ca',800:'#3730a3',900:'#312e81',950:'#1e1b4b' },
  violet:  { 50:'#f5f3ff',100:'#ede9fe',200:'#ddd6fe',300:'#c4b5fd',400:'#a78bfa',500:'#8b5cf6',600:'#7c3aed',700:'#6d28d9',800:'#5b21b6',900:'#4c1d95',950:'#2e1065' },
  purple:  { 50:'#faf5ff',100:'#f3e8ff',200:'#e9d5ff',300:'#d8b4fe',400:'#c084fc',500:'#a855f7',600:'#9333ea',700:'#7e22ce',800:'#6b21a8',900:'#581c87',950:'#3b0764' },
  fuchsia: { 50:'#fdf4ff',100:'#fae8ff',200:'#f5d0fe',300:'#f0abfc',400:'#e879f9',500:'#d946ef',600:'#c026d3',700:'#a21caf',800:'#86198f',900:'#701a75',950:'#4a044e' },
  pink:    { 50:'#fdf2f8',100:'#fce7f3',200:'#fbcfe8',300:'#f9a8d4',400:'#f472b6',500:'#ec4899',600:'#db2777',700:'#be185d',800:'#9d174d',900:'#831843',950:'#500724' },
  rose:    { 50:'#fff1f2',100:'#ffe4e6',200:'#fecdd3',300:'#fda4af',400:'#fb7185',500:'#f43f5e',600:'#e11d48',700:'#be123c',800:'#9f1239',900:'#881337',950:'#4c0519' },
};

// GOV.UK Design System — govuk-frontend (MIT). Explicit WCAG 2.2 AA claims.
// Source: github.com/alphagov/govuk-frontend _colours-palette.scss
const GOVUK: Record<string, Record<string, string>> = {
  blue:    { primary:'#1d70b8', shade10:'#1a65a6', shade25:'#16548a', shade50:'#0f385c', tint25:'#5694ca', tint50:'#8eb8dc', tint80:'#d2e2f1', tint95:'#f4f8fb' },
  green:   { primary:'#0f7a52', shade25:'#0b5c3e', shade50:'#083d29', tint25:'#4b9b7d', tint50:'#87bca8', tint80:'#cfe4dc', tint95:'#f3f8f6' },
  teal:    { primary:'#158187', shade25:'#106165', shade50:'#0b4144', tint25:'#50a1a5', tint50:'#8ac0c3', tint80:'#d0e6e7', tint95:'#f3f9f9' },
  purple:  { primary:'#54319f', shade25:'#3f2577', shade50:'#2a1950', tint25:'#7f65b7', tint50:'#aa98cf', tint80:'#ddd6ec', tint95:'#f6f5fa' },
  magenta: { primary:'#ca357c', shade25:'#98285d', shade50:'#651b3e', tint25:'#d7689d', tint50:'#e59abe', tint80:'#f4d7e5', tint95:'#fcf5f8' },
  red:     { primary:'#ca3535', shade25:'#982828', shade50:'#651b1b', tint25:'#d76868', tint50:'#e59a9a', tint80:'#f4d7d7', tint95:'#fcf5f5' },
  orange:  { primary:'#f47738', shade25:'#b7592a', shade50:'#7a3c1c', tint25:'#f7996a', tint50:'#fabb9c', tint80:'#fde4d7', tint95:'#fef8f5' },
  yellow:  { primary:'#ffdd00', shade25:'#bfa600', shade50:'#806f00', tint25:'#ffe640', tint50:'#ffee80', tint80:'#fff8cc', tint95:'#fffdf2' },
  brown:   { primary:'#99704a', tint25:'#b39477', tint50:'#ccb8a5', tint95:'#faf8f6' },
  grey:    { black:'#0b0c0c', tint25:'#484949', tint50:'#858686', tint80:'#cecece', tint95:'#f3f3f3' },
};

// US Web Design System v3.x (USWDS, MIT). Explicit WCAG 2.x AA claims.
// Source: github.com/uswds/uswds packages/uswds-core/src/styles/tokens/color/
// Base (non-vivid) grades only — grades 5–90 for chromatic, 1–90/100 for grays.
const USWDS: Record<string, Record<string, string>> = {
  'red-cool':    { '5':'#f8eff1','10':'#f3e1e4','20':'#ecbec6','30':'#e09aa6','40':'#e16b80','50':'#cd425b','60':'#9e394b','70':'#68363f','80':'#40282c','90':'#1e1517' },
  red:           { '5':'#f9eeee','10':'#f8e1de','20':'#f7bbb1','30':'#f2938c','40':'#e9695f','50':'#d83933','60':'#a23737','70':'#6f3331','80':'#3e2927','90':'#1b1616' },
  'red-warm':    { '5':'#f6efea','10':'#f4e3db','20':'#ecc0a7','30':'#dca081','40':'#d27a56','50':'#c3512c','60':'#805039','70':'#524236','80':'#332d29','90':'#1f1c18' },
  'orange-warm': { '5':'#faeee5','10':'#fbe0d0','20':'#f7bca2','30':'#f3966d','40':'#e17141','50':'#bd5727','60':'#914734','70':'#633a32','80':'#3d2925','90':'#1c1615' },
  orange:        { '5':'#f6efe9','10':'#f2e4d4','20':'#f3bf90','30':'#f09860','40':'#dd7533','50':'#a86437','60':'#775540','70':'#524236','80':'#332d27','90':'#1b1614' },
  gold:          { '5':'#f5f0e6','10':'#f1e5cd','20':'#dec69a','30':'#c7a97b','40':'#ad8b65','50':'#8e704f','60':'#6b5947','70':'#4d4438','80':'#322d26','90':'#191714' },
  yellow:        { '5':'#faf3d1','10':'#f5e6af','20':'#e6c74c','30':'#c9ab48','40':'#a88f48','50':'#8a7237','60':'#6b5a39','70':'#504332','80':'#332d27','90':'#1a1614' },
  'green-warm':  { '5':'#f1f4d7','10':'#e7eab7','20':'#cbd17a','30':'#a6b557','40':'#8a984b','50':'#6f7a41','60':'#5a5f38','70':'#45472f','80':'#2d2f21','90':'#171712' },
  green:         { '5':'#eaf4dd','10':'#dfeacd','20':'#b8d293','30':'#9bb672','40':'#7d9b4e','50':'#607f35','60':'#4c6424','70':'#3c4a29','80':'#293021','90':'#161814' },
  'green-cool':  { '5':'#ecf3ec','10':'#dbebde','20':'#b4d0b9','30':'#86b98e','40':'#5e9f69','50':'#4d8055','60':'#446443','70':'#37493b','80':'#28312a','90':'#1a1f1a' },
  mint:          { '5':'#dbf6ed','10':'#c7efe2','20':'#92d9bb','30':'#5abf95','40':'#34a37e','50':'#2e8367','60':'#286846','70':'#204e34','80':'#193324','90':'#0d1a12' },
  'mint-cool':   { '5':'#e0f7f6','10':'#c4eeeb','20':'#9bd4cf','30':'#6fbab3','40':'#4f9e99','50':'#40807e','60':'#376462','70':'#2a4b45','80':'#203131','90':'#111818' },
  cyan:          { '5':'#e7f6f8','10':'#ccecf2','20':'#99deea','30':'#5dc0d1','40':'#449dac','50':'#168092','60':'#2a646d','70':'#2c4a4e','80':'#203133','90':'#111819' },
  'blue-cool':   { '5':'#e7f2f5','10':'#dae9ee','20':'#adcfdc','30':'#82b4c9','40':'#6499af','50':'#3a7d95','60':'#2e6276','70':'#224a58','80':'#14333d','90':'#0f191c' },
  blue:          { '5':'#eff6fb','10':'#d9e8f6','20':'#aacdec','30':'#73b3e7','40':'#4f97d1','50':'#2378c3','60':'#2c608a','70':'#274863','80':'#1f303e','90':'#11181d' },
  'blue-warm':   { '5':'#ecf1f7','10':'#e1e7f1','20':'#bbcae4','30':'#98afd2','40':'#7292c7','50':'#4a77b4','60':'#345d96','70':'#2f4668','80':'#252f3e','90':'#13171f' },
  'indigo-cool': { '5':'#eef0f9','10':'#e1e6f9','20':'#bbc8f5','30':'#96abee','40':'#6b8ee8','50':'#496fd8','60':'#3f57a6','70':'#374274','80':'#292d42','90':'#151622' },
  indigo:        { '5':'#efeff8','10':'#e5e4fa','20':'#c5c5f3','30':'#a5a8eb','40':'#8889db','50':'#676cc8','60':'#4d52af','70':'#3d4076','80':'#2b2c40','90':'#16171f' },
  'indigo-warm': { '5':'#f1eff7','10':'#e7e3fa','20':'#cbc4f2','30':'#afa5e8','40':'#9287d8','50':'#7665d1','60':'#5e519e','70':'#453c7b','80':'#2e2c40','90':'#18161d' },
  violet:        { '5':'#f4f1f9','10':'#ebe3f9','20':'#d0c3e9','30':'#b8a2e3','40':'#9d84d2','50':'#8168b3','60':'#665190','70':'#4c3d69','80':'#312b3f','90':'#18161d' },
  'violet-warm': { '5':'#f8f0f9','10':'#f6dff8','20':'#e2bee4','30':'#d29ad8','40':'#bf77c8','50':'#b04abd','60':'#864381','70':'#5c395a','80':'#382936','90':'#1b151b' },
  magenta:       { '5':'#f9f0f2','10':'#f6e1e8','20':'#f0bbcc','30':'#e895b3','40':'#e0699f','50':'#c84281','60':'#8b4566','70':'#66364b','80':'#402731','90':'#1b1617' },
  'gray-cool':   { '1':'#fbfcfd','2':'#f7f9fa','3':'#f5f6f7','4':'#f1f3f6','5':'#edeff0','10':'#dfe1e2','20':'#c6cace','30':'#a9aeb1','40':'#8d9297','50':'#71767a','60':'#565c65','70':'#3d4551','80':'#2d2e2f','90':'#1c1d1f' },
  gray:          { '1':'#fcfcfc','2':'#f9f9f9','3':'#f6f6f6','4':'#f3f3f3','5':'#f0f0f0','10':'#e6e6e6','20':'#c9c9c9','30':'#adadad','40':'#919191','50':'#757575','60':'#5c5c5c','70':'#454545','80':'#2e2e2e','90':'#1b1b1b','100':'#000000' },
  'gray-warm':   { '1':'#fcfcfb','2':'#f9f9f7','3':'#f6f6f2','4':'#f5f5f0','5':'#f0f0ec','10':'#e6e6e2','20':'#cac9c0','30':'#afaea2','40':'#929285','50':'#76766a','60':'#5d5d52','70':'#454540','80':'#2e2e2a','90':'#171716' },
};


// ── Build pairs ──────────────────────────────────────────────────────────────

interface PalettePair {
  fg: string;
  bg: string;
  label: string;
  system: string;
}

function buildPairs(): PalettePair[] {
  const pairs: PalettePair[] = [];
  const WHITE = '#ffffff';

  const addSystem = (sysId: string, families: Record<string, Record<string, string>>) => {
    for (const [family, shades] of Object.entries(families)) {
      for (const [shade, hex] of Object.entries(shades)) {
        const label = `${sysId}:${family}-${shade}`;
        const h = hex.toLowerCase();
        pairs.push({ fg: WHITE, bg: h, label: `white / ${label}`, system: sysId });
        pairs.push({ fg: h, bg: WHITE, label: `${label} / white`, system: sysId });
      }
    }
  };

  addSystem('tw', TAILWIND);
  addSystem('govuk', GOVUK);
  addSystem('uswds', USWDS);

  return pairs;
}

const ALL_PAIRS = buildPairs();

// ── Tests ────────────────────────────────────────────────────────────────────

const AA = 4.5;

describe('design-system probe', () => {
  it('covers 1,142 pairs', () => {
    expect(ALL_PAIRS.length).toBe(1142);
  });

  it('CRITICAL: zero false passes across all design systems', () => {
    const falsePassPairs: string[] = [];

    for (const { fg, bg, label } of ALL_PAIRS) {
      const okca = contrast(fg, bg)!;
      const wcag = wcagContrast(fg, bg);

      if (okca >= AA && wcag < AA) {
        falsePassPairs.push(`${label}: OKCA=${okca}, WCAG=${wcag}`);
      }
    }

    expect(falsePassPairs).toEqual([]);
  });

  it('WCAG disagreement count matches baseline (111 total)', () => {
    let ffCount = 0;

    for (const { fg, bg } of ALL_PAIRS) {
      const okca = contrast(fg, bg)!;
      const wcag = wcagContrast(fg, bg);
      if (okca < AA && wcag >= AA) ffCount++;
    }

    expect(ffCount).toBe(111);
  });

  it('WCAG disagreement counts match per system', () => {
    const ffBySystem: Record<string, number> = {};

    for (const { fg, bg, system } of ALL_PAIRS) {
      const okca = contrast(fg, bg)!;
      const wcag = wcagContrast(fg, bg);
      if (okca < AA && wcag >= AA) {
        ffBySystem[system] = (ffBySystem[system] || 0) + 1;
      }
    }

    expect(ffBySystem['tw'] ?? 0).toBe(46);
    expect(ffBySystem['govuk'] ?? 0).toBe(15);
    expect(ffBySystem['uswds'] ?? 0).toBe(50);
  });

  it('all results are in [1, 21] range', () => {
    for (const { fg, bg } of ALL_PAIRS) {
      const r = contrast(fg, bg);
      expect(r).not.toBeNull();
      expect(r!).toBeGreaterThanOrEqual(1);
      expect(r!).toBeLessThanOrEqual(21);
    }
  });
});
