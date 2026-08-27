// @ts-check
// Info modal — the single reusable dialog behind every "More information" button,
// behaviour ported from nala's #nala-range-modal. No scanner sees any of this: axe/
// WAVE/Nu only ever see a static, closed <div id="info-overlay" hidden>.
//
// describe() labels cite the WCAG 2.2 success criteria actually being tested,
// rather than inventing new shorthand codes the way the sibling files do (those
// map to a11y-3-implementation.md's own numbering, which this file predates).
//
// Real Tab/Escape/mouse events throughout, same reason as the rest of the suite:
// :focus-visible does not match a programmatic .focus(), and element.click() would
// bypass the exact paths a real interaction takes.

const { test, expect } = require('@playwright/test');
const { settle, RING } = require('./settle');

// Keys mirror MODAL_CONTENT in index.html. Kept here rather than imported so this
// suite fails loudly the moment a title changes without a matching test update.
const TRIGGERS = [
  { id: 'info-btn-distance', title: 'Road type impact on range' },
  { id: 'info-btn-speed', title: 'Motorway speed impact on range' },
  { id: 'info-btn-tyres', title: 'Tyres impact on range' },
  { id: 'info-btn-temp', title: 'Outside temperature impact on range' },
  { id: 'info-btn-ac', title: 'Cabin climate impact on range' },
  { id: 'info-btn-occ', title: 'Passenger load impact on range' },
  { id: 'info-btn-range', title: 'How your estimated range is calculated' },
];

// The CSS transition is 300ms; 350ms clears it. closeInfoModal() also has its own
// 350ms fallback timer in case `transitionend` never fires, so this must be >= that.
const TRANSITION_MS = 350;
const CLOSE_SETTLE_MS = 500;

const modalState = (page) => page.evaluate(() => ({
  hidden: document.getElementById('info-overlay').hidden,
  isOpen: document.getElementById('info-overlay').classList.contains('is-open'),
  activeId: document.activeElement && document.activeElement.id,
  anchorTag: document.getElementById('info-modal-focus-anchor') && document.getElementById('info-modal-focus-anchor').tagName,
  mainInert: document.getElementById('sim-main').hasAttribute('inert'),
  topbarInert: document.getElementById('topbar').hasAttribute('inert'),
  title: document.getElementById('info-modal-title').textContent,
}));

test.describe('SC 2.4.3 / 4.1.2 — opening a trigger reveals the dialog with the right name and focus', () => {
  for (const { id, title } of TRIGGERS) {
    test(`#${id} opens with the right title, focus on the body, background inert`, async ({ page }) => {
      await settle(page);
      await page.click(`#${id}`);
      await page.waitForTimeout(TRANSITION_MS);

      const s = await modalState(page);
      expect(s.hidden, 'overlay must be revealed').toBe(false);
      expect(s.isOpen, 'is-open class drives the CSS transition').toBe(true);
      expect(s.title, 'dialog title must match THIS trigger, not a stale one left by a previous open').toBe(title);
      // A screen reader announces the dialog's accessible name (this h2, via
      // aria-labelledby) on open but not the body text — landing focus on the
      // close button instead would leave the explanation unread.
      expect(s.activeId, 'focus must land on the first paragraph, not the close button or the whole body container').toBe('info-modal-focus-anchor');
      expect(s.anchorTag, 'the focus anchor must be the first real content block (a <p> for every current entry), not the container').toBe('P');
      expect(s.mainInert, '#sim-main must be inert while the dialog is open').toBe(true);
      expect(s.topbarInert, '#topbar must be inert while the dialog is open').toBe(true);

      const bodyText = await page.evaluate(() => (document.getElementById('info-modal-body').textContent || '').trim());
      expect(bodyText.length, 'body must not be empty').toBeGreaterThan(0);

      // Close and confirm the trap is fully released: inert cleared, focus back
      // on the exact button that opened it (not just "some" focusable element).
      await page.keyboard.press('Escape');
      await page.waitForTimeout(CLOSE_SETTLE_MS);
      const after = await modalState(page);
      expect(after.hidden, 'Escape must close the dialog').toBe(true);
      expect(after.mainInert, 'inert must be cleared on close, or every other control stays untabbable').toBe(false);
      expect(after.activeId, 'focus must return to the exact trigger, not just anywhere').toBe(id);
    });
  }
});

test.describe('SC 1.3.1 — the tyres body has a genuine list', () => {
  test('renders real <ul>/<li>, not bullet characters flattened into a paragraph', async ({ page }) => {
    await settle(page);
    await page.click('#info-btn-tyres');
    await page.waitForTimeout(TRANSITION_MS);
    const counts = await page.evaluate(() => ({
      p: document.querySelectorAll('#info-modal-body p').length,
      li: document.querySelectorAll('#info-modal-body li').length,
    }));
    expect(counts.p, 'intro paragraph + closing paragraph').toBe(2);
    expect(counts.li, 'standard / winter / all-season').toBe(3);
  });
});

test.describe('SC 2.1.2 — focus trap cycles without escaping', () => {
  test('Tab cycles body -> close -> body, Shift+Tab reverses, nothing escapes to the page behind it', async ({ page }) => {
    await settle(page);
    await page.click('#info-btn-range');
    await page.waitForTimeout(TRANSITION_MS);

    const activeId = () => page.evaluate(() => document.activeElement && document.activeElement.id);
    expect(await activeId()).toBe('info-modal-focus-anchor');

    await page.keyboard.press('Tab');
    expect(await activeId()).toBe('info-modal-close');

    await page.keyboard.press('Tab');
    expect(await activeId(), 'must wrap back to the focus anchor, not escape to the CTA button behind the dialog').toBe('info-modal-focus-anchor');

    await page.keyboard.press('Shift+Tab');
    expect(await activeId()).toBe('info-modal-close');
  });

  test('SC 2.4.7 — the audited orange ring appears on both the body and the close button, under real :focus-visible', async ({ page }) => {
    await settle(page);
    // Opened via real Tab + Enter, not page.click(): Chrome's :focus-visible
    // heuristic keys off the interaction MODALITY, not the .focus() call itself.
    // A mouse click on the trigger correctly shows no ring on the body afterwards
    // (a pointer user doesn't need one) — only a keyboard-driven activation does.
    // Verified empirically: the same body.focus() call reports outline-style
    // "none" after page.click() and "solid" after Tab+Enter.
    let reached = false;
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo(0, 0); });
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab');
      if (await page.evaluate(() => document.activeElement && document.activeElement.id === 'info-btn-range')) { reached = true; break; }
    }
    expect(reached, 'could not Tab to #info-btn-range').toBe(true);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(TRANSITION_MS);

    const ringOn = (id) => page.evaluate((elId) => {
      const cs = getComputedStyle(document.getElementById(elId));
      return { color: cs.outlineColor, style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) };
    }, id);

    const bodyRing = await ringOn('info-modal-focus-anchor');
    expect(bodyRing.color, 'body ring colour').toBe(RING.color);
    expect(bodyRing.style, 'body ring style').toBe(RING.style);
    expect(bodyRing.width, 'body ring width').toBeGreaterThanOrEqual(RING.minWidth);

    await page.keyboard.press('Tab');
    const closeRing = await ringOn('info-modal-close');
    expect(closeRing.color, 'close button ring colour').toBe(RING.color);
    expect(closeRing.style, 'close button ring style').toBe(RING.style);
    expect(closeRing.width, 'close button ring width').toBeGreaterThanOrEqual(RING.minWidth);
  });
});

test.describe('SC 2.1.2 — dismissal paths always escape the dialog', () => {
  test('the close button closes it and returns focus to the trigger', async ({ page }) => {
    await settle(page);
    await page.click('#info-btn-temp');
    await page.waitForTimeout(TRANSITION_MS);
    await page.click('#info-modal-close');
    await page.waitForTimeout(CLOSE_SETTLE_MS);
    expect(await page.evaluate(() => document.getElementById('info-overlay').hidden)).toBe(true);
    expect(await page.evaluate(() => document.activeElement.id)).toBe('info-btn-temp');
  });

  test('clicking the dimmed backdrop closes it', async ({ page }) => {
    await settle(page);
    await page.click('#info-btn-ac');
    await page.waitForTimeout(TRANSITION_MS);
    // A click on a viewport corner, not on the backdrop element's own centre — its
    // centre sits directly under the (much larger, centred) modal box, so a click
    // "on the backdrop" by selector alone would actually land on the modal.
    await page.mouse.click(5, 5);
    await page.waitForTimeout(CLOSE_SETTLE_MS);
    expect(await page.evaluate(() => document.getElementById('info-overlay').hidden)).toBe(true);
  });

  test('clicking inside the dialog itself does not close it', async ({ page }) => {
    await settle(page);
    await page.click('#info-btn-ac');
    await page.waitForTimeout(TRANSITION_MS);
    await page.click('#info-modal-title');
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => document.getElementById('info-overlay').hidden), 'a click inside the dialog must not be mistaken for a backdrop click').toBe(false);
  });

  test('Escape does nothing when no modal is open', async ({ page }) => {
    await settle(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => document.getElementById('info-overlay').hidden)).toBe(true);
  });
});

test.describe('info modal — the build itself', () => {
  test('opening and closing every trigger in turn throws no JS exception', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await settle(page);
    for (const { id } of TRIGGERS) {
      await page.click(`#${id}`);
      await page.waitForTimeout(TRANSITION_MS);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(CLOSE_SETTLE_MS);
    }
    expect(errors).toEqual([]);
  });
});
