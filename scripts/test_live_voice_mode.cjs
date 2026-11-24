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
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

  console.log('1. Loading live app...');
  await page.goto('https://mrdev444-scenario-training-backend.hf.space/app/', { waitUntil: 'networkidle', timeout: 45000 });

  // 2. Sign in as student
  console.log('2. Signing in as student...');
  const loginCta = page.locator('#home-signin-cta-btn, button:has-text("Cohort Sign In"), button:has-text("Enter Practice Platform"), button:has-text("Sign In")').first();
  await loginCta.click();
  await page.waitForSelector('#modal-passcode-input', { timeout: 10000 });
  await page.fill('#modal-passcode-input', 'UZAIR-2026');
  await page.fill('#modal-displayname-input', 'Dev');
  await page.click('#modal-signin-submit-btn');
  await page.waitForTimeout(3000);

  // 3. Open first Capability Practice Scenario Briefing Modal
  console.log('3. Opening Scenario Briefing...');
  const practiceBtn = page.locator('button:has-text("Practice Scenario")').first();
  await practiceBtn.click();
  await page.waitForSelector('#start-practice-btn', { timeout: 10000 });

  // 4. Select Voice Practice mode in modal
  console.log('4. Selecting Voice Practice mode...');
  const voiceModeBtn = page.locator('button:has-text("Voice Practice")');
  await voiceModeBtn.click();
  await page.waitForTimeout(500);

  // 5. Click Start Practice
  console.log('5. Clicking Start Practice...');
  await page.click('#start-practice-btn');

  // 6. Wait for chat page to load and audio to start within 3-5 seconds
  console.log('6. Waiting 4 seconds for simulation chat and counterpart speech...');
  await page.waitForTimeout(4000);

  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Page snippet:', bodyText.slice(0, 300).replace(/\n+/g, ' '));

  const isSpeaking = bodyText.includes('is speaking') || bodyText.includes('Speaking');
  const isListening = bodyText.includes('Listening to you') || bodyText.includes('Listening');
  const hasVoiceMode = bodyText.includes('Voice Mode') || bodyText.includes('Voice');

  console.log('Voice session checks:');
  console.log(' - In Voice Mode:', hasVoiceMode);
  console.log(' - Counterpart Speaking detected:', isSpeaking);
  console.log(' - Listening / Microphone Active detected:', isListening);

  // Check Send Response button
  const sendBtn = await page.$('#voice-send-response-btn');
  console.log(' - Send response button present:', !!sendBtn);

  // Filter errors
  const errors = logs.filter(l => l.includes('error') || l.includes('Error') || l.includes('network error') || l.includes('AbortError'));
  console.log('Console errors/warnings (must be empty):', errors);

  await browser.close();
  console.log('TEST COMPLETE!');
})();
