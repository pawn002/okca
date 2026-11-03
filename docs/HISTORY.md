# OKCA — History

How OKCA got to where it is, and where it is going next. The other documents
describe the algorithm as it stands. This one keeps the path: what was tried,
what was kept, what was dropped, and why.

Every chapter links the issue that tracked the work. From 3.0 on, each line of
research also has its own git branch, combined into the release by explicit
merges, so the record can be read in the repository's history as well as here.

---

## 0.x: an OKLCH-native contrast ratio (March 2026)

OKCA started from one question: can a contrast ratio be computed in a modern
perceptual colour space, OKLCH, while never approving a pair that WCAG 2.x
rejects?

The first release replaced WCAG's luminance with lightness from Oklab, and
penalised saturated light colours. WCAG scores hot pink on near-black as a
comfortable AA pass (6.6), though designers routinely judge it inadequate. It
also carried a green-hue correction: a patch for one region of the hue circle where the two
models disagreed.

## 1.0: polarity, and the end of hue patches (April 2026)

- **Polarity** ([#8](https://github.com/pawn002/okca/issues/8)). The premise
  at the time was that light text on a dark background carries more contrast
  than the reverse, so OKCA gave the two directions different caps:
  light-on-dark 21, dark-on-light 20. `contrast(fg, bg)` and
  `contrast(bg, fg)` could now differ. That premise was reversed in 3.0 (below).
- **No more hue patches.** The green correction was removed. OKCA became a pure
  Oklab model with no hue-specific code. That principle held through every
  later change.
- **Oklab and OKLCH inputs** ([#10](https://github.com/pawn002/okca/issues/10)),
  so colours did not have to round-trip through hex.

A font-size table, mapping contrast to minimum text size the way WCAG's normal
and large text do, was considered and not pursued
([#11](https://github.com/pawn002/okca/issues/11)).

## 2.0: the guarantee becomes a proof (July 2026)

Through 1.x, "zero false passes" was proven only for greys. For colours it was
checked by sampling, which is evidence, not proof
([#14](https://github.com/pawn002/okca/issues/14)).

2.0 recalibrated the algorithm so the guarantee could be proven for every sRGB
colour pair. The proof combines an exact algebraic identity with two
single-colour bounds checked by interval arithmetic, a method that leaves no
gaps between sample points. The light-on-dark cap dropped from 21 to 20.9, so
OKCA always sits strictly below WCAG rather than touching it. A test in CI now
checks the bound on every push
([#15](https://github.com/pawn002/okca/issues/15)).

## 2.0.3: retracting a claim (August 2026)

The docs had said white on `#767676`, WCAG's own boundary pair, "is not
production-ready in most real designs." A threshold experiment
([#22](https://github.com/pawn002/okca/issues/22)) tested that. The contrast at
which the same observer judged body text shippable was 5.2 at one screen
brightness and 2.8 at another, in the same room and session. OKCA scores the
pair 3.9, between the two, so the verdict on it flips with ordinary viewing
conditions.

The claim was withdrawn and replaced with the one the measurement supports: a
pair sitting on the AA line has no margin against the conditions it will be
read in. That argues for a floor above the line, on grounds of variance rather
than appearance. OKCA's docs now state plainly that it does not model viewing
conditions.

---

## 3.0: the dark-background research (October–November 2026)

3.0 began with a complaint: mid-tone text on near-black backgrounds scored too
generously, compared with other modern contrast methods. Following that
complaint led through six changes, several dead ends, and three reversals of
earlier decisions. The comparison methods that prompted it were never used as a
target, so OKCA's calibration stays independent of them.

### Looking for the problem ([#25](https://github.com/pawn002/okca/issues/25))

A survey scored pairs on dark backgrounds four ways: colour difference
(CIEDE2000), lightness difference, colour-vision-deficiency simulation, and
WCAG's ratio with a brighter room.

- **Dead end:** colour difference and colour-vision simulation did not flag
  these pairs. By those measures, the near-black results looked fine.
- **What did flag them:** light. WCAG's ratio already includes a small allowance
  for stray light on the screen. Double it, as a brighter room would, and a grey
  that just passed AA on black keeps only 3.1, against 4.5 on white. On a
  near-black background almost all of a pair's ratio rests on the background
  being nearly zero, and stray light erodes that first.

**Adopted: the flare ceiling.** Each score is capped at what the pair keeps
under doubled stray light.

This step was challenged as bolted on: a physical correction sitting beside an
OKLCH-based algorithm. It stayed because its basis is WCAG's own. The 0.05 in
the WCAG ratio is a flare term, traceable to the sRGB standard's viewing
conditions (Stokes et al., 1996). The ceiling asks how much of a pair's contrast
survives if that allowance doubles. It never raises a score, so it sits outside
the proof.

### Background as an input ([#26](https://github.com/pawn002/okca/issues/26))

Oklab assumes one fixed viewing situation. CAM16, the colour appearance model
behind the CIE's current standard, takes the background as an input. The
question was which of CAM16's inputs matter for contrast, and whether they can
be expressed in Oklab's own terms.

One clearly did: a darker background flattens the lightness scale, so the same
two colours look less different. At the AA line, a just-passing grey on
`#1a1a1a` kept 25% less lightness difference than one on white.

**Adopted: background induction.** On backgrounds darker than `#767676`, the
darker colour's lightness is adjusted using CAM16's own constant. Nothing is
tuned. It reaches mid-dark backgrounds such as `#333333`, which the flare
ceiling leaves alone.

- **Dead end:** CAM16's full form adjusts both colours. Applied that way, it
  produced false passes, so only the darker colour is adjusted.
- **Dead end:** induction moved hot pink on `#1a1a1a` from its published 3.6
  to 3.0. Restoring it would have meant weakening the saturation penalty. That
  loosened over 1,300 pairs, and no evidence supported a weaker penalty. The decision: **let the science dictate the
  work.** The algorithm stays, and published figures are updated to match it.

### Hue, through colour-vision deficiency ([#28](https://github.com/pawn002/okca/issues/28))

The colour-vision survey from #25 had found nothing at near-black, but it had
found something else. OKCA's saturation penalty was the same at every hue.
People with red–green colour-vision deficiency are not. They lose much of the
contrast of reds, oranges and magentas, and little of blues and purples. OKCA
scored saturated blue on black at about 0.43 of WCAG, though a dichromat keeps
95–98% of that contrast.

- **Rejected:** building a colour-vision simulation into the algorithm. It
  would have been another bolted-on model. The simulation (Machado et al.,
  2009) stays a measuring stick in the tests, not a part of OKCA.
- **Rejected:** a hue switch, with different rules for different hue ranges.
  That would undo the 1.0 principle.

**Adopted: opponent-axis terms.** In Oklab, a and b together encode both hue
and saturation. Weighting the penalty along a direction in that plane lets reds
keep the full penalty and blues carry less, with no hue switch. The direction
is measured from colour-vision data: it is essentially Oklab's red–green axis.
Easing the lighter colour exposed a matching gap in dark text, so a small lift
was added for the darker colour too.

This changed one of OKCA's design principles. Its saturation terms are no
longer the same in every direction of the colour plane.

The result also raised a question about the promise. Should "never above what a
dichromat sees" join "never above WCAG"? The answer was no. The colour-vision
result is the reason the calibration is safe, tested against one model of
colour-vision deficiency. It is not a guarantee.

### The reference background ([#29](https://github.com/pawn002/okca/issues/29))

Background induction switches on below `#767676`, chosen because it is the
background of OKCA's boundary anchor. CAM16 itself says the effect continues up
to white. Moving the reference toward white was explored.

- **Dead end:** every lighter reference that held the anchor either broke the
  guarantee or reversed which polarity scored higher. `#767676` stayed.
- That second outcome raised a question the anchor had been hiding: which
  polarity *should* score higher?

### Polarity, reversed ([#30](https://github.com/pawn002/okca/issues/30))

Since 1.0, light-on-dark had been capped above dark-on-light by editorial
choice. By 3.0, the evidence-based steps already pushed the other way: for most
pairs on dark backgrounds, dark-on-light scored higher. The reading research
agrees: proofreading is consistently better with dark text on a light
background (Buchner & Baumgartner, 2007; Piepenbrock et al., 2013, 2014).

**Adopted: one cap for both directions.** The editorial asymmetry is gone.
Light-on-dark never outscores dark-on-light. Every difference between the two
directions now comes from a measured effect. Black on white rose from 20.0 to
20.9, and `#767676` on white from 3.7 to 3.9, matching their reverses.

Inverting the caps was considered and rejected. It would have kept an editorial
size for the polarity effect, just pointed the other way, and no source gives
one.

### Applying the rationale consistently ([#31](https://github.com/pawn002/okca/issues/31))

One cap raised dark-on-light scores slightly. That left 43 pairs of saturated
blue text on light backgrounds scoring above what a dichromat sees. It was not
a broken promise, since that was never a promise, but it was an inconsistency.

- **Apparent dead end:** strengthening the darker lift could not clear them.
- **Why:** its direction had been taken from the raw colour-vision data, which
  pointed between blue and magenta. Its shape had been borrowed from the
  lighter colour's penalty, which levels off at high saturation.

**Adopted: a refitted lift.** The same rule was applied to every piece of the
lift. For each dark colour, find the smallest lift that keeps its scores at or
below what a dichromat sees. Only 35 of 512 test colours need one, nearly all
blue to violet, and the need grows in step with saturation. That gave the
direction (blue), the shape (linear) and the strength. No pair on the test grid
now scores above the dichromat's ratio, and other hues moved by 0.03 or less.

### The last editorial strength ([#33](https://github.com/pawn002/okca/issues/33))

Writing this history exposed an overclaim. The docs had said hot pink on
near-black fails "in user studies" at reduced contrast sensitivity. No such
study was ever cited. The call came from early design work, and it rests on
designers' judgement, which experience supports. Colour-vision deficiency
explains part of it: a dichromat keeps about 5.3 of the pair's 6.6. Nothing
measured explained the rest. The strength of the saturation penalty,
`CHROMA_K`, had been set so hot pink would fail, which made it the last
strength in OKCA chosen by eye.

- **Dead end:** removing the penalty. Over a hundred light colours need one to
  stay at or below what a dichromat sees, and without it the proof of the WCAG
  bound does not go through.
- **What the rule said:** the penalty was about twice as strong as needed, and
  its capped shape could not follow a need that grows steadily with
  saturation, the same lesson #31 taught for the darker lift.

**Adopted: a derived penalty.** The same rule as #31 now sets the penalty's
shape (linear) and strength (0.22, down from 0.65), fitted together with the
darker lift. Hot pink on near-black scores 4.1 and still fails AA, so the
designers' call survives derivation with less margin. It is kept as a test of
the result, not an input to it. Dark orange on near-black scores 4.8 and now
passes. The earlier docs had named it as a pair OKCA should fail, but a
dichromat sees 6.1, and the evidence was allowed to decide.

### Which eye? ([#34](https://github.com/pawn002/okca/issues/34))

Reviewing these docs raised an objection: a contrast algorithm aimed at readers
with impaired vision was scoring polarity from CAM16, a model of a typical
observer. Many people, the maintainer included, find light text on a dark
background easier at the AA line.

- **Checking the claim:** Rubin & Legge (1989) found that some low-vision
  readers do read white-on-black faster, and four of the five who did had
  cloudy ocular media. Light scattered inside such an eye veils the image, and
  a bright background is its main source.
- **Dead end:** scoring both directions and keeping the lower. It is cautious,
  but it erases real differences instead of explaining them.
- **The optics and the behaviour disagree.** Sized from the age-adjusted
  Stiles–Holladay glare equation, the veil makes dark-on-light the weaker
  arrangement for every eye, even at age 25. Yet reading studies find
  dark-on-light better for younger and older adults alike (Piepenbrock et al.,
  2013, which tested exactly this hypothesis for older eyes). Something,
  probably pupil size, outweighs scatter for most readers.
- **Dead end:** keeping the 3.9 anchor under the veil by lowering `POL_K` to
  1.037. Lemma A of the proof does not certify there.

**Adopted, for release candidates: two observers.** The default stays, grounded
in the reading studies. An experimental scatter observer scores for eyes that
scatter light: black on white falls to 5.2 for that eye, while white on black
keeps 20.9. It can only lower scores, so the guarantee holds. This was the
first decision published as a fork in outputs rather than settled in private:
the release candidate carries both answers, and feedback decides whether the
option survives into 3.0.0.

### Where 3.0 landed

- **The guarantee is unchanged:** OKCA never scores a pair above WCAG, proven
  for every sRGB pair. The proof now also covers Steps 4 and 6 and needed no
  new bounds, because both can only lower a score.
- **Every strength in OKCA is now derived, not tuned.** Each comes from CAM16,
  from colour-vision data, from WCAG's own flare term, or from a constraint
  stated in advance.
- **One policy input remains, stated as one.** White on `#767676`, WCAG's own
  boundary pair, scores 3.9, and that sets the exponent that scales every
  score. It was chosen at 2.0 and no measurement sets it. Rather than search
  for a derivation with no data to fit, it is stated as OKCA's position: a pair
  on the AA line has no margin and should not pass. A check made later
  agrees: under doubled flare, the premise of Step 6, the pair keeps 3.91. That
  supports the value; it does not derive it.
- **Three earlier decisions were reversed:** the 1.0 polarity premise, a
  saturation penalty that ignored hue, and a penalty strength set by eye.

---

## What's ahead

Open questions, roughly in order of how much they would change:

- **Beyond sRGB** ([#21](https://github.com/pawn002/okca/issues/21)). OKCA
  accepts Oklab and OKLCH colours outside sRGB, but the proof covers sRGB only.
  Wide-gamut displays make this a practical question: extend the proof, or
  refuse such colours explicitly.
- **Milder colour-vision deficiency.** The colour-vision checks model full
  dichromacy. Anomalous trichromacy, the more common form, loses less. Whether
  it changes any calibration is untested.
- **The boundary anchor.** Kept as a stated policy (above). If a threshold
  study with more than one observer appears, it could test the value.
- **Legibility of saturated text.** Designers judge hot pink on near-black
  inadequate, and OKCA agrees with less margin than before. No legibility study
  yet found measures how saturated text reads at equal luminance; the reading
  research so far (Legge et al., 1990) shows low-vision readers rely on
  luminance contrast, not that saturated colours are harder to read.
- **The scatter observer.** Whether it graduates into 3.0.0, and how to apply a
  veil without WCAG's ratio scale exaggerating it for dark text. The ages in
  Piepenbrock et al. (2013) and the cataract veil are still to be checked.
- **Viewing conditions.** OKCA is a relative measure and cannot see screen
  brightness or room light. #22 showed those conditions can flip a verdict at
  the AA line. A relative metric cannot fix that; whether anything should
  accompany it is open.
- **Text size and weight.** WCAG's normal and large text thresholds remain the
  only link between contrast and type. A fuller mapping was set aside at 1.0
  ([#11](https://github.com/pawn002/okca/issues/11)) and has not been revisited.

New work adds a chapter here when it settles, whether it is adopted or not.
