/**
 * 20 Concurrent Browser Tabs Stress & Practice Simulation
 * Launches 20 isolated Chromium browser contexts simultaneously, logs in with 20 distinct corporate students,
 * enters interactive scenario practice concurrently, sends dialogue messages, and measures granular latencies.
 */

const { chromium } = require('../frontend/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://scenariolab-alpha.vercel.app';
const COHORT_PASSCODE = 'UZAIR-2026';
const ARTIFACT_DIR = path.resolve('C:/Users/naren/.gemini/antigravity-ide/brain/0076dc3c-7d41-4c8c-bc55-bf0ce1ea111c');

const STUDENTS = [
  'Sarah Jenkins',
  'Marcus Vance',
  'Priya Sharma',
  'David Chen',
  'Elena Rostova',
  'James Wilson',
  'Aaliyah Patel',
  'Carlos Mendez',
  'Rachel Green',
  'Vikram Malhotra',
  'Chloe Bennett',
  'Tariq Al-Mansoor',
  'Stephanie Wong',
  'Michael Chang',
  'Fatima Zahra',
  'Liam O\'Connor',
  'Ananya Iyer',
  'Jonathan Brooks',
  'Mei-Ling Zhou',
  'Omar Farooq',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function computeStats(arr) {
  if (!arr || arr.length === 0) return { min: 0, median: 0, mean: 0, p95: 0, max: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  return { min, median, mean, p95, max };
}

async function simulateStudentTab(index, studentName, browser, results) {
  const result = {
    index: index + 1,
    studentName,
    loginMs: 0,
    sessionStartMs: 0,
    dialogueTurnMs: 0,
    totalJourneyMs: 0,
    counterpartReply: '',
    status: 'PENDING',
    error: null,
  };

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) ScenarioTest/1.0 Student/${index + 1}`,
  });

  const page = await context.newPage();
  page.on('dialog', async (dialog) => {
    console.log(`  ⚠️ [Tab ${index + 1}/20] Alert dialog: "${dialog.message()}"`);
    await dialog.dismiss();
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`  Console Error [Tab ${index + 1}/20]: ${msg.text()}`);
    }
  });

  const journeyStart = Date.now();

  try {
    // Realistic arrival stagger: students enter across 2-3 seconds
    if (index > 0) {
      await sleep(index * 150);
    }

    console.log(`[Tab ${index + 1}/20] (${studentName}) Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });

    // Step 1: Login
    const t0_login = Date.now();
    await page.waitForSelector('#passcode-input', { timeout: 25000 });
    await page.fill('#passcode-input', COHORT_PASSCODE);
    await page.fill('#display-name-input', studentName);
    await page.click('#login-submit-btn');

    // Wait for scenario library / curriculum to appear
    await page.waitForSelector('text=Scenarios Available', { timeout: 35000 });
    result.loginMs = Date.now() - t0_login;
    console.log(`  -> [Tab ${index + 1}/20] (${studentName}) Logged in successfully in ${result.loginMs}ms`);

    // Step 2: Open First Scenario Briefing Modal
    const scenarioCard = page.locator('text=Addressing Chronic Punctuality & Meeting Lateness').first();
    await scenarioCard.waitFor({ timeout: 15000 });
    await scenarioCard.click();

    // Step 3: Start Practice Session
    await page.waitForSelector('#start-simulation-btn', { timeout: 20000 });
    const t0_start = Date.now();
    await page.click('#start-simulation-btn');

    // Wait for simulation chat to load and textarea to appear
    await page.waitForSelector('textarea', { timeout: 60000 });
    result.sessionStartMs = Date.now() - t0_start;
    console.log(`  -> [Tab ${index + 1}/20] (${studentName}) Simulation started in ${result.sessionStartMs}ms`);

    // Step 4: Send Practice Dialogue Turn
    const studentUtterance = `Marcus, I value your dedication to high-quality slides, but starting 10 minutes late impacts our team alignment. Let's agree on starting promptly at 9:00 AM.`;
    await page.fill('textarea', studentUtterance);

    const t0_turn = Date.now();
    await page.click('#send-message-btn');

    // Wait for counterpart reply to appear (the bubble containing response from Marcus Vance)
    await page.waitForFunction(
      () => {
        const bubbles = document.querySelectorAll('.whitespace-pre-line');
        // Initial opening line + student message + counterpart reply = at least 3 bubbles
        return bubbles.length >= 3;
      },
      { timeout: 45000 }
    );

    result.dialogueTurnMs = Date.now() - t0_turn;

    // Extract counterpart response text
    const replies = await page.$$eval('.whitespace-pre-line', (elements) => elements.map((el) => el.textContent.trim()));
    result.counterpartReply = replies[replies.length - 1] || '';

    result.totalJourneyMs = Date.now() - journeyStart;
    result.status = 'SUCCESS';
    console.log(`  -> [Tab ${index + 1}/20] (${studentName}) Dialogue turn complete in ${result.dialogueTurnMs}ms! Reply: "${result.counterpartReply.substring(0, 60)}..."`);

    // Capture screenshots for Tabs 1, 5, 10, and 20 as verification artifacts
    if ([0, 4, 9, 19].includes(index)) {
      const screenshotName = `tab_${String(index + 1).padStart(2, '0')}_${studentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_practice.png`;
      const screenshotPath = path.join(ARTIFACT_DIR, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`  📸 [Tab ${index + 1}/20] Screenshot saved to ${screenshotName}`);
    }
  } catch (err) {
    result.status = 'FAILED';
    result.error = err.message;
    result.totalJourneyMs = Date.now() - journeyStart;
    console.error(`  ❌ [Tab ${index + 1}/20] (${studentName}) Error: ${err.message}`);
  } finally {
    results.push(result);
    await context.close();
  }
}

async function main() {
  console.log('='.repeat(75));
  console.log(' 3H SOLUTIONS EXECUTIVE PLATFORM — 20 CONCURRENT BROWSER TABS STRESS TEST');
  console.log(` Target URL:          ${BASE_URL}`);
  console.log(` Simulated Students:  20 corporate trainees in 20 distinct browser tabs`);
  console.log(` Passcode:            ${COHORT_PASSCODE}`);
  console.log('='.repeat(75));

  const t0_overall = Date.now();
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const results = [];
  console.log(`\nLaunching all 20 browser tabs concurrently...\n`);

  const tasks = STUDENTS.map((name, index) => simulateStudentTab(index, name, browser, results));
  await Promise.all(tasks);

  await browser.close();
  const totalElapsedSec = (Date.now() - t0_overall) / 1000;

  // Compile benchmarks
  const successfulTabs = results.filter((r) => r.status === 'SUCCESS');
  const failedTabs = results.filter((r) => r.status === 'FAILED');

  const loginLatencies = successfulTabs.map((r) => r.loginMs);
  const startLatencies = successfulTabs.map((r) => r.sessionStartMs);
  const turnLatencies = successfulTabs.map((r) => r.dialogueTurnMs);
  const totalLatencies = successfulTabs.map((r) => r.totalJourneyMs);

  const loginStats = computeStats(loginLatencies);
  const startStats = computeStats(startLatencies);
  const turnStats = computeStats(turnLatencies);
  const totalStats = computeStats(totalLatencies);

  console.log('\n' + '='.repeat(75));
  console.log(' 20-TAB SIMULTANEOUS BROWSER EXECUTION BENCHMARK REPORT');
  console.log('='.repeat(75));
  console.log(` Total Wall-Clock Test Time:     ${totalElapsedSec.toFixed(2)}s`);
  console.log(` Total Simultaneous Tabs Run:   20`);
  console.log(` Successful Practice Journeys:   ${successfulTabs.length} / 20 (${((successfulTabs.length / 20) * 100).toFixed(1)}%)`);
  console.log(` Failed Tabs:                    ${failedTabs.length}`);

  console.log('\n--- Granular Latency Profile Across 20 Concurrent Tabs ---');
  console.log(' Phase 1: Authentication & Scenario Library Load:');
  console.log(`   Min: ${loginStats.min.toFixed(0)}ms | P50 (Median): ${loginStats.median.toFixed(0)}ms | Mean: ${loginStats.mean.toFixed(0)}ms | P95: ${loginStats.p95.toFixed(0)}ms | Max: ${loginStats.max.toFixed(0)}ms`);

  console.log('\n Phase 2: Scenario Briefing & Simulation Session Initialization:');
  console.log(`   Min: ${startStats.min.toFixed(0)}ms | P50 (Median): ${startStats.median.toFixed(0)}ms | Mean: ${startStats.mean.toFixed(0)}ms | P95: ${startStats.p95.toFixed(0)}ms | Max: ${startStats.max.toFixed(0)}ms`);

  console.log('\n Phase 3: AI Counterpart Dialogue Turn Response:');
  console.log(`   Min: ${turnStats.min.toFixed(0)}ms | P50 (Median): ${turnStats.median.toFixed(0)}ms | Mean: ${turnStats.mean.toFixed(0)}ms | P95: ${turnStats.p95.toFixed(0)}ms | Max: ${turnStats.max.toFixed(0)}ms`);

  console.log('\n Complete Student Journey Duration:');
  console.log(`   Min: ${(totalStats.min / 1000).toFixed(2)}s | P50 (Median): ${(totalStats.median / 1000).toFixed(2)}s | Mean: ${(totalStats.mean / 1000).toFixed(2)}s | P95: ${(totalStats.p95 / 1000).toFixed(2)}s | Max: ${(totalStats.max / 1000).toFixed(2)}s`);

  if (failedTabs.length > 0) {
    console.log('\n Failed Tab Breakdown:');
    failedTabs.forEach((f) => {
      console.log(`   - Tab ${f.index} (${f.studentName}): ${f.error}`);
    });
  } else {
    console.log('\n 🌟 Zero failures! All 20 students completed active simulation dialogue concurrently!');
  }

  console.log('\n Sample Student Dialogue Replies:');
  successfulTabs.slice(0, 3).forEach((s) => {
    console.log(`   - ${s.studentName}: "${s.counterpartReply}"`);
  });

  console.log('='.repeat(75));

  // Write results JSON
  const reportPath = path.join(ARTIFACT_DIR, 'test_20_tabs_results.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        totalElapsedSec,
        successCount: successfulTabs.length,
        totalTabs: 20,
        stats: { loginStats, startStats, turnStats, totalStats },
        tabResults: results,
      },
      null,
      2
    )
  );
  console.log(`\nDetailed report written to: ${reportPath}`);
}

main().catch((err) => {
  console.error('Fatal benchmark error:', err);
  process.exit(1);
});
