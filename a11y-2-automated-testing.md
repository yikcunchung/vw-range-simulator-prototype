# A11y 2 of 3 — What the automated tests cover, and what they cannot

**App:** VW Range Simulator (`range-simulator`).
**Audited:** 2026-08-22 against the live deployment, headless Chrome 151.0.7922.174, axe-core 4.13.0
(`axe.version` read from the engine, not the bundle filename).
**Deployed at:** https://yikcunchung.github.io/vw-range-simulator-prototype/
**Companions:** `a11y-1-criteria.md` (every criterion) · `a11y-3-implementation.md` (what to build).

The single most important sentence in this pack:

> **A clean automated run is necessary and nowhere near sufficient.** This app scores 0 axe
> violations, 0 WAVE errors and 0 HTML validity errors — and that result could not see the
> unnamed-graphic defect that the accessibility tree found, cannot test SC 2.5.3, cannot judge
> whether a name is *correct* rather than merely present, and cannot tell you what a screen reader
> actually says.

---

# 0. Scope of this evidence — read before quoting a number

This app is a **standalone page**, so `axe.run(document)` covers the whole conformance surface.
There is no component-versus-page split.

Everything below describes the **deployed** build. Confirm the local checkout matches it before
quoting a number — the two have diverged before without anyone noticing.

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
| **axe DevTools 4.131.2** | ✅ **Done — UI at WCAG 2.2 AA** | Interactive Elements and Forms guided tests both run — every AI-flagged item was a false positive (the tool examining a decorative sibling element instead of the real native input beside it, or misapplying a disclosure-widget/switch pattern to a dialog trigger or radiogroup); none required a markup change — §9.3. The CDP run used **axe-core 4.13.0**, the library the extension embeds, with no `runOnly` filter; the two agree |
| **WAVE Evaluation Tool 3.3.1.0** | ✅ **Done** | Real engine via `wave.webaim.org/report#/<url>` against the public URL |
| **Zoom 400% and 320 × 256 px** | ✅ **Done** | `320×256 @ deviceScaleFactor 4`. **dsf 1 is a small screen, not a zoomed one** |
| **Operated via the keyboard** | ✅ **Done** | Driven with real `Input.dispatchKeyEvent` |
| **NVDA 2026.1.1.55980** | ❌ **Not done** | The one real screen-reader gap. **VoiceOver has been run — §9.1** — a deviation, not a substitute. Protocol §6 Run 1, checklist §7 |
| **PAC 26.1.0.0** | ⚪ **Not applicable** | PAC checks PDF/UA-1 (ISO 14289-1). This app ships no PDFs (`*.pdf` count: 0). If brochures or price lists are added they are a separate surface under EN 301 549 clause 10 |

### NVDA vs VoiceOver — a deviation to record

VoiceOver is planned instead of NVDA. Record that as a **deviation**, not a substitution. The two
disagree exactly where this app is interesting: a `<select>` named via `aria-labelledby`, live-region
politeness, and controls built from a visually hidden `<input>` behind a styled `<label>`. NVDA is
normally tested with Firefox or Chrome, VoiceOver with Safari, so the browser differs too. Budget an
NVDA pass before formal sign-off.

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

The run was confirmed to have analysed the real page — control count and document title were read
back out of WAVE's iframe, not assumed.

## Nu HTML validator — 0 errors

SC 4.1.1 Parsing. Obsolete in WCAG 2.2 but normative under EN 301 549 (clause 9.4.1.1), so it is
checked and kept.

## Contrast — the `incomplete` bucket resolved by hand

axe punts whenever the background is a gradient, an image, or overlapped. Those are **not passes** —
a BITV tester must resolve every one. At 1440×900 there were **18**.

16 of the 18 are "background could not be determined due to a background gradient"; the other 2 are overlap. axe declined to compute a ratio in every case — it never computed a failing one.

**Every one resolves to a pass.** Measured on composited pixels: viewport screenshot, cropped in PIL
with viewport-relative coordinates, foreground taken from the glyph band and background from the
dominant colour of a second capture with the text forced transparent. **Worst ratio anywhere:
14.50:1**, against a 4.5:1 requirement (every element is 16px or smaller, so the 3:1
large-text threshold never applies).

## Orientation and text spacing

**SC 1.3.4 Orientation — pass.** No `@media (orientation:)` rule exists anywhere in the app.

**SC 1.4.12 Text Spacing — pass.** With all four overrides applied (`line-height:1.5`,
`letter-spacing:0.12em`, `word-spacing:0.16em`, `p margin-bottom:2em`) at 1440 / 390 / 320:
**no newly clipped element, no control lost, no horizontal scroll.**

> **One nuance the detector accounts for, re-verified this pass.** Direct `scrollWidth`/`clientWidth`
> measurement of both floating labels ("Model: The new ID.3 Neo" / "Motor / Battery Capacity") under
> these overrides, swept across every tested width from 320 to 1440 (including the 960–1280 zone
> where this app's own grid narrows the shared column), found **zero truncation now** — the
> unconditional vertical stack (`.select-group { flex-direction: column }`) gives each label the
> full row width everywhere. Each select's `<option>`s are *also* wrapped in an `<optgroup>` whose
> `label` matches the floating-label string exactly, as a safeguard: if content ever grows past the
> stacked width in the future, opening the select — its own normal operation — still reveals the
> same text in full, and the detector's exemption for that case is already in place and tested.

> **Detector validated.** A canary that fits at the default line-height and overflows only at 1.5
> was injected and *was* detected. A first canary was already clipped before the override and
> therefore proved nothing — "no new clipping" is worthless unless you have watched the detector fire.

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

**`target-size` first appeared to miss, and that was the harness's fault.** The canaries had been
injected at `position:fixed; top:0; left:0` — underneath the sticky topbar, so axe treated them as
obscured — and only `violations` was read. In normal flow the rule fires on both nodes. Traps 1 and 2.

---

# 4. Ten traps that produce a confident false pass

**1 · Bare `axe.run()` is not every rule.** Nine rules are `enabled:false` by default in axe-core
4.13.0: **`target-size`** (SC 2.5.8), `aria-roledescription`, `color-contrast-enhanced`,
`duplicate-id`, `duplicate-id-active`, `identical-links-same-purpose`,
`landmark-complementary-is-top-level`, `meta-refresh-no-exceptions`, `audio-caption`. A stock run
reports "0 violations" **without ever having tested target size**. Pass
`{rules:{'target-size':{enabled:true}, …}}` and confirm the rule appears in `passes`. Check
`axe._audit.rules.filter(r => !r.enabled)` before believing a rule ran.

**2 · `violations` is not the whole result.** `incomplete` is the "needs review" bucket a BITV or
EN 301 549 tester must resolve by hand. It is also where an *obscured* element lands — so a
genuinely undersized target can be missing from `violations` because axe could not decide, not
because it passed.

**3 · `runOnly: {type:'tag'}` is not "all rules".** A tag filter silently skips every rule without
one of those tags.

**4 · 400% zoom is `deviceScaleFactor: 4`.** `320×256 @ dsf 1` is a small screen — a different test,
and not the one 1.4.4 asks for.

**5 · WAVE reads stale counts.** Poll until the icon counts go **stable**, not until
`wave.report.iconlist` merely exists. Reading early returns the *previous* page's numbers. Also
`iconlist.error` is `{description, count, items}`, not a map — summing it as a map yields a false
all-zero clean pass.

**6 · `Page.captureScreenshot` clip is document-absolute.** `getBoundingClientRect()` is
viewport-relative. Mixing them photographs a blank region: the element scores exactly `1.00:1` with
one unique colour. **A ratio of exactly 1.00 means the clip missed, not that contrast failed.**

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
the AX tree and assert 0 unnamed** — that is how every unnamed-graphic failure in this suite was
found, and neither axe nor WAVE nor Nu saw any of them.

---

# 5. What automation will never close

**Real screen-reader/AI-guided output requires a human pass.** The accessibility tree confirms what
is *exposed*; NVDA, JAWS and VoiceOver differ in what they *announce*, and axe's AI-guided tests
still misjudge decorative elements (§9.3). VoiceOver, WAVE (extension), and axe DevTools have now
all been run manually — §9. **NVDA remains the one outstanding instrument.**

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
disclosure-widget/switch interaction pattern to something that isn't one:

- **Occupancy radiogroup** (`label.vw-toggle-opt`, `span.vw-toggle-track`, `span.vw-toggle-knob`) —
  flagged as "not Tab focusable" (Interactive Elements) and separately as missing name/role/states,
  with AI suggesting `role="switch"`. The real controls are the two
  `<input type="radio" name="occ">` elements, each already named by its own wrapping label ("1
  person"/"Full"). `switch` would also be the wrong *concept* here regardless of DOM node — this
  control was deliberately built as a radiogroup (native "1 of 2"/"2 of 2" position info), not a
  binary switch.
- **Speed/AC toggles** (`label.vw-switch`, `span.vw-switch-track` ×2) — same "not Tab focusable"
  pattern, plus separate Name/Role/States findings on the AC toggle's track span. The real controls
  are `<input type="checkbox" role="switch" aria-labelledby="q-ac lbl-no">` (and the speed
  equivalent), already fully correct.
- **Temperature slider** (`div#temp-thumb`, `span.slider-track-area`) — decorative thumb/track
  elements flagged as "not focusable" / role missing (AI suggests `slider`). The real control is
  `<input type="range" id="temp-slider" aria-labelledby="q-temp" aria-valuetext="...">`.
- **Info-modal trigger buttons** (all 7) — States/Properties flagged as missing `aria-expanded`
  (AI suggestion: `"collapsed"`), treating the button as a disclosure-widget trigger. These buttons
  open a modal dialog (`role="dialog" aria-modal="true"`), which is a different, standard ARIA
  pattern that doesn't use `aria-expanded` at all — the modal's own role and focus movement
  communicate its open state, not a property on the trigger.

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

VoiceOver Run 1 has been completed against the live build (Tab-stop names/roles/values, the 7
info-modals' open/close/focus-trap behaviour, the occupancy radiogroup, and the two switches). See
`a11y-1-criteria.md` for the naming/role decisions this pass drove (tyre-select, temp-slider, the
occupancy radiogroup role, the toggle naming pattern).

## 9.2 WAVE 3.3.1.0 — extension, complete

WAVE has been run via the browser extension against the live build, covering the default state and
the info-modal-open state.

## 9.3 axe DevTools 4.131.2 — Interactive Elements + Forms guided tests, complete

Both guided tests were run against the live build. See §6 above for the specific items the AI
flagged and why each was a false positive. No markup changes were required as a result of this run.

## 9.4 Outstanding

**NVDA 2026.1.1.55980** — not yet run; see the deviation note in §1. Required before formal
BITV/EN 301 549 sign-off; VoiceOver is a documented deviation, not a substitute.
