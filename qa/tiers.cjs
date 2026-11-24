const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, 'shots');
require('fs').mkdirSync(OUT, { recursive: true });
async function fps(page, ms = 2000) {
  return page.evaluate((ms) => new Promise((resolve) => {
    let n = 0; const t0 = performance.now();
    const tick = (t) => { n++; if (t - t0 < ms) requestAnimationFrame(tick); else resolve(Math.round((n * 1000) / (t - t0))); };
    requestAnimationFrame(tick);
  }), ms);
}
(async () => {
  const q = process.argv[2] || 'high';
  const w = +(process.argv[3] || 1280), h = +(process.argv[4] || 760);
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text().slice(0, 240)));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://localhost:5180/?quality=${q}`);
  await page.waitForFunction(() => window.__xp && window.__xp.getState().progress >= 1, null, { timeout: 40000 });
  await page.getByRole('button', { name: 'Enter NEXORA' }).click();
  await page.waitForTimeout(5200);
  await page.screenshot({ path: path.join(OUT, `${q}-${w}-universe.png`) });
  console.log(q, w, 'universe fps', await fps(page));
  await page.evaluate(() => window.__xp.getState().activatePortal('fashion'));
  await page.waitForFunction(() => window.__xp.getState().mode === 'browse' && !window.__xp.getState().transition, null, { timeout: 30000 });
  await page.waitForTimeout(2300);
  await page.screenshot({ path: path.join(OUT, `${q}-${w}-fashion.png`) });
  console.log(q, w, 'fashion fps', await fps(page));
  await page.evaluate(() => window.__xp.getState().setZone('luxury'));
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(OUT, `${q}-${w}-luxury.png`) });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2600);
  await page.screenshot({ path: path.join(OUT, `${q}-${w}-inspect.png`) });
  console.log(q, w, 'inspect fps', await fps(page));
  await page.evaluate(() => window.__xp.setState({ mode: 'overview', selectedId: null }));
  await page.waitForTimeout(2600);
  await page.screenshot({ path: path.join(OUT, `${q}-${w}-overview.png`) });
  console.log('quality now', await page.evaluate(() => window.__xp.getState().quality), 'errors:', [...new Set(errors)].join('\n'));
  await browser.close();
})();
