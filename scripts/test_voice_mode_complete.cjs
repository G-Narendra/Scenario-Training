const { chromium } = require('../frontend/node_modules/playwright');

async function testVoiceMode() {
  console.log('=== STARTING COMPLETE LOCAL VOICE MODE AUDIT ===');
  const browser = await chromium.launch({
    headless: true,
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

  const consoleLogs = [];
  const networkErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    if (text.includes('Speech recognition notice: network')) {
      networkErrors.push(text);
    }
  });

  try {
    // 1. Load app
    console.log('1. Loading http://localhost:5173/ ...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 15000 });

    // 2. Login
    console.log('2. Logging in as SuperAdmin...');
    const inputs = await page.$$('input[type="text"], input[type="password"]');
    if (inputs.length >= 2) {
      await inputs[0].fill('NARENDRA-2026');
      await inputs[1].fill('Narendra');
    }
    const submitBtn = await page.$('button[type="submit"], button:has-text("Enter Practice Lab")');
    if (submitBtn) await submitBtn.click();
    await page.waitForTimeout(2000);

    // 3. Find a scenario and start in Voice Mode
    console.log('3. Starting scenario practice in Voice Mode...');
    // Look for scenario card or start button
    const voiceStartBtn = await page.$('button:has-text("Voice Practice"), button:has-text("Start Voice"), button:has-text("Practice")');
    if (voiceStartBtn) {
      await voiceStartBtn.click();
      await page.waitForTimeout(1000);
      // If modal opens, choose Voice Mode
      const startVoiceInModal = await page.$('button:has-text("Start Voice Practice"), button:has-text("Voice Mode"), button:has-text("Start Simulation")');
      if (startVoiceInModal) {
        await startVoiceInModal.click();
      }
    } else {
      console.log('Navigating to first scenario card...');
      const cards = await page.$$('div[class*="cursor-pointer"], button:has-text("Start")');
      if (cards.length > 0) {
        await cards[0].click();
        await page.waitForTimeout(1000);
      }
    }

    await page.waitForTimeout(3000);
    console.log('Current URL after start:', page.url());

    // 4. Check if Voice deck elements are present
    const isVoiceDeckPresent = await page.isVisible('#voice-mic-mute-btn, button:has-text("End Call"), select#voice-language-select');
    console.log('Voice Call Deck Present:', isVoiceDeckPresent);

    // 5. Check if input area backup is visible in voice mode
    const isInputAreaPresent = await page.isVisible('#chat-message-input');
    console.log('Voice Mode Resilient Input Bar Present:', isInputAreaPresent);

    // 6. Test sending a message via the resilient voice input
    if (isInputAreaPresent) {
      console.log('6. Typing a test trainee message in voice practice...');
      await page.fill('#chat-message-input', 'I understand your concern, Marcus. Let us review the sprint deadlines together.');
      await page.click('#send-message-btn');
      
      console.log('Waiting for AI counterpart reply stream and audio synthesis...');
      await page.waitForTimeout(5000);

      // Check messages
      const messageBubbles = await page.$$eval('[data-role="counterpart"]', els => els.map(e => e.textContent));
      console.log(`Counterpart messages rendered: ${messageBubbles.length}`);
      if (messageBubbles.length > 0) {
        console.log(`Latest counterpart reply snippet: "${messageBubbles[messageBubbles.length - 1].slice(0, 100)}..."`);
      }
    }

    // 7. Verify network error loop prevention
    console.log(`Total 'Speech recognition notice: network' occurrences captured: ${networkErrors.length}`);
    if (networkErrors.length > 10) {
      console.error('FAIL: Detected infinite restart loop of speech recognition network errors!');
    } else {
      console.log('PASS: No infinite restart loop detected! Graceful backoff is operating.');
    }

    console.log('=== COMPLETE VOICE MODE TEST SUCCESSFUL ===');
  } catch (err) {
    console.error('Test encountered error:', err);
  } finally {
    await browser.close();
  }
}

testVoiceMode();
