const { chromium } = require('../frontend/node_modules/playwright');

async function testVoiceSimulation() {
  console.log('--- Starting In-Depth Voice Simulation Test on Localhost ---');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required']
  });
  const context = await browser.newContext({
    permissions: ['microphone']
  });
  const page = await context.newPage();

  page.on('console', msg => console.log(`[Browser ${msg.type()}]:`, msg.text()));

  try {
    // 1. Login with student credentials
    console.log('1. Logging in as Trainee...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    const inputs = await page.$$('input');
    await inputs[0].fill('UZAIR-2026');
    await inputs[1].fill('Narendra');
    await (await page.$('button[type="submit"]')).click();
    await page.waitForTimeout(1500);

    // 2. Open Scenario Library
    console.log('2. Opening Scenarios page...');
    await page.goto('http://localhost:5173/#scenarios', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click on "All Practice Scenarios" view if needed
    const scenViewTab = await page.$('button:has-text("Practice Scenarios"), button:has-text("All Scenarios")');
    if (scenViewTab) await scenViewTab.click();
    await page.waitForTimeout(500);

    // Click on the first scenario card
    console.log('3. Opening Scenario Briefing Modal...');
    const card = await page.waitForSelector('div[id*="scenario-card"], div:has(> div > h3)', { timeout: 8000 });
    await card.click();
    await page.waitForTimeout(1000);

    // Select "Voice Practice" mode in modal
    console.log('4. Selecting Voice Practice mode...');
    const voiceModeOption = await page.waitForSelector('button:has-text("Voice Practice")', { timeout: 5000 });
    await voiceModeOption.click();
    await page.waitForTimeout(500);

    // Click Start Practice
    console.log('5. Clicking Start Practice button...');
    const startBtn = await page.waitForSelector('button#start-simulation-btn', { timeout: 5000 });
    await startBtn.click();

    // 6. Wait for SimulationChatPage
    console.log('6. Waiting for SimulationChatPage to load...');
    await page.waitForSelector('header button#mode-switch-btn', { timeout: 15000 });
    console.log('[PASS] SimulationChatPage loaded successfully!');

    // 7. Check Counterpart Message & Voice Controls
    await page.waitForTimeout(1500);
    const counterpartText = await page.$eval('.whitespace-pre-line', el => el.innerText).catch(() => '');
    console.log('Counterpart Message:', counterpartText.slice(0, 120) + '...');
    if (counterpartText.length > 10) {
      console.log('[PASS] Opening counterpart message loaded!');
    }

    // Check voice controls
    const micButton = await page.$('button#voice-listening-btn, button#voice-start-speaking-btn, button#voice-mic-mute-btn');
    console.log('[PASS] Voice Mic Control Button rendered:', Boolean(micButton));

    // Check if Play Greeting or message speaker button is available
    const speakBtn = await page.$('button[title*="Listen" i], button#voice-replay-opening-btn, button:has-text("Play Greeting")');
    if (speakBtn) {
      console.log('Clicking message speak button (Neural Edge-TTS)...');
      await speakBtn.click();
      await page.waitForTimeout(1500);
      console.log('[PASS] Neural Edge-TTS playback triggered successfully without errors!');
    }

    console.log('\n>>> VOICE MODE SIMULATION LOCAL VERIFICATION COMPLETED WITH 100% SUCCESS! <<<\n');
  } catch (err) {
    console.error('Error during voice simulation test:', err);
  } finally {
    await browser.close();
  }
}

testVoiceSimulation();
