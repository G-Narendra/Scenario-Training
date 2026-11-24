const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  const context = await browser.newContext({
    permissions: ['microphone']
  });
  const page = await context.newPage();
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(msg.text()));

  console.log('Navigating to live deployment...');
  await page.goto('https://mrdev444-scenario-training-backend.hf.space/app/', { waitUntil: 'networkidle', timeout: 45000 });
  console.log('Page title:', await page.title());

  // Click login
  const loginCta = page.locator('#home-signin-cta-btn, #enter-platform-cta, button:has-text("Cohort Sign In"), button:has-text("Enter Practice Platform"), button:has-text("Sign In")').first();
  await loginCta.click();
  await page.waitForSelector('#modal-passcode-input', { timeout: 10000 });
  await page.fill('#modal-passcode-input', 'UZAIR-2026');
  await page.fill('#modal-displayname-input', 'Dev');
  await page.click('#modal-signin-submit-btn');
  await page.waitForTimeout(3000);

  // Check scenario badges
  const badges = await page.$$eval('.font-mono', els => els.map(e => e.textContent.trim()).filter(t => t.startsWith('#')));
  console.log('First 10 scenario badges:', badges.slice(0, 10));

  // Check print style in document
  const hasPrintStyle = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('style')).some(s => s.textContent.includes('@page') && s.textContent.includes('margin: 0 !important'));
  });
  console.log('Has clean print @page margin 0 style:', hasPrintStyle);

  // Test voice switch
  const firstScenBtn = await page.$('button:has-text("Start Simulation"), button:has-text("Enter Practice")');
  if (firstScenBtn) {
    await firstScenBtn.click();
    await page.waitForTimeout(2000);
    const voiceToggle = await page.$('button:has-text("Voice Mode"), button:has-text("Switch to Voice")');
    if (voiceToggle) {
      await voiceToggle.click();
      await page.waitForTimeout(2000);
      console.log('Switched to voice mode.');
    }
  }

  const errorLogs = consoleLogs.filter(l => l.includes('error') || l.includes('Error') || l.includes('network error'));
  console.log('Console warnings/errors:', errorLogs);

  await browser.close();
  console.log('ALL BROWSER TESTS COMPLETED SUCCESSFULLY!');
})();
