# Induction Reference — Exploration Findings

Research notes for [#29](https://github.com/pawn002/okca/issues/29). This is
*analysis*: nothing here is in `src/`.

Reproduce:

```
npm run induction-ref     # scripts/induction-reference.ts
```

---

## 1. The question

Step 4's background induction switches on below a reference background:

$$
s = \min\left(1, \thinspace \frac{1.48 + L_{\text{bg}}^{1.5}}{1.48 + L_{\text{ref}}^{1.5}}\right)
$$

The reference is OKLab $L$ of `#767676`, the background of the white/`#767676`
anchor. It was chosen to keep that anchor exact, not taken from CAM16. In CAM16
the background effect continues up to white, and light-grey backgrounds are
mildly lenient too ([`CAM16_FINDINGS.md`](CAM16_FINDINGS.md) §3). This
explores references from `#767676` up to white, on the full 3.0 algorithm. The
script reimplements it with $L_{\text{ref}}$ and `POL_K` as parameters, and
reproduces the live `contrast()` exactly at the current values.

---

## 2. Results

**Anchors and calibration pairs (`POL_K` = 1.1):**

| Pair | ref `#767676` | `#999999` | `#bbbbbb` | `#dddddd` | white |
|---|---:|---:|---:|---:|---:|
| `#ffffff` on `#000000` | 20.9 | 20.9 | 20.9 | 20.9 | 20.9 |
| `#ffffff` on `#767676` | 3.9 | 3.5 | 3.2 | 2.9 | 2.7 |
| `#767676` on `#ffffff` | 3.7 | 3.7 | 3.7 | 3.7 | 3.7 |
| `#ff69b4` on `#1a1a1a` | 3.0 | 2.7 | 2.4 | 2.2 | 2.0 |
| `#ffffff` on `#595959` | 5.7 | 5.0 | 4.5 | 4.1 | 3.7 |
| `#333333` on `#cccccc` | 6.7 | 6.7 | 6.7 | 6.5 | 5.9 |
| `#595959` on `#e6e6e6` | 4.7 | 4.7 | 4.7 | 4.7 | 4.3 |

**CAM16 threshold parity.** Background-aware CAM16-UCS gap $\Delta J'$ of the
grey that first scores 4.5. A dash means no grey reaches 4.5 on that
background.

| Background | ref `#767676` | `#999999` | `#bbbbbb` | `#dddddd` | white |
|---|---:|---:|---:|---:|---:|
| `#1a1a1a` | 53.3 | 54.9 | 57.1 | 59.6 | 62.2 |
| `#333333` | 50.6 | 53.6 | 56.6 | 59.4 | 62.2 |
| `#555555` | 50.4 | 53.6 | 56.6 | — | — |
| `#999999` | 58.4 | 58.4 | 58.4 | 58.4 | 58.4 |
| `#c8c8c8` | 53.6 | 53.6 | 53.6 | 55.3 | 57.7 |
| `#e6e6e6` | 58.5 | 58.5 | 58.5 | 58.5 | 60.6 |
| `#ffffff` | 63.4 | 63.4 | 63.4 | 63.4 | 63.4 |
| **Spread** | 13.0 | 10.3 | 10.3 | 9.1 | **6.6** |

**Cost, against the current reference.** Counts are on a 262,144-pair grid;
disagreements use the design-system battery.

| Reference | Disagreements | Above WCAG | Lowered | AA lost | AAA lost |
|---|---:|---:|---:|---:|---:|
| `#767676` | 109 | 0 | — | — | — |
| `#999999` | 127 | 0 | 60,562 | 1,523 | 436 |
| `#bbbbbb` | 151 | 0 | 84,274 | 2,708 | 712 |
| `#dddddd` | 167 | 0 | 116,400 | 4,180 | 1,050 |
| white | 182 | 0 | 131,760 | 5,971 | 1,592 |

**Re-deriving `POL_K` to hold white on `#767676` at 3.9:**

| Reference | `POL_K` | `#767676` on white | Grid pairs above WCAG |
|---|---:|---:|---:|
| `#767676` | 1.096 | 3.7 | 0 |
| `#999999` | 1.034 | 4.1 | 0 |
| `#bbbbbb` | 0.984 | 4.2 | 3 |
| `#dddddd` | 0.942 | 4.2 | 4 |
| white | 0.906 | 4.2 | 4 |

---

## 3. Readings

1. **A white reference is the CAM16-faithful choice, and it works for
   parity.** The spread of the lightness gap at the AA line halves, from 13.0
   to 6.6, and the light side evens out as well as the dark side.
2. **It is very strict in practice.** With the reference at `#dddddd` or
   above, no grey passes AA on `#555555` at all. White on `#595959` (WCAG 7.0)
   drops to 3.7, and hot pink to 2.0. WCAG disagreements rise from 109 to 182.
3. **FP=0 holds at every reference while `POL_K` is unchanged.** Induction only
   raises the darker proxy, whatever the reference.
4. **The anchor cannot be restored cleanly.** The two polarity anchors sit on
   opposite sides of any reference above `#767676`: the light-on-dark anchor's
   background is induced, the dark-on-light anchor's (white) is not. One shared
   `POL_K` cannot hold both.
   - At references of `#bbbbbb` and above, `POL_K` falls below 1 and a few
     pairs score above WCAG. That breaks the core promise.
   - At `#999999`, `POL_K` stays above 1 and FP=0 holds, but `#767676` on white
     rises to 4.1, above the light-on-dark 3.9. That flips OKCA's polarity
     ordering. (The reading literature noted in
     [`MIDTONE_SURVEY_FINDINGS.md`](MIDTONE_SURVEY_FINDINGS.md) §6 favours dark
     text on light, so that flip is not obviously wrong, but it is a separate
     decision.)
5. **Intermediate references buy little.** `#999999` and `#bbbbbb` improve only
   the dark side; the light-side spread stays at 10.3, because the gap there
   comes from backgrounds above the reference.

## 4. Conclusion

Keep `#767676`. Moving the reference trades the editorial anchor for CAM16
parity. Every option that holds the anchor either breaks FP=0 or flips the
polarity ordering. Every option that keeps `POL_K` costs thousands of AA
verdicts, and leaves mid-dark backgrounds unable to host AA grey text.

If revisited, it belongs with the polarity question (`LOD_CAP` above
`DOL_CAP`), since the two cannot be separated: a white reference forces a
choice about which polarity anchor gives way.
