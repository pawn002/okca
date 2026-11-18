/**
 * #34: does intraocular scatter reverse OKCA's polarity direction?
 * Read-only; no algorithm change. Run: npm run scatter
 *
 * Light scattered inside the eye adds a veil over the whole retinal image. A
 * bright background is the main source, so the veil falls on dark text on a
 * light background, and barely at all on light text on a dark one.
 *
 * Veil size uses the age-adjusted Stiles–Holladay equation,
 *   L_veil / E_glare = s / θ²,  s = 10 (1 + (A/70)^4),  1° ≤ θ ≤ 30°,
 * integrated over a uniform background from θ1 to θ2 around the text:
 *   k = L_veil / L_bg = s · 2π (π/180)² · ln(θ2/θ1).
 * The veil k·Y_bg is added to both patches of the WCAG ratio, in WCAG's
 * relative-luminance units. A cataract eye is represented by s = 60, an
 * assumed value, not a fitted one.
 */
import { contrast } from '../src/index';

const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const Y = (h: string) => { const c = [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const kOf = (s: number, th1 = 1, th2 = 20) => s * 2 * Math.PI * (Math.PI / 180) ** 2 * Math.log(th2 / th1);
const sAge = (A: number) => 10 * (1 + (A / 70) ** 4);
const veiled = (fg: string, bg: string, k: number) => { const f = Y(fg), b = Y(bg), v = k * b; return (Math.max(f, b) + 0.05 + v) / (Math.min(f, b) + 0.05 + v); };
const pad = (x: string | number, n: number) => String(x).padStart(n);

const EYES: [string, number][] = [['age 25', sAge(25)], ['age 60', sAge(60)], ['age 80', sAge(80)], ['cataract', 60]];
console.log('=== 1. Veil as a fraction of background luminance ===');
console.log('  eye         s      k (1–20°)  k (1–10°)');
for (const [n, s] of EYES) console.log(`  ${n.padEnd(10)} ${pad(s.toFixed(1), 5)}  ${pad(kOf(s).toFixed(3), 9)}  ${pad(kOf(s, 1, 10).toFixed(3), 9)}`);

const PAIRS: [string, string][] = [['#ffffff', '#767676'], ['#ffffff', '#595959'], ['#ffffff', '#333333'], ['#cccccc', '#333333'], ['#ffffff', '#1a1a1a'], ['#ffffff', '#000000'], ['#ffff00', '#000080'], ['#ffffff', '#2563eb']];
console.log('\n=== 2. Light-on-dark / dark-on-light, veiled WCAG ratio (1–20°) and OKCA ===');
console.log('  pair                WCAG   ' + EYES.map(([n]) => pad(n, 13)).join('') + '         OKCA');
for (const [a, b] of PAIRS) {
  const cells = EYES.map(([, s]) => { const k = kOf(s); return pad(`${veiled(a, b, k).toFixed(2)}/${veiled(b, a, k).toFixed(2)}`, 13); }).join('');
  console.log(`  ${a} / ${b}  ${pad(veiled(a, b, 0).toFixed(2), 5)}  ${cells}  ${pad(`${contrast(a, b)}/${contrast(b, a)}`, 11)}`);
}
