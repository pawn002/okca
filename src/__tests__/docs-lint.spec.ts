/**
 * Documentation lint checks — catches structural errors in docs that are
 * easy to introduce during updates but hard to spot by eye.
 *
 * These run as part of the normal test suite so CI catches them.
 *
 * Scope: every `docs/*.md` file. Math in these docs is authored in LaTeX and
 * rendered by GitHub with KaTeX, so the checks below target the ways that
 * pipeline silently breaks.
 */
import * as fs from 'fs';
import * as path from 'path';

const DOCS_DIR = path.resolve(__dirname, '../../docs');

const MD_FILES = fs
  .readdirSync(DOCS_DIR)
  .filter((f) => f.endsWith('.md'))
  .sort();

/**
 * Blank out fenced code blocks. Math delimiters inside them are literal text,
 * not math, so none of the checks below should look at them.
 */
function maskCodeFences(lines: string[]): string[] {
  let inFence = false;
  return lines.map((line) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return '';
    }
    return inFence ? '' : line;
  });
}

/**
 * Check a list of lines for \texttt{*_*} inside $...$ math spans.
 * Returns violation strings (human-readable) for each offending line.
 *
 * The renderer treats _ as a subscript operator in math context, even inside
 * \texttt{}. The fix is always to split the math span:
 * $k =$ `FOO` $= v$.
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

/**
 * An odd number of unescaped `$` on a line means a math span is unclosed or
 * wraps onto the next line. GitHub does not render an inline span that spans a
 * newline, so both cases are bugs — reflow the span onto one line.
 */
function findUnbalancedDollars(lines: string[], filename: string): string[] {
  const violations: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const dollars = lines[i].match(/(?<!\\)\$/g);
    if (dollars && dollars.length % 2 !== 0) {
      violations.push(`${filename}:${i + 1}: ${lines[i].trim()}`);
    }
  }
  return violations;
}

/**
 * `\{` and `\}` inside math are consumed by the Markdown escape pass before
 * KaTeX sees them, so the braces silently turn into grouping rather than
 * literal set braces. `\lbrace` / `\rbrace` survive the round trip.
 */
function findEscapedBracesInMath(lines: string[], filename: string): string[] {
  const violations: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const mathSpans = lines[i].matchAll(/\$([^$]+)\$/g);
    for (const match of mathSpans) {
      if (/\\[{}]/.test(match[1])) {
        violations.push(`${filename}:${i + 1}: ${lines[i].trim()}`);
      }
    }
  }
  return violations;
}

describe('docs-lint', () => {
  it('finds markdown files to check', () => {
    expect(MD_FILES.length).toBeGreaterThan(0);
  });

  describe.each(MD_FILES)('%s', (filename) => {
    const lines = maskCodeFences(
      fs.readFileSync(path.join(DOCS_DIR, filename), 'utf8').split('\n'),
    );

    it('has no \\texttt{} containing underscores inside $...$ math', () => {
      expect(findTextttInMath(lines, filename)).toEqual([]);
    });

    it('has balanced $ math delimiters on every line', () => {
      expect(findUnbalancedDollars(lines, filename)).toEqual([]);
    });

    it('uses \\lbrace/\\rbrace rather than \\{ \\} inside math', () => {
      expect(findEscapedBracesInMath(lines, filename)).toEqual([]);
    });
  });
});
