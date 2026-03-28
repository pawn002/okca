/**
 * Oracle tests: validate zero-dep OKCA produces identical contrast ratios
 * to the original colorjs.io-backed implementation.
 *
 * Strategy: run both implementations on the same color pairs, assert exact match.
 */
import Color from 'colorjs.io';
import { calculateContrast } from '../index';

// ── Reference implementation (colorjs-backed, copied from original) ──────────

const C_THRESH  = 0.15;
const CHROMA_K  = 0.75;
const K_DARK    = 0.155;
const A_THRESH  = 0.05;
const LOD_SCALE  = 0.81;
const DOL_MULT   = 0.78;
const DOL_OFFSET = 0.36;

function refContrast(textColor: string, bgColor: string): number | null {
  let tp: Color, bp: Color;
  try { tp = new Color(textColor); } catch { return null; }
  try { bp = new Color(bgColor); } catch { return null; }

  const tL = Math.max(0, tp.to('oklch').coords[0]);
  const bL = Math.max(0, bp.to('oklch').coords[0]);

  if (Math.abs(tL - bL) < 1e-6) return 1;

  const isBoW    = bL >= tL;
  const lighter  = isBoW ? bp : tp;
  const lighterL = isBoW ? bL : tL;
  const darker   = isBoW ? tp : bp;
  const darkerL  = isBoW ? tL : bL;

  // Step 3
  const oklab1 = lighter.to('oklab');
  const a1 = oklab1.coords[1], b1 = oklab1.coords[2];
  const C = Math.sqrt(a1 * a1 + b1 * b1);
  const satW = Math.min(1, (C / C_THRESH) ** 2);
  const exp = 1 + CHROMA_K * satW;
  const lighterY = Math.pow(Math.pow(lighterL, exp), 3);

  // Step 4
  const oklab2 = darker.to('oklab');
  const da = oklab2.coords[1];
  const correction = da < -A_THRESH ? K_DARK * (-da - A_THRESH) : 0;
  const Leff = Math.min(1, darkerL + correction);
  const darkerY = Math.pow(Leff, 3);

  // Step 5 — polarity-aware scaling
  const isLightOnDark = tL > bL;
  const rawRatio = (lighterY + 0.05) / (darkerY + 0.05);
  const ratio = isLightOnDark
    ? rawRatio * LOD_SCALE
    : rawRatio * DOL_MULT - DOL_OFFSET;
  return parseFloat(Math.max(1, Math.min(21, ratio)).toFixed(1));
}

// ── Test pairs ───────────────────────────────────────────────────────────────

const EDGE_PAIRS: [string, string][] = [
  // Achromatic
  ['#ffffff', '#000000'],
  ['#000000', '#ffffff'],
  ['#ffffff', '#808080'],
  ['#ffffff', '#767676'],
  ['#cccccc', '#333333'],
  ['#ffffff', '#555555'],
  ['#ffffff', '#595959'],
  // Greens (correction targets)
  ['#ffffff', '#228b22'],
  ['#ffffff', '#3a7d44'],
  ['#ffffff', '#008000'],
  ['#ffffff', '#006400'],
  ['#ffffff', '#007700'],
  ['#00ff00', '#000000'],
  ['#228b22', '#ffffff'],
  ['#008900', '#ffffff'],
  ['#006400', '#ffffff'],
  // Blues
  ['#ffffff', '#000080'],
  ['#ffffff', '#0057b7'],
  ['#add8e6', '#000080'],
  ['#000080', '#ffffff'],
  ['#0057b7', '#ffffff'],
  ['#1d4ed8', '#ffffff'],
  // Purples
  ['#ffffff', '#4b0082'],
  ['#ffffff', '#800080'],
  ['#4b0082', '#ffffff'],
  // Reds
  ['#ffffff', '#8b0000'],
  ['#ffffff', '#b22222'],
  ['#ffffff', '#d62728'],
  ['#8b0000', '#ffffff'],
  // Teals
  ['#ffffff', '#008080'],
  ['#ffffff', '#006666'],
  ['#008080', '#ffffff'],
  ['#006666', '#ffffff'],
  // Chromatic on near-black
  ['#ffff99', '#1a1a1a'],
  ['#ff69b4', '#1a1a1a'],
  ['#ff8c00', '#1a1a1a'],
  // Light backgrounds
  ['#000000', '#90ee90'],
  ['#000000', '#add8e6'],
  ['#000000', '#ffff99'],
  // Same color
  ['#ffffff', '#ffffff'],
  ['#000000', '#000000'],
  ['#808080', '#808080'],
  // Invalid
  ['not-a-color', '#000000'],
  ['#ffffff', 'bad'],
];

/** Seeded random pairs for broader coverage. */
function randomHexPairs(count: number, seed: number): [string, string][] {
  let s = seed;
  const rand = () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const hex = () => {
    const r = Math.floor(rand() * 256).toString(16).padStart(2, '0');
    const g = Math.floor(rand() * 256).toString(16).padStart(2, '0');
    const b = Math.floor(rand() * 256).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  };
  return Array.from({ length: count }, () => [hex(), hex()] as [string, string]);
}

const RANDOM_PAIRS = randomHexPairs(1000, 7);

// ── Tests ────────────────────────────────────────────────────────────────────

describe('OKCA contrast — zero-dep vs colorjs.io reference', () => {
  describe('edge-case pairs', () => {
    it.each(EDGE_PAIRS)('%s vs %s', (a, b) => {
      expect(calculateContrast(a, b)).toBe(refContrast(a, b));
    });
  });

  describe('1000 random pairs', () => {
    it.each(RANDOM_PAIRS)('%s vs %s', (a, b) => {
      expect(calculateContrast(a, b)).toBe(refContrast(a, b));
    });
  });
});
