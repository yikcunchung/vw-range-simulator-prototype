// @ts-check
// Structural half. axe runs INSIDE Playwright rather than under jest-axe, because
// jsdom has no layout: target-size, reflow, the 24x24 hit-area ray-cast and the
// text-spacing clipping diff cannot be evaluated there at all. Same rules, against
// a browser that actually built the page.
//
// describe()/test() names cite the WCAG 2.2 success criteria directly. Comments
// that cross-reference a specific doc section (e.g. "a11y-3 C1") still use that
// doc's own heading names, which are unchanged.

const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;
const {
  settle, waitForStableBox, tabThrough, axTree, nameOfExpr, ROOT, EXPECTED, DISABLED_BY_DEFAULT,
} = require('./settle');

const axeRun = (page) => new AxeBuilder({ page })
  .options({ rules: Object.fromEntries(DISABLED_BY_DEFAULT.map((r) => [r, { enabled: true }])) })
  .analyze();

test.describe('axe', () => {
  test('0 violations in the AA conformance scope, with all nine default-disabled rules on', async ({ page }) => {
    await settle(page);
    const r = await axeRun(page);

    // The audit target is WCAG 2.2 **AA** (a11y-1-criteria.md). Force-enabling the
    // nine default-disabled rules also switches on `color-contrast-enhanced`, which
    // is SC 1.4.6 — AAA, and out of scope. Splitting on the `wcag2aaa` tag rather
    // than by rule id means a future AAA rule cannot quietly fail the build either,
    // and the AAA findings are still printed rather than swallowed.
    const aaa = r.violations.filter((v) => v.tags.includes('wcag2aaa'));
    const inScope = r.violations.filter((v) => !v.tags.includes('wcag2aaa'));

    expect(inScope, JSON.stringify(
      inScope.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), null, 1,
    )).toEqual([]);

    console.log(`[axe] AAA-only findings, out of AA scope: ${JSON.stringify(
      aaa.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => String(n.target)) })))}`);
    console.log(`[axe] incomplete (needs manual review): ${JSON.stringify(
      r.incomplete.map((v) => `${v.id}: ${v.nodes.length}`))}`);
  });

  test('target-size actually ran — a silent skip is the trap', async ({ page }) => {
    await settle(page);
    const r = await axeRun(page);
    // `target-size` is SC 2.5.8 and ships `enabled: false`. A stock run reports
    // "0 violations" having never tested target size (a11y-2 trap 1). Assert the
    // rule appears in the RESULTS, not that the config asked for it.
    const found = [...r.passes, ...r.violations, ...r.incomplete].filter((x) => x.id === 'target-size');
    expect(found.length, 'target-size must appear in the results, or SC 2.5.8 went untested').toBe(1);
    expect(found[0].nodes.length, 'target-size ran but matched no node — it tested nothing')
      .toBeGreaterThan(0);
    console.log(`[axe] target-size: ${found[0].nodes.length} node(s) in ${found[0].id === 'target-size' && r.violations.some((v) => v.id === 'target-size') ? 'violations' : 'passes/incomplete'}`);
  });

  test('incomplete is read, not ignored — every entry is a contrast-over-imagery item', async ({ page }) => {
    await settle(page);
    const r = await axeRun(page);
    // `incomplete` is the needs-review bucket a BITV / EN 301 549 tester must resolve
    // by hand, and it is also where an OBSCURED undersized target lands — so a real
    // 2.5.8 failure can be absent from `violations` because axe could not decide
    // (a11y-2 trap 2). Anything other than a contrast punt here is a new problem.
    const unexpected = r.incomplete
      .filter((v) => !['color-contrast', 'color-contrast-enhanced'].includes(v.id));
    expect(unexpected.map((v) => `${v.id}: ${v.nodes.length}`),
      'a non-contrast rule landed in `incomplete` — resolve it by hand before trusting the zero')
      .toEqual([]);
  });
});

test.describe('SC 1.1.1 — no unnamed graphic', () => {
  test('every inline <svg> is either aria-hidden or a named role="img"', async ({ page }) => {
    await settle(page);
    // THE defect that shipped: 16 decorative inline <svg>s exposed to AT as unnamed
    // graphics. axe scored 0 violations at 98 rules, WAVE 0 errors, Nu 0 errors —
    // `svg-img-alt` and `role-img-alt` are INAPPLICABLE to an <svg> with no role,
    // and `image-alt` only inspects <img>. No scanner can see this class of defect.
    const bad = await page.evaluate(() => [...document.querySelectorAll('svg')]
      .filter((s) => {
        if (s.closest('[aria-hidden="true"]')) return false;         // hidden, incl. by an ancestor
        const named = (s.getAttribute('aria-label') || '').trim()
          || (s.getAttribute('aria-labelledby') || '').trim()
          || (s.querySelector('title') ? (s.querySelector('title').textContent || '').trim() : '');
        return !(s.getAttribute('role') === 'img' && named);          // meaningful: role AND name
      })
      .map((s) => `${s.getAttribute('class') || '(no class)'} ${s.getAttribute('width') || ''}x${s.getAttribute('height') || ''}`));
    expect(bad, `inline <svg> neither hidden nor named (${bad.length} of ${await page.locator('svg').count()})`)
      .toEqual([]);
  });

  test('the accessibility tree has 0 unnamed, non-ignored role=image nodes', async ({ page }) => {
    await settle(page);
    // Ground truth, read over CDP the same way the audit read it. Chrome maps a bare
    // <svg> to role=image, name="", ignored=false — it is NOT decorative by default.
    // This assertion is the one that caught the shipped defect; keep it.
    const nodes = await axTree(page);
    const graphics = nodes.filter((n) => ['image', 'graphics-symbol', 'graphics-document']
      .includes(n.role && n.role.value));
    const unnamed = graphics.filter((n) => !n.ignored && !((n.name && n.name.value) || '').trim());
    expect(unnamed.length,
      `${unnamed.length} unnamed graphic node(s) exposed of ${graphics.length} total — `
      + 'axe, WAVE and Nu are all blind to this (a11y-2 trap 10)').toBe(0);
  });
});

test.describe('names', () => {
  test('SC 4.1.2 / 2.4.4 — every icon-only button carries the name, and its icon does not', async ({ page }) => {
    await settle(page);
    const btns = await page.evaluate(`[...document.querySelectorAll('${ROOT} button')].map((b) => ({
      label: (b.getAttribute('aria-label') || '').trim(),
      text: (b.textContent || '').trim(),
      iconOnly: !((b.textContent || '').trim()),
      svgHidden: [...b.querySelectorAll('svg')].every((s) => !!s.closest('[aria-hidden="true"]')),
      svgNamed: [...b.querySelectorAll('svg')].some((s) => (s.getAttribute('aria-label') || '').trim()),
      sig: b.className || b.id,
    }))`);
    expect(btns.length).toBeGreaterThanOrEqual(EXPECTED.infoBtns);
    for (const b of btns) {
      expect(b.label || b.text, `unnamed button: ${b.sig}`).not.toBe('');
      if (b.iconOnly) {
        expect(b.label, `icon-only button ${b.sig} must carry aria-label itself`).not.toBe('');
        expect(b.svgHidden, `the icon inside ${b.sig} must be aria-hidden, not named`).toBe(true);
        expect(b.svgNamed, `name the button, not the icon (${b.sig})`).toBe(false);
      }
    }
  });

  test('no interactive node is unnamed', async ({ page }) => {
    await settle(page);
    const unnamed = await page.evaluate(`(() => {
      const nameOf = ${nameOfExpr()};
      const sel = '${ROOT} button, ${ROOT} select, ${ROOT} a[href], ${ROOT} input, ${ROOT} [role]';
      return [...document.querySelectorAll(sel)]
        .filter((el) => !el.closest('[aria-hidden="true"]'))
        .filter((el) => el.matches('button, select, a[href], input, [role="slider"], [role="button"], [role="link"], [role="checkbox"]'))
        .filter((el) => nameOf(el) === '')
        .map((el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '.' + el.className));
    })()`);
    expect(unnamed).toEqual([]);
  });

  test('sibling controls of the same kind have unique names', async ({ page }) => {
    await settle(page);
    const groups = await page.evaluate(`(() => {
      const nameOf = ${nameOfExpr()};
      const g = (sel) => [...document.querySelectorAll(sel)].map(nameOf);
      return {
        infoButtons: g('${ROOT} .q-icon-btn'),
        selects: g('${ROOT} select'),
        checkboxes: g('${ROOT} input[type=checkbox]'),
        radios: g('${ROOT} input[type=radio]'),
        distThumbs: g('${ROOT} [role=slider]'),
      };
    })()`);
    expect(groups.infoButtons).toHaveLength(EXPECTED.infoBtns);
    expect(groups.selects).toHaveLength(EXPECTED.selects);
    expect(groups.checkboxes).toHaveLength(EXPECTED.toggles);
    expect(groups.radios).toHaveLength(EXPECTED.radios);
    expect(groups.distThumbs).toHaveLength(EXPECTED.distThumbs);
    for (const [kind, names] of Object.entries(groups)) {
      expect(names.filter((n) => n === ''), `unnamed ${kind}`).toEqual([]);
      expect(new Set(names).size, `duplicate names among ${kind}: ${JSON.stringify(names)}`)
        .toBe(names.length);
    }
  });

  test('SC 1.3.1 / 4.1.2 — every select is named by aria-labelledby at a visible label, never a retyped aria-label', async ({ page }) => {
    await settle(page);
    // Retyping the label into aria-label is exactly how the visible text and the
    // accessible name drift apart (A4). A <select>'s <option> text is NOT its label
    // and must not be compared against the name (a11y-2 trap 8).
    const selects = await page.evaluate(`[...document.querySelectorAll('${ROOT} select')].map((s) => {
      // aria-labelledby may reference MULTIPLE ids (e.g. trim-select's static
      // question + mutating value) — resolve each one, not the raw string as one id.
      const ref = s.getAttribute('aria-labelledby');
      const ids = (ref || '').split(/\\s+/).filter(Boolean);
      const targets = ids.map((id) => document.getElementById(id)).filter(Boolean);
      return {
        id: s.id,
        labelledby: ref,
        hasAriaLabel: s.hasAttribute('aria-label'),
        targetExists: ids.length > 0 && targets.length === ids.length,
        targetVisible: targets.length > 0 && targets.every((el) => el.getBoundingClientRect().width > 0
          && getComputedStyle(el).visibility !== 'hidden'
          && !el.closest('.sr-only')),
        targetText: targets.length ? targets.map((el) => (el.textContent || '').trim()).join(' ').replace(/\\s+/g, ' ').trim() : null,
      };
    })`);
    expect(selects).toHaveLength(EXPECTED.selects);
    for (const s of selects) {
      expect(s.labelledby, `#${s.id} must be named by aria-labelledby`).toBeTruthy();
      expect(s.targetExists, `#${s.id} aria-labelledby="${s.labelledby}" points at a missing id`).toBe(true);
      expect(s.targetVisible, `#${s.id} must be named by a VISIBLE label`).toBe(true);
      expect(s.targetText, `#${s.id} label text is empty`).not.toBe('');
      expect(s.hasAriaLabel, `#${s.id} must not retype its label into aria-label`).toBe(false);
    }
  });

  test('SC 2.5.3 — the visible label sits contiguously inside the accessible name', async ({ page }) => {
    await settle(page);
    // axe has no `label-in-name` rule at all. This is the check that replaces it.
    // Occupancy used to be a single checkbox whose visible "1 person" / "Full" were
    // its two VALUES, not a label — a recorded exception. It is now two real radio
    // inputs, each natively wrapped in its own <label> containing that option's own
    // text ("1 person", "Full"), which correctly IS that radio's label. No exception
    // needed any more.
    const RECORDED_EXCEPTIONS = [];
    const rows = await page.evaluate(`(() => {
      const nameOf = ${nameOfExpr()};
      const norm = (s) => (s || '').replace(/\\s+/g, ' ').trim();
      const out = [];
      for (const el of document.querySelectorAll('${ROOT} select, ${ROOT} input, ${ROOT} button, ${ROOT} [role=slider]')) {
        const name = nameOf(el);
        // The visible text a speech-input user can say, found STRUCTURALLY. Deriving
        // it from aria-labelledby would make this check tautological — worse, it made
        // the check silently SKIP a control whose aria-labelledby had been deleted,
        // which is exactly the mutation it is supposed to catch. Mutation testing
        // caught that; the lookup below does not consult the ARIA at all.
        let visible = '';
        const lab = el.closest('label');
        if (lab) {
          // A wrapping <label>'s own text — excluding the control and the sr-only
          // spans, which are not visible and so are not what a speech user says.
          visible = norm([...lab.childNodes]
            .filter((n) => n.nodeType === 3 || (n.nodeType === 1 && !n.matches('input, .sr-only')))
            .map((n) => n.textContent).join(' '));
        }
        // The row's own visible label. Only for real form controls: the two
        // role=slider thumbs have no visible text label of their own, so SC 2.5.3
        // does not apply to them and the section heading is not their label.
        if (!visible && el.matches('select, input')) {
          const fl = el.closest('.fl-select') && el.closest('.fl-select').querySelector('.fl-label');
          if (fl) visible = norm(fl.textContent);
          if (!visible) {
            const q = el.closest('.combo') && el.closest('.combo').querySelector('.question-label');
            if (q) visible = norm(q.textContent);
          }
        }
        if (!visible && el.tagName === 'BUTTON') visible = norm(el.textContent);
        if (!visible) continue;
        out.push({ id: el.id || el.className, name, visible });
      }
      return out;
    })()`);
    // Assert the harness matched what it is supposed to: every select, every
    // checkbox, the range input and the CTA. A silently shrinking row set is how
    // this check passes while testing nothing.
    expect(rows.map((r) => r.id).sort(),
      'the SC 2.5.3 harness did not match the expected control set').toEqual([
      'ac-toggle', 'battery-select', 'cta-button', 'occ-1p', 'occ-full', 'speed-toggle',
      'temp-slider', 'trim-select', 'tyre-select',
    ]);
    const failures = rows
      .filter((r) => !RECORDED_EXCEPTIONS.includes(r.id))
      .filter((r) => !r.name.toLowerCase().includes(r.visible.toLowerCase()));
    expect(failures, 'visible label not contained contiguously in the accessible name').toEqual([]);
  });

  test('SC 1.3.1 / 2.4.1 / 2.4.6 — one h1, no skipped levels, real landmarks, and the skip link works', async ({ page }) => {
    await settle(page);
    const s = await page.evaluate(() => {
      const levels = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
        .map((h) => Number(h.tagName[1]));
      let gap = null;
      for (let i = 1; i < levels.length; i++) if (levels[i] - levels[i - 1] > 1) gap = [levels[i - 1], levels[i]];
      const skip = document.querySelector('a.skip-link');
      return {
        h1: document.querySelectorAll('h1').length,
        levels,
        gap,
        banner: document.querySelectorAll('[role=banner], header').length,
        main: document.querySelectorAll('[role=main], main').length,
        skipHref: skip ? skip.getAttribute('href') : null,
        skipTargetExists: !!(skip && document.querySelector(skip.getAttribute('href'))),
      };
    });
    expect(s.h1, 'exactly one h1').toBe(1);
    expect(s.gap, `heading level gap in ${JSON.stringify(s.levels)}`).toBeNull();
    expect(s.banner, 'a banner landmark').toBe(1);
    expect(s.main, 'a main landmark').toBe(1);
    expect(s.skipHref, 'a skip link').toBeTruthy();
    expect(s.skipTargetExists, `skip link points at a missing id (${s.skipHref})`).toBe(true);

    // "First tab stop" is a behaviour, so drive real Tab rather than trusting DOM order.
    const stops = await tabThrough(page, 3);
    expect(stops[0] && stops[0].sig, 'the skip link must be the FIRST tab stop')
      .toContain('skip-link');
  });
});

test.describe('SC 4.1.3 — the live region is the only accessible copy of the result', () => {
  test('it exists at load, is populated, and keeps its clip', async ({ page }) => {
    await settle(page);
    // #range-display is aria-hidden (its textContent is all ten digits per reel), so
    // #range-live is the ONLY readable form of the app's output. Unlike the sibling
    // NaLa app, it must therefore be NON-empty at rest, not empty.
    const s = await page.evaluate(() => {
      const el = document.getElementById('range-live');
      if (!el) return null;
      const cs = getComputedStyle(el);
      const display = document.getElementById('range-display');
      return {
        text: (el.textContent || '').trim(),
        live: el.getAttribute('aria-live'),
        ariaHidden: el.getAttribute('aria-hidden'),
        position: cs.position, width: cs.width, height: cs.height,
        clipPath: cs.clipPath, color: cs.color, whiteSpace: cs.whiteSpace,
        displayAriaHidden: display ? display.getAttribute('aria-hidden') : null,
      };
    });
    expect(s, '#range-live must be in the DOM at load — injecting and writing in the '
      + 'same tick is not announced').not.toBeNull();
    expect(s.live).toBe('polite');
    expect(s.ariaHidden, 'the only accessible copy of the result must not be hidden').not.toBe('true');
    expect(s.text, 'the live region carries the result, so it is never empty at rest').not.toBe('');
    expect(s.displayAriaHidden, 'the digit reels read as all ten digits, so they stay hidden').toBe('true');
    // The .sr-only clip, asserted on computed values.
    expect(s.position).toBe('absolute');
    expect(s.width).toBe('1px');
    expect(s.height).toBe('1px');
    expect(s.clipPath).toBe('inset(50%)');
    expect(s.whiteSpace).toBe('nowrap');
    // An explicit colour: a clipped region that inherits a matching colour reads as
    // a 1:1 contrast error to WAVE even though nothing renders.
    expect(s.color, '#range-live needs an explicit colour').toBe('rgb(255, 255, 255)');
  });
});

test.describe('SC 2.5.8 — targets', () => {
  test('no visible target is under 24x24', async ({ page }) => {
    await settle(page);
    // Measure after the box stops moving. A control read mid-transition reports a
    // smaller box than it ever presents — a measurement artifact, not a 2.5.8 failure.
    await waitForStableBox(page, 'label.vw-switch');
    await waitForStableBox(page, '#dist-thumb-1');
    const small = await page.evaluate(() => {
      const visible = (el) => {
        for (let n = el; n; n = n.parentElement) {
          if (n.nodeType !== 1) continue;
          const cs = getComputedStyle(n);
          if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        }
        return true;
      };
      // The TARGET is the region that accepts a pointer action. For the three
      // toggles that is the <label>, not the 1x1 clipped <input> inside it — so
      // measure the label and skip an input that has one (a11y-3 §7.1).
      const targets = [...document.querySelectorAll(
        '#sim-main button, #sim-main select, #sim-main a[href], #sim-main [role=slider], '
        + '#sim-main input, #sim-main label.vw-switch, #sim-main label.vw-toggle-opt')]
        .filter((el) => !(el.tagName === 'INPUT' && el.closest('label')))
        .filter((el) => !el.disabled)
        .filter(visible);
      return targets
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { id: el.id || el.className, w: +r.width.toFixed(2), h: +r.height.toFixed(2) };
        })
        .filter((b) => b.w > 0 && (b.w < 24 || b.h < 24));
    });
    expect(small, 'targets under 24x24').toEqual([]);
  });

  test('the dist thumb hit region really is >= 24x24 — ray-cast, not assumed', async ({ page }) => {
    await settle(page);
    // "Prove it, do not assume it" (a11y-3 C1): walk elementFromPoint outward from
    // the centre in 0.5px steps and measure the region that actually hit-tests to
    // the control. A CSS box of 24px means nothing if an ancestor clips it.
    //
    // elementFromPoint is VIEWPORT-relative and returns null for any point outside
    // the viewport, so at 320x256 the thumbs sit below the fold and every ray
    // measures 0px. That is the same class of error as mixing document-absolute
    // screenshot clips with viewport-relative rects (a11y-2 trap 6): a reading of
    // 0 means the probe missed, not that the target failed. So scroll each thumb
    // into view, let the scroll settle, and assert the centre point hits the
    // control before believing any measurement taken from it.
    for (const id of ['dist-thumb-1', 'dist-thumb-2']) {
      await page.evaluate((t) =>
        document.getElementById(t).scrollIntoView({ block: 'center' }), id);
      await waitForStableBox(page, `#${id}`);
      const m = await page.evaluate((t) => {
        const el = document.getElementById(t);
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const at = document.elementFromPoint(cx, cy);
        const centreHits = !!at && (at === el || el.contains(at));
        const reach = (dx, dy) => {
          let d = 0;
          for (; d < 60; d += 0.5) {
            const n = document.elementFromPoint(cx + dx * d, cy + dy * d);
            if (!n || !(n === el || el.contains(n))) break;
          }
          return d;
        };
        return {
          centreHits,
          inViewport: r.top >= 0 && r.bottom <= window.innerHeight
            && r.left >= 0 && r.right <= window.innerWidth,
          w: reach(-1, 0) + reach(1, 0),
          h: reach(0, -1) + reach(0, 1),
        };
      }, id);
      expect(m.inViewport, `#${id} is not fully in the viewport, so the ray-cast would `
        + 'measure 0px and report a failure that is not there').toBe(true);
      expect(m.centreHits, `#${id}: its own centre does not hit-test to it — something `
        + 'is covering the control, which is a real 2.5.8 problem, not a probe artifact')
        .toBe(true);
      expect(m.w, `#${id} hit width (measured ${m.w}px)`).toBeGreaterThanOrEqual(24);
      expect(m.h, `#${id} hit height (measured ${m.h}px)`).toBeGreaterThanOrEqual(24);
    }
  });
});

test.describe('reflow and spacing', () => {
  test('SC 1.4.10 / 1.4.4 — no page-level horizontal scroll', async ({ page }) => {
    await settle(page);
    const m = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(m.scrollW, `scrollWidth ${m.scrollW} > clientWidth ${m.clientW}`)
      .toBeLessThanOrEqual(m.clientW);
  });

  test('SC 1.3.4 — no orientation lock', async ({ page }) => {
    await settle(page);
    const rules = await page.evaluate(() => {
      const hits = [];
      for (const sheet of document.styleSheets) {
        let list;
        try { list = sheet.cssRules; } catch { continue; }
        for (const r of list) if (r.conditionText && /orientation/.test(r.conditionText)) hits.push(r.conditionText);
      }
      return hits;
    });
    expect(rules, 'no @media (orientation:) rule may hide or restrict content').toEqual([]);
  });

  test('SC 1.4.12 — the text-spacing overrides clip nothing new, and the detector fires', async ({ page }) => {
    await settle(page);
    const OVERRIDE = '* { line-height:1.5 !important; letter-spacing:.12em !important; '
      + 'word-spacing:.16em !important; } p { margin-bottom:2em !important; }';

    // Clipped = content bigger than its box with overflow actually hidden, in
    // EITHER axis. The digit reels (10 digits per column, aria-hidden) and
    // .sr-only are clipped BY DESIGN and are present in both sets, so the
    // before/after diff is what matters. Vertical-only (scrollHeight) missed a
    // real bug: the trim-select/battery-select floating labels are single-line,
    // `overflow:hidden` on the X axis (`white-space:nowrap`), so their
    // truncation under these overrides is a scrollWidth/clientWidth mismatch,
    // never a scrollHeight one — checking only overflowY reported 0 new
    // clipping while the labels visibly truncated by up to 33px.
    const clipped = () => page.evaluate(() => [...document.querySelectorAll('#sim-main *')]
      .filter((e) => {
        const cs = getComputedStyle(e);
        const vClipped = /hidden|clip/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1;
        const hClipped = /hidden|clip/.test(cs.overflowX) && e.scrollWidth > e.clientWidth + 1;
        if (!vClipped && !hClipped) return false;
        // A floating select label's truncated text is not actually lost if
        // that same string is also an <optgroup> heading inside its own
        // <select> — opening the select (standard operation for this
        // control) recovers it in full. "The new ID.3 Neo"/"The new ID.
        // Polo" and "Motor / Battery Capacity" all have a matching optgroup.
        const flLabel = e.closest('.fl-label');
        if (flLabel) {
          const select = flLabel.closest('.fl-select')?.querySelector('select');
          const optgroupLabels = select
            ? [...select.querySelectorAll('optgroup')].map((og) => og.label) : [];
          const text = flLabel.textContent.trim();
          if (optgroupLabels.some((og) => og && text.includes(og))) return false;
        }
        return true;
      })
      .map((e) => e.tagName.toLowerCase() + '.' + (typeof e.className === 'string' ? e.className : '')));
    const hScroll = () => page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth);

    const before = new Set(await clipped());
    expect(await hScroll()).toBe(false);

    // Validate the detector BEFORE trusting the result. A canary that is already
    // clipped at the default line-height proves nothing — this one fits at 1.2 and
    // overflows only once line-height:1.5 is forced.
    await page.evaluate(() => {
      const c = document.createElement('div');
      c.id = 'spacing-canary';
      c.style.cssText = 'height:2.6em; line-height:1.2; overflow:hidden; width:200px; font-size:16px;';
      c.innerHTML = 'canary line one<br>canary line two';
      document.getElementById('sim-main').appendChild(c);
    });
    expect([...await clipped()], 'the canary must NOT be clipped before the override')
      .not.toContain('div.');
    const canaryClippedBefore = await page.evaluate(() => {
      const c = document.getElementById('spacing-canary');
      return c.scrollHeight > c.clientHeight + 1;
    });
    expect(canaryClippedBefore, 'canary already clipped at default spacing — it would prove nothing')
      .toBe(false);

    await page.addStyleTag({ content: OVERRIDE });
    await waitForStableBox(page, '#sim-main');

    const canaryClippedAfter = await page.evaluate(() => {
      const c = document.getElementById('spacing-canary');
      return c.scrollHeight > c.clientHeight + 1;
    });
    expect(canaryClippedAfter, 'the detector did not fire on a known-bad canary — '
      + 'a clean result from it would be worthless').toBe(true);

    await page.evaluate(() => document.getElementById('spacing-canary').remove());
    const after = await clipped();
    const newlyClipped = after.filter((s) => !before.has(s));
    expect(newlyClipped, 'newly clipped under the SC 1.4.12 overrides').toEqual([]);
    expect(await hScroll(), 'the overrides introduced horizontal scroll').toBe(false);

    // Target sizes must survive the very override the criterion invites: a 24px
    // target built from line-height collapses, one built from padding does not.
    const stillBigEnough = await page.evaluate(() => [
      ...document.querySelectorAll('#sim-main label.vw-switch, #sim-main label.vw-toggle-opt'),
    ].map((el) => {
      const r = el.getBoundingClientRect();
      return { cls: el.className, w: +r.width.toFixed(2), h: +r.height.toFixed(2) };
    }));
    for (const t of stillBigEnough) {
      expect(t.h, `${t.cls} height under the text-spacing override`).toBeGreaterThanOrEqual(24);
    }
  });
});

test.describe('the build itself', () => {
  test('the battery options were rebuilt from the trim, not left as static markup', async ({ page }) => {
    await settle(page);
    // index.html ships THREE static <option>s (50 / 58 / 79 kWh) that
    // updateBatteryOptions() replaces with the set for the selected trim. If that
    // wiring breaks, the user is offered batteries the chosen trim cannot have —
    // and every scanner still reports a clean page.
    const s = await page.evaluate(() => ({
      trim: document.getElementById('trim-select').value,
      options: [...document.getElementById('battery-select').options].map((o) => o.value),
    }));
    expect(s.trim).toBe('Trend');
    expect(s.options, 'the Trend trim has exactly one battery — three options means '
      + 'updateBatteryOptions() never ran').toEqual(['50']);
  });

  test('battery-select disables when its trim has only one option, and re-enables when it has more', async ({ page }) => {
    await settle(page);
    // Trend has exactly one battery (no real choice); Life/Style have three.
    const trendDisabled = await page.evaluate(() => document.getElementById('battery-select').disabled);
    expect(trendDisabled, 'a single-option select is not a real choice and should be disabled').toBe(true);

    await page.selectOption('#trim-select', 'Life');
    const lifeDisabled = await page.evaluate(() => document.getElementById('battery-select').disabled);
    expect(lifeDisabled, 'switching to a trim with real choices must re-enable the select').toBe(false);

    await page.selectOption('#trim-select', 'Trend');
    const backToTrendDisabled = await page.evaluate(() => document.getElementById('battery-select').disabled);
    expect(backToTrendDisabled, 'switching back to a single-option trim must re-disable it').toBe(true);
  });

  test('no JS exception on load or through a full interaction pass', async ({ page }) => {
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await settle(page);
    await page.selectOption('#trim-select', { index: 1 });
    await page.selectOption('#battery-select', { index: 0 });
    await page.selectOption('#tyre-select', { index: 4 });
    for (const id of ['speed-toggle', 'ac-toggle']) {
      await page.locator(`#${id}`).focus();
      await page.keyboard.press('Space');
    }
    // occ-1p is checked by default; Space on an already-checked radio does not
    // toggle it off (unlike a checkbox) — exercise the OTHER option instead.
    await page.locator('#occ-full').focus();
    await page.keyboard.press('Space');
    await page.locator('#temp-slider').focus();
    await page.keyboard.press('ArrowLeft');
    await page.locator('#dist-thumb-1').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+ArrowLeft');
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(300);
    expect(errs).toEqual([]);
  });
});
