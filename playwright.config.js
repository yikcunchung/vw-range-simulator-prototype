// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// Served over HTTP, not file:// — the audit is claimed against the deployed build,
// and file:// changes font loading, webp decoding and `document.fonts.ready`
// timing in ways that would let the suite measure something the users never see.
//
// The port must be unique across the sibling prototypes, because `reuseExistingServer`
// makes a collision silent AND wrong: the second run reuses the first run's server,
// which is serving a DIFFERENT app's directory, and the first run's teardown then
// kills it under the second. Both failure modes were observed while writing this
// suite. Taken at the time of writing: 4173 visualizer, 4174 nala,
// 4175 cost-simulator AND charging-time-simulator (they collide with each other),
// 4176 tariffs. This app takes 4177. `settle()` also asserts the document title, so
// a reused server pointed at the wrong app fails loudly instead of scoring clean.
const PORT = 4177;

// The directory the webServer serves. Defaults to the repo root — that is what CI
// runs. Overridable so the same suite can be pointed at a materialised copy of the
// deployed build (`git archive origin/main`), which is how the mutation testing in
// a11y-3 §6 ("inject the defect and confirm the detector fires") was run: a mutant
// only proves anything against a baseline that was green to begin with.
const SERVE_DIR = process.env.RS_SERVE_DIR || '.';

const chrome = devices['Desktop Chrome'];

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  // The four viewports the audit is claimed at. 320x256 @ dsf 4 is literal 400%
  // browser zoom — dsf 1 would just be a small screen, which is a different test
  // and not the one SC 1.4.4 / 1.4.10 asks for (a11y-2 trap 4).
  projects: [
    { name: 'desktop-1440', use: { ...chrome, viewport: { width: 1440, height: 900 } } },
    { name: 'tablet-768',   use: { ...chrome, viewport: { width: 768,  height: 1024 } } },
    { name: 'mobile-390',   use: { ...chrome, viewport: { width: 390,  height: 844 } } },
    { name: 'zoom-400',     use: { ...chrome, viewport: { width: 320,  height: 256 }, deviceScaleFactor: 4 } },
  ],
  webServer: {
    // The `2>/dev/null` is not cosmetic. python3 -m http.server writes one access-log
    // line per subresource per test to STDERR and has no quiet flag; when the pipe
    // Playwright gave it goes away, the handler threads die on BrokenPipeError and
    // the process is left holding the port in LISTEN while accepting nothing. Every
    // subsequent test then fails with ERR_CONNECTION_REFUSED against a server that
    // `lsof` says is up. Redirecting inside the command means there is no pipe at all.
    command: `python3 -m http.server ${PORT} --bind 127.0.0.1 --directory ${SERVE_DIR} 2>/dev/null`,
    url: `http://127.0.0.1:${PORT}/index.html`,
    // Deliberately NOT `!process.env.CI`, which is what the sibling configs use. With
    // reuse enabled, a stale or wedged server on this port is silently adopted — and
    // if it belongs to another app's suite you audit the wrong document. Starting our
    // own always means a busy port fails loudly at startup instead.
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: 'ignore',
  },
});
