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

### LaTeX rule — `\texttt{}` must never appear inside `$...$`

When writing a constant name inline with an equation, split the math:

```latex
% CORRECT
$k =$ \texttt{POL\_K} $= 1.100$

% WRONG — causes "'_' allowed only in math mode"
$k = \texttt{POL\_K} = 1.100$
```

A test in `docs-lint.spec.ts` enforces this automatically.
