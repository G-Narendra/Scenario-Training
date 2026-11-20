// Facilitator (Uzair) Walkthrough Recording Script with Playwright
// Records a high-resolution video of the facilitator administrative & coaching journey.
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright'));
const fs = require('fs');

const BASE_URL = 'http://127.0.0.1:8000/app/';
const RAW_DIR = path.resolve(__dirname, '../recordings/uzair_raw');
const FINAL_DIR = path.resolve(__dirname, '../recordings');

(async () => {
  console.log('=== STARTING FACILITATOR (UZAIR) WALKTHROUGH RECORDING ===');
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
    // STEP 1: FACILITATOR LOGIN
    // ------------------------------------------------------------------
    console.log('[1/7] Navigating to Login Page as Uzair...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(FINAL_DIR, 'uzair_01_login.png') });

    console.log('[1/7] Submitting Facilitator Credentials (UZAIR-2026 + Uzair)...');
    await page.fill('#passcode-input', 'UZAIR-2026');
    await page.waitForTimeout(500);
    await page.fill('#display-name-input', 'Uzair');
    await page.waitForTimeout(800);

    await page.click('#login-submit-btn');
    await page.waitForTimeout(2500);

    // If landed on scenarios page, click Admin Console in Navbar
    const navAdminBtn = await page.$('#nav-admin-btn');
    if (navAdminBtn) {
      console.log('Navigating to Facilitator Console via #nav-admin-btn...');
      await navAdminBtn.click();
      await page.waitForTimeout(2000);
    }

    // ------------------------------------------------------------------
    // STEP 2: FACILITATOR CONSOLE & KPI STRIP
    // ------------------------------------------------------------------
    console.log('[2/7] Landed on Facilitator Console. Inspecting KPI Strip...');
    await page.waitForSelector('#admin-tab-roster', { timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(FINAL_DIR, 'uzair_02_console_kpi.png') });

    // ------------------------------------------------------------------
    // STEP 3: COHORT ROSTER & EXPORT COHORT PDF
    // ------------------------------------------------------------------
    console.log('[3/7] Exploring Participant Roster & Hovering Export Cohort PDF...');
    await page.evaluate(() => window.scrollTo({ top: 350, behavior: 'smooth' }));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(FINAL_DIR, 'uzair_03_roster_table.png') });

    // ------------------------------------------------------------------
    // STEP 4: COHORT MANAGEMENT & SCALE REASSURANCE
    // ------------------------------------------------------------------
    console.log('[4/7] Testing Cohort Management Modal & Scale Reassurance...');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(500);

    // Select __new__ from #admin-cohort-selector to open Create Cohort modal
    console.log('[4/7] Opening Create New Cohort Modal...');
    await page.selectOption('#admin-cohort-selector', '__new__').catch(async () => {
      const newCohortBtn = await page.$('button:has-text("Create Cohort")');
      if (newCohortBtn) await newCohortBtn.click();
    });

    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(FINAL_DIR, 'uzair_04_create_cohort_modal.png') });

    // Close the modal
    const closeBtn = await page.$('div[role="dialog"] button');
    if (closeBtn) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
    }

    // ------------------------------------------------------------------
    // STEP 5: REVIEWING PARTICIPANT REPORT & SPIDER GRAPH
    // ------------------------------------------------------------------
    console.log('[5/7] Reviewing Participant Performance Report...');
    const reviewBtn = await page.$('button:has-text("1-Pager Debrief"), button:has-text("Review")');
    if (reviewBtn) {
      await reviewBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(FINAL_DIR, 'uzair_05_session_review_summary.png') });

      // In AdminConsolePage, the modal directly renders the RadarChart!
      console.log('[5/7] Inspecting Multidimensional Spider Graph inside modal...');
      await page.evaluate(() => {
        const modal = document.querySelector('div[role="dialog"] .overflow-y-auto');
        if (modal) modal.scrollTo({ top: 280, behavior: 'smooth' });
      });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(FINAL_DIR, 'uzair_06_spider_graph.png') });

      // Scroll further down to verbatim transcripts and dialogue moments
      console.log('[5/7] Inspecting Verbatim Transcripts...');
      await page.evaluate(() => {
        const modal = document.querySelector('div[role="dialog"] .overflow-y-auto');
        if (modal) modal.scrollTo({ top: 900, behavior: 'smooth' });
      });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(FINAL_DIR, 'uzair_07_detailed_transcripts.png') });

      // Close report modal
      console.log('[5/7] Closing Report Modal...');
      const closeRep = await page.$('button[title="Close Report Card"]');
      if (closeRep) {
        await closeRep.click();
      } else {
        const xBtn = await page.$('div[role="dialog"] button');
        if (xBtn) await xBtn.click();
      }
      await page.waitForTimeout(1000);
    }

    // ------------------------------------------------------------------
    // STEP 6: CORPORATE NAVY THEME DEMONSTRATION
    // ------------------------------------------------------------------
    console.log('[6/7] Demonstrating Solid Executive Navy Theme...');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(500);

    // Toggle theme to dark and then light
    const themeToggle = await page.$('#theme-toggle-btn');
    if (themeToggle) {
      console.log('Toggling theme to Dark Mode...');
      await themeToggle.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(FINAL_DIR, 'uzair_08_dark_mode.png') });

      console.log('Toggling theme back to Solid Executive Navy Light Mode...');
      await themeToggle.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(FINAL_DIR, 'uzair_09_executive_navy_mode.png') });
    }

    // ------------------------------------------------------------------
    // STEP 7: CURRICULUM & SCENARIO MANAGEMENT
    // ------------------------------------------------------------------
    console.log('[7/7] Viewing Curriculum & Scenarios Catalog...');
    const currTab = await page.$('#admin-tab-curriculum');
    if (currTab) {
      await currTab.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(FINAL_DIR, 'uzair_10_curriculum_catalog.png') });
    }

    console.log('Facilitator walkthrough completed successfully!');
  } catch (err) {
    console.error('Error during facilitator walkthrough:', err);
    await page.screenshot({ path: path.join(FINAL_DIR, 'uzair_error.png') });
  } finally {
    await page.close();
    await context.close();
    await browser.close();

    // Move/rename video file
    const rawFiles = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith('.webm'));
    if (rawFiles.length > 0) {
      // Find the newest raw webm
      const sorted = rawFiles
        .map(f => ({ name: f, time: fs.statSync(path.join(RAW_DIR, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);
      const srcPath = path.join(RAW_DIR, sorted[0].name);
      const destPath = path.join(FINAL_DIR, 'uzair_walkthrough.webm');
      fs.copyFileSync(srcPath, destPath);
      console.log(`\n🎉 Facilitator Video saved successfully to: ${destPath}`);
    } else {
      console.warn('No video file found in raw directory.');
    }
  }
})();
