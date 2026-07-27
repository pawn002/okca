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

### The one thing to understand

GitHub runs its **Markdown pass first**, then hands the result to KaTeX. So
Markdown rewrites your TeX before the renderer ever sees it. Every rule below
follows from that, and none of it is visible locally — only on github.com.

**A multi-line `$$` block is passed through literally and is exempt.** A
single-line `$$...$$` is not: it is processed like any other inline content.

Rules `docs-lint.spec.ts` enforces across every `docs/*.md`:

1. **No backslash-escaped punctuation inside single-line math.** Markdown eats
   the backslash. `\_`→`_` and `\%`→`%` become hard KaTeX parse errors; `\,`→`,`
   `\;`→`;` `\\`→`\` silently render the wrong glyph. Letter-named commands
   survive, so use `\thinspace`, `\quad`, `\lbrace`, `\rbrace`. For `\\` row
   breaks, write the `$$` block across multiple lines.
2. **Never put a constant name inside math.** `\texttt{POL\_K}` and
   `\text{POL\_K}` both break — the escaped underscore does not survive. Split
   the span: `` $k =$ `POL_K` $= 1.100$ ``. If the constant is a quantity in an
   equation, give it a symbol (`$c$` for the L-o-D cap in `FP0_PROOF.md`) or
   inline its value.
3. **No `$` jammed against `"`, `-`, `/`, or a single `*`.** GitHub then fails
   to recognise the span at all and prints literal `$...$`. Add a space or
   reword. Bold `**` is fine.
4. **Balanced `$` on every line.** An inline span may not wrap onto the next
   line — GitHub will not render it. Reflow it.
5. Code stays code: constant identifiers, function names, CLI commands, and hex
   colours belong in backticks, not math.

Headings stay plain text — math in a heading mangles its anchor.

**Verifying a change.** The lint catches the known traps, but it is not a
renderer. To check real output, POST the file to GitHub's markdown API and parse
what comes back:

```sh
gh api -X POST markdown -f mode=gfm -f text="$(cat docs/FP0_PROOF.md)"
```

Math arrives as `<math-renderer>` elements holding the post-Markdown TeX — that
string, not your source, is what KaTeX receives. A span missing from the output
entirely was not recognised as math (rule 3).
