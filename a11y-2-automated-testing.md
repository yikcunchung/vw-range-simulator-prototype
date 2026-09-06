# A11y 2 of 3 — What the automated tests cover, and what they cannot

**App:** VW Range Simulator (`range-simulator`).
**Audited:** 2026-08-22 against the live deployment, headless Chrome 151.0.7922.174, axe-core 4.13.0
(`axe.version` read from the engine, not the bundle filename).
**Deployed at:** https://yikcunchung.github.io/vw-range-simulator-prototype/
**Companions:** `a11y-1-criteria.md` (every criterion) · `a11y-3-implementation.md` (what to build).

> **A clean automated run is necessary and nowhere near sufficient.** This app scores 0 axe
> violations, 0 WAVE errors, 0 HTML validity errors — yet that missed the unnamed-graphic defect
> the AX tree found, can't test SC 2.5.3, can't judge if a name is *correct* vs merely present, and
> can't say what a screen reader actually announces.

---

# 0. Scope of this evidence — read before quoting a number

Standalone page, so `axe.run(document)` covers the whole conformance surface — no
component-versus-page split. Everything below describes the **deployed** build; confirm the local
checkout matches it before quoting a number — the two have diverged before without anyone noticing.

---

# 1. Tool coverage at a glance

| Tool | Good for | Blind spots that matter here |
|---|---|---|
| **axe-core 4.13.0** | Structural ARIA, names, roles, contrast on solid backgrounds | **No `label-in-name` rule at all** (SC 2.5.3). **Cannot see an unnamed inline `<svg>` that has no `role`** — trap 10. Cannot see behaviour. Punts on contrast over gradients. **Nine rules are off by default, including `target-size`** — trap 1 |
| **WAVE 3.3.1.0** | A genuinely different engine; catches empty labels and sr-only contrast axe passes | Needs a public URL. Reports `.sr-only` contrast as an error even when clipped to 1×1 |
| **Nu HTML validator** | SC 4.1.1 Parsing, still normative under EN 301 549 | Says nothing about semantics or naming |
| **Accessibility tree (CDP)** | Ground truth for name / role / value | Exposure is not announcement — §5 |
| **Real key and pointer events** | The only way to test behaviour | Slow; assert state after every event |

## Required toolchain — coverage against it

| Required | Status | Note |
|---|---|---|
| **axe DevTools 4.131.2** | ✅ **Done — UI at WCAG 2.2 AA** | Interactive Elements + Forms guided tests run — every AI flag was a false positive (decorative sibling vs. the real native control, or a disclosure/switch pattern misapplied to a dialog/radiogroup); no markup change needed — §9.3. CDP run used axe-core 4.13.0 (same lib the extension embeds), no `runOnly` filter; both agree |
| **WAVE Evaluation Tool 3.3.1.0** | ✅ **Done — hosted and extension** | Hosted engine via `wave.webaim.org/report#/<url>`; extension pass confirmed **0 errors**, default and info-modal-open states — §9.2 |
| **Zoom 400% and 320 × 256 px** | ✅ **Done** | `320×256 @ deviceScaleFactor 4`. **dsf 1 is a small screen, not a zoomed one** |
| **Operated via the keyboard** | ✅ **Done** | Driven with real `Input.dispatchKeyEvent` |
| **NVDA 2026.1.1.55980** | ❌ **Not done** | The one real screen-reader gap. **VoiceOver has been run — §9.1** — a deviation, not a substitute. Protocol §6 Run 1, checklist §7 |
| **PAC 26.1.0.0** | ⚪ **Not applicable** | PAC checks PDF/UA-1 (ISO 14289-1). This app ships no PDFs (`*.pdf` count: 0). If brochures or price lists are added they are a separate surface under EN 301 549 clause 10 |

### NVDA vs VoiceOver — a deviation to record

**VoiceOver run instead of NVDA — record as deviation, not substitution.** The two disagree where
this app gets interesting: `<select>` named via `aria-labelledby`, live-region politeness, and
hidden-`<input>`-behind-styled-`<label>` controls. Browser differs too (NVDA: Firefox/Chrome,
VoiceOver: Safari). Budget an NVDA pass before formal sign-off.

---

# 2. Results

## axe-core — 0 violations

Bare `axe.run(document)` plus the default-disabled rules force-enabled (98 rules).
Viewports: 1440×900, 768×1024, 390×844, 320×640, and 320×256 @ dsf 4 (literal 400% zoom).

| Measure | Value |
|---|---|
| Rules executed | 98 |
| Violations | **0** at every viewport |
| `target-size` | **passes 11 nodes**, 0 violations, 0 incomplete |
| JS exceptions | **0** |
| Horizontal scroll | none, at any viewport |

## Accessibility tree

| Measure | Value |
|---|---|
| Nodes (1440×900) | 241 |
| Named interactive / graphic nodes | 34 |
| **Unnamed** | **0** |
| Focusable controls | 16 |

> **This is where the one real defect was found.** Before the fix, **16 `role=image` nodes were exposed unnamed** — invisible to axe, WAVE and Nu alike. See trap 10.

## WAVE 3.3.1.0 — real engine, public URL

| Errors | Contrast errors | Alerts | Features | Structure | ARIA |
|---|---|---|---|---|---|
| **0** | **0** | 0 | 7 | 3 | 28 |

Confirmed to have analysed the real page — control count and document title read back out of
WAVE's own iframe, not assumed.

## Nu HTML validator — 0 errors

SC 4.1.1 Parsing. Obsolete in WCAG 2.2 but normative under EN 301 549 (clause 9.4.1.1), so it is
checked and kept.

## Contrast — the `incomplete` bucket resolved by hand

**All 18 `incomplete` nodes resolve to a pass — worst 14.50:1** vs 4.5:1 required (every element
≤16px, so the 3:1 large-text threshold never applies). 16 are gradient-background, 2 overlap — axe
never computed a failing ratio here, just an undecidable one; these are **not passes** until a
human resolves them. Measured on composited pixels: PIL crop to viewport-relative coordinates,
foreground = the glyph band, background = dominant colour of a text-forced-transparent capture.

## Orientation and text spacing

**SC 1.3.4 Orientation — pass.** No `@media (orientation:)` rule exists anywhere in the app.

**SC 1.4.12 Text Spacing — pass.** All 4 overrides (`line-height:1.5`, `letter-spacing:.12em`,
`word-spacing:.16em`, `p margin-bottom:2em`) at 1440/390/320: **no newly clipped element, no
control lost, no horizontal scroll.**

> **Zero truncation found, re-verified this pass.** `scrollWidth`/`clientWidth` swept 320–1440
> incl. the 960–1280 zone where this app's grid narrows the shared column — the unconditional
> vertical stack (`.select-group{flex-direction:column}`) gives each floating label full row width
> everywhere. `<optgroup label>` mirrors it as a safeguard if content ever grows further.

> **Detector validated.** A canary that fits at default line-height and overflows only at 1.5 was
> injected and *was* detected — an already-clipped-before-override canary would prove nothing.

---

# 3. Validate the harness before trusting a zero

Every axe detector was re-run against the page with that defect injected:

| Injected defect | Rule | Fired |
|---|---|---|
| `<button>` with no accessible name | `button-name` | ✅ |
| `<img>` with no `alt` | `image-alt` | ✅ |
| Text at ~1.2:1 | `color-contrast` | ✅ |
| Two elements sharing an `id` | `duplicate-id` | ✅ |
| `<input>` with no label | `label` | ✅ |
| `<a href>` with no text | `link-name` | ✅ |
| Two adjacent 12×12 buttons | `target-size` | ✅ |

**`target-size` first appeared to miss — harness's fault, not axe's.** Canaries were injected at
`position:fixed;top:0;left:0`, under the sticky topbar, so axe called them obscured, and only
`violations` was read. In normal flow the rule fires on both nodes. Traps 1, 2.

---

# 4. Ten traps that produce a confident false pass

**1 · Bare `axe.run()` is not every rule.** 9 rules are `enabled:false` by default in axe-core
4.13.0: **`target-size`** (SC 2.5.8), `aria-roledescription`, `color-contrast-enhanced`,
`duplicate-id`, `duplicate-id-active`, `identical-links-same-purpose`,
`landmark-complementary-is-top-level`, `meta-refresh-no-exceptions`, `audio-caption`. A stock run
reports "0 violations" **without testing target size at all**. Pass
`{rules:{'target-size':{enabled:true}, …}}`, confirm it's in `passes`; check
`axe._audit.rules.filter(r => !r.enabled)` first.

**2 · `violations` is not the whole result.** `incomplete` is the "needs review" bucket a BITV or
EN 301 549 tester must resolve by hand — and where an *obscured* element lands, so a genuinely
undersized target can be missing from `violations` because axe couldn't decide, not because it passed.

**3 · `runOnly: {type:'tag'}` is not "all rules".** A tag filter silently skips every rule without
one of those tags.

**4 · 400% zoom is `deviceScaleFactor: 4`.** `320×256 @ dsf 1` is a small screen — a different test,
and not the one 1.4.4 asks for.

**5 · WAVE reads stale counts.** Poll until icon counts go **stable**, not until
`wave.report.iconlist` merely exists — reading early returns the *previous* page's numbers.
`iconlist.error` is `{description, count, items}`, not a map; summing it as one yields a false
all-zero clean pass.

**6 · `Page.captureScreenshot` clip is document-absolute; `getBoundingClientRect()` is
viewport-relative.** Mixing them photographs a blank region — the element scores exactly `1.00:1`
with one unique colour. **A ratio of exactly 1.00 means the clip missed, not that contrast failed.**

**7 · Anti-aliasing is not the background, and neither is a border.** Taking the *worst* minority
colour in a text crop reports white-on-dark text as a failure — it has found the element's own
border. Crop to the **glyph band** (union of `Range.getClientRects()`), or the padding box for a
`<select>`, and use the **dominant** background.

**8 · A `<select>`'s options are not its label.** Comparing concatenated `<option>` text against the
accessible name manufactures SC 2.5.3 failures that do not exist. Compare the associated `<label>`.

**9 · `Network.setCacheDisabled` is a no-op unless `Network.enable` was called first.** Re-auditing
after an edit then silently re-measures the *old* page and reports the defect as unfixed. Enable the
domain, or append a cache-busting query string.

**10 · axe is blind to unnamed inline SVGs.** `svg-img-alt` and `role-img-alt` return
**`inapplicable`** for an `<svg>` with no `role`, and `image-alt` only inspects `<img>`. A page can
expose any number of unnamed graphics and still score 0 violations. **Read `role=image` nodes off
the AX tree and assert 0 unnamed** — how every unnamed-graphic failure in this suite was found; axe,
WAVE, Nu saw none of them.

---

# 5. What automation will never close

**Real screen-reader/AI-guided output requires a human pass.** The AX tree confirms what's
*exposed*; NVDA, JAWS and VoiceOver differ in what they *announce*, and axe's AI-guided tests still
misjudge decorative elements (§9.3). VoiceOver, WAVE (extension), and axe DevTools all now run
manually — §9. **NVDA remains the one outstanding instrument.**

**A name can be present, unique, and wrong.** Every automated check here passes on a control
labelled "button". Names must be read against what they describe.

**SC 2.5.3 Label in Name has no axe rule.** It was checked by hand — see `a11y-1-criteria.md`.

---

# 6. Manual testing — what to do

**All three (VoiceOver, WAVE, axe DevTools) have now been run — results in §9. NVDA remains
outstanding** — §1.

**The reusable procedure (Step 0, VoiceOver/WAVE/axe DevTools runs, sign-off checklist) lives
centrally** in `../audit-evidence/manual-testing-guide.md` — it's identical across all five sibling
apps, so it's maintained once there instead of copied per app. What follows here is only what's
specific to range-simulator.

## App-specific Step 0

- **Live** — `https://yikcunchung.github.io/vw-range-simulator-prototype/`.
- **Confirm on screen:** 7 info-modal triggers (`info-btn-distance`, `info-btn-speed`,
  `info-btn-tyres`, `info-btn-temp`, `info-btn-ac`, `info-btn-occ`, `info-btn-range`), the
  temperature slider, the occupancy radiogroup ("1 person"/"Full"), two switches (motorway speed,
  heating/AC), and the trim/battery selects.
- **18 Tab stops** total.

## App-specific notes for the central procedure's Run 3 (axe DevTools)

Both the **Interactive Elements** and **Forms** guided tests have been run. Every item the AI
flagged in Interactive Elements was a false positive — in every case the tool was examining a
decorative sibling element next to a real, already-correct native control, or misapplying a
disclosure-widget/switch interaction pattern:

- **Occupancy radiogroup** — real controls are `<input type="radio" name="occ">` ×2, each named by
  its wrapping label ("1 person"/"Full"). AI flagged the decorative `label.vw-toggle-opt`/
  `span.vw-toggle-track`/`-knob` as "not Tab focusable" + missing name/role, suggesting
  `role="switch"` — wrong concept too: this is deliberately a radiogroup (native "1 of 2" position
  info), not a binary switch.
- **Speed/AC toggles** — real controls are `<input type="checkbox" role="switch"
  aria-labelledby="q-ac lbl-no">` (+ speed equivalent), already correct. AI flagged the decorative
  `label.vw-switch`/`span.vw-switch-track` as "not Tab focusable", plus separate Name/Role/States
  findings on the AC track span.
- **Temperature slider** — real control is `<input type="range" id="temp-slider"
  aria-labelledby="q-temp" aria-valuetext="...">`. AI flagged decorative `div#temp-thumb`/
  `span.slider-track-area` as "not focusable" / role missing (suggested `slider`).
- **Info-modal triggers** (all 7) — open a modal dialog (`role="dialog" aria-modal="true"`), a
  pattern that doesn't use `aria-expanded` at all; the modal's own role and focus movement
  communicate open state. AI flagged missing `aria-expanded` (suggested `"collapsed"`), treating
  them as disclosure-widget triggers — wrong pattern.

The Forms guided test was also run and returned no findings needing action.

---

# 7. Verification checklist

Tick only what you actually observed against the central sign-off checklist in
`../audit-evidence/manual-testing-guide.md`. **An untested box is not a pass.**

---

# 8. Re-running the automated suite

Identical across all five sibling apps — see `../audit-evidence/manual-testing-guide.md` for the
CDP re-run script (serve locally, drive headless Chrome over the CDP protocol, run axe/AX-tree/
reflow/text-spacing/WAVE checks, diff local against live). Substitute this app's own port (`7810`)
and live URL where the script needs them.

**Automate the structural half in CI, but do not mistake it for the whole.** A structural-only suite
is exactly what scores clean on a build with a Level A naming failure.

---

# 9. Manual run results

## 9.1 Screen reader — VoiceOver / Safari, complete

VoiceOver Run 1 completed against the live build: Tab-stop names/roles/values, the 7 info-modals'
open/close/focus-trap behaviour, the occupancy radiogroup, both switches. See
`a11y-1-criteria.md` for the naming/role decisions this drove (tyre-select, temp-slider, occupancy
radiogroup role, toggle naming pattern).

## 9.2 WAVE 3.3.1.0 — extension, complete

WAVE has been run via the browser extension against the live build, covering the default state and
the info-modal-open state.

## 9.3 axe DevTools 4.131.2 — Interactive Elements + Forms guided tests, complete

Both guided tests were run against the live build. See §6 above for the specific items the AI
flagged and why each was a false positive. No markup changes were required as a result of this run.

## 9.4 Outstanding

**NVDA 2026.1.1.55980** — not yet run; see the deviation note in §1. Required before formal
BITV/EN 301 549 sign-off; VoiceOver is a documented deviation, not a substitute.
