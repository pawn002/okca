/**
 * Documentation lint checks — catches structural errors in docs that are
 * easy to introduce during updates but hard to spot by eye.
 *
 * These run as part of the normal test suite so CI catches them.
 */
import * as fs from 'fs';
import * as path from 'path';

const TEX_FILE = path.resolve(__dirname, '../../docs/OKCA_DESIGN.tex');
const MD_FILE  = path.resolve(__dirname, '../../docs/OKCA_DESIGN.md');

/**
 * Check a list of lines for \texttt{*_*} inside $...$ math spans.
 * Returns violation strings (human-readable) for each offending line.
 *
 * Applies to both .tex (LaTeX) and .md (GitHub KaTeX) files — both renderers
 * treat _ as a subscript operator in math context, even inside \texttt{}.
 * The fix is always to split the math span: $k =$ \texttt{FOO} $= v$.
 */
function findTextttInMath(lines: string[], filename: string): string[] {
  const violations: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const mathSpans = lines[i].matchAll(/\$([^$]+)\$/g);
    for (const match of mathSpans) {
      if (/\\texttt\{[^}]*_[^}]*\}/.test(match[1])) {
        violations.push(`${filename}:${i + 1}: ${lines[i].trim()}`);
      }
    }
  }
  return violations;
}

describe('docs-lint', () => {
  it('has no \\texttt{} containing underscores inside $...$ math (tex + md)', () => {
    const texLines = fs.readFileSync(TEX_FILE, 'utf8').split('\n');
    const mdLines  = fs.readFileSync(MD_FILE,  'utf8').split('\n');

    const violations = [
      ...findTextttInMath(texLines, 'OKCA_DESIGN.tex'),
      ...findTextttInMath(mdLines,  'OKCA_DESIGN.md'),
    ];

    expect(violations).toEqual([]);
  });
});
