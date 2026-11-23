const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('response', resp => {
    if (resp.url().includes('/api/')) {
      console.log('API RESPONSE:', resp.status(), resp.url());
    }
  });

  await page.goto('https://mrdev444-scenario-training-backend.hf.space/app/');
  await page.click('#home-signin-cta-btn');
  await page.waitForSelector('#modal-passcode-input');
  await page.fill('#modal-passcode-input', 'UZAIR-2026');
  await page.fill('#modal-displayname-input', 'Dev');
  await page.click('#modal-signin-submit-btn');
  await page.waitForTimeout(4000);

  const errorEl = await page.$('[role="alert"]');
  if (errorEl) {
    console.log('ALERT FOUND:', await errorEl.innerText());
  }
  console.log('Current URL:', page.url());
  const bodyText = await page.innerText('body');
  console.log('Body snippet:', bodyText.slice(0, 300));
  await browser.close();
})();
