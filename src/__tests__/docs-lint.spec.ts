/**
 * Documentation lint checks — catches structural errors in docs that are
 * easy to introduce during updates but hard to spot by eye.
 *
 * These run as part of the normal test suite so CI catches them.
 *
 * Scope: every `docs/*.md` file. Math in these docs is authored in LaTeX and
 * rendered by GitHub, which runs its Markdown pass BEFORE handing the result
 * to KaTeX. That two-stage pipeline is what the checks below target: Markdown
 * silently rewrites the TeX, and the damage is only visible on github.com.
 *
 * The rules were established empirically by rendering probe documents through
 * GitHub's own markdown API and parsing what came back with KaTeX.
 */
import * as fs from 'fs';
import * as path from 'path';

const DOCS_DIR = path.resolve(__dirname, '../../docs');

const MD_FILES = fs
  .readdirSync(DOCS_DIR)
  .filter((f) => f.endsWith('.md'))
  .sort();

interface Line {
  n: number;
  text: string;
  /** Inside a multi-line `$$` block, which Markdown passes through literally. */
  literalMath: boolean;
}

/**
 * Blank out fenced code blocks and mark multi-line `$$` blocks.
 *
 * A `$$...$$` block written across several lines is handed to KaTeX verbatim,
 * so it is exempt from the escape rules below. A single-line `$$...$$` is NOT
 * — Markdown processes it like any other inline content.
 */
function scan(src: string): Line[] {
  const out: Line[] = [];
  let inFence = false;
  let inBlockMath = false;

  src.split('\n').forEach((text, i) => {
    const n = i + 1;
    if (/^\s*```/.test(text)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;

    const delims = (text.match(/\$\$/g) || []).length;
    if (inBlockMath) {
      out.push({ n, text, literalMath: true });
      if (delims >= 1) inBlockMath = false;
      return;
    }
    if (delims === 1) {
      inBlockMath = true;
      out.push({ n, text, literalMath: true });
      return;
    }
    out.push({ n, text, literalMath: false });
  });

  return out;
}

const mathSpans = (text: string) => [...text.matchAll(/\$\$?([^$]+)\$\$?/g)].map((m) => m[1]);

/**
 * \texttt{} containing an underscore inside math. The renderer treats _ as a
 * subscript operator even inside \texttt{}. Split the span instead:
 * $k =$ `POL_K` $= 1.100$.
 */
function findTextttInMath(lines: Line[]): string[] {
  const bad: string[] = [];
  for (const line of lines) {
    for (const span of mathSpans(line.text)) {
      if (/\\texttt\{[^}]*_[^}]*\}/.test(span)) bad.push(`${line.n}: ${line.text.trim()}`);
    }
  }
  return bad;
}

/**
 * An odd number of unescaped `$` means a span is unclosed or wraps onto the
 * next line. GitHub will not render an inline span that spans a newline.
 */
function findUnbalancedDollars(lines: Line[]): string[] {
  return lines
    .filter((l) => !l.literalMath)
    .filter((l) => {
      const d = l.text.match(/(?<!\\)\$/g);
      return d && d.length % 2 !== 0;
    })
    .map((l) => `${l.n}: ${l.text.trim()}`);
}

/**
 * Backslash-escaped punctuation inside a single-line math span. Markdown eats
 * the backslash before KaTeX sees it, so `\_`->`_` and `\%`->`%` become parse
 * errors, while `\,`->`,` `\;`->`;` `\\`->`\` silently render the wrong glyph.
 *
 * Use letter-named commands, which survive: \thinspace, \quad, \lbrace,
 * \rbrace. For `\\` row breaks, write the `$$` block across multiple lines.
 */
function findMarkdownEatenEscapes(lines: Line[]): string[] {
  const bad: string[] = [];
  for (const line of lines) {
    if (line.literalMath) continue;
    for (const span of mathSpans(line.text)) {
      const hits = span.match(/\\\\|\\[_,;%{}]/g);
      if (hits) {
        bad.push(`${line.n}: uses ${[...new Set(hits)].join(' ')} :: ${line.text.trim()}`);
      }
    }
  }
  return bad;
}

/**
 * A `$` delimiter directly against `"`, `-`, `/` or a single `*` stops GitHub
 * recognising the span as math at all — it renders as literal `$...$` text.
 * (Bold `**` is fine.) Put a space in, or reword.
 */
function findBadDelimiterAdjacency(lines: Line[]): string[] {
  const bad: string[] = [];
  for (const line of lines) {
    if (line.literalMath) continue;
    for (const m of line.text.matchAll(/(.)?\$[^$\n]+\$(.)?/g)) {
      const [, before, after] = m;
      const offenders: string[] = [];
      // A single `*` breaks it; `**` (bold) does not.
      const isSingleStar = (ch: string, side: 'before' | 'after') => {
        if (ch !== '*') return false;
        const i = m.index! + (side === 'before' ? 0 : m[0].length - 1);
        const neighbour = side === 'before' ? line.text[i - 1] : line.text[i + 1];
        return neighbour !== '*';
      };
      if (before && (/["\-/]/.test(before) || isSingleStar(before, 'before'))) {
        offenders.push(`before='${before}'`);
      }
      if (after && (/["\-/]/.test(after) || isSingleStar(after, 'after'))) {
        offenders.push(`after='${after}'`);
      }
      if (offenders.length) bad.push(`${line.n}: ${offenders.join(' ')} :: ${line.text.trim()}`);
    }
  }
  return bad;
}

describe('docs-lint', () => {
  it('finds markdown files to check', () => {
    expect(MD_FILES.length).toBeGreaterThan(0);
  });

  describe.each(MD_FILES)('%s', (filename) => {
    const lines = scan(fs.readFileSync(path.join(DOCS_DIR, filename), 'utf8'));

    it('has no \\texttt{} containing underscores inside math', () => {
      expect(findTextttInMath(lines)).toEqual([]);
    });

    it('has balanced $ math delimiters on every line', () => {
      expect(findUnbalancedDollars(lines)).toEqual([]);
    });

    it('has no backslash-escaped punctuation inside single-line math', () => {
      expect(findMarkdownEatenEscapes(lines)).toEqual([]);
    });

    it('has no $ delimiter jammed against " - / or a single *', () => {
      expect(findBadDelimiterAdjacency(lines)).toEqual([]);
    });
  });
});
