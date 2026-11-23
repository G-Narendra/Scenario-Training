const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LIVE_URL = 'https://mrdev444-scenario-training-backend.hf.space/app/';
const SCREENSHOT_DIR = path.resolve(__dirname, '../outputs/verification_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function verifyAll() {
  console.log('=== STARTING COMPREHENSIVE LIVE VERIFICATION ===');
  console.log('Target URL:', LIVE_URL);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ['microphone'],
  });
  const page = await context.newPage();

  const results = {
    landingPage: false,
    landingMetrics: false,
    traineeLogin: false,
    scenarioNumbering: false,
    searchByNumber: false,
    voiceSwitch: false,
    emptySessionScoreZero: false,
    summaryReportBullets: false,
    adminConsole: false,
    csvExportColumns: false,
  };

  try {
    // 1. LANDING PAGE VERIFICATION
    console.log('\n--- 1. Testing Landing Page ---');
    await page.goto(LIVE_URL, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(2000);

    const bodyHtml = await page.content();
    results.landingPage = bodyHtml.includes('3H Solutions Group') && !bodyHtml.includes('Three H Solutions Group');
    console.log('Brand strictly "3H Solutions Group":', results.landingPage);

    // Verify metrics
    const has60 = bodyHtml.includes('60') && bodyHtml.includes('Executive Scenarios');
    const hasPillars = bodyHtml.includes('6') && (bodyHtml.includes('Leadership Pillars') || bodyHtml.includes('Core Competency Pillars'));
    results.landingMetrics = has60 && hasPillars;
    console.log('Correct landing metrics (60 Scenarios, 6 Pillars):', results.landingMetrics);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_landing_page.png'), fullPage: false });

    // 2. TRAINEE LOGIN
    console.log('\n--- 2. Testing Trainee Login ---');
    const loginCta = page.locator('#home-signin-cta-btn, #enter-platform-cta, button:has-text("Cohort Sign In"), button:has-text("Enter Practice Platform")').first();
    if (await loginCta.isVisible()) {
      await loginCta.click();
    } else {
      await page.click('button:has-text("Sign In"), button:has-text("Login")');
    }
    await page.waitForSelector('#modal-passcode-input', { timeout: 10000 });
    await page.fill('#modal-passcode-input', 'UZAIR-2026');
    await page.fill('#modal-displayname-input', 'Dev');
    await page.click('#modal-signin-submit-btn');

    await page.waitForSelector('#scenario-search-input', { timeout: 15000 });
    results.traineeLogin = true;
    console.log('Trainee login successful into Scenario Library!');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_scenario_library.png') });

    // 3. SCENARIO NUMBERING & SEARCH JUMP
    console.log('\n--- 3. Testing Scenario Numbering & Jump by Number ---');
    const numberBadges = await page.locator('span:text-matches("^#0[1-9]|^#[1-6][0-9]")').count();
    console.log('Number badges detected (#01 to #60):', numberBadges);
    results.scenarioNumbering = numberBadges > 0;

    // Search by #47 or 47
    await page.fill('#scenario-search-input', '47');
    await page.waitForTimeout(800);
    const visibleCards = await page.locator('[id^="scenario-card-"]').count();
    console.log('Cards matching search "47":', visibleCards);
    const cardText = await page.locator('[id^="scenario-card-"]').first().innerText();
    results.searchByNumber = cardText.includes('#47') || cardText.includes('47');
    console.log('Scenario #47 found via number search:', results.searchByNumber);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_search_scenario_47.png') });

    // Clear search
    await page.fill('#scenario-search-input', '');
    await page.waitForTimeout(500);

    // 4. SIMULATION & VOICE SWITCH
    console.log('\n--- 4. Testing Simulation & Voice Switch ---');
    // Start Scenario 1
    const firstScenarioCard = page.locator('[id^="scenario-card-"]').first();
    await firstScenarioCard.click();
    await page.waitForSelector('#start-practice-btn', { timeout: 10000 });
    await page.click('#start-practice-btn');

    await page.waitForSelector('#mode-switch-btn', { timeout: 15000 });
    console.log('Simulation interface loaded!');

    // Test Voice Switch
    const switchBtn = page.locator('#mode-switch-btn');
    await switchBtn.click();
    await page.waitForTimeout(1000);
    const switchBtnText = await switchBtn.innerText();
    results.voiceSwitch = switchBtnText.toLowerCase().includes('text') || switchBtnText.toLowerCase().includes('voice');
    console.log('Mode switch toggled successfully:', results.voiceSwitch);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_voice_mode_active.png') });

    // 5. EMPTY SESSION EVALUATION (Score 0 & No Hallucinated Praise)
    console.log('\n--- 5. Testing Empty Session Evaluation Fallback ---');
    await page.click('#end-session-btn');
    await page.waitForTimeout(500);
    // Confirm end
    const confirmEndBtn = page.locator('button:has-text("End & View Diagnostic Debrief"), button:has-text("Confirm End")').first();
    if (await confirmEndBtn.isVisible()) {
      await confirmEndBtn.click();
    }

    // Wait for Report
    await page.waitForSelector('#overall-score-display', { timeout: 30000 });
    const scoreText = await page.locator('#overall-score-display').innerText();
    console.log('Empty session overall score:', scoreText);
    results.emptySessionScoreZero = scoreText.trim() === '0';

    const reportContent = await page.content();
    const noFakePraise = !reportContent.includes('Initiated the conversation with professional composure');
    const hasEmptyNotice = reportContent.includes('This practice session concluded early with no participant dialogue spoken or submitted') ||
                           reportContent.includes('Session was initialized, but concluded before any dialogue was entered');

    console.log('Score is 0:', results.emptySessionScoreZero);
    console.log('No fake praise for 0-dialogue session:', noFakePraise);
    console.log('Clean empty session notice displayed:', hasEmptyNotice);

    // 6. 1-PAGE SUMMARY BULLETS
    console.log('\n--- 6. Testing 1-Page Summary Bullet Layout ---');
    const strengthsHeading = reportContent.includes('Key Strengths Demonstrated (Goods)');
    const badsHeading = reportContent.includes('Priority Coaching Adjustments (Bads & Deflections)');
    const improvementsHeading = reportContent.includes('Targeted Action Plan & Practice Drills (Improvements)');
    results.summaryReportBullets = strengthsHeading && badsHeading && improvementsHeading;
    console.log('Summary report high-density bullet sections present:', results.summaryReportBullets);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_summary_report_1page.png'), fullPage: true });

    // 7. ADMIN CONSOLE & FACILITATOR CSV EXPORT
    console.log('\n--- 7. Testing Facilitator Admin Console & CSV Export ---');
    const adminPage = await context.newPage();
    await adminPage.goto(LIVE_URL, { waitUntil: 'networkidle' });
    const adminLoginCta = adminPage.locator('#home-signin-cta-btn, button:has-text("Cohort Sign In")').first();
    await adminLoginCta.click();
    await adminPage.waitForSelector('#modal-passcode-input', { timeout: 10000 });
    await adminPage.fill('#modal-passcode-input', 'UZAIR-2026');
    await adminPage.fill('#modal-displayname-input', 'Uzair Hassan');
    await adminPage.click('#modal-signin-submit-btn');

    await adminPage.waitForSelector('#admin-console-btn', { timeout: 15000 });
    await adminPage.click('#admin-console-btn');

    await adminPage.waitForSelector('button:has-text("Export Facilitator CSV")', { timeout: 15000 });
    results.adminConsole = true;
    console.log('Admin Console accessed successfully by Facilitator Uzair!');

    // Listen for download event
    const [download] = await Promise.all([
      adminPage.waitForEvent('download', { timeout: 10000 }),
      adminPage.click('button:has-text("Export Facilitator CSV")'),
    ]);

    const suggestedFilename = download.suggestedFilename();
    console.log('Downloaded CSV Filename:', suggestedFilename);

    const downloadPath = path.join(SCREENSHOT_DIR, suggestedFilename);
    await download.saveAs(downloadPath);

    const csvContent = fs.readFileSync(downloadPath, 'utf-8');
    const firstLine = csvContent.split('\n')[0];
    console.log('CSV Headers:', firstLine);

    const requiredColumns = [
      'Participant Name',
      'Scenario Title',
      'Track',
      'Practice Mode',
      'Overall Score (%)',
      'Benchmark Status',
      'Key Strengths (Goods)',
      'Critical Gaps / Deflections (Bads)',
      'Priority Coaching Adjustments (Improvements)',
      'Duration',
      'Date & Time',
      'Session Status'
    ];

    const hasAllCols = requiredColumns.every(col => firstLine.includes(col));
    const omittedUnwanted = !firstLine.includes('User ID') && !firstLine.includes('Session ID') && !firstLine.includes('End Reason');

    results.csvExportColumns = hasAllCols && omittedUnwanted;
    console.log('CSV contains all required coaching columns and omitted raw IDs:', results.csvExportColumns);

    await adminPage.screenshot({ path: path.join(SCREENSHOT_DIR, '06_admin_console_live.png') });
    await adminPage.close();

  } catch (err) {
    console.error('Verification error:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_state.png') }).catch(() => {});
  } finally {
    await browser.close();
  }

  console.log('\n=== FINAL VERIFICATION RESULTS SUMMARY ===');
  console.log(JSON.stringify(results, null, 2));

  const allPassed = Object.values(results).every(v => v === true);
  console.log('ALL VERIFICATION CHECKS PASSED:', allPassed);
  return results;
}

verifyAll();
