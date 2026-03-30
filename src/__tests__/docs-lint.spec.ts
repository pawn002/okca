/**
 * Documentation lint checks — catches structural errors in docs that are
 * easy to introduce during updates but hard to spot by eye.
 *
 * These run as part of the normal test suite so CI catches them.
 */
import * as fs from 'fs';
import * as path from 'path';

const TEX_FILE = path.resolve(__dirname, '../../docs/OKCA_DESIGN.tex');

describe('docs-lint', () => {
  describe('OKCA_DESIGN.tex', () => {
    let lines: string[];

    beforeAll(() => {
      lines = fs.readFileSync(TEX_FILE, 'utf8').split('\n');
    });

    /**
     * \texttt{} inside $...$ causes "'_' allowed only in math mode" because
     * LaTeX treats _ as a subscript operator in math context even inside
     * \texttt{}. The fix is to break the math span: $k =$ \texttt{FOO} $= v$.
     *
     * This catches the pattern on a single line (the recurrent failure mode).
     * Multi-line occurrences are rare enough that a comment in CLAUDE.md
     * suffices for those.
     */
    it('has no \\texttt{} containing underscores inside $...$ math', () => {
      const violations: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Find every $...$ span on the line and check for \texttt{*_*} inside
        const mathSpans = line.matchAll(/\$([^$]+)\$/g);
        for (const match of mathSpans) {
          if (/\\texttt\{[^}]*_[^}]*\}/.test(match[1])) {
            violations.push(`line ${i + 1}: ${line.trim()}`);
          }
        }
      }

      expect(violations).toEqual([]);
    });
  });
});
