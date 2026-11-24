// NEXORA end-to-end QA: drives the real app in Chromium on the local GPU,
// records console errors, frame rates and screenshots at each checkpoint.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const URL = process.env.NX_URL || 'http://localhost:5180/';
const only = process.argv[2] || 'all';

const log = [];
const check = (name, ok, extra = '') => {
  log.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
};

async function waitFor(page, fn, timeout = 20000, arg) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try {
      if (await page.evaluate(fn, arg)) return true;
    } catch {}
    await page.waitForTimeout(150);
  }
  return false;
}

async function fps(page, ms = 2500) {
  return page.evaluate(
    (ms) =>
      new Promise((resolve) => {
        let frames = 0;
        const times = [];
        let last = performance.now();
        const t0 = last;
        const tick = (t) => {
          frames++;
          times.push(t - last);
          last = t;
          if (t - t0 < ms) requestAnimationFrame(tick);
          else {
            times.sort((a, b) => a - b);
            resolve({ fps: Math.round((frames * 1000) / (t - t0)), p95: Math.round(times[Math.floor(times.length * 0.95)]) });
          }
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );
}

const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) });

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text().slice(0, 300)}`);
  });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  const q = process.env.NX_Q ? `?quality=${process.env.NX_Q}` : '';
  await page.goto(URL + q, { waitUntil: 'domcontentloaded' });
  const t0 = Date.now();

  // ---------- loader ----------
  const loaded = await waitFor(page, () => window.__xp && window.__xp.getState().progress >= 1, 40000);
  check('Loader reaches 100%', loaded, `${((Date.now() - t0) / 1000).toFixed(1)}s, quality=${await page.evaluate(() => window.__xp.getState().quality)}`);
  await shot(page, '01-loader');
  await page.getByRole('button', { name: 'Enter NEXORA' }).click();
  await page.waitForTimeout(5500);
  await shot(page, '02-universe');
  const fU = await fps(page);
  check('Universe frame rate', fU.fps >= 45, `${fU.fps} fps, p95 frame ${fU.p95} ms`);

  // ---------- universe exploration ----------
  const box = { x: 640, y: 380 };
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  await page.mouse.move(box.x + 260, box.y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const yaw = await page.evaluate(() => window.__motion.universe.yawTarget);
  check('Drag turns the view in the universe', Math.abs(yaw) > 0.3, `yawTarget=${yaw.toFixed(2)}`);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(800);
  const prog = await page.evaluate(() => window.__motion.universe.progress);
  check('Scroll moves through the universe', prog > 0.1, `progress=${prog.toFixed(2)}`);
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(1500);
  await shot(page, '03-universe-explored');

  if (only === 'universe') return finish();

  // ---------- portal hover + entry ----------
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  await shot(page, '04-portal-approach');
  await page.waitForTimeout(1500);
  await shot(page, '05-warp');
  const arrived = await waitFor(page, () => window.__xp.getState().scene === 'fashion' && !window.__xp.getState().transition, 20000);
  check('Enter flies through the Fashion portal into the dimension', arrived);
  await shot(page, '06-fashion-overview');
  const inZone = await waitFor(page, () => window.__xp.getState().mode === 'browse', 6000);
  check('Arrival glides into zone A (browse)', inZone);
  await page.waitForTimeout(2200);
  await shot(page, '07-streetwear');
  const fF = await fps(page);
  check('Fashion dimension frame rate', fF.fps >= 45, `${fF.fps} fps, p95 ${fF.p95} ms`);

  // ---------- carousel ----------
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(900);
  let fi = await page.evaluate(() => window.__xp.getState().focusIndex.streetwear);
  check('Arrow key moves the carousel', fi === 1, `focusIndex=${fi}`);
  await page.mouse.move(800, 420);
  await page.mouse.down();
  await page.mouse.move(520, 420, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(1400);
  fi = await page.evaluate(() => window.__xp.getState().focusIndex.streetwear);
  check('Drag with inertia moves the carousel', fi >= 2, `focusIndex=${fi}`);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(900);
  const fiW = await page.evaluate(() => window.__xp.getState().focusIndex.streetwear);
  check('Mouse wheel moves the carousel', fiW < fi, `focusIndex=${fiW}`);
  await shot(page, '08-carousel');

  // ---------- zone switching ----------
  await page.keyboard.press('Digit2');
  await page.waitForTimeout(2200);
  check('Zone 2 (Luxury) via keyboard', (await page.evaluate(() => window.__xp.getState().zone)) === 'luxury');
  await shot(page, '09-luxury');
  for (const [k, z] of [['Digit3', 'essentials'], ['Digit4', 'sneakers'], ['Digit5', 'accessories']]) {
    await page.keyboard.press(k);
    await page.waitForTimeout(2200);
    await shot(page, `10-${z}`);
  }
  await page.keyboard.press('Digit1');
  await page.waitForTimeout(2200);

  // ---------- extraction + 360 ----------
  await page.keyboard.press('Enter');
  await page.waitForTimeout(700);
  await shot(page, '11-extracting');
  await page.waitForTimeout(1600);
  const sel = await page.evaluate(() => [window.__xp.getState().mode, window.__xp.getState().selectedId, window.__xp.getState().extractedId]);
  check('Enter extracts the centred garment', sel[0] === 'inspect' && sel[1] === sel[2], JSON.stringify(sel));
  await shot(page, '12-inspect');
  const r0 = await page.evaluate(() => window.__motion.inspect.rotYTarget);
  await page.mouse.move(400, 400);
  await page.mouse.down();
  await page.mouse.move(600, 400, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(700);
  const r1 = await page.evaluate(() => window.__motion.inspect.rotYTarget);
  check('Drag rotates the product (360)', Math.abs(r1 - r0) > 1, `rotY ${r0.toFixed(2)} → ${r1.toFixed(2)}`);
  await shot(page, '13-inspect-rotated');
  await page.mouse.move(400, 400);
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(800);
  const z = await page.evaluate(() => window.__motion.inspect.zoomTarget);
  check('Wheel zooms the product', z < 0.9, `zoom=${z.toFixed(2)}`);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.waitForTimeout(1200);
  await shot(page, '14-inspect-back');
  await page.getByRole('button', { name: 'Detail', exact: true }).click();
  await page.waitForTimeout(1300);
  const hs = await page.evaluate(() => window.__xp.getState().activeHotspot);
  check('Detail preset opens a hotspot', !!hs, `hotspot=${hs}`);
  await shot(page, '15-detail-hotspot');

  // colour + size + bag + wishlist
  const pid = await page.evaluate(() => window.__xp.getState().selectedId);
  const colors = page.getByRole('radiogroup', { name: 'Colour' }).getByRole('radio');
  await colors.nth(2).click();
  await page.waitForTimeout(700);
  const cv = await page.evaluate((id) => window.__shop.getState().variants[id]?.colorId, pid);
  check('Colour change', !!cv, `colorId=${cv}`);
  await shot(page, '16-colour');
  await page.getByRole('button', { name: /Add to bag|Pre-order/ }).click();
  const noSize = await page.evaluate(() => window.__shop.getState().bag.length);
  check('Add to bag without a size is blocked with a prompt', noSize === 0);
  await page.getByRole('radiogroup', { name: /Size|UK size/ }).getByRole('radio').nth(1).click();
  await page.getByRole('button', { name: /Add to bag|Pre-order/ }).click();
  await page.waitForTimeout(300);
  const bagLen = await page.evaluate(() => window.__shop.getState().bag.length);
  check('Add to bag with a size', bagLen === 1);
  await page.getByRole('button', { name: 'Save to wishlist' }).click();
  check('Wishlist', (await page.evaluate(() => window.__shop.getState().wishlist.length)) === 1);

  // ---------- fitting room ----------
  await page.getByRole('button', { name: 'Try on avatar' }).click();
  await page.waitForTimeout(3600);
  check('Try on opens the fitting pod', (await page.evaluate(() => window.__xp.getState().mode)) === 'fitting');
  await shot(page, '17-fitting');
  await page.getByRole('radio', { name: /Noor/ }).click();
  await page.waitForTimeout(2800);
  check('Avatar switch', (await page.evaluate(() => window.__shop.getState().avatarId)) === 'noor');
  await shot(page, '18-fitting-noor');
  await page.getByRole('tab', { name: 'Outfit composer' }).click();
  await page.waitForTimeout(1800);
  await page.getByRole('tab', { name: 'Tops', exact: true }).click();
  await page.waitForTimeout(500);
  await page.locator('aside[aria-label="Fitting pod"] li button[aria-pressed="false"]').first().click();
  await page.waitForTimeout(400);
  await page.getByRole('tab', { name: 'Footwear' }).click();
  await page.locator('aside[aria-label="Fitting pod"] li button[aria-pressed="false"]').first().click();
  await page.waitForTimeout(1500);
  const outfit = await page.evaluate(() => window.__shop.getState().outfit);
  check('Outfit composer adds pieces', Object.keys(outfit).length >= 3, JSON.stringify(outfit));
  await shot(page, '19-composer');
  await page.getByRole('button', { name: 'Save outfit' }).click();
  check('Save outfit to wishlist', (await page.evaluate(() => window.__shop.getState().outfits.length)) === 1);
  const fC = await fps(page);
  check('Fitting pod frame rate', fC.fps >= 40, `${fC.fps} fps, p95 ${fC.p95} ms`);

  // ---------- runway ----------
  await page.getByRole('button', { name: 'Walk the runway' }).click();
  await page.waitForTimeout(4500);
  check('Runway opens', (await page.evaluate(() => window.__xp.getState().mode)) === 'runway');
  await shot(page, '20-runway');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(2000);

  // ---------- bag panel ----------
  await page.getByRole('button', { name: /Shopping bag/ }).click();
  await page.waitForTimeout(800);
  await shot(page, '21-bag');
  await page.getByRole('button', { name: 'Increase quantity' }).first().click();
  check('Update quantity', (await page.evaluate(() => window.__shop.getState().bag[0].qty)) === 2);
  await page.getByRole('button', { name: 'Checkout preview' }).click();
  await page.waitForTimeout(700);
  await shot(page, '22-checkout');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // ---------- companion ----------
  await page.getByRole('button', { name: /Open the NEXORA fashion companion/ }).click();
  await page.getByRole('button', { name: 'Build an outfit under ₹10,000' }).click();
  await page.waitForTimeout(1600);
  await shot(page, '23-companion');
  const reply = await page.locator('section[aria-label="Fashion companion"]').innerText();
  check('Companion builds a budget outfit', /inside your/.test(reply), reply.split('\n').slice(0, 4).join(' | ').slice(0, 200));
  await page.keyboard.press('Escape');

  // ---------- back to universe, then Tech ----------
  await page.getByRole('button', { name: 'Back to the universe' }).click();
  const back = await waitFor(page, () => window.__xp.getState().scene === 'universe' && !window.__xp.getState().transition, 20000);
  check('Back to universe', back);
  await page.waitForTimeout(600);
  await shot(page, '24-universe-return');
  await page.evaluate(() => window.__xp.getState().goToProduct('audio-sonar'));
  const tech = await waitFor(page, () => window.__xp.getState().scene === 'tech' && window.__xp.getState().mode === 'inspect', 30000);
  check('Companion/product link flies to the Tech Dimension and extracts', tech);
  await page.waitForTimeout(1800);
  await shot(page, '25-tech-inspect');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1600);
  await shot(page, '26-tech-browse');
  const fT = await fps(page);
  check('Tech dimension frame rate', fT.fps >= 45, `${fT.fps} fps, p95 ${fT.p95} ms`);

  // inactive portal
  await page.getByRole('button', { name: 'Back to the universe' }).click();
  await waitFor(page, () => window.__xp.getState().scene === 'universe' && !window.__xp.getState().transition, 20000);
  await page.evaluate(() => window.__xp.getState().activatePortal('living'));
  await page.waitForTimeout(400);
  const toast = await page.locator('[role=status]').innerText();
  check('Inactive portal explains it is coming soon', /Opening/.test(toast), toast.slice(0, 120));

  finish();

  async function finish() {
    const dpr = await page.evaluate(() => window.__dpr).catch(() => 'n/a');
    console.log('\nfinal quality:', await page.evaluate(() => window.__xp.getState().quality), 'dpr:', dpr);
    console.log('\nconsole errors/warnings:', errors.length);
    [...new Set(errors)].slice(0, 25).forEach((e) => console.log('  ' + e));
    fs.writeFileSync(path.join(OUT, 'qa-log.txt'), log.join('\n') + '\n\n' + [...new Set(errors)].join('\n'));
    await browser.close();
  }
})().catch((e) => {
  console.error('QA crashed:', e);
  process.exit(1);
});
