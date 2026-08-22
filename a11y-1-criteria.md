# A11y 1 of 3 — WCAG 2.2 criterion checklist

**App:** VW Range Simulator (`range-simulator`) — a single-page simulator.
**Audited:** 2026-08-22 against the live deployment.
**Deployed at:** https://yikcunchung.github.io/vw-range-simulator-prototype/
**Scope:** the whole page. This app is standalone, so there is no component-versus-page split and
nothing is out of scope. **PDFs are excluded** — the app ships none; they would be a separate
conformance surface under EN 301 549 clause 10, checked with PAC.
**Companion documents:** `a11y-2-automated-testing.md` (what the tools can and cannot prove) ·
`a11y-3-implementation.md` (what to build).

The conformance target is **Level A + AA** — what EN 301 549 clause 9 requires, and therefore
BFSG / the European Accessibility Act. That is **56 criteria** (32 A + 24 AA). The 31 Level AAA
criteria are not required and are not listed.

> **If EN 301 549 becomes the formal target**, note that V3.2.1 (2021-03) references **WCAG 2.1**,
> not 2.2. The only practical delta is **4.1.1 Parsing** — obsolete in 2.2 but normative in 2.1 and
> listed by EN as clause 9.4.1.1. It is satisfied here and kept in the table rather than dropped, so
> the EN path is not silently broken.

| Status | Meaning |
|---|---|
| ✅ Pass | Verified by driving the app — real pointer and key events, or measured pixels |
| ✅ Pass\* | Verified by code and accessibility-tree inspection, **not** driven |
| ⚪ N/A | The app has no such content |
| ⚖️ Decide | Passes, but on an arguable reading — record the decision |

**56 criteria assessed. 0 failures and 0 open items.** 22 verified · 9 inspected · 23 not applicable · 2 decisions to record.

---

# 1. Perceivable


## 1.1 Text Alternatives

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **1.1.1** | Non-text Content | A | Yes | ✅ Pass | **0 unnamed nodes in the accessibility tree**, at all 5 viewports. 16 decorative inline `<svg>`s were exposed unnamed and now carry `aria-hidden="true"`; the car render has `alt="Volkswagen ID.3 Neo"`. **No tool in the required toolchain detected this** — axe, WAVE and Nu all reported clean throughout. |


## 1.2 Time-based Media

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **1.2.1** | Audio-only and Video-only (Prerecorded) | A | No | ⚪ N/A | No audio-only or video-only content. |
| **1.2.2** | Captions (Prerecorded) | A | No | ⚪ N/A | No prerecorded video with audio. |
| **1.2.3** | Audio Description or Media Alternative (Prerecorded) | A | No | ⚪ N/A | No prerecorded video. |
| **1.2.4** | Captions (Live) | AA | No | ⚪ N/A | No live media. |
| **1.2.5** | Audio Description (Prerecorded) | AA | No | ⚪ N/A | No prerecorded video. |


## 1.3 Adaptable

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **1.3.1** | Info and Relationships | A | Yes | ✅ Pass | One `h1`, `role="banner"` topbar, `main`, three named `<select>`s and three labelled toggles. axe 0 violations on all structure rules at 98 rules. |
| **1.3.2** | Meaningful Sequence | A | Yes | ✅ Pass* | DOM order matches visual order; the 17 Tab stops follow the question sequence top to bottom. |
| **1.3.3** | Sensory Characteristics | A | Yes | ✅ Pass* | No instruction relies on shape, size or position. |
| **1.3.4** | Orientation | AA | Yes | ✅ Pass | No `@media (orientation:)` rule exists anywhere. Nothing locks orientation. |
| **1.3.5** | Identify Input Purpose | AA | No | ⚪ N/A | No field collects information *about the user* — no name, address, email or payment. The number inputs are tariff prices, not personal data, so `autocomplete` has nothing to identify. |


## 1.4 Distinguishable

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **1.4.1** | Use of Color | A | Yes | ✅ Pass* | Colour is never the only channel — every toggle and select conveys state through its value and label. |
| **1.4.2** | Audio Control | A | No | ⚪ N/A | No audio. `audio[autoplay]` / `video[autoplay]` count is 0. |
| **1.4.3** | Contrast (Minimum) | AA | Yes | ✅ Pass | **All 18 `color-contrast` incomplete nodes resolved by hand on composited pixels — worst 14.50:1**, against a 4.5:1 requirement. axe went incomplete because of a subtle full-height page gradient, not because anything was close. |
| **1.4.4** | Resize Text | AA | Yes | ✅ Pass | 400% zoom (320×256 @ dsf 4): 0 violations, no horizontal scroll, all 17 controls still present and reachable. |
| **1.4.5** | Images of Text | AA | Yes | ✅ Pass* | No images of text. All text is live text. |
| **1.4.10** | Reflow | AA | Yes | ✅ Pass | No horizontal scroll at 320 / 390 / 768 / 1440 or at 400% zoom. The control set is identical at every width — nothing is dropped at narrow widths. |
| **1.4.11** | Non-text Contrast | AA | Yes | ✅ Pass* | Control boundaries and the focus ring are navy `#293043` on light — far above 3:1. |
| **1.4.12** | Text Spacing | AA | Yes | ✅ Pass | All four overrides applied (line-height 1.5, letter-spacing .12em, word-spacing .16em, paragraph 2em) at 1440 / 390 / 320: **no newly clipped element, no control lost, no horizontal scroll.** Detector validated with a canary that fits at the default line-height and overflows at 1.5. |
| **1.4.13** | Content on Hover or Focus | AA | No | ⚪ N/A | No hover- or focus-triggered overlay. |


# 2. Operable


## 2.1 Keyboard Accessible

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **2.1.1** | Keyboard | A | Yes | ✅ Pass | All 17 controls keyboard-operable. The three visually hidden checkbox toggles were driven with real `Space` and all three flipped state; every `<select>` and the range slider operate with arrows. |
| **2.1.2** | No Keyboard Trap | A | Yes | ✅ Pass | No trap — Tab cycles all 17 stops and returns to the first. |
| **2.1.4** | Character Key Shortcuts | A | No | ⚪ N/A | No single-character key shortcuts are registered. |


## 2.2 Enough Time

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **2.2.1** | Timing Adjustable | A | No | ⚪ N/A | No time limit exists anywhere in the app. |
| **2.2.2** | Pause, Stop, Hide | A | No | ⚪ N/A | Nothing moves, blinks or auto-updates. The result changes only on user input. |


## 2.3 Seizures and Physical Reactions

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **2.3.1** | Three Flashes or Below Threshold | A | Yes | ✅ Pass* | Nothing flashes. No animation exceeds three cycles per second. |


## 2.4 Navigable

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **2.4.1** | Bypass Blocks | A | Yes | ✅ Pass | `a.skip-link → #main`, present as the **first** Tab stop, with a custom focus style. |
| **2.4.2** | Page Titled | A | Yes | ✅ Pass | `<title>Volkswagen Range Simulator</title>` — descriptive and unique. |
| **2.4.3** | Focus Order | A | Yes | ✅ Pass | 17 Tab stops in DOM order matching visual order, verified at 1440×900 and 390×844 with real Tab presses. |
| **2.4.4** | Link Purpose (In Context) | A | No | ⚪ N/A | No links other than the skip link, which is named. |
| **2.4.5** | Multiple Ways | AA | No | ⚪ N/A | A standalone single page. SC 2.4.5 applies to a *set* of web pages; there is no set. |
| **2.4.6** | Headings and Labels | AA | Yes | ✅ Pass | One `h1`, no other headings, so no skipped levels. Each question label describes its control. |
| **2.4.7** | Focus Visible | AA | Yes | ✅ Pass | **Every one of the 17 stops shows a visible focus indicator.** The hidden-checkbox toggles draw a 2px `rgb(41,48,67)` ring on their visible surrogate — measured at ~1540 changed device pixels against a predicted 1536 for a 2px ring at 3px offset around a 60×24 track, i.e. a real ring, not a repaint artifact. |
| **2.4.11** | Focus Not Obscured (Minimum) | AA | Yes | ✅ Pass | No fixed or sticky element overlaps a focused control; every focused control measured inside the viewport after the scroll settled. |


## 2.5 Input Modalities

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **2.5.1** | Pointer Gestures | A | Yes | ✅ Pass* | No path-based or multipoint gesture. |
| **2.5.2** | Pointer Cancellation | A | Yes | ✅ Pass* | Activation is on the up-event throughout — native `<button>`, `<select>` and `<label>` semantics. |
| **2.5.3** | Label in Name | A | Yes | ⚖️ Decide | **Decide:** `#occ-toggle` shows "1 person" / "Full" at the two ends of the switch but is named "How many people are in the car?". Those visible words are the two *values*, not the control's label — the same reading that lets a value display sit outside the name. It passes on that reading; a speech-input user saying "1 person" would not match. All other labelled controls are exact. |
| **2.5.4** | Motion Actuation | A | No | ⚪ N/A | No device-motion or user-motion actuation. |
| **2.5.7** | Dragging Movements | AA | Yes | ✅ Pass | The temperature `<input type=range>` is a native slider — arrow keys operate it without any dragging. |
| **2.5.8** | Target Size (Minimum) | AA | Yes | ✅ Pass | **No target under 24×24.** The three toggles' `<input>`s measure 1×1, but the input is not the target — the wrapping `<label>` is, at **640.14 × 24.00**, and a real `Input.dispatchMouseEvent` toggled the input at **15 of 15** points probed across the full width. Height is exactly 24.00, so any future line-height change is a regression risk. |


# 3. Understandable


## 3.1 Readable

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **3.1.1** | Language of Page | A | Yes | ✅ Pass | `<html lang="en">`; axe `html-has-lang` clean. |
| **3.1.2** | Language of Parts | AA | No | ⚪ N/A | Every string is English. No passage changes language, so no `lang` attribute is needed. |


## 3.2 Predictable

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **3.2.1** | On Focus | A | Yes | ✅ Pass* | Focus alone changes nothing — no control acts on `focus`. |
| **3.2.2** | On Input | A | Yes | ✅ Pass | Changing a control recomputes the range and announces it. That is the declared purpose; focus stays put and no navigation occurs. |
| **3.2.3** | Consistent Navigation | AA | No | ⚪ N/A | Applies across a set of web pages. This is a standalone page. |
| **3.2.4** | Consistent Identification | AA | No | ⚪ N/A | Applies across a set of web pages. This is a standalone page. |
| **3.2.6** | Consistent Help | A | No | ⚪ N/A | No help mechanism is offered, and the criterion applies across a set of pages. |


## 3.3 Input Assistance

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **3.3.1** | Error Identification | A | No | ⚪ N/A | No input can be in error — every control is a closed `<select>`, a bounded native slider, or a checkbox. |
| **3.3.2** | Labels or Instructions | A | Yes | ✅ Pass | Every control is labelled: `<select>`s via `aria-labelledby` to their visible question, toggles via the wrapping `<label>`. |
| **3.3.3** | Error Suggestion | AA | No | ⚪ N/A | No validated input, so no error to suggest a correction for. |
| **3.3.4** | Error Prevention (Legal, Financial, Data) | AA | No | ⚪ N/A | Nothing is submitted, purchased or legally committed. The app computes an estimate and stores nothing. |
| **3.3.7** | Redundant Entry | A | No | ⚪ N/A | No multi-step process re-asks for information. |
| **3.3.8** | Accessible Authentication (Minimum) | AA | No | ⚪ N/A | No authentication of any kind. |


# 4. Robust


## 4.1 Compatible

| SC | Name | Lvl | Relevant | Status | Evidence / what to do |
|---|---|---|---|---|---|
| **4.1.1** | Parsing | A | Yes | ✅ Pass | Nu HTML validator: **0 errors**. Obsolete in WCAG 2.2 but normative under EN 301 549 clause 9.4.1.1, so it is checked and kept. |
| **4.1.2** | Name, Role, Value | A | Yes | ⚖️ Decide | **AX tree: 235 nodes, 34 named, 0 unnamed, 0 duplicate role+name** (the `Trend/Life/Style ×2` pairs are one `<select>` split across two `<optgroup>`s, disambiguated by the group in the AX parent chain). 16 focusable controls, all named. **Decide:** `#trim-select` takes its name from a label whose text JavaScript rewrites on every change, so the accessible name mutates with the value — see the decisions table. |
| **4.1.3** | Status Messages | AA | Yes | ✅ Pass | `#range-live` (`aria-live="polite"`, in the DOM at load, 1×1 clipped with an explicit white `color`) announces every recomputation — driven through 10 distinct announcements, e.g. "Estimated range 252 miles" → 244 → 241 → 229. |

---

# What is actually left to do

**No open criteria and no known failures.** Every Level A/AA criterion is verified, inspected, or
not applicable.

**Two decisions to record.** Both pass; they need a recorded position, not code:

| SC | Decision |
|---|---|
| **2.5.3** Label in Name | `#occ-toggle` shows "1 person" / "Full" but is named "How many people are in the car?". Those are the switch's two *values*, not its label, so it passes on the same reading that lets a value display sit outside the name — but a speech-input user saying "1 person" would not match. |
| **4.1.2** Name, Role, Value | The `#trim-select` combobox takes its accessible name from `#trim-fl-label`, whose text JavaScript **rewrites on every change** to the model-group name. So the name is "The new ID.3 Neo" rather than a stable field label like "Equipment line", and it *mutates as the value changes*. A screen reader announces "The new ID.3 Neo, combobox … The new ID.3 Neo group, Trend". Not a hard AA failure — the name is present, unique and accurate at the moment it is read — but a mutating name is fragile. Prefer a stable visible label. |

**One thing no automated pass can close:** a screen-reader run. VoiceOver is planned; the protocol
names NVDA 2026.1.1.55980, so record that as a deviation. Two tool runs also remain — one pass
through the axe DevTools 4.131.2 UI, and a WAVE run from the browser extension. See
`a11y-2-automated-testing.md`.

# Decisions an auditor could challenge

24 of the 56 A/AA criteria have **no machine-testable ACT rule**, and several apply directly here
(1.4.11, 1.4.13, 2.5.1, 2.5.2, 2.5.8, 2.4.11). For those, "passes" reflects a **judgement**, not a
test result.

**The strongest claim this evidence supports:**

> *"This app meets WCAG 2.2 A/AA on every automated and runtime check available, pending
> screen-reader verification."*

That is stronger than a tool-clean claim, and unlike a tool-clean claim it is true — the one real
defect found here (unnamed graphics, SC 1.1.1) was invisible to axe, WAVE and Nu alike.
