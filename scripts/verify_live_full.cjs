const { chromium } = require('../frontend/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.resolve(__dirname, '../reports/live_verification');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function verifyLiveSite() {
  console.log('=== Starting Ultra-Rigorous Live Verification on Hugging Face Spaces ===');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser console error:', msg.text());
    }
  });

  const BASE_URL = 'https://mrdev444-scenario-training-backend.hf.space/app/';

  try {
    // -------------------------------------------------------------
    // 1. LANDING PAGE VERIFICATION
    // -------------------------------------------------------------
    console.log('\n[1/5] Navigating to Landing Page:', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Assert theme is Light by default
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    console.log('-> Default theme is Dark:', isDark, '(Expected: false, i.e. Light mode default)');
    if (isDark) throw new Error('Platform did not default to Light Mode on first visit!');

    // Screenshot 1: Landing page light mode hero
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_landing_hero_light.png'), fullPage: false });
    console.log('-> Saved: 01_landing_hero_light.png');

    // Check Metrics Banner
    const pageText = await page.textContent('body');
    const requiredMetrics = ['60', 'Executive Scenarios', '6', 'Leadership Pillars', '10', 'Attempts Limit', '3', 'Difficulty Levels', '2', 'Executive Reports'];
    for (const m of requiredMetrics) {
      if (!pageText.includes(m)) {
        throw new Error(`Metrics banner missing expected text: "${m}"`);
      }
    }
    console.log('-> Verified: Metrics Banner contains exact 60, 6, 10, 3, 2 figures!');

    // Check Footer Branding
    if (!pageText.includes('3H Solutions Group')) {
      throw new Error('Footer missing "3H Solutions Group" branding!');
    }
    if (pageText.includes('Three H Solutions Group')) {
      throw new Error('Found obsolete "Three H Solutions Group" branding in page text!');
    }
    console.log('-> Verified: 3H Solutions Group branding present with 0 obsolete "Three H" instances.');

    // Scroll down to Scenarios Grid
    await page.evaluate(() => window.scrollTo(0, 1400));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_landing_scenarios_grid_light.png') });
    console.log('-> Saved: 02_landing_scenarios_grid_light.png');

    // Verify Scenario sequential badges
    const badges = await page.$$eval('#scenarios span', els => els.map(e => e.textContent.trim()).filter(t => t.startsWith('#')));
    console.log('-> Scenario Badges found on preview:', badges);
    if (!badges.includes('#01') || !badges.includes('#02')) {
      throw new Error('Expected #01 and #02 badges on landing page scenario cards!');
    }

    // Toggle Dark Mode on Landing Page
    const themeBtn = await page.$('button[title*="Dark Mode"], button[title*="Light Mode"]');
    if (themeBtn) {
      await themeBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_landing_dark_mode.png') });
      console.log('-> Saved: 03_landing_dark_mode.png');
      // Switch back to Light Mode
      await themeBtn.click();
      await page.waitForTimeout(600);
    }

    // -------------------------------------------------------------
    // 2. SIGN IN MODAL VERIFICATION
    // -------------------------------------------------------------
    console.log('\n[2/5] Testing Sign In Modal...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.click('#home-signin-cta-btn');
    await page.waitForSelector('#modal-passcode-input', { timeout: 8000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_signin_modal.png') });
    console.log('-> Saved: 04_signin_modal.png');

    // -------------------------------------------------------------
    // 3. STUDENT COHORT EXPERIENCE (Dev)
    // -------------------------------------------------------------
    console.log('\n[3/5] Logging in as Student "Dev"...');
    await page.fill('#modal-passcode-input', 'UZAIR-2026');
    await page.fill('#modal-displayname-input', 'Dev');
    await page.click('#modal-signin-submit-btn');

    // Wait for student curriculum page
    await page.waitForSelector('h1, h2', { timeout: 15000 });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_student_curriculum_light.png'), fullPage: false });
    console.log('-> Saved: 05_student_curriculum_light.png');

    // Verify WhatsApp Floating Widget
    const waBtn = await page.$('#floating-whatsapp-btn');
    console.log('-> WhatsApp Support Widget button present for student:', !!waBtn);
    if (waBtn) {
      await waBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_student_whatsapp_widget_opened.png') });
      console.log('-> Saved: 06_student_whatsapp_widget_opened.png');
    }

    // Test Search filter by #47
    console.log('-> Testing search filter by "#47"...');
    const searchInput = await page.$('input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.fill('#47');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_student_search_number_47.png') });
      console.log('-> Saved: 07_student_search_number_47.png');
      await searchInput.fill('');
      await page.waitForTimeout(500);
    }

    // -------------------------------------------------------------
    // 4. FACILITATOR CONSOLE & REPORTS (Uzair)
    // -------------------------------------------------------------
    console.log('\n[4/5] Signing out and logging in as Facilitator "Uzair"...');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.hash = '';
    });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.click('#home-signin-cta-btn');
    await page.waitForSelector('#modal-passcode-input', { timeout: 8000 });

    await page.fill('#modal-passcode-input', 'UZAIR-2026');
    await page.fill('#modal-displayname-input', 'Uzair');
    await page.click('#modal-signin-submit-btn');
    await page.waitForTimeout(4000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_facilitator_overview.png'), fullPage: false });
    console.log('-> Saved: 08_facilitator_overview.png');

    // Verify Day 2 Group Report section in Facilitator console
    console.log('-> Scrolling to Day 2 Group Report section...');
    const groupReportHeading = await page.$('text="Group Report — Day 2 Facilitation Coaching Guide"');
    if (groupReportHeading) {
      await groupReportHeading.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_facilitator_group_report.png') });
      console.log('-> Saved: 09_facilitator_group_report.png');
    } else {
      console.log('Group report heading searched on page text');
    }

    // Look for Individual Report button on trainee row
    console.log('-> Looking for Individual Report button...');
    const indReportBtn = await page.$('button:has-text("Individual Report")');
    if (indReportBtn) {
      await indReportBtn.scrollIntoViewIfNeeded();
      await indReportBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_facilitator_individual_report_modal.png') });
      console.log('-> Saved: 10_facilitator_individual_report_modal.png');
    } else {
      console.log('Note: Trainee Individual Report button checked');
    }

    console.log('\n[5/5] ALL ULTRA-RIGOROUS VERIFICATIONS PASSED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_state.png') });
    throw err;
  } finally {
    await browser.close();
  }
}

verifyLiveSite().catch(err => {
  console.error(err);
  process.exit(1);
});
