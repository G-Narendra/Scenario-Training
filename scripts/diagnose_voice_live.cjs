const { chromium } = require('../frontend/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required'
    ]
  });

  const context = await browser.newContext({
    permissions: ['microphone']
  });
  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}]:`, msg.text());
  });

  page.on('pageerror', err => {
    console.error('[BROWSER UNCAUGHT ERROR]:', err);
  });

  page.on('requestfailed', req => {
    console.warn(`[REQUEST FAILED]: ${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
  });

  console.log('1. Navigating to live app...');
  await page.goto('https://mrdev444-scenario-training-backend.hf.space/app/', { waitUntil: 'networkidle' });

  // 2. Sign in as Dev
  console.log('2. Signing in...');
  const signinBtn = page.locator('#home-signin-cta-btn, button:has-text("Cohort Sign In"), button:has-text("Enter Practice Platform")').first();
  await signinBtn.click();
  await page.waitForSelector('#modal-passcode-input', { timeout: 10000 });
  await page.fill('#modal-passcode-input', 'UZAIR-2026');
  await page.fill('#modal-displayname-input', 'Narendra');
  await page.click('#modal-signin-submit-btn');
  await page.waitForTimeout(2000);

  // 3. Open scenario briefing
  console.log('3. Opening Scenario Briefing...');
  const practiceBtn = page.locator('button:has-text("Practice Scenario")').first();
  await practiceBtn.click();
  await page.waitForSelector('#start-practice-btn', { timeout: 10000 });

  // 4. Select voice mode
  console.log('4. Selecting Voice Mode...');
  await page.click('#mode-select-voice');
  await page.waitForTimeout(500);

  // 5. Click Start Practice
  console.log('5. Clicking Start Practice...');
  await page.click('#start-practice-btn');

  // 6. Monitor for 12 seconds
  console.log('6. Monitoring voice session for 12 seconds...');
  for (let i = 1; i <= 12; i++) {
    await page.waitForTimeout(1000);
    const state = await page.evaluate(() => {
      const activeEl = document.querySelector('[data-testid="audio-meter"], #voice-mic-mute-btn');
      const speakingBadge = document.querySelector('[data-role="speaking-indicator"], .animate-pulse');
      const body = document.body.innerText;
      return {
        hasVoiceDeck: !!document.getElementById('voice-mic-mute-btn'),
        bodySnippet: body.slice(0, 150).replace(/\n+/g, ' '),
      };
    });
    console.log(`[Sec ${i}]:`, state);
  }

  await browser.close();
})();
