# VW Range Simulator — Context Handoff Document

---

## OBJECTIVE

Build a pixel-accurate, fully interactive HTML prototype of the **VW ID.3 Neo Range Simulator** based on the Figma file `FivoE61MU1j5xtIMd6r0Ie` ("New Brand Design"). The prototype is:

- A single self-contained `index.html` (~420KB, all assets base64-embedded)
- Deployed on GitHub Pages
- Responsive across all VW breakpoints (375px → 2560px)
- Faithfully reproducing VW design system tokens, components, and interactions

---

## KEY DECISIONS

### Layout
- **CSS Grid** for the two-column layout at ≥960px:
  ```css
  grid-template: "inputs right" / 4.2fr 2.45fr;
  column-gap: 4.16vw;
  ```
- **Flex column** below 960px (single column)
- Grid area `inputs` = left input card, `right` = output panel
- Disclaimer is **outside** `.section-container` (critical — keeping it inside breaks the sticky stop)
- `position: relative` on `.section-container` for absolute positioning anchor

### Sticky Output Panel (≥960px)
```css
.right-col {
  grid-area: right;
  position: sticky;
  top: 76px;      /* 64px topbar + 12px gap */
  bottom: 0;
  align-self: start;
  z-index: 1;
}
```
- `align-self: start` keeps the item content-height (shorter than the row), giving sticky a range
- `bottom: 0` stops the panel when its bottom edge reaches the grid row bottom (= input card bottom)
- Disclaimer is outside `.section-container` so the grid row ends at the card bottom
- No JS required for the sticky stop

### Padding / Spacing
- **Topbar**: `padding: 0 4.16vw`
- **Content**: `padding-inline: 8.33vw`
- **Input card**: has `border-radius`, `background`, `box-shadow`, `padding: 40px` at ≥960px
- **Below 960px**: card wrapper stripped — `border-radius: 0`, `background: none`, `box-shadow: none`, `padding: 0`

### Typography
- VW Head (300, 400, 700) and VW Text (400, 700)
- All five weights embedded as base64 woff2 in `@font-face`
- Fallback: `'Inter', -apple-system, sans-serif`

### Colour Tokens
- `--bg: rgba(246,245,242,1)` — page background
- `--navy: rgba(27,34,54,1)` — primary text
- `--navy-dark: rgba(41,48,67,1)` — buttons, switch tracks
- `--label-blue: rgba(0,30,80,1)` — floating labels
- `--border-light: rgb(208,209,213)` — topbar bottom border (not the select border — see below)
- Select border (enabled): `rgb(110,116,126)`, deliberately darker than the real core component's
  `rgb(161,164,172)` so it clears the SC 1.4.11 3:1 floor outright; disabled selects use the real
  core's `rgb(161,164,172)` for the muted state
- Hover brown: `#997F67` / `rgba(153,127,103,1)`
- Active/focus orange: `rgba(200,108,3,1)`

### Components (all implemented)
| Component | Key spec |
|---|---|
| **Topbar** | Exact VW SVGs, sticky, 64px, `padding: 0 4.16vw` |
| **Input section card** | `border-radius: 20px`, gradient bg, box-shadow — stripped below 960px |
| **Distribution slider** | Two draggable `<button>` knobs (top/bottom edges), dashed dividers, icons float to region midpoint, labels fixed below, 0% allowed |
| **Switch (Yes/No)** | 60×24px, SVG `<rect>` border, CSS `:hover` on `.vw-switch` |
| **Toggle (1 person/Full)** | Unchecked = knob left = 1 person (default); checked = knob right = Full |
| **Temperature slider** | Rainbow gradient `270deg`, 6 snap stops (−20 to +30, step 10), tooltip inside thumb div |
| **Floating label selects** | Native `<select>` with `appearance: none`, custom label + chevron overlay. Hover: `rgba(153,127,103)`. Focus: none (focus state removed) |
| **Tyre select** | Non-floating label select (no `.fl-label`), `padding: 0 48px 0 16px; line-height: 50px` |
| **Slot machine range** | `buildSlots(container, value)` — each digit is a `.slot-digit` column with `.slot-reel`, `translateY(-Nem)`, `1.2s cubic-bezier(0.22, 1, 0.36, 1)`, 60ms stagger right-to-left |
| **Vehicle image** | Base64 webp, changes per trim (Trend=grey, Life=white, Style=blue) |

### Info Icon
- SVG `.q-icon` is placed **inside** `<span class="question-label">` as an inline element
- CSS: `display: inline-block; vertical-align: middle; margin-left: 8px; width: 20px; height: 20px`
- This keeps the icon at the end of the last line of text regardless of wrapping

### Range Calculation
- Base values tuned so displayed defaults show 252/299/380mi at +20°C default temperature:
  - `50kWh: 279mi | 58kWh: 326mi | 79kWh: 407mi`
- Distribution modifier: weighted blend — City=371, Country=394, Motorway=295 anchors, delta from neutral=353
- Temperature: linear, `(temp - 30) * (137 / 50)` — at +20°C = −27mi penalty
- Speed >120km/h: −22mi
- AC on: −15mi
- Winter tyres: −10mi
- 20" tyres: −5mi
- Full occupancy (checked): −8mi

### Tyre Options
```
Summer tyres 18"  ← default
Summer tyres 19"
Summer tyres 20"
Winter tyres 20"
All-season tyres 19"
```

### Auto tyre logic
- When temperature drops below 10°C → auto-selects `Winter tyres 20"`
- When temperature returns to ≥10°C → reverts to `Summer tyres 18"`
- `tyreAutoSelected` flag — reset to `false` when user manually changes tyre

### Trim/Battery options
Battery select label: "Motor" (no "Battery /")
Options show kW/PS only (no kWh prefix):
```
Trend: 125 kW (170 PS)
Life:  125 kW (170 PS) | 140 kW (190 PS) | 170 kW (231 PS)
Style: 125 kW (170 PS) | 140 kW (190 PS) | 170 kW (231 PS)
```

---

## CURRENT STATE

### File
- `index.html` — ~1,330 lines, ~420KB, fully self-contained
- All fonts embedded (VW Head Light/Regular/Bold, VW Text Regular/Bold)
- All images embedded (3 car webps, base64)

### What works
- ✅ Full layout at all breakpoints
- ✅ Distribution slider with draggable knobs, floating icons, 0% support
- ✅ Temperature slider with correct gradient and snapping
- ✅ Switch / Toggle components with hover states
- ✅ Select hover states (hover=`#997F67`)
- ✅ No focus ring on selects (removed entirely)
- ✅ Select overflow: visible on `.fl-select` (prevents outline clipping)
- ✅ Slot machine range animation (1.2s ease-out)
- ✅ Trim-driven car image swap
- ✅ Battery options filtered by trim
- ✅ Sticky output panel (right column) — `position: sticky; top: 76px; bottom: 0; align-self: start`
- ✅ Sticky scroll stop — disclaimer moved outside `.section-container`
- ✅ Input card wrapper stripped below 960px
- ✅ Info icon inline at end of question text
- ✅ Sticky result bar (mobile/tablet) — slides up from bottom when result section bottom is out of view
- ✅ Sticky result bar shows trim name (e.g. "The new ID.3 Neo Trend"), updates on trim change
- ✅ Sticky result bar click scrolls to `#model-selection` with 80px topbar offset
- ✅ Sticky result bar drives slot machine animation via shared `buildSlots()`

### What is partially working / open
- ⚠️ **Sticky result bar visibility** — currently shows whenever result section bottom is out of view. A "show only after first full view" gate was attempted but tricky because the section is taller than the viewport on mobile. Currently set to always-on.

---

## RESPONSIVE BREAKPOINTS

```css
/* Base (≥960px): two-column grid */
/* <1280px: rs-header padding 32px */
/* <960px: single column, input card wrapper stripped */
/* <768px: rs-headline 24px, rs-header padding 28px */
/* <560px: section-container gap 32px, input-section gap 32px */
/* <440px: rs-headline 22px, input-section gap 28px */
/* <375px: rs-headline 20px, input-section gap 24px */
```

---

## CONSTRAINTS & PREFERENCES

### Interaction style
- Jay is a product designer, not a developer — write for a developer audience when explaining, but keep responses **direct and output-first**
- **No unsolicited changes** — surgical fixes only, exactly what's asked
- **No rewrites** — if one line needs changing, change one line
- Push back on vague requests, ask for clarification when needed
- Source all design decisions from Figma when possible

### Code style
- Single-file HTML — no external dependencies except embedded base64
- CSS: token-based where possible (`var(--navy)` etc.)
- JS: vanilla, no frameworks, minimal and readable
- Prefer CSS over JS — only use JS when CSS cannot solve the problem
- No `!important` unless absolutely necessary

### Design fidelity
- Every measurement, colour, and font weight sourced from Figma
- Use exact SVG paths from Figma exports
- VW brand colours only

---

## JS FUNCTION MAP

| Function | Purpose |
|---|---|
| `buildSlots(container, value)` | Builds/updates slot machine digit reels in a container. Called for both `#range-display` and `#sticky-range-display` |
| `rollSlots(target)` | Calls `buildSlots` on both display containers |
| `updateRange()` | Reads all inputs, computes range, calls `rollSlots` |
| `updateBatteryOptions()` | Filters battery select options by trim |
| `updateCarImage()` | Swaps car image by trim |
| `syncSelectValue(sel)` | Updates custom select display value |
| `initSlider(id, tooltipId, thumbId)` | Temperature slider init |
| `initDistSlider()` | Distribution slider drag init |
| `checkVisibility()` | Scroll listener — shows/hides sticky result bar |
| `updateStickyLabel()` | Syncs sticky bar label to selected trim name |

---

## STICKY RESULT BAR

```html
<div class="sticky-result" id="sticky-result" aria-hidden="true">
  <div class="result-header">
    <div class="result-headline-row">
      <span class="result-headline-label" id="sticky-model-label">The new ID.3 Neo Trend</span>
    </div>
    <div class="result-value" id="sticky-range-display"></div>
  </div>
</div>
```

- Fixed to bottom, full viewport width, `background: var(--navy)`
- Slides up via `transform: translateY(0)` on `.visible` class
- Hidden above 960px via `display: none`
- JS: `checkVisibility()` on scroll — shows when `rect.bottom > window.innerHeight` or `rect.bottom <= 0`
- Click navigates to `#model-selection` with 80px offset

---

## FIGMA REFERENCE

- **File:** `FivoE61MU1j5xtIMd6r0Ie` — "New Brand Design"
- **Page:** 🟡 Display Battery Capacity
- **Main node:** `7141:115744` — "Range Simulator / Laptop / 1440 / Default"
- **Input panel:** `7141:115750`
- **Result section:** `7141:116000`
- **CTA button:** `7141:116001`
- **Select component:** `I7141:115999;476:66124;6120:227238`
- **Figma MCP:** WebSocket Console plugin on port 9223, `figma_execute` as primary method

---

## ENVIRONMENT

- Output file: `/mnt/user-data/outputs/index.html`
- GitHub Pages deployment: user uploads `index.html` to repo root
- Browser target: Chrome, Safari, Firefox, Edge (modern versions)
- Viewport range: 375px → 2560px+
