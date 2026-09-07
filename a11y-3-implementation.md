# A11y 3 of 3 — What to build

**App:** VW Range Simulator (`range-simulator`). **Target:** production vw.com — AEM + React SPA Editor +
styled-components.
**Companions:** `a11y-1-criteria.md` (every criterion, pass/fail) ·
`a11y-2-automated-testing.md` (what the tools can and cannot prove).

**Scope:** the whole page. This app is standalone — there is no component-versus-page split.

> **Do not copy the reference build.** It is vanilla HTML/JS and it is a *behavioural
> specification*, not source to port. A meaningful share of the required behaviour lives in
> JavaScript — a port that copies the DOM and rewrites the logic will silently drop it.

---

## Start here — the defect that shipped, and that no tool caught

**16 decorative inline `<svg>`s were exposed as unnamed graphics — not one required-toolchain tool
saw them:** axe 0 violations/98 rules, WAVE 0 errors, Nu 0 errors. Only the accessibility tree
caught it — Chrome maps a bare `<svg>` to `role=image`, `name=""`, `ignored=false` (**not**
decorative by default); `svg-img-alt`/`role-img-alt` are **inapplicable** to a roleless `<svg>`,
`image-alt` only inspects `<img>`.

Fixed with `aria-hidden="true"`. **SC 1.1.1 is the rule; the AX-tree assertion in the Definition of
Done is what keeps it fixed.** Every `.q-icon` SVG already carried it — these 16 were simply
missed.

**Before quoting any figure in this pack, confirm the local checkout matches the deployed build.**

---
# 1. Semantics and naming

### SC 1.1.1 — Every inline `<svg>` is either named or hidden

**Level A**

Chrome maps a bare `<svg>` to `role=image`, `name=""`, `ignored=false`. It is therefore **exposed to
assistive technology as an unnamed graphic** — it is not "decorative by default".

```jsx
// ✗ exposed, unnamed — this is the defect that shipped
<svg width="24" height="24" viewBox="0 0 24 24"><path d="…"/></svg>

// ✓ decorative: remove it from the tree
<svg aria-hidden="true" focusable="false" width="24" height="24">…</svg>

// ✓ meaningful: give it a role AND a name
<svg role="img" aria-label="Volkswagen" width="32" height="32">…</svg>
```

> **No scanner catches this.** `svg-img-alt`/`role-img-alt` are **inapplicable** to a roleless
> `<svg>`; `image-alt` only inspects `<img>`. axe, WAVE, Nu all returned clean carrying up to 16 of
> these. **The AX tree is the only check that works** — assert `0` unnamed, non-`ignored`
> `role=image` nodes.

**In React:** put it in the icon component itself, so it cannot be forgotten per call site.

```jsx
export const Icon = ({ label, ...p }) =>
  label ? <svg role="img" aria-label={label} {...p}/> 
        : <svg aria-hidden="true" focusable="false" {...p}/>;
```

---

### SC 4.1.2, 2.4.4 — An icon-only control needs a real name, not a hidden one

**Level A**

If a control's only content is an icon, the control carries `aria-label`; the icon inside it is
`aria-hidden`. Never name the icon and leave the button unnamed — the name must sit on the thing
that is focusable.

---

### SC 1.3.1, 4.1.2 — A `<select>` is named by its visible label

**Level A**

Use `aria-labelledby` pointing at the visible label element. Do not retype the label into an
`aria-label` — that is how the visible text and the name drift apart (see SC 2.5.3 above).

**Trap:** a `<select>`'s `<option>` text is **not** its label. An audit that compares concatenated
option text against the accessible name will manufacture failures that do not exist.

---

### SC 2.5.3 — The visible label sits inside the accessible name

**Level A**

If a control has a visible text label, the accessible name must **contain that text, contiguously**
— otherwise a speech-input user cannot activate it by saying what they see.

```jsx
// ✗ visible "Motor / Battery Capacity", name "Motor and battery capacity"
//   one character — "/" written as the word "and" — is a Level A failure
// ✓ append, never splice — extending the visible text is fine, rewording it is not
```

**axe has no rule for this at all.** It must be checked by hand, against the accessibility tree.

---

### SC 1.3.1, 2.4.1, 2.4.6 — One `h1`, no skipped levels, real landmarks

**Level A / AA**

One `h1`; heading levels descend without gaps; `role="banner"` on the topbar and a `<main>`; and a
skip link as the **first** tab stop, pointing at an id that exists.

---

### SC 1.3.1 — Each FAQ item is a `role="group"` around its question and answer

**Level A**

`div.faq-item[role="group"]` wraps each of the 7 question/answer pairs. Without it a screen
reader hears an isolated expand/collapse button, with no cue it belongs to a set — `role="group"`
gives the pair a container an AT can announce membership in.

---

### SC 4.1.3 — A visually hidden polite live region, updated on every path

**Level AA**

```html
<p id="range-live" class="sr-only" aria-live="polite"></p>
```

The region must already be in the DOM at load — injecting it and writing to it in the same tick is
not announced. Write to it from **every** path that changes the result, not just the common one.

> **Keep the `.sr-only` clip** (`position:absolute;width:1px;height:1px;clip:rect(0,0,0,0);
> clip-path:inset(50%);white-space:nowrap`) and set an explicit `color` on it — a clipped region
> inheriting a matching colour reads as a 1:1 contrast error to WAVE even though nothing renders.

---

### SC 3.1.1, 3.1.2 — `lang` on the document, and on any passage that differs

**Level A / AA**

`<html lang="en">`. If a CMS field can hold a string in another language, the component rendering it
must be able to emit `lang` alongside it.

---
# 2. Keyboard and focus

### SC 2.1.1 — Everything the mouse can do, the keyboard can do

**Level A**

Every custom control — anything that is not a native `<button>`, `<a>`, `<select>` or `<input>` —
needs an explicit key handler. Assert the **state change**, not just that the handler fired.

---

### SC 4.1.2 — A custom widget exposes role, name **and** value, on every path

**Level A**

A slider built from a `<div>` needs the full contract, and the value must be written from every
path that can change it — keyboard, drag, and click-on-track:

```html
<div role="slider" tabindex="0"
     aria-label="Current charge level"
     aria-valuemin="0" aria-valuemax="100"
     aria-valuenow="20" aria-valuetext="20 percent">
```

**Derive the ARIA from state, never set it imperatively in one branch only.** In React:
`aria-valuenow={value}`, so desync is impossible.

> **A CDP caveat, not a defect:** `Accessibility.getPartialAXTree` reports `valuetext: ""` for
> *every* ARIA widget, even with `aria-valuetext` set — not measurable over CDP, needs a real
> screen reader. Do not read that empty string as a failure.

---

### SC 4.1.2 — A select with only one real option is disabled, not offered as a choice

**Level A**

```js
sel.disabled = opts.length === 1;
```

`#battery-select` rebuilds from `batteryOptions[trim]` on every trim change; some trims (e.g.
Trend) have exactly one battery, not a real choice. The native `disabled` attribute is sufficient —
no extra ARIA needed, the browser removes it from the tab order on its own. Toggle on every
rebuild, not just at load, so it re-enables the moment a multi-option trim is selected.

> **Disabling a currently-focused control forces a native blur to `<body>`.** If a rebuild disables
> the control the user is tabbing through, focus moves away immediately — expected, not a bug, but
> a "Tab always reaches this control" test needs to branch on enabled state first.

> **Chromium's UA stylesheet applies `opacity:0.7` to `:disabled` controls**, regardless of author
> `color`. Matching an exact disabled-state spec colour (here: value `rgb(96,101,116)`, border
> `rgb(161,164,172)`, label stays navy `rgb(27,34,54)`) needs an explicit `opacity:1` override, or
> the browser's dimming stacks on top and renders lighter/greyer. Verify via
> `getComputedStyle(el).opacity`.

---

### SC 2.4.3 — Focus order matches visual order

**Level A**

Drive real `Tab` and assert `document.activeElement` at each stop. Responsive layouts are where this
breaks: a control that moves visually at a breakpoint must move in the DOM too, not be repositioned
with CSS `order`.

---

### SC 2.4.7 — A visible focus indicator on every control, styled consistently

**Level AA**

`outline: 2px solid var(--focus-orange); outline-offset: 0`, applied to **every** focusable thing
incl. skip links and inline links — a default-ring fallback still passes but is a visible
inconsistency, the first thing an auditor notices. Match current design tokens; keep colour+offset
uniform site-wide.

**Never remove an outline without replacing it.** If the real control is a hidden `<input>` behind
a styled surrogate, style the ring on an ancestor containing the input, so it fires even though the
surrogate itself has no outline of its own:

```css
.vw-switch:has(input:focus-visible) { outline: 2px solid var(--focus-orange); outline-offset: 0; }
```

---

### SC 2.4.11 — A focused control is never left under sticky chrome

**Level AA**

Use `scroll-padding-top` / `scroll-padding-bottom` on the scroll container equal to the height of
the fixed bars, or a `focusin` handler that scrolls the control clear. Verify by measuring the
focused control's rect against the viewport **after the scroll settles** — a synchronous read right
after `.focus()` catches a smooth scroll mid-flight and reports a false failure.

---

### SC 2.1.2 — No keyboard trap

**Level A**

Tab must cycle through every stop and out the other side. Any disclosure or panel must be escapable.

---

### SC 2.1.1 — A scrollable region is keyboard reachable

**Level A** (ACT rule `0ssw9k`)

A region that scrolls must be focusable so a keyboard user can scroll it: `tabindex="0"` plus
`role="group"` and an accessible name.

> **Two rules disagree here, by construction.** axe's experimental `focus-order-semantics` flags
> `tabindex="0"` on a `role="group"` as a defect. It is tagged `best-practice` + `experimental`,
> carries **no `wcag2*` tag**, and maps to no WCAG criterion. **Keep the `tabindex`** — 2.1.1 wins.

---
# 3. Pointer and targets

### SC 2.5.8 — Every target is at least 24×24 CSS px

**Level AA**

> **axe will not catch this for you.** `target-size` is `enabled: false` by default in axe-core
> 4.13.0, so a stock run reports "0 violations" without testing target size at all. Turn it on:
> `axe.run(el, { rules: { 'target-size': { enabled: true } } })`.

A visually small control can still be a compliant target if a transparent `::before` enlarges the
**hit area** — and that is a legitimate technique, not a loophole. WCAG defines a target as "the
region of the display that will accept a pointer action":

```css
.thumb { width: 18px; height: 18px; }
.thumb::before {                    /* the real 24x24 target */
  content: ""; position: absolute; inset: 50% auto auto 50%;
  width: 24px; height: 24px; transform: translate(-50%, -50%);
  pointer-events: auto;             /* and the parent must not clip it */
}
```

**Prove it, do not assume it.** Ray-cast `document.elementFromPoint` outward from the centre in
0.5px steps and confirm the hit region really is ≥24×24 — and that a real drag *starts* from the
enlarged area, not just a hit-test.

**If a target genuinely is undersized**, the spacing exception is the fallback, and the test depends
on the neighbour:

- against a **full-size** neighbour: a 24px-diameter circle centred on the undersized target must
  not intersect the neighbour's **box** — i.e. **≥12px from centre to box edge**
- against **another undersized** target: **≥24px centre-to-centre**

Using centre-to-centre against a full-size neighbour is the wrong test — falsely comfortable.

---

### SC 2.5.2 — Activation happens on the up-event

**Level A**

Native `<button>` gets this free. A custom control must fire on `pointerup`/`click`, never
`pointerdown`, so a user can drag off to abort.

---

### SC 2.5.7 — Dragging always has a non-drag alternative

**Level AA**

A slider thumb that can be dragged must also respond to arrow keys, and ideally to a click on the
track. Arrow keys alone satisfy the criterion.

---
# 4. Visual

### SC 1.4.3 — Text contrast ≥4.5:1, measured on composited pixels

**Level AA**

Over a gradient, an image, or an overlapping element, axe returns **`incomplete`**, not a pass.
Those must be resolved by hand, on real pixels.

**How to measure without producing a false result:**

- `Page.captureScreenshot` `clip` is **document-absolute**; `getBoundingClientRect()` is
  **viewport-relative** — screenshot the viewport, crop in PIL with viewport-relative coords. A
  ratio of exactly `1.00:1` with one unique colour means the crop missed.
- Crop to the **glyph band** — the union of `Range.getClientRects()` over the text nodes — so the
  element's own border is excluded. A 1px border can occupy enough of a padding-box crop to be
  picked as "the background" and produce a false failure.
- Take the **dominant** background, not the worst minority colour. At 12px the glyph core is under
  1% of the crop, so the most *frequent* off-background pixel is an anti-aliasing mid-tone.

---

### SC 1.4.11 — Non-text contrast ≥3:1

**Level AA**

Control boundaries, focus rings and selected-state indicators.

---

### SC 1.4.10, 1.4.4 — No content loss at 320×256 CSS px

**Level AA**

**400% zoom is `setDeviceMetricsOverride{ width:320, height:256, deviceScaleFactor:4 }`.**
`dsf 1` is a small screen — a different test.

Content may scroll in **one** direction only. A horizontal carousel inside a bounded, keyboard-
operable region is the permitted two-dimensional exception; page-level horizontal scroll is not.

Sufficient techniques: **C31** (flexbox), **C32** (media queries + grid), **C34** (un-fix sticky).

---

### SC 1.4.12 — The text-spacing overrides must not clip anything

**Level AA**

```css
* { line-height:1.5 !important; letter-spacing:.12em !important; word-spacing:.16em !important; }
p { margin-bottom:2em !important; }
```

Nothing may newly clip, no control may be lost, no horizontal scroll may appear.

> **Build target sizes from `padding`, not `line-height`.** This criterion invites overriding
> `line-height`, so a 24px target built on line-height collapses under the very override being
> tested — padding is unaffected.

> **Fix the width first, not just the recovery path.** A `<select>`'s floating label (e.g. "Motor /
> Battery Capacity") can run out of room if two selects share a row. `.select-group` stacks them
> vertically, unconditionally (this grid's available width is non-monotonic across viewports, so no
> single breakpoint holds) — zero clipping verified at every tested width.
>
> As a belt-and-suspenders safeguard, wrap that select's `<option>`s in a matching `<optgroup
> label="…">`, so opening the select (its own normal operation) reveals the text in full:
> ```html
> <select aria-labelledby="battery-fl-label">
>   <optgroup label="Motor / Battery Capacity">
>     <option value="50">125 kW (170 PS) · 50 kWh</option>
>   </optgroup>
> </select>
> ```
> Do this everywhere the select's `innerHTML` is rebuilt — a static fix alone is undone once JS
> rebuilds the options. The optgroup is a safety net, not the primary fix: without a layout fix
> too, a label must actually fit, or the criterion is a real failure.

---

### SC 1.3.4 — Never lock orientation

**Level AA**

No `@media (orientation:)` rule that hides or restricts content.

---
# 5. React, styled-components and AEM — the ones that bite

1. **`styled-components` drops unknown props.** `aria-*` and `role` pass through on DOM elements but
   **not** through a custom component unless you forward them. Spread `{...rest}` onto the DOM node.
2. **AEM `EditableComponent` injects a wrapper `<div>`.** Anything relying on a parent-child ARIA
   relationship (a `radiogroup` owning its radios, `aria-labelledby` across a boundary) breaks when
   each child becomes separately authorable. Keep such a group as **one** component, or wire
   `aria-owns` explicitly.
3. **Conditional rendering destroys focus.** Unmounting a panel while focus is inside drops focus to
   `<body>`. Return focus to the opener explicitly.
4. **`useId()` for every label association** — hand-written ids collide once a component is placed
   twice on a page, and `duplicate-id-aria` is a real failure.
5. **A CSS-in-JS `:focus-visible` must survive minification.** Verify the ring in the built bundle,
   not just in dev.
6. **Icons: name or hide at the component boundary** (SC 1.1.1). A per-call-site decision will be missed.
7. **Live regions must mount before they are written to.** Render the region unconditionally; write
   into it on update.

---

# 6. Definition of Done

- [ ] **axe with `target-size` explicitly enabled** — it is off by default, so without that line CI
      passes SC 2.5.8 without ever testing it
- [ ] **Accessibility tree asserted** — `0` unnamed `role=image` nodes, `0` unnamed interactive
      nodes, every duplicate role+name pair reviewed
- [ ] **Real keyboard run** — Tab / Shift+Tab / Enter / Space / Arrows / Escape, asserting
      `document.activeElement` and the resulting state at each step
- [ ] **All states, not just the default** — expand every disclosure, open every panel, select every
      option, and re-run the checks after each
- [ ] **Reflow at 320×256 @ dsf 4** — nothing lost, no page-level horizontal scroll
- [ ] **Contrast on composited pixels** wherever text sits over a gradient or imagery
- [ ] **SC 2.5.3 by hand** — visible label contained in the accessible name. No tool does this
- [ ] **Names are correct**, not merely present and unique — read each against what it describes
- [ ] **Screen reader** — one pass with NVDA or VoiceOver. Not optional
- [ ] **The suite fails when it should** — inject the defect and confirm the detector fires

---

# 7. App-specific notes

**Two patterns, not three.** `#speed-toggle`/`#ac-toggle` are hidden `<input type="checkbox">`s
(1×1, `clip-path:inset(50%)`) inside `<label class="vw-switch">`. Occupancy (`#occ-1p`/`#occ-full`)
is a native two-radio `role="radiogroup"` — one of two *named* states, not on/off, so
`role="switch"` was the wrong shape.

```html
<label class="vw-switch">
  <input id="speed-toggle" type="checkbox" role="switch"  <!-- 1x1, clipped, still focusable -->
         aria-labelledby="q-speed lbl-no"                 <!-- re-pointed to the current value on every change -->
         onchange="updateRange(); updateToggleValueLabel(this, 'q-speed', 'lbl-no', 'lbl-yes')">
  <span class="sr-only">Motorway driving</span>
  <span class="vw-switch-track">…</span>                  <!-- fixed 60x24, does NOT stretch to the row -->
</label>

<div class="vw-toggle" role="radiogroup" aria-labelledby="q-occ">
  <label class="vw-toggle-opt"><input type="radio" name="occ" id="occ-1p" checked><span>1 person</span></label>
  <span class="vw-toggle-track"><span class="vw-toggle-knob"></span></span>
  <label class="vw-toggle-opt"><input type="radio" name="occ" id="occ-full"><span>Full</span></label>
</div>
```

```css
/* the ring is drawn on the label/container that HAS the focused input, not a sibling
   combinator on the track — this generalises to the radiogroup's two separate labels */
.vw-switch:has(input:focus-visible),
.vw-toggle:has(input:focus-visible) {
  outline: 2px solid var(--focus-orange); outline-offset: 0; border-radius: 12px;
}
```

1. **SC 2.5.8** — input is 1×1, target is `label.vw-switch`, fixed **60×24** (`align-self:
   flex-start` stops it stretching to the row). `label.vw-toggle-opt` was found at only **~20px
   tall** — test selector didn't match the real class (`vw-toggle-opt`). Fixed:
   `display:inline-flex;align-items:center;min-height:24px` → 59.56×24/25.16×24, selector corrected.
   **Lesson:** build height from an explicit box property, not line-height.
2. **SC 2.4.7** — audited ring `2px solid #C86C03` (`--focus-orange`, matches nala's focus colour),
   `outline-offset:0`, drawn via `:has(input:focus-visible)` on the label/container. Assert the
   *computed* colour (`rgb(200,108,3)`) after a real `Tab` — `:focus-visible` never matches `.focus()`.
3. **SC 2.1.1** — `Space` toggles `#speed-toggle`/`#ac-toggle` (real `<input type="checkbox">`).
   Occupancy radiogroup needs no `Space`: arrow keys move the native selection, the correct and
   sufficient path for a `radiogroup`.

**Don't "simplify" either pattern to a bare `<div role="switch">`/`role="radio">`** — you'd lose
native `Space`/arrow-key handling and label-as-target geometry, rebuilding both by hand.

**`aria-labelledby` wins over the wrapping `<label>`.** The switches' `sr-only` spans are an
*unused* name source (exposed name comes from `aria-labelledby`), kept only for WAVE's empty-label
heuristic. Occupancy radios are the opposite: no `aria-label`/`aria-labelledby`, name comes from the
`<label>` — "1 person"/"Full" exactly.

**SC 2.5.3 is no longer a decision on this app.** The old single-switch showed "1 person"/"Full"
as two *values* of one control — arguable. Splitting into two native radios removed the ambiguity:
each radio's visible label **is** its accessible name, verbatim. See `a11y-1-criteria.md`.
