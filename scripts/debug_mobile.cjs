const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright'));

async function debugMobile() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://127.0.0.1:8000/app/', { waitUntil: 'networkidle' });
  console.log('Opened home page');

  // Open mobile menu and sign in
  await page.locator("button[aria-label='Toggle mobile menu']").click();
  await page.waitForTimeout(500);
  await page.locator("button:has-text('Cohort Sign In')").last().click();
  await page.waitForSelector('#modal-passcode-input');

  await page.fill('#modal-passcode-input', 'UZAIR-2026');
  await page.fill('#modal-displayname-input', 'Dev');
  await page.click('#modal-signin-submit-btn');

  await page.waitForTimeout(2000);

  const html = await page.content();
  console.log('HTML length:', html.length);

  const text = await page.evaluate(() => document.body.innerText);
  console.log('Body text preview:\n', text.slice(0, 1000));

  await page.screenshot({ path: 'recordings/debug_mobile_screenshot.png' });
  console.log('Saved debug_mobile_screenshot.png');

  await browser.close();
}

debugMobile();
