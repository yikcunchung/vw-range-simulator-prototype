// Shared setup. Everything here polls for a real condition — never a fixed sleep,
// because two honest runs would then disagree and the disagreement would be silent.
//
// ── THE INIT GATE ────────────────────────────────────────────────────────────────
// This app does NOT defer itself behind an IntersectionObserver. Verified: there is
// no `IntersectionObserver`, `MutationObserver` or `ResizeObserver` anywhere in
// index.html. The sibling Visualizer gates `initVisualizer()` on an observer
// watching an element ABOVE the component, so a programmatic jump to the component
// skips the gate and every test then passes against an empty shell — that trap does
// not exist here, and this file must not pretend it does.
//
// What DOES exist is a single `window.addEventListener('DOMContentLoaded', ...)`
// handler that builds a large part of the audited surface. Before it runs, the
// markup is not what the audit measured:
//
//   · #range-display and #sticky-range-display ship EMPTY. `buildSlots()` injects
//     the `.slot-digit` reels. Audit those divs early and you audit two empty divs.
//   · #battery-select ships with THREE static <option>s (50 / 58 / 79 kWh).
//     `updateBatteryOptions()` REPLACES them with the set for the selected trim —
//     one option for the Trend default. An early read sees three options that the
//     user can never have.
//   · initDistSlider() -> setPositions() writes the inline width/height/opacity on
//     #dist-icon-*, the `.dist-seg-pct` percentages and aria-valuenow on both
//     thumbs. Before it runs the icons have no inline size at all.
//   · initSlider() writes #temp-thumb's inline `left` and the tooltip text.
//
// So the gate is real, it is just `DOMContentLoaded` rather than an observer. Note
// that `goto(..., { waitUntil: 'domcontentloaded' })` can resolve in the same tick
// as the handler, so waiting on the navigation is NOT waiting on the build. Every
// marker polled below is one the static markup provably does not contain, so the
// suite fails loudly rather than quietly measuring an unbuilt page.

const ROOT = '#sim-main';

// Counts the audited build actually has. Asserted, not assumed — a config that
// drifts from the DOM is how a suite ends up measuring nothing.
const EXPECTED = {
  distThumbs: 2,  // #dist-thumb-1, #dist-thumb-2 — the only role="slider" elements.
                  // #temp-slider is a native input[type=range], so the AX tree shows
                  // three sliders while only two carry the role attribute.
  toggles: 3,     // #speed-toggle, #ac-toggle, #occ-toggle
  selects: 3,     // #tyre-select, #trim-select, #battery-select
  infoBtns: 7,    // the .q-icon-btn "More information" buttons, incl. the one
                  // on the result panel's "Estimated range" headline
};

// The three toggles are a visually hidden <input> behind a styled surrogate, so the
// focus ring cannot be on the input — it is drawn on the sibling named here via
// `input:focus-visible ~ <surrogate>`. Same for the range input, which is opacity:0.
const RING_SURROGATE = {
  'speed-toggle': '.vw-switch-track',
  'ac-toggle': '.vw-switch-track',
  'occ-toggle': '.vw-toggle-track',
  'temp-slider': '.slider-thumb',
};

// The audited ring: `outline: 2px solid var(--focus-orange)` where --focus-orange
// is #C86C03 (matches nala's focus colour). Browsers normalise that to
// rgb(200, 108, 3), so a source-text check would pass while the ring was broken
// — assert the COMPUTED value.
const RING = { color: 'rgb(200, 108, 3)', style: 'solid', minWidth: 2 };

// The nine rules axe-core ships with `enabled: false`. `target-size` among them is
// SC 2.5.8 — a stock run reports "0 violations" having never tested target size
// (a11y-2 trap 1). Force-enable all nine, then assert target-size actually ran.
const DISABLED_BY_DEFAULT = [
  'target-size', 'aria-roledescription', 'color-contrast-enhanced',
  'duplicate-id', 'duplicate-id-active', 'identical-links-same-purpose',
  'landmark-complementary-is-top-level', 'meta-refresh-no-exceptions', 'audio-caption',
];

/**
 * Navigate, wait for the DOMContentLoaded build to finish, and prove it finished.
 * Returns the component root locator.
 */
async function settle(page) {
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

  // Guard against auditing the wrong document entirely. This is not paranoia: the
  // sibling prototypes' suites shared port 4175, and `reuseExistingServer` happily
  // hands you another app's index.html — a run that then reports "0 violations"
  // about a page you were not testing. Assert the title AND the component root.
  await page.waitForFunction(() => document.title === 'Volkswagen Range Simulator'
    && !!document.getElementById('sim-main'), null, { timeout: 15_000 });

  // Built, not merely present. Each marker is absent from the static markup.
  await page.waitForFunction(() => {
    const slots = document.querySelectorAll('#range-display .slot-digit').length;
    const icon = document.getElementById('dist-icon-0');
    const thumb = document.getElementById('temp-thumb');
    const pct = document.querySelector('#dist-label-0 .dist-seg-pct');
    const tip = document.getElementById('temp-tooltip');
    return slots > 0                                  // markup ships an empty div
      && !!icon && icon.style.width !== ''            // written only by setPositions()
      && !!thumb && thumb.style.left !== ''           // written only by initSlider()
      && !!pct && /%$/.test((pct.textContent || '').trim())
      && !!tip && (tip.textContent || '').trim() !== '';
  }, null, { timeout: 15_000 });

  // Fonts and images must be resolved before ANY contrast assertion. Half-painted
  // text lets axe compute a background it otherwise could not determine, which
  // flips colour-contrast findings from `incomplete` (needs review — the honest
  // answer over a gradient) into hard `violations`. That is a red suite with
  // nothing actually broken. Conditions, not sleeps.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const imgs = [...document.querySelectorAll('#sim-main img')];
    // `complete` is true for a FAILED load too, so naturalWidth is the real test.
    return imgs.length > 0 && imgs.every((i) => i.complete && i.naturalWidth > 0);
  }, null, { timeout: 15_000 });

  // The sticky result bar animates in below 960px (0.3s transform). While it is
  // mid-transition its box and its aria-hidden disagree, so let it land.
  await waitForStableBox(page, '#sticky-result');

  return page.locator(ROOT);
}

/**
 * Wait until an element's box stops changing.
 *
 * The sticky bar and the dist thumbs both animate. A control measured mid-transition
 * reports a smaller box than it ever presents to a user — in the sibling Visualizer
 * that produced a phantom 13x13 target-size failure. Polls for two identical
 * consecutive samples rather than asserting a size, so it cannot mask a real failure.
 */
async function waitForStableBox(page, selector, tries = 25) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    const box = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return `${r.width.toFixed(2)}x${r.height.toFixed(2)}@${r.top.toFixed(2)}`;
    }, selector);
    if (box !== null && box === last) return box;
    last = box;
    await page.waitForTimeout(80);
  }
  return last;
}

/**
 * Real Tab presses from the top of the document, collecting each stop.
 *
 * Tab, not `.focus()`. `:focus-visible` does not match a programmatic focus, so a
 * `.focus()`-based focus-ring check measures literally nothing, and the skip link
 * only reveals itself on `:focus`.
 */
async function tabThrough(page, max = 40) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  const stops = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const s = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body || a === document.documentElement) return null;
      const r = a.getBoundingClientRect();
      const cs = getComputedStyle(a);
      return {
        id: a.id || null,
        tag: a.tagName.toLowerCase(),
        cls: a.className && typeof a.className === 'string' ? a.className : '',
        role: a.getAttribute('role'),
        docOrder: [...document.querySelectorAll('*')].indexOf(a),
        x: r.left + window.scrollX, y: r.top + window.scrollY,
        w: r.width, h: r.height, top: r.top,
        outlineColor: cs.outlineColor, outlineStyle: cs.outlineStyle,
        outlineWidth: parseFloat(cs.outlineWidth),
        inRoot: !!document.querySelector('#sim-main')?.contains(a),
        inAriaHidden: !!a.closest('[aria-hidden="true"]'),
      };
    });
    if (!s) break;
    // Signature must be the DOM POSITION, not id/class: six .q-icon-btn buttons
    // share a class and no id, so a class-based signature stops the walk at the
    // second one and the suite silently tests 4 stops instead of 15.
    const sig = `${s.id || s.tag + '.' + s.cls}@${s.docOrder}`;
    if (stops.some((p) => p.sig === sig)) break; // wrapped round — no keyboard trap
    stops.push({ ...s, sig });
  }
  return stops;
}

/** The accessible name, computed the way the AX tree does for the sources this app uses. */
function nameOfExpr() {
  return `(el) => {
    const byIds = (v) => (v || '').split(/\\s+/).filter(Boolean)
      .map((id) => (document.getElementById(id) || {}).textContent || '').join(' ');
    const n = el.getAttribute('aria-labelledby') ? byIds(el.getAttribute('aria-labelledby'))
      : el.getAttribute('aria-label') ? el.getAttribute('aria-label')
      : el.tagName === 'IMG' ? (el.getAttribute('alt') || '')
      : (el.textContent || '');
    return n.replace(/\\s+/g, ' ').trim();
  }`;
}

/** Full AX tree over CDP — the only check that sees an unnamed inline <svg> (a11y-2 trap 10). */
async function axTree(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  return nodes;
}

module.exports = {
  settle, waitForStableBox, tabThrough, axTree, nameOfExpr,
  ROOT, EXPECTED, DISABLED_BY_DEFAULT, RING_SURROGATE, RING,
};
