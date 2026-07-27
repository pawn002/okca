# OKCA — Developer Notes

## Documentation checklist

Algorithm changes require updating **all six** of the following. They
duplicate content intentionally (different audiences/formats) and must
be kept in sync:

| File | Audience |
|------|----------|
| `src/index.ts` | Algorithm doc-comment at top of file |
| `README.md` | Public API consumers |
| `docs/OKCA_DESIGN.md` | Contributors / architectural reference |
| `docs/WCAG_DISAGREEMENTS.md` | Counts and calibration reference |
| `docs/OKCA_EXECUTIVE_BRIEF.md` | Non-technical stakeholders / decision-makers |
| `docs/FP0_PROOF.md` | FP=0 proof (identity + interval-verified lemmas) |

A typical algorithm change touches: constants (`C_THRESH`, `CHROMA_K`,
`POL_K`, `LOD_CAP`, `DOL_CAP`), step descriptions, the FP=0 proof,
achromatic anchor values (white/black = 20.9/20.0, white/#767676 = 3.9/3.7),
and the WCAG disagreement counts. Probe test expectations
(`probe-curated.spec.ts`, `probe-design-systems.spec.ts`), the oracle
(`okca-oracle.spec.ts`), and the FP=0 verifier (`npm run fp0`, which must
still certify with 0 uncertified boxes) must also be updated/re-run.

## Math notation in `docs/`

All maths in `docs/*.md` is authored in LaTeX (`$...$` inline, `$$...$$`
display) and rendered by GitHub with KaTeX. Do not introduce ASCII or Unicode
formulas (`L³`, `δ = L³ − Y`, `21^(1−k)·A(white)`) — convert them.

Shared symbols, so the docs read as one notation: $L^3$, $\delta$, $Y$,
$Y_{\text{lighter}}$ / $Y_{\text{darker}}$ (OKCA proxies) vs $Y_l$ / $Y_d$
(WCAG luminances), $r_{\text{raw}}$, $\text{CAP}$, $k$, $A(l)$, $B(d)$.

Four rules the `docs-lint.spec.ts` suite enforces across every `docs/*.md`:

1. **`\texttt{}` must never appear inside `$...$`.** The renderer treats `_` as
   a subscript operator even inside `\texttt{}`. Split the span instead:

   ```latex
   $k =$ `POL_K` $= 1.100$      % CORRECT
   $k = \texttt{POL\_K} = 1.1$  % WRONG — "'_' allowed only in math mode"
   ```

2. **Balanced `$` on every line.** An inline span may not wrap onto the next
   line — GitHub will not render it. Reflow it onto one line.
3. **Use `\lbrace` / `\rbrace`, never `\{` / `\}`.** Markdown consumes the
   backslash-escape before KaTeX sees it, silently turning literal set braces
   into grouping.
4. Code stays code: constant identifiers, function names, CLI commands, and hex
   colours belong in backticks, not math. The exception is a constant appearing
   as a quantity inside an equation, where `\text{LOD\_CAP}` (`\text`, escaped
   underscore) is used.

Headings stay plain text — math in a heading mangles its anchor.
