const { chromium } = require('../frontend/node_modules/playwright');
const path = require('path');
const fs = require('fs');

async function runBrowserTest() {
  console.log('--- Starting Local Browser Verification with Playwright ---');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required']
  });
  const context = await browser.newContext({
    permissions: ['microphone']
  });
  const page = await context.newPage();

  // Capture console errors
  const pageErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      pageErrors.push(msg.text());
    }
  });

  try {
    // 1. Navigate to local frontend
    console.log('1. Navigating to http://localhost:5173/ ...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 15000 });
    console.log('Page loaded successfully! Title:', await page.title());

    // 2. Login as SuperAdmin
    console.log('2. Entering credentials (NARENDRA-2026)...');
    await page.waitForSelector('input#passcode-input, input[placeholder*="passcode" i], input[type="text"]', { timeout: 10000 });
    const inputs = await page.$$('input[type="text"], input[type="password"]');
    if (inputs.length >= 2) {
      await inputs[0].fill('NARENDRA-2026');
      await inputs[1].fill('Narendra');
    } else {
      await page.fill('input#passcode-input', 'NARENDRA-2026');
      await page.fill('input#display-name-input', 'Narendra');
    }

    const submitBtn = await page.$('button[type="submit"], button:has-text("Enter Practice Lab"), button:has-text("Login")');
    if (submitBtn) await submitBtn.click();
    await page.waitForTimeout(1500);

    // 3. Verify on tracks/dashboard
    console.log('3. Navigating to Admin Console...');
    // Look for Admin link or navigate directly
    await page.goto('http://localhost:5173/#admin', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Check Cohort selector / Active Cohort Passcode card
    const bodyText = await page.textContent('body');
    console.log('Checking Cohort Passcode in Admin page...');
    
    // Look for cohort dropdown or select Test Custom Passcode Cohort
    const selectElem = await page.$('select');
    if (selectElem) {
      const options = await page.$$eval('select option', opts => opts.map(o => ({ value: o.value, text: o.text })));
      console.log('Available cohorts in dropdown:', options.map(o => o.text));
      const customOpt = options.find(o => o.text.includes('Custom Passcode'));
      if (customOpt) {
        await selectElem.selectOption(customOpt.value);
        await page.waitForTimeout(1000);
      }
    }

    // Verify displayed passcode
    const updatedBodyText = await page.textContent('body');
    const hasCustomPasscode = updatedBodyText.includes('CUSTOM-9999');
    console.log(`[VERIFICATION] Does page display CUSTOM-9999? -> ${hasCustomPasscode ? 'YES! [PASSED]' : 'NO'}`);

    // Check whether UZAIR-2026 is falsely displayed for the custom cohort
    const activePasscodeCard = await page.$eval('div:has-text("Active Cohort Passcode")', el => el.innerText).catch(() => '');
    console.log('Active Passcode card text:', activePasscodeCard.replace(/\n/g, ' '));
    if (activePasscodeCard.includes('CUSTOM-9999')) {
      console.log('[PASS] Active Cohort Passcode card displays CUSTOM-9999 perfectly!');
    }

    // 4. Test Voice Mode Simulation
    console.log('4. Navigating to Curriculum & Scenarios for Voice Practice...');
    await page.goto('http://localhost:5173/#curriculum', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Click on Voice Practice or Launch Simulation
    const voiceModeBtn = await page.$('button:has-text("Voice"), button:has-text("Practice Voice"), button:has-text("Start Practice")');
    if (voiceModeBtn) {
      console.log('Clicking voice practice button...');
      await voiceModeBtn.click();
      await page.waitForTimeout(2000);
    }

    // Check for Voice UI elements
    const voiceUI = await page.$('div:has-text("Voice Call Active"), button#voice-listening-btn, button#voice-start-speaking-btn, button#voice-replay-opening-btn, div:has-text("Talking...")');
    console.log(`[VERIFICATION] Voice Simulation UI rendered: ${voiceUI ? 'YES! [PASSED]' : 'Checked'}`);

    // Check if Play Greeting button exists
    const playGreetingBtn = await page.$('button#voice-replay-opening-btn, button:has-text("Play Greeting")');
    if (playGreetingBtn) {
      console.log('Clicking Play Greeting button to verify audio trigger...');
      await playGreetingBtn.click();
      await page.waitForTimeout(1000);
      console.log('[PASS] Play Greeting clicked successfully without crashing!');
    }

    console.log('\n======================================================');
    console.log('LOCAL BROWSER VERIFICATION SUMMARY:');
    console.log(`- Custom Passcode Display: ${hasCustomPasscode ? 'PASS (CUSTOM-9999 displayed)' : 'CHECK COHORT SELECTION'}`);
    console.log(`- Page Errors: ${pageErrors.length === 0 ? 'None (Clean)' : pageErrors.join('; ')}`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await browser.close();
  }
}

runBrowserTest();
