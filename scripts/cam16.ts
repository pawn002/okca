/**
 * CAM16 forward model (Li et al. 2017, "Comprehensive color solutions: CAM16,
 * CAT16, and CAM16-UCS", Color Res Appl 42:703–718), reimplemented from the
 * published equations, plus sRGB helpers. Shared by the CAM16 scripts.
 * Validated against colorjs.io's cam16-jmh in scripts/cam16-survey.ts.
 * OKCA_CAM=ciecam16 switches to CIECAM16 (CIE 248:2022), which differs only
 * in the stimulus response compression at very low and very high signals.
 * Yb is clamped at 1 (n = 0.01): the induction factors diverge as Yb -> 0.
 */
export type V3 = [number, number, number];

export const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
export const hx = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
export const grey = (v: number) => '#' + hx(v).repeat(3);
export function xyz(hex: string): V3 { // D65, Y in 0..100
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  return [
    100 * (0.4124564 * r + 0.3575761 * g + 0.1804375 * b),
    100 * (0.2126729 * r + 0.7151522 * g + 0.0721750 * b),
    100 * (0.0193339 * r + 0.1191920 * g + 0.9503041 * b),
  ];
}
export const Ywcag = (hex: string) => xyz(hex)[1] / 100;

// ── CAM16 (Li et al. 2017) ────────────────────────────────────────────────────
const M16 = [[0.401288, 0.650173, -0.051461], [-0.250268, 1.204414, 0.045854], [-0.002079, 0.048952, 0.953127]];
const mul = (m: number[][], v: V3) => m.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]) as V3;
const SURROUND = { average: [1.0, 0.69, 1.0], dim: [0.9, 0.59, 0.9], dark: [0.8, 0.525, 0.8] } as const;
export type Surround = keyof typeof SURROUND;
export interface Env { LA: number; Yb: number; surround: Surround }
/** 'cam16' = Li et al. 2017; 'ciecam16' = CIE 248:2022. Select with OKCA_CAM=ciecam16. */
export const MODEL: 'cam16' | 'ciecam16' = process.env.OKCA_CAM === 'ciecam16' ? 'ciecam16' : 'cam16';
export const DEFAULT: Env = { LA: (64 / Math.PI) * 0.2, Yb: 20, surround: 'average' }; // colorjs.io's default

function prep(env: Env) {
  const W: V3 = [95.047, 100, 108.883];
  const [F, c, Nc] = SURROUND[env.surround];
  const k = 1 / (5 * env.LA + 1), k4 = k ** 4;
  const FL = k4 * env.LA + 0.1 * (1 - k4) ** 2 * Math.cbrt(5 * env.LA);
  const n = Math.max(env.Yb, 1) / 100, z = 1.48 + Math.sqrt(n), Nbb = 0.725 * n ** -0.2;
  const D = Math.min(1, Math.max(0, F * (1 - (1 / 3.6) * Math.exp((-env.LA - 42) / 92))));
  const rgbW = mul(M16, W), Drgb = rgbW.map((v) => D * (100 / v) + 1 - D);
  const mm = (v: number) => { const x = (FL * Math.abs(v) / 100) ** 0.42; return Math.sign(v) * 400 * x / (x + 27.13); };
  // CIECAM16 (CIE 248:2022) replaces the stimulus compression with linear
  // extensions below q_L = 0.26 and above q_U = 150; the white keeps the
  // original curve. Per the colour-science reference implementation.
  const qL = 0.26, qU = 150, fqL = mm(qL), fqU = mm(qU);
  const dfqU = (1.68 * 27.13 * FL * (FL * qU / 100) ** -0.58) / (27.13 + (FL * qU / 100) ** 0.42) ** 2;
  const post = MODEL === 'cam16' ? mm
    : (v: number) => (v < qL ? (fqL * v) / qL : v > qU ? fqU + dfqU * (v - qU) : mm(v));
  const aW = rgbW.map((v, i) => mm(v * Drgb[i]));
  const Aw = (2 * aW[0] + aW[1] + 0.05 * aW[2]) * Nbb;
  return { c, Nc, FL, n, z, Nbb, Drgb, post, Aw };
}

export function cam16(X: V3, env: Env) {
  const p = prep(env);
  const [R, G, B] = mul(M16, X).map((v, i) => p.post(v * p.Drgb[i]));
  const a = R - (12 * G) / 11 + B / 11, b = (R + G - 2 * B) / 9;
  const h = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  const A = (2 * R + G + 0.05 * B) * p.Nbb;
  const J = A <= 0 ? 0 : 100 * (A / p.Aw) ** (p.c * p.z);
  const et = 0.25 * (Math.cos((h * Math.PI) / 180 + 2) + 3.8);
  const t = ((50000 / 13) * p.Nc * p.Nbb * et * Math.hypot(a, b)) / (R + G + (21 / 20) * B + 0.305); // spec's +0.1 per channel, dropped from post()
  const C = t ** 0.9 * Math.sqrt(J / 100) * (1.64 - 0.29 ** p.n) ** 0.73;
  const M = C * p.FL ** 0.25;
  const Q = (4 / p.c) * Math.sqrt(J / 100) * (p.Aw + 4) * p.FL ** 0.25;
  const Jp = (1.7 * J) / (1 + 0.007 * J); // CAM16-UCS lightness
  return { J, C, M, h, Q, Jp };
}

export const bgEnv = (bgHex: string): Env => ({ ...DEFAULT, Yb: 100 * Ywcag(bgHex) });
