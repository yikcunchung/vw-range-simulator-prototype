# VW Range Simulator / Battery Capacity — Context Handoff Document

---

## OBJECTIVE

An extended version of the VW ID.3 Neo Range Simulator that adds the **ID. Polo** as a second vehicle, with full trim/battery/range logic and dedicated car images. This was originally built as a standalone `index-battery.html`; that content has since been merged into `index.html`, which is now the only live file — this document is a historical record of the Polo/battery-capacity build, not a description of a separate file.

---

## VEHICLES & TRIMS

### The new ID.3 Neo
| Trim | Battery value | Label |
|---|---|---|
| Trend | `50` | 50 kWh / 125 kW (170 PS) |
| Life | `50` / `58` / `79` | 50–79 kWh options |
| Style | `50` / `58` / `79` | 50–79 kWh options |

### The new ID. Polo
| Trim | Battery value | Label |
|---|---|---|
| PoloTrend | `37a` | 37 kWh / 85 kW (166 PS) |
| PoloLife | `37a` / `37b` / `52a` | 37–52 kWh options |
| PoloStyle | `37b` / `52a` | 37–52 kWh options |
| PoloGTI | `52b` | 52 kWh / 166 kW (226 PS) |

### Trim select structure
```html
<optgroup label="The new ID.3 Neo">
  <option value="Trend">Trend</option>
  <option value="Life">Life</option>
  <option value="Style">Style</option>
</optgroup>
<optgroup label="The new ID. Polo">
  <option value="PoloTrend">Trend</option>
  <option value="PoloLife">Life</option>
  <option value="PoloStyle">Style</option>
  <option value="PoloGTI">GTI</option>
</optgroup>
```

---

## RANGE CALCULATION

### Base values (internal — higher than displayed due to +20°C temp penalty of −27mi)
```js
if      (batt === '79')  base = 407;   // ID.3 Neo → displays 380mi
else if (batt === '58')  base = 326;   // ID.3 Neo → displays 299mi
else if (batt === '52a') base = 300;   // Polo 155kW → displays 273mi (439km confirmed)
else if (batt === '52b') base = 282;   // Polo GTI 166kW → displays 255mi (simulated)
else if (batt === '37a') base = 226;   // Polo 85kW → displays 199mi (simulated)
else if (batt === '37b') base = 220;   // Polo 99kW → displays 193mi (simulated)
else                     base = 279;   // ID.3 Neo 50kWh → displays 252mi (406km)
```

### Distribution modifier
- City=371, Country=394, Motorway=295 anchors; neutral (33/33/33) = 353
- `distModifier = (wCity * 371 + wCountry * 394 + wMotor * 295) - 353`

### Temperature
- `base += (temp - 30) * (137 / 50)` — peaks at +30°C (0 penalty), −27mi at +20°C default

### Tyre modifiers (ID.3 Neo Trend confirmed, from 406km base = 252mi)
| Tyre | Delta |
|---|---|
| Summer 18" (default) | 0 |
| Summer 19" | −8mi (393km) |
| Summer 20" | −11mi (388km) |
| Winter 20" | −23mi (368km) |
| All-season 19" | −20mi (374km) |

### Switch/toggle modifiers (ID.3 Neo Trend confirmed)
| Input | Delta |
|---|---|
| Speed >120km/h: Yes | −39mi (343km) |
| AC/Heating: Yes | −21mi (371km) |
| Full occupancy | −13mi (384km) |

### Auto tyre logic
- When temperature drops below 10°C → auto-selects `Winter tyres 20"`
- When temperature returns to ≥10°C → reverts to `Summer tyres 18"`
- `tyreAutoSelected` flag — reset to `false` when user manually changes tyre

---

## CAR IMAGES

All embedded as base64 webp in `carImages` object:
- `Trend` → grey ID.3 Neo
- `Life` → white ID.3 Neo
- `Style` → blue ID.3 Neo
- `PoloTrend` → yellow ID. Polo (webp, transparent bg)
- `PoloLife` → white ID. Polo (webp, transparent bg)
- `PoloStyle` → blue ID. Polo (webp, transparent bg)
- `PoloGTI` → red ID. Polo GTI (webp, transparent bg, cropped 40px top/bottom)

All resized to 864×432.

---

## DYNAMIC ELEMENTS

### Floating label (`#trim-fl-label`)
- "The new ID.3 Neo" for Trend/Life/Style
- "The new ID. Polo" for PoloTrend/PoloLife/PoloStyle/PoloGTI
- Updated by `updateTrimLabel()` on trim change

### Model disclaimer (`#model-disclaimer`)
Consumption data (kWh/100mi, converted from kWh/100km × 1.60934):
```js
Trend:     '22.7–22.5 kWh/100mi'
Life:      '25.1–22.5 kWh/100mi'
Style:     '25.3–22.9 kWh/100mi'
PoloTrend: '22.8–21.0 kWh/100mi'  // simulated
PoloLife:  '23.3–21.4 kWh/100mi'
PoloStyle: '23.5–21.6 kWh/100mi'
PoloGTI:   '25.1–23.0 kWh/100mi'  // simulated
```
Updated by `updateDisclaimer()` on trim change.

### Sticky bar label
The sticky result bar no longer carries a model/trim name — `#sticky-model-label` and
`updateStickyLabel()` were removed. It now shows only the static "Estimated range" headline label
plus the live value (`#sticky-range-display`).

---

## COMPONENTS STATE

### Switches & Toggles
- All `onclick` handlers removed from tracks — `<label>` wrapper handles clicks
- Switch track fill uses `opacity` transition (not `display`) — 400ms
- Switch/toggle knob transition: 400ms
- Switch knob: 12×12px, stays same size in both states
- Switch active knob: `left: calc(100% - 18px)` (6px margin from right, matching 6px left margin)
- Toggle: unchecked = 1 person (knob left), checked = Full (knob right)

### Temperature Slider
- Track margin: `0 18px 10px` (18px each side)
- Input range: `left: -18px; right: -18px; width: calc(100% + 36px)`
- Thumb: 18×18px
- Tooltip: `padding: 8px 12px`, `bottom: calc(100% + 8px)`
- Caret: `border: 6px solid transparent` (6px tall, 12px wide)
- Tooltip align-left: `left: -9px` (from track-relative)
- Tooltip align-right: `right: -9px`
- Caret align-left: `left: 14px`
- Caret align-right: `right: 14px`
- align-left/right triggers at pct < 10 or pct > 90

### Select Focus State
- Removed entirely — no `focused-closed` class or CSS

### Slot Machine
- Transition: `1.2s cubic-bezier(0.22, 1, 0.36, 1)`
- `buildSlots(container, value)` drives both `#range-display` and `#sticky-range-display`

---

## JS FUNCTION MAP

| Function | Purpose |
|---|---|
| `buildSlots(container, value)` | Builds slot machine reels in a container |
| `rollSlots(target)` | Calls buildSlots on both display containers |
| `updateRange()` | Reads all inputs, computes range, calls rollSlots |
| `updateBatteryOptions()` | Filters battery select by trim |
| `updateCarImage()` | Swaps car image by trim |
| `updateTrimLabel()` | Updates floating label with model group name |
| `updateDisclaimer()` | Updates consumption disclaimer by trim |
| `syncSelectValue(sel)` | Updates custom select display value |
| `syncSelectDisabled(sel)` | Disables a select when it has exactly one option |
| `updateSlider(id, tooltipId, thumbId)` | Temp slider update + auto winter tyre logic |
| `initSlider(id, tooltipId, thumbId)` | Temp slider init |
| `initDistSlider()` | Distribution slider drag init |
| `checkVisibility()` | Scroll listener for sticky result bar |

---

## STICKY RESULT BAR

- Fixed bottom, full viewport width, `background: var(--navy)`
- Shows when `rect.bottom > window.innerHeight` (result section bottom out of view)
- Hidden above 960px
- Click scrolls to `#model-selection` with 80px offset
- Drives slot machine via shared `buildSlots()`
- Label: `#sticky-model-label` — full trim name, no info icon

---

## OPEN / SIMULATED DATA

- PoloTrend and PoloGTI consumption figures are simulated
- Polo 37kWh (85kW, 99kW) range figures are simulated
- Polo 52kWh GTI range is simulated (only 155kW confirmed at 439km)
- Tyre/switch modifiers calibrated for ID.3 Neo Trend only — not confirmed for Polo

---

## CONSTRAINTS & PREFERENCES

- Jay is a product designer — direct, output-first responses
- No unsolicited changes — surgical fixes only
- Single-file HTML, vanilla JS, no frameworks
- CSS token-based where possible
- VW brand colours only
- No `!important` unless absolutely necessary

---

## ENVIRONMENT

- Live file: `index.html` (the Polo/battery-capacity work described above is merged into it — there is no separate `index-battery.html`)
- Title: `Volkswagen Range Simulator`
- Browser target: Chrome, Safari, Firefox, Edge
- Viewport range: 375px → 2560px+
- Figma file: `FivoE61MU1j5xtIMd6r0Ie` — "New Brand Design"
- Figma MCP: WebSocket Console plugin on port 9223
