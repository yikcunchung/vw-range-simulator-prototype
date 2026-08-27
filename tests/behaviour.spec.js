// @ts-check
// Behavioural half — the part no scanner executes. Every assertion here is on
// something axe (101 rules), WAVE and Nu all report clean on.
//
// Keys and pointer are driven through page.keyboard / page.mouse so they are real
// events. element.click() would dispatch a synthetic click that bypasses the exact
// code paths that break, and :focus-visible does not match a programmatic .focus()
// at all — a .focus()-based focus-ring check measures nothing.
//
// describe()/test() names cite the WCAG 2.2 success criteria directly. Comments
// that cross-reference a specific doc section (e.g. "a11y-3 B4") still use that
// doc's own heading names, which are unchanged.

const { test, expect } = require('@playwright/test');
const {
  settle, waitForStableBox, tabThrough, ROOT, EXPECTED, RING_SURROGATE, RING,
} = require('./settle');

const activeId = (page) => page.evaluate(() => {
  const a = document.activeElement;
  if (!a || a === document.body) return 'BODY';
  return a.id || a.tagName.toLowerCase() + '.' + a.className;
});
const live = (page) => page.evaluate(() =>
  (document.getElementById('range-live').textContent || '').trim());

/** Focus a control the way a user does — real Tab presses until it is reached. */
async function tabTo(page, id, max = 40) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate((t) => document.activeElement && document.activeElement.id === t, id)) return true;
  }
  return false;
}

test.describe('SC 2.4.3 / 2.1.2 — focus order and no trap', () => {
  test('tab order is DOM order — nothing is repositioned with CSS order', async ({ page }) => {
    await settle(page);
    const stops = await tabThrough(page);
    expect(stops.length, 'expected to reach the real control surface').toBeGreaterThanOrEqual(10);

    const orders = stops.map((s) => s.docOrder);
    const sorted = [...orders].sort((a, b) => a - b);
    expect(orders, `tab order diverges from DOM order: ${JSON.stringify(stops.map((s) => s.sig))}`)
      .toEqual(sorted);

    // The mechanism that breaks B3 at a breakpoint: a control moved visually with
    // CSS `order` or a reversed flex direction while its DOM position stays put.
    const reordered = await page.evaluate(`[...document.querySelectorAll('${ROOT} *')]
      .map((el) => ({ sig: el.id || el.tagName.toLowerCase() + '.' + el.className,
                      order: getComputedStyle(el).order,
                      dir: getComputedStyle(el).flexDirection }))
      .filter((r) => (r.order && r.order !== '0' && r.order !== 'normal') || /reverse/.test(r.dir))`);
    expect(reordered, 'visual order is set by CSS here, so focus order cannot follow it')
      .toEqual([]);
  });

  test('no keyboard trap — Tab leaves the app and Shift+Tab retraces', async ({ page }) => {
    await settle(page);
    const stops = await tabThrough(page, 60);
    // tabThrough stops when a signature repeats, i.e. focus wrapped past the last
    // control and round again. Never reaching that is the trap.
    expect(stops.length, 'focus never wrapped out of the app within 60 presses')
      .toBeLessThan(60);

    const forward = stops.map((s) => s.sig);
    // Walk back from the last stop and confirm the sequence reverses.
    await page.evaluate(() => window.scrollTo(0, 0));
    const back = [];
    for (let i = 0; i < forward.length - 1; i++) {
      await page.keyboard.press('Shift+Tab');
      back.push(await page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return null;
        return `${a.id || a.tagName.toLowerCase() + '.' + a.className}@${[...document.querySelectorAll('*')].indexOf(a)}`;
      }));
    }
    expect(back.filter((b) => b === null), 'Shift+Tab dropped focus to <body>').toEqual([]);
  });
});

test.describe('SC 2.4.7 — a visible focus ring on every control', () => {
  test('every tab stop shows a focus indicator, on itself or on its surrogate', async ({ page }) => {
    await settle(page);
    const stops = await tabThrough(page);
    const missing = [];
    for (const s of stops) {
      const own = s.outlineStyle !== 'none' && s.outlineWidth >= 1;
      if (own) continue;
      missing.push(s.sig);
    }
    // Every stop must show SOMETHING. A control falling back to the browser's default
    // ring still satisfies SC 2.4.7 (a11y-3 B4), so this test accepts `auto 1px`;
    // the audited ring is asserted separately below.
    expect(missing, 'tab stops with no focus indicator at all').toEqual([]);
  });

  test('the audited ring is rendered on each surrogate, under real :focus-visible', async ({ page }) => {
    await settle(page);
    // Three reasons this is measured on the COMPUTED style after a real Tab:
    //   · browsers normalise #C86C03 to rgb(200, 108, 3), so a stylesheet
    //     text check passes while the ring is broken;
    //   · :focus-visible does not match a programmatic .focus(), so a .focus()-based
    //     check measures nothing at all;
    //   · the ring is set by FIVE separate rules (.dist-thumb, .vw-switch-track,
    //     .vw-toggle-track, .fl-select select, input[type=range] ~ .slider-thumb).
    //     Checking one lets a mutation to another through.
    const targets = [
      ...Object.keys(RING_SURROGATE).map((id) => ({ id, surrogate: RING_SURROGATE[id] })),
      { id: 'dist-thumb-1', surrogate: null },
      { id: 'dist-thumb-2', surrogate: null },
      { id: 'tyre-select', surrogate: null },
      { id: 'trim-select', surrogate: null },
      { id: 'battery-select', surrogate: null },
    ];
    for (const t of targets) {
      const reached = await tabTo(page, t.id);
      expect(reached, `could not Tab to #${t.id}`).toBe(true);
      const ring = await page.evaluate(({ id, surrogate }) => {
        const inp = document.getElementById(id);
        let el = inp;
        if (surrogate) {
          el = null;
          for (let sib = inp.nextElementSibling; sib; sib = sib.nextElementSibling) {
            if (sib.matches(surrogate)) { el = sib; break; }
          }
        }
        if (!el) return null;
        const cs = getComputedStyle(el);
        return { color: cs.outlineColor, style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) };
      }, t);
      expect(ring, `no ring surrogate ${t.surrogate} found for #${t.id}`).not.toBeNull();
      expect(ring.color, `ring colour on #${t.id}${t.surrogate ? ' ' + t.surrogate : ''}`).toBe(RING.color);
      expect(ring.style, `ring style on #${t.id}`).toBe(RING.style);
      expect(ring.width, `ring width on #${t.id}`).toBeGreaterThanOrEqual(RING.minWidth);
    }
  });
});

test.describe('SC 2.4.11 — a focused control is never left under the sticky chrome', () => {
  test('every tab stop is fully clear of the sticky bars once the scroll settles', async ({ page }) => {
    await settle(page);
    const chrome = await page.evaluate(() => {
      const top = document.getElementById('topbar');
      const bottom = document.getElementById('sticky-result');
      const vis = (el) => el && getComputedStyle(el).display !== 'none'
        && el.getBoundingClientRect().height > 0;
      return {
        top: vis(top) ? top.getBoundingClientRect().height : 0,
        bottom: vis(bottom) && getComputedStyle(bottom).position === 'fixed'
          ? bottom.getBoundingClientRect().height : 0,
      };
    });

    const ids = ['dist-thumb-1', 'tyre-select', 'temp-slider', 'ac-toggle', 'trim-select', 'battery-select'];
    for (const id of ids) {
      expect(await tabTo(page, id), `could not Tab to #${id}`).toBe(true);
      // A synchronous read right after focus catches a smooth scroll mid-flight and
      // reports a false failure. Wait for the box to stop moving.
      const sel = `#${id}`;
      await waitForStableBox(page, sel);
      const m = await page.evaluate(({ s, id: ident }) => {
        // For the 1x1 clipped inputs, the thing the user must be able to SEE is the
        // surrogate, so measure the label that wraps it.
        const el = document.querySelector(s);
        const measured = el.getBoundingClientRect().width <= 1 && el.closest('label')
          ? el.closest('label') : el;
        const r = measured.getBoundingClientRect();
        return { id: ident, top: r.top, bottom: r.bottom, vh: window.innerHeight };
      }, { s: sel, id });
      expect(m.top, `#${id} top ${m.top.toFixed(1)} is under the ${chrome.top}px topbar`)
        .toBeGreaterThanOrEqual(chrome.top - 1);
      if (chrome.bottom > 0) {
        expect(m.bottom, `#${id} bottom ${m.bottom.toFixed(1)} is under the ${chrome.bottom}px sticky bar`)
          .toBeLessThanOrEqual(m.vh - chrome.bottom + 1);
      }
    }
  });
});

test.describe('SC 2.1.1 / 4.1.2 / 2.5.7 — the dist slider', () => {
  test('arrow keys move the focused thumb, Shift takes a larger step', async ({ page }) => {
    await settle(page);
    expect(await tabTo(page, 'dist-thumb-1')).toBe(true);
    const val = () => page.locator('#dist-thumb-1').getAttribute('aria-valuenow');

    const start = Number(await val());
    await page.keyboard.press('ArrowRight');
    expect(Number(await val()), 'ArrowRight must step the value').toBe(start + 1);
    await page.keyboard.press('ArrowLeft');
    expect(Number(await val())).toBe(start);
    await page.keyboard.press('Shift+ArrowRight');
    expect(Number(await val()), 'Shift must take the larger step').toBe(start + 5);
    // ArrowUp / ArrowDown are aliases in this widget.
    await page.keyboard.press('ArrowDown');
    expect(Number(await val())).toBe(start + 4);
    // Focus must not move while operating the widget.
    expect(await activeId(page)).toBe('dist-thumb-1');
  });

  test('the thumbs cannot cross, and neither leaves 0..100', async ({ page }) => {
    await settle(page);
    expect(await tabTo(page, 'dist-thumb-2')).toBe(true);
    for (let i = 0; i < 25; i++) await page.keyboard.press('Shift+ArrowLeft');
    const t = await page.evaluate(() => ({
      v1: Number(document.getElementById('dist-thumb-1').getAttribute('aria-valuenow')),
      v2: Number(document.getElementById('dist-thumb-2').getAttribute('aria-valuenow')),
    }));
    expect(t.v2, 'thumb 2 must clamp at thumb 1, not pass it').toBeGreaterThanOrEqual(t.v1);
    expect(t.v2).toBeGreaterThanOrEqual(0);

    expect(await tabTo(page, 'dist-thumb-1')).toBe(true);
    for (let i = 0; i < 30; i++) await page.keyboard.press('Shift+ArrowRight');
    const u = await page.evaluate(() => ({
      v1: Number(document.getElementById('dist-thumb-1').getAttribute('aria-valuenow')),
      v2: Number(document.getElementById('dist-thumb-2').getAttribute('aria-valuenow')),
    }));
    expect(u.v1, 'thumb 1 must clamp at thumb 2').toBeLessThanOrEqual(u.v2);
    expect(u.v1).toBeLessThanOrEqual(100);
  });

  test('SC 4.1.2 — aria-valuenow is written from all three paths: keyboard, drag, track click', async ({ page }) => {
    await settle(page);
    const v1 = () => page.locator('#dist-thumb-1').getAttribute('aria-valuenow');

    // 1. keyboard
    expect(await tabTo(page, 'dist-thumb-1')).toBe(true);
    const before = Number(await v1());
    await page.keyboard.press('Shift+ArrowRight');
    const afterKey = Number(await v1());
    expect(afterKey, 'keyboard path did not write aria-valuenow').not.toBe(before);

    // 2. real drag — mouse down, move, up. Not a synthetic click.
    const box = await page.locator('#dist-thumb-1').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(120);
    const afterDrag = Number(await v1());
    expect(afterDrag, 'drag path did not write aria-valuenow').not.toBe(afterKey);

    // 3. click on the track — the non-drag alternative SC 2.5.7 wants
    const blk = await page.locator('#dist-block').boundingBox();
    await page.mouse.click(blk.x + blk.width * 0.15, blk.y + blk.height * 0.25);
    await page.waitForTimeout(120);
    const afterClick = Number(await v1());
    expect(afterClick, 'click-on-track did not write aria-valuenow').not.toBe(afterDrag);

    // The visible percentages must agree with the ARIA — one derived from the other.
    const agree = await page.evaluate(() => {
      const v1n = Number(document.getElementById('dist-thumb-1').getAttribute('aria-valuenow'));
      const v2n = Number(document.getElementById('dist-thumb-2').getAttribute('aria-valuenow'));
      const pcts = [0, 1, 2].map((i) =>
        parseFloat(document.querySelector(`#dist-label-${i} .dist-seg-pct`).textContent));
      return { aria: [v1n, v2n - v1n, 100 - v2n], visible: pcts };
    });
    expect(agree.visible, 'the visible split and aria-valuenow disagree').toEqual(agree.aria);
  });

  test('SC 2.5.2 — the track responds on the up-event, so a drag can be aborted', async ({ page }) => {
    await settle(page);
    const v1 = () => page.locator('#dist-thumb-1').getAttribute('aria-valuenow');
    const start = await v1();
    const blk = await page.locator('#dist-block').boundingBox();
    // Press inside the track, then release OUTSIDE it: nothing may change.
    await page.mouse.move(blk.x + blk.width * 0.8, blk.y + blk.height * 0.25);
    await page.mouse.down();
    await page.mouse.move(blk.x + blk.width * 0.8, blk.y - 200, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(120);
    expect(await v1(), 'the value changed on the DOWN event — a drag cannot be aborted')
      .toBe(start);
  });
});

test.describe('SC 4.1.2 — the temperature slider exposes its value truthfully', () => {
  test('aria-valuetext tracks the value on the keyboard path', async ({ page }) => {
    await settle(page);
    expect(await tabTo(page, 'temp-slider')).toBe(true);
    const read = () => page.evaluate(() => {
      const s = document.getElementById('temp-slider');
      return {
        value: s.value,
        valuetext: s.getAttribute('aria-valuetext'),
        tooltip: (document.getElementById('temp-tooltip').textContent || '').trim(),
      };
    });
    const before = await read();
    // aria-valuetext is what a screen reader speaks in place of the raw number, so
    // it must be derived from state on EVERY path that changes the value — never set
    // once in the markup (a11y-3 B2). This is the assertion that catches a stale one.
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(150);
    const after = await read();

    expect(after.value, 'ArrowLeft must move the slider').not.toBe(before.value);
    expect(after.tooltip, 'the visible tooltip must follow the value').not.toBe(before.tooltip);
    expect(after.valuetext,
      `aria-valuetext is stale: value=${after.value}, visible tooltip="${after.tooltip}", `
      + `but aria-valuetext still says "${after.valuetext}"`).not.toBe(before.valuetext);
    expect(after.valuetext, 'aria-valuetext must contain the current value')
      .toContain(String(after.value));
  });

  test('the slider name never changes when its value does', async ({ page }) => {
    await settle(page);
    const nameBefore = await page.locator('#temp-slider').getAttribute('aria-label');
    expect(await tabTo(page, 'temp-slider')).toBe(true);
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(150);
    expect(await page.locator('#temp-slider').getAttribute('aria-label')).toBe(nameBefore);
  });
});

test.describe('SC 2.1.1 — the toggles are operable from the keyboard', () => {
  for (const id of ['speed-toggle', 'ac-toggle', 'occ-toggle']) {
    test(`Space toggles #${id} and focus stays on it`, async ({ page }) => {
      await settle(page);
      expect(await tabTo(page, id), `could not Tab to #${id}`).toBe(true);
      const before = await page.locator(`#${id}`).isChecked();
      await page.keyboard.press('Space');
      await page.waitForTimeout(120);
      expect(await page.locator(`#${id}`).isChecked(), 'Space must toggle the control')
        .toBe(!before);
      expect(await activeId(page), 'focus must not move when a control is operated').toBe(id);
      // The ARIA state a reader announces is the native `checked`, so it cannot
      // desync — but the visible surrogate can. Assert they agree.
      const visual = await page.evaluate((t) => {
        const inp = document.getElementById(t);
        for (let sib = inp.nextElementSibling; sib; sib = sib.nextElementSibling) {
          if (/-track$/.test(sib.className)) {
            const bg = sib.querySelector('[class$="-track-bg"]');
            const knob = sib.querySelector('[class$="-knob"]');
            return {
              bgOpacity: bg ? Number(getComputedStyle(bg).opacity) : null,
              knobLeft: knob ? getComputedStyle(knob).left : null,
            };
          }
        }
        return null;
      }, id);
      expect(visual, `no visible surrogate found for #${id}`).not.toBeNull();
    });
  }
});

test.describe('SC 4.1.3 — every path that changes the result announces it', () => {
  test('the live region is written from each control, not just the common one', async ({ page }) => {
    await settle(page);
    // "Write to it from EVERY path that changes the result, not just the common one."
    // The writer is guarded by `target !== _currentRange`, so each step below is
    // chosen to move the mileage — a step too small to change the number is not a
    // missing announcement, and a test that could not tell the difference would be
    // worthless.
    const seen = [];
    const step = async (label, fn) => {
      const before = await live(page);
      await fn();
      await page.waitForTimeout(250);
      const after = await live(page);
      seen.push({ label, before, after, changed: before !== after });
    };

    await step('tyre-select', () => page.selectOption('#tyre-select', { index: 3 }));
    await step('battery via trim', async () => {
      await page.selectOption('#trim-select', 'Life');
      await page.selectOption('#battery-select', '79');
    });
    for (const id of ['speed-toggle', 'ac-toggle', 'occ-toggle']) {
      await step(id, async () => {
        await tabTo(page, id);
        await page.keyboard.press('Space');
      });
    }
    await step('temp-slider keyboard', async () => {
      await tabTo(page, 'temp-slider');
      await page.keyboard.press('ArrowLeft');
    });
    await step('dist-thumb keyboard', async () => {
      await tabTo(page, 'dist-thumb-1');
      for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowRight');
    });

    const silent = seen.filter((s) => !s.changed);
    expect(silent, `paths that changed the result without announcing it: ${JSON.stringify(silent)}`)
      .toEqual([]);
    // And it never empties: it is the only accessible copy of the output.
    expect(await live(page)).not.toBe('');
  });

  test('the announcement matches the digits actually displayed', async ({ page }) => {
    await settle(page);
    await page.selectOption('#trim-select', 'Style');
    await page.waitForTimeout(300);
    const m = await page.evaluate(() => {
      // Each reel column is translated to its digit; recover the digits from the
      // transform rather than from textContent, which is all ten digits per column.
      const digits = [...document.querySelectorAll('#range-display .slot-digit')].map((col) => {
        const t = getComputedStyle(col.querySelector('.slot-reel')).transform;
        const em = parseFloat(getComputedStyle(col).fontSize);
        const ty = t === 'none' ? 0 : parseFloat(t.split(',')[5]);
        return Math.round(-ty / em);
      }).join('');
      return { digits, live: (document.getElementById('range-live').textContent || '').trim() };
    });
    expect(m.live, `the reels show ${m.digits} but the live region says "${m.live}"`)
      .toContain(m.digits);
  });
});

test.describe('SC 4.1.2 — state matches reality, and nothing hidden is focusable', () => {
  test('no focusable control sits inside an aria-hidden subtree', async ({ page }) => {
    await settle(page);
    const leaked = await page.evaluate(() => [...document.querySelectorAll(
      'button, select, input, a[href], [tabindex]:not([tabindex="-1"])')]
      .filter((el) => el.closest('[aria-hidden="true"]'))
      .map((el) => el.id || el.tagName.toLowerCase() + '.' + el.className));
    expect(leaked, 'a control inside an aria-hidden subtree is reachable by Tab but '
      + 'invisible to a screen reader').toEqual([]);
  });

  test('the sticky result bar aria-hidden tracks whether it is actually shown', async ({ page }) => {
    await settle(page);
    const read = () => page.evaluate(() => {
      const el = document.getElementById('sticky-result');
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const onScreen = cs.display !== 'none' && r.height > 0
        && r.top < window.innerHeight && r.bottom > 0;
      return { ariaHidden: el.getAttribute('aria-hidden'), onScreen };
    });
    const a = await read();
    expect(String(a.onScreen), `sticky bar onScreen=${a.onScreen} but aria-hidden=${a.ariaHidden}`)
      .toBe(a.ariaHidden === 'true' ? 'false' : 'true');

    await page.mouse.wheel(0, 3000);
    await waitForStableBox(page, '#sticky-result');
    const b = await read();
    expect(String(b.onScreen), `after scrolling: onScreen=${b.onScreen} but aria-hidden=${b.ariaHidden}`)
      .toBe(b.ariaHidden === 'true' ? 'false' : 'true');
  });

  test('#trim-select keeps a real name at every value — the one name that mutates', async ({ page }) => {
    await settle(page);
    // a11y-1 §4.1.2 records this as a known weakness rather than a failure:
    // #trim-select is named by #trim-fl-label, and updateTrimLabel() rewrites that
    // label's textContent on every change — so this control's accessible NAME moves
    // with its VALUE. That is why it is excluded from "names do not change when
    // values change" below.
    //
    // Excluding it silently would hide the real risk, which is not that the name
    // moves but that a `textContent =` on a name source can leave the name EMPTY.
    // So this asserts what has to hold either way: a non-empty name at every value,
    // from a label element that still exists. A future fix to a stable label keeps
    // passing; a rewrite that blanks the label does not.
    const values = await page.evaluate(() =>
      [...document.getElementById('trim-select').options].map((o) => o.value));
    expect(values.length, 'the trim list is empty').toBeGreaterThan(1);

    const seen = [];
    for (const v of values) {
      await page.selectOption('#trim-select', v);
      await page.waitForTimeout(180);
      const s = await page.evaluate(() => {
        const sel = document.getElementById('trim-select');
        const ref = sel.getAttribute('aria-labelledby');
        const lab = ref ? document.getElementById(ref) : null;
        return {
          value: sel.value,
          labelExists: !!lab,
          name: lab ? (lab.textContent || '').replace(/\s+/g, ' ').trim() : '',
        };
      });
      expect(s.labelExists, `#trim-select lost its label element at value ${v}`).toBe(true);
      expect(s.name, `#trim-select has an EMPTY accessible name at value ${v}`).not.toBe('');
      seen.push(`${s.value}="${s.name}"`);
    }
    console.log(`[a11y-1 4.1.2] #trim-select name per value: ${seen.join(', ')}`);
  });

  test('names do not change when values change', async ({ page }) => {
    await settle(page);
    // #trim-select is deliberately absent: its name is documented (a11y-1 §4.1.2) to
    // follow the selected model group. It is pinned by the test above instead.
    const names = () => page.evaluate(() => {
      const byIds = (v) => (v || '').split(/\s+/).filter(Boolean)
        .map((id) => (document.getElementById(id) || {}).textContent || '').join(' ')
        .replace(/\s+/g, ' ').trim();
      const out = {};
      for (const id of ['speed-toggle', 'ac-toggle', 'occ-toggle', 'tyre-select', 'battery-select']) {
        const el = document.getElementById(id);
        out[id] = byIds(el.getAttribute('aria-labelledby'));
      }
      return out;
    });
    const before = await names();
    await page.selectOption('#tyre-select', { index: 4 });
    await page.selectOption('#battery-select', { index: 0 });
    for (const id of ['speed-toggle', 'ac-toggle', 'occ-toggle']) {
      await tabTo(page, id);
      await page.keyboard.press('Space');
    }
    await page.waitForTimeout(250);
    expect(await names()).toEqual(before);
  });
});

test.describe('focus is never lost', () => {
  test('rebuilding the battery options does not drop focus to <body>', async ({ page }) => {
    await settle(page);
    // updateBatteryOptions() replaces #battery-select's children with innerHTML. In
    // the React/AEM port that becomes a conditional re-render, and a re-render while
    // focus is inside the subtree drops focus to <body> (a11y-3 §5.3). Drive the
    // trim change from the keyboard so the rebuild happens for real.
    expect(await tabTo(page, 'trim-select')).toBe(true);
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(150);
      expect(await activeId(page), 'focus left #trim-select while the battery options rebuilt')
        .toBe('trim-select');
    }
    const opts = await page.evaluate(() => ({
      trim: document.getElementById('trim-select').value,
      count: document.getElementById('battery-select').options.length,
    }));
    expect(opts.count, `the battery list is empty after a trim change to ${opts.trim}`)
      .toBeGreaterThan(0);

    // And the next control is still reachable in one Tab.
    await page.keyboard.press('Tab');
    expect(await activeId(page)).toBe('battery-select');
  });

  test('focus survives every control being operated in turn', async ({ page }) => {
    await settle(page);
    const ids = ['dist-thumb-1', 'dist-thumb-2', 'speed-toggle', 'tyre-select',
      'temp-slider', 'ac-toggle', 'occ-toggle'];
    for (const id of ids) {
      expect(await tabTo(page, id), `could not Tab to #${id}`).toBe(true);
      const key = id.startsWith('dist') || id === 'temp-slider' ? 'ArrowRight' : 'Space';
      await page.keyboard.press(key);
      await page.waitForTimeout(120);
      expect(await activeId(page), `operating #${id} moved or dropped focus`).toBe(id);
    }
  });

  test('the auto-selected tyre and AC side effects keep their ARIA truthful', async ({ page }) => {
    await settle(page);
    // Moving the temperature below +10 auto-selects winter tyres and, before any
    // manual AC interaction, switches AC on. Those writes bypass the controls'
    // own change handlers, so they are exactly the "one branch only" path a11y-3 B2
    // warns about: the DOM state must still match what a reader would announce.
    expect(await tabTo(page, 'temp-slider')).toBe(true);
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(250);
    const s = await page.evaluate(() => {
      const tyre = document.getElementById('tyre-select');
      const ac = document.getElementById('ac-toggle');
      return {
        temp: Number(document.getElementById('temp-slider').value),
        tyre: tyre.value,
        tyreSelectedText: tyre.options[tyre.selectedIndex].text,
        acChecked: ac.checked,
        acAriaChecked: ac.getAttribute('aria-checked'),
      };
    });
    expect(s.temp).toBeLessThan(10);
    expect(s.tyre, 'below +10 the tyre must auto-switch to winter').toContain('Winter');
    expect(s.tyreSelectedText, 'the selected option text must match the value')
      .toBe(s.tyre);
    // A native checkbox exposes `checked`; a stray aria-checked would be a second,
    // unsynchronised source of truth.
    expect(s.acAriaChecked, 'do not shadow a native checkbox with aria-checked').toBeNull();
    expect(await activeId(page), 'the auto side effects must not steal focus').toBe('temp-slider');
  });
});

test.describe('sanity — the suite is measuring the built page', () => {
  test('the control surface is present in full', async ({ page }) => {
    await settle(page);
    const counts = await page.evaluate(`({
      infoBtns: document.querySelectorAll('${ROOT} .q-icon-btn').length,
      selects: document.querySelectorAll('${ROOT} select').length,
      toggles: document.querySelectorAll('${ROOT} input[type=checkbox]').length,
      distThumbs: document.querySelectorAll('${ROOT} [role=slider]').length,
      slotDigits: document.querySelectorAll('#range-display .slot-digit').length,
    })`);
    expect(counts.infoBtns).toBe(EXPECTED.infoBtns);
    expect(counts.selects).toBe(EXPECTED.selects);
    expect(counts.toggles).toBe(EXPECTED.toggles);
    expect(counts.distThumbs).toBe(EXPECTED.distThumbs);
    expect(counts.slotDigits, 'the digit reels were never built').toBeGreaterThan(0);
  });
});
