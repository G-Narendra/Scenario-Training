const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright'));

async function testMobileLogoutAndSignIn() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();

  console.log('1. Navigating to /app/ ...');
  await page.goto('http://127.0.0.1:8000/app/', { waitUntil: 'networkidle' });

  console.log('2. Opening mobile menu...');
  await page.click('button[aria-label="Toggle mobile menu"]');
  await page.waitForTimeout(400);

  console.log('3. Clicking mobile sign in button...');
  await page.click('#mobile-nav-signin-btn');
  await page.waitForSelector('#modal-signin-submit-btn', { timeout: 8000 });

  console.log('4. Filling delegate credentials...');
  await page.fill('#modal-passcode-input', 'UZAIR-2026');
  await page.fill('#modal-displayname-input', 'Dev');
  await page.click('#modal-signin-submit-btn');

  console.log('5. Waiting for library...');
  await page.waitForSelector('text=3H Solutions Executive Training', { timeout: 12000 });
  console.log('✓ Student logged in');

  console.log('6. Clicking logout...');
  await page.click('#logout-btn');
  await page.waitForTimeout(1000);

  console.log('URL after logout:', page.url());
  const homeHero = await page.isVisible('text=Master High-Stakes');
  console.log('Home page visible:', homeHero);

  console.log('7. Opening mobile menu again after logout...');
  await page.click('button[aria-label="Toggle mobile menu"]');
  await page.waitForTimeout(400);

  console.log('8. Clicking mobile sign in button again...');
  await page.click('#mobile-nav-signin-btn');

  console.log('9. Waiting for modal title...');
  const modalTitle = await page.waitForSelector('#signin-modal-title', { timeout: 8000 });
  console.log('✓ Modal title visible:', Boolean(modalTitle));

  console.log('10. Filling facilitator credentials...');
  await page.fill('#modal-passcode-input', 'UZAIR-2026');
  await page.fill('#modal-displayname-input', 'Uzair');
  await page.click('#modal-signin-submit-btn');

  console.log('11. Waiting for Facilitator Console...');
  await page.waitForSelector('text=Executive Facilitator Console', { timeout: 15000 });
  console.log('✓ Facilitator logged in and console visible!');

  await browser.close();
}

testMobileLogoutAndSignIn().catch((err) => {
  console.error('Test cycle failed:', err);
  process.exit(1);
});
