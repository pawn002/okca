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

A typical algorithm change touches: constants (`CHROMA_K`, `OPP_K_D`,
`OPP_THETA_L`, `OPP_THETA_D`, `C_THRESH`, `POL_K`, `CAP`, `IND_Z`,
`IND_REF_L`, `FLARE`, `FLARE_K`), step descriptions, the FP=0 proof, achromatic
anchor values (white/black = 20.9 both ways, white/#767676 = 3.9 both ways),
the WCAG disagreement counts, and a chapter in `docs/HISTORY.md`. Probe test expectations
(`probe-curated.spec.ts`, `probe-design-systems.spec.ts`), the oracle
(`okca-oracle.spec.ts`), and the FP=0 verifier (`npm run fp0`, which must
still certify with 0 uncertified boxes) must also be updated/re-run.

## Current state vs history

The six docs above, and the CHANGELOG's Unreleased entry, describe OKCA **as it
is**. They carry no history: no "was", no "before #N", no superseded values, no
chains of past counts. Each constant gets one line on *why* it has its value,
not how it got there.

History has two homes:

- **`docs/HISTORY.md`** — the narrative: what was tried, kept and dropped, and
  why. When work settles, adopted or not, add its chapter there, and update
  "What's ahead".
- **Research records** (`docs/*_FINDINGS.md`, `CALIBRATION_EXPERIMENT.md`) —
  dated, not kept current. Each opens with one `Research record` status line
  naming its issue, date and outcome. Do not add "Applied" or "Superseded"
  notes to them; update the outcome clause if it changes.

When a change lands, update the current-state docs to the new state and write
the path in HISTORY.md, not in the docs.

## Math notation in `docs/`

All maths in `docs/*.md` is authored in LaTeX (`$...$` inline, `$$...$$`
display) and rendered by GitHub with KaTeX. Do not introduce ASCII or Unicode
formulas (`L³`, `δ = L³ − Y`, `21^(1−k)·A(white)`) — convert them.

Shared symbols, so the docs read as one notation: $L^3$, $\delta$, $Y$,
$Y_{\text{lighter}}$ / $Y_{\text{darker}}$ (OKCA proxies) vs $Y_l$ / $Y_d$
(WCAG luminances), $r_{\text{raw}}$, $\text{CAP}$, $k$, $A(l)$, $B(d)$.

### Scope — `docs/` only, deliberately

`README.md` and `src/index.ts` are **excluded on purpose**. Both contain
algorithm descriptions and both look like unfinished conversions. They are not.

- **`README.md` must stay free of `$` math.** It is the npm package page, and
  **npmjs.com does not render GitHub's math syntax** — LaTeX there prints as
  literal `$...$` to every visitor. Use Unicode (`≤`, `≥`) or backticked code,
  which render correctly on both npm and GitHub.
- **`src/index.ts` is a source comment**, not Markdown. ASCII (`sqrt(a² + b²)`,
  `L³`) is right there; nothing renders it.

So the notation rule is scoped to `docs/*.md`, and `docs-lint.spec.ts` globs
exactly that. Widening either the rule or the lint glob breaks the npm listing.

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
   survive, so use `\quad`, `\lbrace`, `\rbrace`. Avoid `\thinspace`: GitHub renders
   it, but not every Markdown math viewer does, and juxtaposition reads fine. For `\\` row
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
