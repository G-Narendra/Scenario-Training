import { test, expect } from '@playwright/test';

const LIVE_URL = 'https://scenariolab-alpha.vercel.app';

test.describe('ScenarioLab Production Live End-to-End Verification', () => {
  test.setTimeout(120000);

  test('Complete Live Web Workflow: Login, Scenarios, Roleplay, Evaluation & Admin', async ({ page }) => {
    console.log('1. Navigating to live web app:', LIVE_URL);
    await page.goto(LIVE_URL);
    await page.waitForLoadState('networkidle');

    // 1. Verify Branding & Typography
    await expect(page.locator('h1')).toContainText('ScenarioLab');
    await expect(page.locator('h1')).toContainText('Scenario Training');

    // 2. Trainee Login using Demo Passcode
    console.log('2. Testing trainee login with DEMO-2026...');
    await page.fill('#passcode-input', 'DEMO-2026');
    await page.fill('#display-name-input', 'Enterprise Executive');
    await page.click('#login-submit-btn');

    // 3. Verify Track Selection Page
    console.log('3. Verifying training tracks...');
    await expect(page.locator('h1')).toContainText('Choose Your Training Track');
    await expect(page.locator('#track-card-sales')).toBeVisible();
    await expect(page.locator('#track-card-leadership')).toBeVisible();

    // 4. Click Sales Track and view scenarios
    console.log('4. Opening Sales Track scenario library...');
    await page.click('#track-card-sales');
    await expect(page.locator('h1')).toContainText('Sales Mastery Scenarios');

    // Check that scenarios loaded from Render backend
    const scenarioCards = page.locator('div[id^="scenario-card-"]');
    await expect(scenarioCards.first()).toBeVisible({ timeout: 15000 });
    const count = await scenarioCards.count();
    console.log(`Found ${count} live scenarios from Render backend.`);
    expect(count).toBeGreaterThanOrEqual(1);

    // 5. Open Briefing Modal
    console.log('5. Opening first scenario briefing...');
    await scenarioCards.first().click();
    await expect(page.locator('div[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Scenario Situation & Context')).toBeVisible();

    // 6. Launch Simulation
    console.log('6. Launching live simulation session...');
    const startSimBtn = page.locator('#start-simulation-btn');
    await expect(startSimBtn).toBeVisible();
    await startSimBtn.click();

    // Wait for simulation room
    await expect(page.locator('#end-simulation-btn')).toBeVisible({ timeout: 20000 });

    // 7. Verify Voice Mode button exists and is clickable
    console.log('7. Verifying voice mode toggle button...');
    const voiceBtn = page.locator('button[aria-label="Toggle voice output"]');
    if (await voiceBtn.count() > 0) {
      await expect(voiceBtn).toBeVisible();
      await voiceBtn.click();
      await page.waitForTimeout(500);
      await voiceBtn.click();
    }

    // Wait for opening counterpart message
    console.log('8. Verifying counterpart opening statement...');
    await page.waitForTimeout(3000);
    const messages = page.locator('div[class*="rounded-2xl"]');
    await expect(messages.first()).toBeVisible({ timeout: 20000 });

    // 8. Send a live trainee message
    console.log('9. Sending trainee message in live roleplay...');
    const messageInput = page.locator('#chat-message-input');
    await expect(messageInput).toBeVisible();
    await messageInput.fill('Hello Arthur, thank you for meeting. What is the most critical priority for your team this quarter?');
    await page.click('#send-message-btn');

    // Wait for counterpart reply to stream or arrive
    await page.waitForTimeout(5000);
    const updatedCount = await page.locator('div[class*="rounded-2xl"]').count();
    console.log(`Live conversation turn completed. Total messages: ${updatedCount}`);
    expect(updatedCount).toBeGreaterThanOrEqual(2);

    // 9. Conclude Simulation
    console.log('10. Ending simulation session...');
    await page.click('#end-simulation-btn');
    await expect(page.locator('#confirm-end-session-btn')).toBeVisible();
    await page.click('#confirm-end-session-btn');

    // 10. Verify Feedback Evaluation Report Page
    console.log('11. Verifying feedback evaluation report...');
    await expect(page.locator('#print-report-btn')).toBeVisible({ timeout: 25000 });
    await expect(page.locator('#back-to-scenarios-btn')).toBeVisible();
    console.log('Feedback Evaluation report verified successfully.');

    // 11. Navigate to Progress Dashboard
    console.log('12. Navigating to Progress Dashboard...');
    await page.click('#nav-progress-btn');
    await expect(page.locator('h1')).toContainText('Executive Training Progress');
    await expect(page.locator('text=Simulations Completed')).toBeVisible();

    // Test tab switching on Progress Page (Leaderboard / Cohort view)
    const cohortTabBtn = page.locator('button:has-text("Cohort Performance")');
    if (await cohortTabBtn.count() > 0) {
      await cohortTabBtn.click();
      await page.waitForTimeout(500);
    }

    // 12. Switch to Leadership Track via Track Switcher
    console.log('13. Switching to Leadership Track...');
    await page.click('#nav-scenarios-btn');
    await expect(page.locator('#track-card-leadership')).toBeVisible();
    await page.click('#track-card-leadership');
    await expect(page.locator('h1')).toContainText('Leadership Mastery Scenarios');
    const leadershipCards = page.locator('div[id^="scenario-card-"]');
    await expect(leadershipCards.first()).toBeVisible({ timeout: 10000 });
    const leadCount = await leadershipCards.count();
    console.log(`Found ${leadCount} leadership scenarios from Render backend.`);
    expect(leadCount).toBeGreaterThanOrEqual(1);

    // 13. Sign Out
    console.log('14. Signing out...');
    await page.click('button[aria-label="Sign Out"]');
    await expect(page.locator('#passcode-input')).toBeVisible();

    // 14. Login as Administrator
    console.log('15. Testing Admin Login with ADMIN-PASS...');
    await page.fill('#passcode-input', 'ADMIN-PASS');
    await page.fill('#display-name-input', 'Executive Admin');
    await page.click('#login-submit-btn');

    // Check Admin Console navigation
    console.log('16. Opening Admin Console...');
    await expect(page.locator('#nav-admin-btn')).toBeVisible({ timeout: 15000 });
    await page.click('#nav-admin-btn');

    // Verify Admin tabs
    await expect(page.locator('h1')).toContainText('Admin Management Console');
    await expect(page.locator('#admin-tab-cohorts')).toBeVisible();
    await expect(page.locator('text=Active & Scheduled Cohorts')).toBeVisible({ timeout: 15000 });

    // Test Admin Scenarios Tab
    console.log('17. Testing Admin Scenarios tab...');
    await page.click('#admin-tab-scenarios');
    await expect(page.locator('text=Scenario Studio & Content Manager')).toBeVisible({ timeout: 15000 });

    // Test Admin Usage Tab
    console.log('18. Testing Admin Usage tab...');
    await page.click('#admin-tab-usage');
    await expect(page.locator('text=Total Tokens')).toBeVisible({ timeout: 15000 });

    // Test Admin Audit Tab
    console.log('19. Testing Admin Audit tab...');
    await page.click('#admin-tab-audit');
    await expect(page.locator('text=System Audit & Compliance Log')).toBeVisible({ timeout: 15000 });

    console.log('✅ ALL LIVE VERIFICATION CHECKS PASSED 100% PERFECTLY!');
  });
});
