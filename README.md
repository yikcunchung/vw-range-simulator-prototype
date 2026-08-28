# VW Range Simulator — accessibility reference build

A working, WCAG 2.2 AA reference build. **It is a behavioural specification, not source to copy.** The defects that shipped here were invisible to every automated tool — they were found only by reading the accessibility tree.

**Live:** https://yikcunchung.github.io/vw-range-simulator-prototype/

---

## If you are the developer porting this — read this section only

You need **six things**. Everything else in this repo is evidence for auditors.

### 1. 16 inline SVGs must be aria-hidden or named

```
<!-- decorative -->
<svg aria-hidden="true" focusable="false">…</svg>

<!-- meaningful -->
<svg role="img" aria-label="ID.3 Neo exterior">…</svg>
```

**Why:** The 16 decorative SVGs shipped unnamed. Chrome maps a bare <svg> to role=image with an empty name.

> axe returns inapplicable for an <svg> without a role — not a pass. The accessibility-tree assertion in the Definition of Done is what proves it.

### 2. Animated digit reels must be aria-hidden; publish the real value as text

```
<div class="slot-reel" aria-hidden="true">…</div>
<p class="sr-only" id="range-live" aria-live="polite">Estimated range 252 miles.</p>
```

**Why:** The result was exposed as "0123456789012345…" — every digit in every column — instead of "252 miles".

> The live region carries the answer. aria-hidden on the reel keeps the intermediate digits out of the tree.

### 3. The toggle switch input cannot use display:none

```
/* ✗ */  .vw-switch input { display: none; }
/* ✓ */  .vw-switch input { position: absolute; width: 1px; height: 1px; margin: -1px;
                             overflow: hidden; clip: rect(0,0,0,0); clip-path: inset(50%); }
```

**Why:** display:none removes an element from the focus order AND the accessibility tree simultaneously.

> Visually hidden via clip or opacity keeps it in the tree and keyboard-reachable.

### 4. The live region is empty at rest

```
<p id="range-live" class="sr-only" aria-live="polite" aria-atomic="true"></p>
```

**Why:** A live region already populated at first paint is read as page content, not an update.

> Write to it on change, clear it after ~3s. Never populate it at load.

### 5. Image alt must be reassigned whenever src is

```
// ✓
img.src = variant.src;
img.alt = variant.alt;   // together, never apart
```

**Why:** The car image src changes per variant; alt that does not follow describes an image the user is not looking at.

> SC 1.1.1 failure. axe passes it because a name is present; only the wrong name is invisible to tools.

### 6. Every focusable control has a visible focus ring

```
.fl-select select:focus-visible { outline: 2px solid #C86C03; }
```

**Why:** .fl-select select set outline:none with a comment claiming JS handled focus. No such JS existed.

> Never remove outline without a named replacement. Four stops painted zero indicator pixels at audit.

---

## How you know you are done

```bash
npm install
npm test
```

**232 tests over 4 viewports.** They encode all six rules above plus the scanner checks. Green means you have it.

> **These six exist because every one of them was invisible to axe, WAVE and Nu.**

---

## Everything else in this repo

You do not need these to build.

| File | Who it is for |
|---|---|
| [`a11y-3-implementation.md`](a11y-3-implementation.md) | The full version of the six rules, plus 17 more standard for any VW app. |
| [`a11y-2-automated-testing.md`](a11y-2-automated-testing.md) | What the tools prove, the test procedure, and the recorded results. |
| [`a11y-1-criteria.md`](a11y-1-criteria.md) | All 56 WCAG A/AA criteria, one row each. For the auditor — look up, don't read through. |

## One known failure, not yours to fix

The `<select>` border is `rgb(161,164,172)` — **2.29:1** against the page where WCAG needs 3:1. Core component value — raise it upstream, never darken locally. (`#8b8e96` passes at 3.01:1.)
