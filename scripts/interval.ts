/**
 * Minimal interval arithmetic for the FP=0 proof (issue #14, Option 2).
 *
 * Each Interval [lo, hi] encloses a real quantity. Every operation returns an
 * enclosure of the true result set, inflated outward by a conservative relative
 * + absolute margin to dominate IEEE-754 rounding and libm transcendental error
 * (assumed < REL relative per elementary op — true for standard Math.*).
 *
 * This makes the verifier a *computer-assisted* proof: if `final.hi <= wcag.lo`
 * on a box, OKCA <= WCAG holds for EVERY point in that box, not just samples.
 */

const REL = 1e-12; // outward inflation per op (>> the ~1e-16 IEEE rounding)
const ABS = 1e-15;

export interface Iv {
  lo: number;
  hi: number;
}

function wrap(lo: number, hi: number): Iv {
  if (lo > hi) [lo, hi] = [hi, lo];
  const dl = Math.abs(lo) * REL + ABS;
  const dh = Math.abs(hi) * REL + ABS;
  return { lo: lo - dl, hi: hi + dh };
}

export const K = (x: number): Iv => ({ lo: x, hi: x });
export const add = (a: Iv, b: Iv): Iv => wrap(a.lo + b.lo, a.hi + b.hi);
export const addK = (a: Iv, k: number): Iv => wrap(a.lo + k, a.hi + k);
export const sub = (a: Iv, b: Iv): Iv => wrap(a.lo - b.hi, a.hi - b.lo);
export const mulK = (a: Iv, k: number): Iv =>
  k >= 0 ? wrap(a.lo * k, a.hi * k) : wrap(a.hi * k, a.lo * k);

export function mul(a: Iv, b: Iv): Iv {
  const p = [a.lo * b.lo, a.lo * b.hi, a.hi * b.lo, a.hi * b.hi];
  return wrap(Math.min(...p), Math.max(...p));
}

/** a / b, requires b.lo > 0 (all denominators here are +flare, strictly positive). */
export function div(a: Iv, b: Iv): Iv {
  if (b.lo <= 0) throw new Error('div by interval spanning 0');
  const p = [a.lo / b.lo, a.lo / b.hi, a.hi / b.lo, a.hi / b.hi];
  return wrap(Math.min(...p), Math.max(...p));
}

export function square(a: Iv): Iv {
  if (a.lo >= 0) return wrap(a.lo * a.lo, a.hi * a.hi);
  if (a.hi <= 0) return wrap(a.hi * a.hi, a.lo * a.lo);
  return wrap(0, Math.max(a.lo * a.lo, a.hi * a.hi));
}

export const sqrt = (a: Iv): Iv => wrap(Math.sqrt(Math.max(0, a.lo)), Math.sqrt(Math.max(0, a.hi)));
export const cbrt = (a: Iv): Iv => wrap(Math.cbrt(a.lo), Math.cbrt(a.hi)); // increasing

/** x^p for x >= 0 interval, constant p >= 0 (increasing in x). */
export function powK(x: Iv, p: number): Iv {
  const lo = Math.max(0, x.lo);
  const hi = Math.max(0, x.hi);
  return wrap(Math.pow(lo, p), Math.pow(hi, p));
}

/** x^y for x in (0,1] interval, y >= 1 interval. Increasing in x, decreasing in y. */
export function powIv(x: Iv, y: Iv): Iv {
  const xl = Math.min(1, Math.max(0, x.lo));
  const xh = Math.min(1, Math.max(0, x.hi));
  return wrap(Math.pow(xl, y.hi), Math.pow(xh, y.lo));
}

export const imin = (a: Iv, k: number): Iv => wrap(Math.min(a.lo, k), Math.min(a.hi, k));
export const imax = (a: Iv, k: number): Iv => wrap(Math.max(a.lo, k), Math.max(a.hi, k));
export const clamp = (a: Iv, lo: number, hi: number): Iv => imin(imax(a, lo), hi);

/** Union enclosure (for indeterminate branches). */
export const union = (a: Iv, b: Iv): Iv => ({ lo: Math.min(a.lo, b.lo), hi: Math.max(a.hi, b.hi) });

// ── Colour transforms as interval functions of an sRGB channel/box ──────────

/** sRGB channel [0,1] -> linear. Piecewise; handles a box spanning the knee. */
export function linearize(c: Iv): Iv {
  const KNEE = 0.04045;
  const lin = (v: number) => v / 12.92;
  const pw = (v: number) => Math.pow((v + 0.055) / 1.055, 2.4);
  // both branches increasing & continuous at the knee
  const lo = c.lo <= KNEE ? lin(c.lo) : pw(c.lo);
  const hi = c.hi <= KNEE ? lin(c.hi) : pw(c.hi);
  return wrap(lo, hi);
}

export interface ColorIv {
  L: Iv;
  C: Iv;
  Y: Iv;
}

/** Full OKCA-relevant enclosures (OKLab L, chroma C, WCAG luminance Y) for an
 *  sRGB box [r]x[g]x[b]. Uses the exact Ottosson matrices from transforms.ts. */
export function colorIv(r: Iv, g: Iv, b: Iv): ColorIv {
  const rl = linearize(r);
  const gl = linearize(g);
  const bl = linearize(b);

  // linear sRGB -> LMS (M1)
  const l = add(add(mulK(rl, 0.4122214708), mulK(gl, 0.5363325363)), mulK(bl, 0.0514459929));
  const m = add(add(mulK(rl, 0.2119034982), mulK(gl, 0.6806995451)), mulK(bl, 0.1073969566));
  const s = add(add(mulK(rl, 0.0883024619), mulK(gl, 0.2817188376)), mulK(bl, 0.6299787005));

  const l_ = cbrt(l);
  const m_ = cbrt(m);
  const s_ = cbrt(s);

  // LMS^(1/3) -> Oklab (M2)
  const L = clamp(
    add(add(mulK(l_, 0.2104542553), mulK(m_, 0.793617785)), mulK(s_, -0.0040720468)),
    0,
    1,
  );
  const aa = add(add(mulK(l_, 1.9779984951), mulK(m_, -2.428592205)), mulK(s_, 0.4505937099));
  const bb = add(add(mulK(l_, 0.0259040371), mulK(m_, 0.7827717662)), mulK(s_, -0.808675766));
  const C = sqrt(add(square(aa), square(bb)));

  const Y = add(add(mulK(rl, 0.2126), mulK(gl, 0.7152)), mulK(bl, 0.0722));
  return { L, C, Y };
}
