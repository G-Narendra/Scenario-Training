// Student (Dev) Walkthrough Recording Script with Playwright
// Records a high-resolution, full-journey video of the student experience.
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright'));
const fs = require('fs');

const BASE_URL = 'https://mrdev444-scenario-training-backend.hf.space/app/';
const RAW_DIR = path.resolve(__dirname, '../recordings/student_raw');
const FINAL_DIR = path.resolve(__dirname, '../recordings');

(async () => {
  console.log('=== STARTING STUDENT (DEV) WALKTHROUGH RECORDING ===');
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.mkdirSync(FINAL_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--no-sandbox']
  });

  const context = await browser.newContext({
    recordVideo: {
      dir: RAW_DIR,
      size: { width: 1280, height: 720 },
    },
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  try {
    // ------------------------------------------------------------------
    // STEP 1: LOGIN AS PARTICIPANT DEV
    // ------------------------------------------------------------------
    console.log('[1/7] Navigating to Login Page...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    // Save screenshot
    await page.screenshot({ path: path.join(FINAL_DIR, 'student_01_login.png') });

    console.log('[1/7] Entering passcode and student name Dev...');
    await page.fill('#passcode-input', 'UZAIR-2026');
    await page.waitForTimeout(500);
    await page.fill('#display-name-input', 'Dev');
    await page.waitForTimeout(800);

    await page.click('#login-submit-btn');
    await page.waitForTimeout(2500);

    // ------------------------------------------------------------------
    // STEP 2: SCENARIO LIBRARY & PARTICIPANT ORIENTATION
    // ------------------------------------------------------------------
    console.log('[2/7] Landed on Scenario Library / Curriculum. Viewing Orientation Banner...');
    await page.waitForSelector('#view-mode-capabilities-btn', { timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(FINAL_DIR, 'student_02_orientation_curriculum.png') });

    // Filter by Pillar: Cognitive Agility & Problem Solving
    console.log('[2/7] Filtering by Leadership Pillar: Cognitive Agility...');
    const pillarSelect = await page.$('#capability-pillar-filter');
    if (pillarSelect) {
      await page.selectOption('#capability-pillar-filter', 'Cognitive Agility & Problem Solving');
      await page.waitForTimeout(1800);
      await page.screenshot({ path: path.join(FINAL_DIR, 'student_03_pillar_filtered.png') });

      // Reset back to All
      await page.selectOption('#capability-pillar-filter', 'all');
      await page.waitForTimeout(1200);
    }

    // Switch to Practice Scenarios View
    console.log('[2/7] Switching to Practice Scenarios View...');
    await page.click('#view-mode-scenarios-btn');
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(FINAL_DIR, 'student_04_practice_scenarios.png') });

    // ------------------------------------------------------------------
    // STEP 3: BRIEFING MODAL & 2-RUN LIMIT EXPLAINER
    // ------------------------------------------------------------------
    console.log('[3/7] Selecting first practice scenario for briefing...');
    await page.waitForSelector('[id^="scenario-card-"]', { timeout: 15000 });
    const firstScenarioCard = await page.$('[id^="scenario-card-"]');
    if (firstScenarioCard) {
      await firstScenarioCard.click();
    } else {
      await page.click('div[id^="scenario-card-"]');
    }

    console.log('[3/7] Waiting for briefing modal...');
    await page.waitForSelector('#mode-select-text', { timeout: 20000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(FINAL_DIR, 'student_05_briefing_modal.png') });

    // Select Text Practice Mode
    console.log('[3/7] Selecting Text Practice mode & launching simulation...');
    await page.click('#mode-select-text');
    await page.waitForTimeout(800);

    await page.click('#start-simulation-btn');
    await page.waitForTimeout(3000);

    // ------------------------------------------------------------------
    // STEP 4: INTERACTIVE SIMULATION CHAT
    // ------------------------------------------------------------------
    console.log('[4/7] Simulation active. Viewing counterpart opening statement...');
    await page.waitForSelector('textarea', { timeout: 20000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(FINAL_DIR, 'student_06_simulation_opening.png') });

    // Send first executive message
    console.log('[4/7] Typing executive response 1...');
    const msg1 = "Good morning Marcus. I understand your team has concerns regarding the timeline, but let's review the critical path and ensure our deliverables remain on track without compromising quality.";
    await page.fill('textarea', msg1);
    await page.waitForTimeout(1000);
    await page.click('#send-message-btn');

    // Wait for streaming reply
    console.log('[4/7] Waiting for counterpart response...');
    await page.waitForTimeout(6000);

    // Send second executive message
    console.log('[4/7] Typing executive response 2 (De-escalation & Alignment)...');
    const msg2 = "I hear your point regarding bandwidth. Let's agree on shifting Phase 2 non-critical items so your engineers can focus 100% on core security.";
    await page.fill('textarea', msg2);
    await page.waitForTimeout(1000);
    await page.click('#send-message-btn');

    // Wait for streaming reply
    await page.waitForTimeout(6000);
    await page.screenshot({ path: path.join(FINAL_DIR, 'student_07_dialogue_exchanges.png') });

    // End simulation
    console.log('[4/7] Ending practice session to generate performance evaluation...');
    await page.click('#end-practice-btn');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(FINAL_DIR, 'student_08_end_confirm.png') });

    await page.click('#confirm-end-session-btn');
    await page.waitForTimeout(6000);

    // ------------------------------------------------------------------
    // STEP 5: 1-PAGE SUMMARY DEBRIEF & FACILITATOR ARCHIVE LOCK
    // ------------------------------------------------------------------
    console.log('[5/7] Reviewing 1-Page Executive Summary Debrief...');
    await page.waitForSelector('#overall-score-display', { timeout: 20000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(FINAL_DIR, 'student_09_summary_debrief.png') });

    // Scroll to see the Facilitator Archive Notice Card & Action Plan
    console.log('[5/7] Inspecting Facilitator Locked Archive Notice...');
    await page.evaluate(() => window.scrollTo({ top: 700, behavior: 'smooth' }));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(FINAL_DIR, 'student_10_locked_archive_notice.png') });

    // ------------------------------------------------------------------
    // STEP 6: FLOATING WHATSAPP HELP DESK
    // ------------------------------------------------------------------
    console.log('[6/7] Testing floating WhatsApp Support Widget...');
    await page.click('#floating-whatsapp-btn');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(FINAL_DIR, 'student_11_whatsapp_open.png') });

    // Close preview
    await page.click('button[title="Close help preview"]');
    await page.waitForTimeout(800);

    // ------------------------------------------------------------------
    // STEP 7: MY PROGRESS DASHBOARD
    // ------------------------------------------------------------------
    console.log('[7/7] Navigating to My Progress dashboard...');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(500);
    await page.click('#nav-progress-btn');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(FINAL_DIR, 'student_12_my_progress.png') });

    console.log('Student walkthrough completed successfully!');
  } catch (err) {
    console.error('Error during student walkthrough:', err);
    await page.screenshot({ path: path.join(FINAL_DIR, 'student_error.png') });
  } finally {
    await page.close();
    await context.close();
    await browser.close();

    // Move/rename video file
    const rawFiles = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith('.webm'));
    if (rawFiles.length > 0) {
      const srcPath = path.join(RAW_DIR, rawFiles[0]);
      const destPath = path.join(FINAL_DIR, 'student_walkthrough.webm');
      fs.copyFileSync(srcPath, destPath);
      console.log(`\n🎉 Student Video saved successfully to: ${destPath}`);
    } else {
      console.warn('No video file found in raw directory.');
    }
  }
})();
