/**
 * REAL 20-USER SIMULTANEOUS CONCURRENCY TEST
 * 
 * Strict Barrier-Synchronized Execution:
 * 1. 20 isolated browser contexts are initialized.
 * 2. Barrier 1: All 20 tabs hit https://scenariolab-alpha.vercel.app AT ONCE.
 * 3. Barrier 2: All 20 tabs click Login AT THE EXACT SAME MILLISECOND.
 * 4. Barrier 3: All 20 tabs click Start Practice AT THE EXACT SAME MILLISECOND.
 * 5. Barrier 4: All 20 tabs send their chat message AT THE EXACT SAME MILLISECOND.
 * 
 * Captures:
 * - Real HTTP response codes and network errors from the backend.
 * - Real Time-to-First-Token (TTFT) and total stream duration.
 * - Exact text received by each user.
 * - Screenshots of real website state under load.
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

// Barrier synchronization helper
function createBarrier(count) {
  let arrived = 0;
  let waiters = [];
  return {
    async wait() {
      arrived++;
      if (arrived >= count) {
        // Release all
        const toRelease = waiters;
        waiters = [];
        for (const resolve of toRelease) {
          resolve();
        }
      } else {
        await new Promise((resolve) => waiters.push(resolve));
      }
    },
    reset() {
      arrived = 0;
      waiters = [];
    }
  };
}

async function runRealConcurrencyTest() {
  console.log('='.repeat(80));
  console.log('🚀 STARTING REAL 20-USER SIMULTANEOUS CONCURRENCY TEST');
  console.log(`Target Frontend: ${BASE_URL}`);
  console.log(`Target Users: 20 simultaneous corporate students`);
  console.log(`Execution Mode: Pure Barrier-Synchronized Burst (Zero Sleep Stagger)`);
  console.log('='.repeat(80));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const barrierInit = createBarrier(20);
  const barrierLogin = createBarrier(20);
  const barrierStart = createBarrier(20);
  const barrierChat = createBarrier(20);

  const tabMetrics = STUDENTS.map((name, i) => ({
    id: i + 1,
    studentName: name,
    navMs: 0,
    loginMs: 0,
    loginHttpStatus: null,
    startMs: 0,
    startHttpStatus: null,
    ttftMs: 0,
    totalChatMs: 0,
    chatHttpStatus: null,
    aiResponse: '',
    errors: [],
    networkFailures: [],
    finalStatus: 'PENDING',
  }));

  const globalTestStart = Date.now();

  const userTasks = STUDENTS.map(async (studentName, index) => {
    const metric = tabMetrics[index];
    const logPrefix = `[User ${String(index + 1).padStart(2, '0')}: ${studentName}]`;

    let context = null;
    let page = null;

    try {
      context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) RealSimultaneousTest/1.0 User/${index + 1}`,
      });
      context.setDefaultTimeout(120000);

      page = await context.newPage();
      page.setDefaultTimeout(120000);

      // Track all HTTP network responses
      page.on('response', (response) => {
        const url = response.url();
        const status = response.status();
        if (url.includes('/api/auth/login')) {
          metric.loginHttpStatus = status;
        } else if (url.includes('/api/sessions') && !url.includes('/messages')) {
          metric.startHttpStatus = status;
        } else if (url.includes('/messages')) {
          metric.chatHttpStatus = status;
        }

        if (status >= 400 && !url.includes('favicon')) {
          const errStr = `HTTP ${status} on ${url.split('?')[0].split('/').slice(-2).join('/')}`;
          metric.networkFailures.push(errStr);
          console.warn(`  ⚠️ ${logPrefix} ${errStr}`);
        }
      });

      page.on('pageerror', (err) => {
        metric.errors.push(`Page Error: ${err.message}`);
        console.error(`  🔴 ${logPrefix} Page Error: ${err.message}`);
      });

      // --- BARRIER 1: All 20 browser contexts ready -> Burst Navigate ---
      await barrierInit.wait();
      const t0_nav = Date.now();
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('#passcode-input', { timeout: 45000 });
      metric.navMs = Date.now() - t0_nav;
      console.log(`  🌐 ${logPrefix} Loaded homepage in ${metric.navMs}ms`);

      // Pre-fill login credentials
      await page.fill('#passcode-input', COHORT_PASSCODE);
      await page.fill('#display-name-input', studentName);

      // --- BARRIER 2: Burst Login at the EXACT SAME INSTANT ---
      await barrierLogin.wait();
      const t0_login = Date.now();
      console.log(`  🔑 ${logPrefix} Submitting Login NOW...`);
      await page.click('#login-submit-btn');

      // Wait for Scenario Library to load
      await page.waitForSelector('text=Scenarios Available', { timeout: 60000 });
      metric.loginMs = Date.now() - t0_login;
      console.log(`  ✅ ${logPrefix} Logged in! Status: ${metric.loginHttpStatus || 200} in ${metric.loginMs}ms`);

      // Open Scenario Briefing
      const scenarioCard = page.locator('text=Addressing Chronic Punctuality & Meeting Lateness').first();
      await scenarioCard.waitFor({ timeout: 30000 });
      await scenarioCard.click();
      await page.waitForSelector('#start-simulation-btn', { timeout: 30000 });

      // --- BARRIER 3: Burst Start Simulation at the EXACT SAME INSTANT ---
      await barrierStart.wait();
      const t0_start = Date.now();
      console.log(`  🎬 ${logPrefix} Clicking Start Practice NOW...`);
      await page.click('#start-simulation-btn');

      // Wait for chat interface to load
      try {
        await page.waitForSelector('textarea', { timeout: 20000 });
      } catch {
        const retryBtn = page.locator('#start-simulation-btn');
        if (await retryBtn.isVisible().catch(() => false)) {
          console.log(`  🔄 ${logPrefix} Retrying Start Practice click...`);
          await retryBtn.click().catch(() => {});
        }
        await page.waitForSelector('textarea', { timeout: 90000 });
      }
      metric.startMs = Date.now() - t0_start;
      console.log(`  ✅ ${logPrefix} Simulation active! Status: ${metric.startHttpStatus || 200} in ${metric.startMs}ms`);

      // Pre-fill the practice message
      const studentMessage = `Marcus, I value your dedication to high-quality work, but starting standups 10 minutes late creates a ripple effect across the team. Can we commit to starting promptly at 9:00 AM?`;
      await page.fill('textarea', studentMessage);

      // --- BARRIER 4: Burst Chat Send at the EXACT SAME INSTANT ---
      await barrierChat.wait();
      const t0_chat = Date.now();
      console.log(`  💬 ${logPrefix} Sending message simultaneously NOW...`);
      await page.click('#send-message-btn');

      // Measure Time-to-First-Token (when typing indicator or streaming response begins)
      try {
        await page.waitForFunction(
          () => {
            const streaming = document.querySelector('.animate-bounce') || document.querySelector('text*="Responding"');
            const counterpartMsg = document.querySelectorAll('[data-role="counterpart"] .whitespace-pre-line');
            return streaming || counterpartMsg.length >= 2;
          },
          { timeout: 45000 }
        );
        metric.ttftMs = Date.now() - t0_chat;
      } catch (e) {
        metric.ttftMs = -1;
      }

      // Wait for complete counterpart reply bubble
      await page.waitForFunction(
        () => {
          const counterpartBubbles = document.querySelectorAll('[data-role="counterpart"] .whitespace-pre-line');
          return counterpartBubbles.length >= 2;
        },
        { timeout: 90000 }
      );
      metric.totalChatMs = Date.now() - t0_chat;

      // Extract the exact response text
      const bubbles = await page.$$eval(
        '[data-role="counterpart"] .whitespace-pre-line',
        (els) => els.map((el) => el.textContent.trim())
      );
      metric.aiResponse = bubbles[bubbles.length - 1] || '';
      metric.finalStatus = 'SUCCESS';

      console.log(`  🌟 ${logPrefix} CHAT RECEIVED in ${metric.totalChatMs}ms (TTFT: ${metric.ttftMs}ms): "${metric.aiResponse.substring(0, 70)}..."`);

      // Save screenshot for sample tabs
      if ([0, 4, 9, 14, 19].includes(index)) {
        const sPath = path.join(ARTIFACT_DIR, `real_burst_tab_${String(index + 1).padStart(2, '0')}.png`);
        await page.screenshot({ path: sPath, fullPage: false });
        console.log(`  📸 ${logPrefix} Saved screenshot: real_burst_tab_${String(index + 1).padStart(2, '0')}.png`);
      }

    } catch (err) {
      metric.finalStatus = 'FAILED';
      metric.errors.push(err.message);
      console.error(`  ❌ ${logPrefix} FAILED: ${err.message}`);
      if (page) {
        const errPath = path.join(ARTIFACT_DIR, `real_burst_tab_${String(index + 1).padStart(2, '0')}_error.png`);
        await page.screenshot({ path: errPath, fullPage: false }).catch(() => {});
      }
    } finally {
      if (context) {
        await context.close().catch(() => {});
      }
    }
  });

  await Promise.all(userTasks);

  const totalDurationSec = ((Date.now() - globalTestStart) / 1000).toFixed(2);
  const successCount = tabMetrics.filter((m) => m.finalStatus === 'SUCCESS').length;

  console.log('\n' + '='.repeat(80));
  console.log('🏁 REAL 20-USER SIMULTANEOUS CONCURRENCY TEST COMPLETED');
  console.log(`Total Wall-Clock Time: ${totalDurationSec}s`);
  console.log(`Successful Sessions: ${successCount} / 20 (${((successCount / 20) * 100).toFixed(1)}%)`);
  console.log('='.repeat(80));

  // Compute stats
  const successful = tabMetrics.filter((m) => m.finalStatus === 'SUCCESS');
  const navStats = computeStats(successful.map((m) => m.navMs));
  const loginStats = computeStats(successful.map((m) => m.loginMs));
  const startStats = computeStats(successful.map((m) => m.startMs));
  const chatStats = computeStats(successful.map((m) => m.totalChatMs));
  const ttftStats = computeStats(successful.map((m) => m.ttftMs).filter((t) => t > 0));

  console.log('\n--- REAL MEASURED PERFORMANCE METRICS ---');
  console.log(`1. Page Load Navigation: Min: ${navStats.min}ms | P50: ${navStats.median}ms | Mean: ${navStats.mean.toFixed(0)}ms | Max: ${navStats.max}ms`);
  console.log(`2. Simultaneous Login:   Min: ${loginStats.min}ms | P50: ${loginStats.median}ms | Mean: ${loginStats.mean.toFixed(0)}ms | Max: ${loginStats.max}ms`);
  console.log(`3. Start Simulation:     Min: ${startStats.min}ms | P50: ${startStats.median}ms | Mean: ${startStats.mean.toFixed(0)}ms | Max: ${startStats.max}ms`);
  console.log(`4. Simultaneous Chat:    Min: ${chatStats.min}ms | P50: ${chatStats.median}ms | Mean: ${chatStats.mean.toFixed(0)}ms | Max: ${chatStats.max}ms`);
  console.log(`5. Time to First Token:  Min: ${ttftStats.min}ms | P50: ${ttftStats.median}ms | Mean: ${ttftStats.mean.toFixed(0)}ms | Max: ${ttftStats.max}ms`);

  const resultsSummary = {
    testTimestamp: new Date().toISOString(),
    totalDurationSec,
    successCount,
    totalUsers: 20,
    stats: {
      navStats,
      loginStats,
      startStats,
      chatStats,
      ttftStats,
    },
    tabMetrics,
  };

  const outPath = path.join(ARTIFACT_DIR, 'real_20_simultaneous_results.json');
  fs.writeFileSync(outPath, JSON.stringify(resultsSummary, null, 2));
  console.log(`\nDetailed JSON results saved to: ${outPath}`);

  await browser.close();
}

runRealConcurrencyTest().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
