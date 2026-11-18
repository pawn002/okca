/**
 * Colour-vision-deficiency yardstick shared by the CVD scripts.
 *
 * Machado, Oliveira & Fernandes (2009), severity 1.0, applied to linear sRGB.
 * The "CVD ratio" of a pair is the WCAG ratio of the simulated pair, worst of
 * protan, deutan and tritan. This is a yardstick for evaluating OKCA, not part
 * of the algorithm.
 */
import { hexToOklab } from '../src/transforms';

export type V3 = [number, number, number];
const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const gam = (v: number) => { v = Math.min(1, Math.max(0, v)); return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055; };
export const hx = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 255).toString(16).padStart(2, '0');
const toLin = (h: string): V3 => [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255)) as V3;
const lumY = (l: V3) => 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const mul = (M: number[][], v: V3) => M.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]) as V3;
const clamp01 = (v: V3) => v.map((x) => Math.min(1, Math.max(0, x))) as V3;

export const MACHADO: Record<string, number[][]> = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};

export interface Measured { fg: string; bg: string; wcag: number; cvdMin: number; a: number; b: number; C: number; H: number }
export function measure(fg: string, bg: string): Measured {
  const lf = toLin(fg), lb = toLin(bg), [, a, b] = hexToOklab(fg)!;
  const cvdMin = Math.min(...Object.values(MACHADO).map((M) => ratio(lumY(clamp01(mul(M, lf))), lumY(clamp01(mul(M, lb))))));
  return { fg, bg, wcag: ratio(lumY(lf), lumY(lb)), cvdMin, a, b, C: Math.hypot(a, b), H: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
}

/** OKLCH to sRGB hex, or null when out of gamut. */
export function oklchHex(L: number, C: number, H: number): string | null {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
  if (rgb.some((v) => v < -1e-6 || v > 1 + 1e-6)) return null;
  return '#' + rgb.map((v) => hx(gam(v))).join('');
}

/** The 8-step sRGB cube (0, 34, ... 238), all ordered pairs: 262,144. */
export function gridPairs(): [string, string][] {
  const g: string[] = [];
  for (let r = 0; r < 256; r += 34) for (let G = 0; G < 256; G += 34) for (let b = 0; b < 256; b += 34) g.push(`#${hx(r / 255)}${hx(G / 255)}${hx(b / 255)}`);
  const out: [string, string][] = [];
  for (const f of g) for (const b of g) out.push([f, b]);
  return out;
}
