// Phone-sized touch QA (lite tier), plus the no-WebGL fallback.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, 'shots');
require('fs').mkdirSync(OUT, { recursive: true });
const check = (n, ok, x = '') => console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${x ? '  — ' + x : ''}`);
async function fps(page, ms = 2000) {
  return page.evaluate((ms) => new Promise((resolve) => {
    let n = 0; const t0 = performance.now();
    const tick = (t) => { n++; if (t - t0 < ms) requestAnimationFrame(tick); else resolve(Math.round((n * 1000) / (t - t0))); };
    requestAnimationFrame(tick);
  }), ms);
}
async function swipe(page, x0, y0, x1, y1, steps = 10) {
  await page.evaluate(async ({ x0, y0, x1, y1, steps }) => {
    const canvas = document.querySelector('canvas');
    const ev = (type, x, y) => new PointerEvent(type, { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true });
    canvas.dispatchEvent(ev('pointerdown', x0, y0));
    for (let i = 1; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, 16));
      window.dispatchEvent(ev('pointermove', x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps));
    }
    window.dispatchEvent(ev('pointerup', x1, y1));
  }, { x0, y0, x1, y1, steps });
}
async function screenOf(page, p) {
  return page.evaluate((p) => {
    const v = new window.__camera.position.constructor(p[0], p[1], p[2]).project(window.__camera);
    return { x: ((v.x + 1) / 2) * innerWidth, y: ((1 - v.y) / 2) * innerHeight };
  }, p);
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:5180/' + (process.argv[2] ? `?quality=${process.argv[2]}` : ''));
  await page.waitForFunction(() => window.__xp && window.__xp.getState().progress >= 1, null, { timeout: 40000 });
  console.log('quality', await page.evaluate(() => window.__xp.getState().quality));
  await page.screenshot({ path: path.join(OUT, 'm01-loader.png') });
  await page.getByRole('button', { name: 'Enter NEXORA' }).tap();
  await page.waitForTimeout(5500);
  await page.screenshot({ path: path.join(OUT, 'm02-universe.png') });
  const f1 = await fps(page);
  check('Phone universe frame rate', f1 >= 40, `${f1} fps`);
  await swipe(page, 200, 500, 200, 300);
  await page.waitForTimeout(600);
  const prog = await page.evaluate(() => window.__motion.universe.target);
  check('Swipe up moves forward in the universe', prog > 0.1, prog.toFixed(2));
  await swipe(page, 120, 500, 300, 500);
  await page.waitForTimeout(600);
  const yaw = await page.evaluate(() => window.__motion.universe.yawTarget);
  check('Horizontal swipe turns the view', Math.abs(yaw) > 0.2, yaw.toFixed(2));
  // reset view and tap the Fashion portal
  await page.evaluate(() => { window.__motion.universe.yawTarget = 0; window.__motion.universe.pitchTarget = 0; });
  await page.waitForTimeout(1500);
  const pt = await screenOf(page, [0, 7.5, -14]);
  await page.touchscreen.tap(pt.x, pt.y);
  const ok = await page.waitForFunction(() => window.__xp.getState().scene === 'fashion' && window.__xp.getState().mode === 'browse' && !window.__xp.getState().transition, null, { timeout: 30000 }).then(() => true).catch(() => false);
  check('Tapping the portal enters the Fashion Dimension', ok, `tap at ${Math.round(pt.x)},${Math.round(pt.y)}`);
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(OUT, 'm03-fashion.png') });
  const f2 = await fps(page);
  check('Phone fashion frame rate', f2 >= 40, `${f2} fps`);
  await swipe(page, 320, 420, 80, 420, 8);
  await page.waitForTimeout(1500);
  const fi = await page.evaluate(() => window.__xp.getState().focusIndex.streetwear);
  check('Swipe browses the carousel with inertia', fi >= 1, `focus ${fi}`);
  await page.getByRole('button', { name: /^Inspect / }).tap();
  await page.waitForTimeout(2600);
  check('Tap the product card to extract', (await page.evaluate(() => window.__xp.getState().mode)) === 'inspect');
  await page.screenshot({ path: path.join(OUT, 'm04-inspect.png') });
  await swipe(page, 100, 250, 300, 250);
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => window.__motion.inspect.rotYTarget);
  check('Swipe rotates the product', Math.abs(r) > 1, r.toFixed(2));
  await page.getByRole('button', { name: 'Try on avatar' }).tap();
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(OUT, 'm05-fitting.png') });
  await page.getByRole('button', { name: /Shopping bag/ }).tap();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, 'm06-bag.png') });
  await page.keyboard.press('Escape');
  console.log('errors', errors.length, [...new Set(errors)].slice(0, 5).join('\n'));

  // fallback
  const fb = await ctx.newPage();
  await fb.goto('http://localhost:5180/?fallback=1');
  await fb.waitForTimeout(1500);
  const cards = await fb.locator('main button').count();
  check('No-WebGL fallback renders the catalogue', cards >= 15, `${cards} buttons`);
  await fb.locator('main .grid button').first().tap();
  await fb.waitForTimeout(400);
  await fb.screenshot({ path: path.join(OUT, 'm07-fallback.png') });
  await browser.close();
})().catch((e) => {
  console.error('mobile QA crashed', e);
  process.exit(1);
});
