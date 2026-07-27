/**
 * Marks dist/esm as ESM.
 *
 * The root package.json has no "type" field, so Node treats every .js file in
 * the package as CommonJS — including dist/esm/, which exports.import points at.
 * Dropping a package.json with {"type": "module"} into that directory scopes the
 * ESM declaration to it, leaving the CJS build in dist/ untouched.
 *
 * Without this, `import` from native Node ESM fails: on Node <22.7 with
 * "Cannot use import statement outside a module", and on newer Node with a
 * resolution error once syntax detection reparses the file.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const esmDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'esm');

mkdirSync(esmDir, { recursive: true });
writeFileSync(join(esmDir, 'package.json'), JSON.stringify({ type: 'module' }, null, 2) + '\n');

console.log('wrote dist/esm/package.json ({"type":"module"})');
