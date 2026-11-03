/**
 * Scatter observer (#34, docs/SCATTER_FINDINGS.md). Experimental and opt-in:
 * a veil proportional to the background's luminance is added to both patches,
 * as intraocular scatter does in an ageing or clouded eye.
 */
import { contrast, OkcaService, hexToOklab } from '../index';

const SCATTER = { observer: 'scatter' as const };
const hx = (n: number) => n.toString(16).padStart(2, '0');
const grid: string[] = [];
for (let r = 0; r < 256; r += 51) for (let g = 0; g < 256; g += 51) for (let b = 0; b < 256; b += 51) grid.push(`#${hx(r)}${hx(g)}${hx(b)}`);

describe('scatter observer: pinned behaviour', () => {
  it.each([
    ['#ffffff', '#000000', 20.9], // black background: no veil
    ['#000000', '#ffffff', 5.2],  // white background veils black text
    ['#ffffff', '#767676', 3.5],
    ['#767676', '#ffffff', 2.6],
    ['#595959', '#ffffff', 3.3],
    ['#ffffff', '#595959', 5.2],
  ])('%s on %s → %d', (fg, bg, expected) => {
    expect(contrast(fg, bg, SCATTER)).toBe(expected);
  });

  it('is reachable through OkcaService', () => {
    expect(new OkcaService().contrast('#000000', '#ffffff', SCATTER)).toBe(5.2);
  });
});

describe('scatter observer: structure', () => {
  it('leaves the default observer unchanged', () => {
    for (const f of grid) for (const b of grid) expect(contrast(f, b, {})).toBe(contrast(f, b));
  });

  it('never scores above the default observer, so FP = 0 carries over', () => {
    for (const f of grid) for (const b of grid) expect(contrast(f, b, SCATTER)!).toBeLessThanOrEqual(contrast(f, b)!);
  });

  // Below 3.0 the veil is small and Step 4's induction can still favour
  // dark-on-light by 0.1; no pair at or above 3.0 does.
  it('scores light-on-dark at least as high as the reverse wherever either reaches 3.0', () => {
    for (const f of grid) for (const b of grid) {
      if (hexToOklab(f)![0] <= hexToOklab(b)![0]) continue; // f is the lighter colour
      const lod = contrast(f, b, SCATTER)!, dol = contrast(b, f, SCATTER)!;
      if (Math.max(lod, dol) < 3) continue;
      expect(lod).toBeGreaterThanOrEqual(dol);
    }
  });
});
