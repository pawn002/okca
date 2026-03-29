# OKCA — Developer Notes

## Documentation checklist

Algorithm changes require updating **all five** of the following. They
duplicate content intentionally (different audiences/formats) and must
be kept in sync:

| File | Audience |
|------|----------|
| `src/index.ts` | Algorithm doc-comment at top of file |
| `README.md` | Public API consumers |
| `docs/OKCA_DESIGN.md` | Contributors / architectural reference |
| `docs/OKCA_DESIGN.tex` | LaTeX source (mirrors the Markdown design doc) |
| `docs/WCAG_DISAGREEMENTS.md` | Counts and calibration reference |

A typical algorithm change touches: constants, step descriptions, FP=0
proof, achromatic anchor values, and the WCAG disagreement counts.
Probe test expectations (`probe-curated.spec.ts`,
`probe-design-systems.spec.ts`) and the oracle
(`okca-oracle.spec.ts`) must also be updated.
