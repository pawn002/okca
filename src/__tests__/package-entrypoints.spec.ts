/**
 * Guards the published entry points (issue #19).
 *
 * The suite elsewhere imports `src/` directly, so it never exercises what
 * consumers actually load. That gap let a broken ESM build ship for three
 * releases: `dist/esm/` emitted extensionless relative specifiers, and nothing
 * marked the directory as ESM, so `import` from native Node ESM failed.
 *
 * These tests run against built output, spawning a real node process so
 * resolution is Node's, not jest's. CI builds before testing and runs the
 * matrix on Node 18/20/22, which is where the version-dependent failure modes
 * would surface.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const DIST = path.join(ROOT, 'dist');
const ESM_DIR = path.join(DIST, 'esm');

const built = fs.existsSync(path.join(ESM_DIR, 'index.js'));

// Local `npm test` on a fresh clone has no dist/ yet; CI always builds first.
const describeBuilt = built ? describe : describe.skip;

if (!built) {
  console.warn('[package-entrypoints] dist/ not built — skipping. Run `npm run build` first.');
}

/** Run a snippet in a real node process and return its stdout. */
function node(source: string, ext: 'mjs' | 'cjs'): string {
  const file = path.join(DIST, `__entrypoint-check.${ext}`);
  fs.writeFileSync(file, source);
  try {
    return execFileSync(process.execPath, [file], { encoding: 'utf8' }).trim();
  } finally {
    fs.unlinkSync(file);
  }
}

const toUrl = (p: string) => 'file:///' + p.replace(/\\/g, '/');

describeBuilt('published entry points', () => {
  describe('dist/esm (the "import" condition)', () => {
    it('is marked as ESM by its own package.json', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ESM_DIR, 'package.json'), 'utf8'));
      expect(pkg.type).toBe('module');
    });

    it('emits no extensionless relative specifiers', () => {
      const offenders: string[] = [];
      for (const f of fs.readdirSync(ESM_DIR).filter((f) => f.endsWith('.js'))) {
        const src = fs.readFileSync(path.join(ESM_DIR, f), 'utf8');
        for (const m of src.matchAll(/from\s+'(\.[^']*)'/g)) {
          if (!m[1].endsWith('.js')) offenders.push(`${f}: ${m[1]}`);
        }
      }
      expect(offenders).toEqual([]);
    });

    it('loads under native node ESM and computes correctly', () => {
      const out = node(
        `import { contrast, OkcaService } from ${JSON.stringify(toUrl(path.join(ESM_DIR, 'index.js')))};\n` +
          `console.log(JSON.stringify([contrast('#ffffff','#000000'), new OkcaService().contrast('#000000','#ffffff')]));`,
        'mjs',
      );
      expect(JSON.parse(out)).toEqual([20.9, 20]);
    });
  });

  describe('dist (the "require" condition)', () => {
    it('loads under CJS and computes correctly', () => {
      const out = node(
        `const { contrast, OkcaService } = require(${JSON.stringify(path.join(DIST, 'index.js'))});\n` +
          `console.log(JSON.stringify([contrast('#ffffff','#000000'), new OkcaService().contrast('#000000','#ffffff')]));`,
        'cjs',
      );
      expect(JSON.parse(out)).toEqual([20.9, 20]);
    });
  });

  it('every path in the exports map exists', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const targets = [
      ...Object.values(pkg.exports['.'] as Record<string, string>),
      pkg.main,
      pkg.module,
      pkg.types,
    ];
    const missing = targets.filter((t) => !fs.existsSync(path.join(ROOT, t)));
    expect(missing).toEqual([]);
  });
});
