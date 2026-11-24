const { chromium } = require('../frontend/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required'
    ]
  });

  const context = await browser.newContext({ permissions: ['microphone'] });
  const page = await context.newPage();

  page.on('console', msg => console.log(`[CONSOLE ${msg.type()}]:`, msg.text()));
  page.on('pageerror', err => console.error('[PAGE ERROR]:', err));

  await page.goto('https://mrdev444-scenario-training-backend.hf.space/app/', { waitUntil: 'networkidle' });

  // Sign in
  const signinBtn = page.locator('#home-signin-cta-btn, button:has-text("Cohort Sign In"), button:has-text("Enter Practice Platform")').first();
  await signinBtn.click();
  await page.waitForSelector('#modal-passcode-input', { timeout: 10000 });
  await page.fill('#modal-passcode-input', 'UZAIR-2026');
  await page.fill('#modal-displayname-input', 'Narendra');
  await page.click('#modal-signin-submit-btn');
  await page.waitForTimeout(2000);

  // Click Practice Scenario
  const practiceBtn = page.locator('button:has-text("Practice Scenario")').first();
  await practiceBtn.click();
  await page.waitForSelector('#start-practice-btn', { timeout: 10000 });

  // Select Voice Mode
  await page.click('#mode-select-voice');
  await page.waitForTimeout(500);

  // Click Start Practice
  console.log('Clicking Start Practice...');
  await page.click('#start-practice-btn');

  // Monitor audio elements and voiceClient state in window
  for (let s = 1; s <= 6; s++) {
    await page.waitForTimeout(1000);
    const info = await page.evaluate(() => {
      const audios = Array.from(document.querySelectorAll('audio')).map(a => ({
        src: a.src,
        paused: a.paused,
        currentTime: a.currentTime,
        duration: a.duration,
        error: a.error ? a.error.message : null
      }));
      // Check audio elements created via new Audio()
      const sharedAudio = window.__sharedAudioContext ? {
        state: window.__sharedAudioContext.state,
        sampleRate: window.__sharedAudioContext.sampleRate
      } : null;
      return { audios, sharedAudio };
    });
    console.log(`Sec ${s}:`, JSON.stringify(info));
  }

  await browser.close();
})();
