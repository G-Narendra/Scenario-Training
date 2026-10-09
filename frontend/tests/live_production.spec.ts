import { test, expect } from '@playwright/test';

const LIVE_URL = 'https://scenariolab-alpha.vercel.app';

test.describe('ScenarioLab Production Live End-to-End Verification', () => {
  test.setTimeout(90000);

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

    // Wait for opening counterpart message
    console.log('7. Verifying counterpart opening statement...');
    await page.waitForTimeout(3000);
    const messages = page.locator('div[class*="rounded-2xl"]');
    await expect(messages.first()).toBeVisible({ timeout: 20000 });

    // 7. Send a live trainee message
    console.log('8. Sending trainee message in live roleplay...');
    const messageInput = page.locator('#chat-message-input');
    await expect(messageInput).toBeVisible();
    await messageInput.fill('Hello Arthur, thank you for meeting. What is the most critical priority for your team this quarter?');
    await page.click('#send-message-btn');

    // Wait for counterpart reply to stream or arrive
    await page.waitForTimeout(5000);
    const updatedCount = await page.locator('div[class*="rounded-2xl"]').count();
    console.log(`Live conversation turn completed. Total messages: ${updatedCount}`);
    expect(updatedCount).toBeGreaterThanOrEqual(2);

    // 8. Conclude Simulation
    console.log('9. Ending simulation session...');
    await page.click('#end-simulation-btn');
    await expect(page.locator('#confirm-end-session-btn')).toBeVisible();
    await page.click('#confirm-end-session-btn');

    // 9. Verify Feedback Evaluation Report Page
    console.log('10. Verifying feedback evaluation report...');
    await expect(page.locator('#print-report-btn')).toBeVisible({ timeout: 25000 });
    await expect(page.locator('#back-to-scenarios-btn')).toBeVisible();
    console.log('Feedback Evaluation report verified successfully.');

    // 10. Navigate to Progress Dashboard
    console.log('11. Navigating to Progress Dashboard...');
    await page.click('#nav-progress-btn');
    await expect(page.locator('h1')).toContainText('Executive Training Progress');
    await expect(page.locator('text=Completed Sessions')).toBeVisible();

    // 11. Sign Out
    console.log('12. Signing out...');
    await page.click('button[aria-label="Sign Out"]');
    await expect(page.locator('#passcode-input')).toBeVisible();

    // 12. Login as Administrator
    console.log('13. Testing Admin Login with ADMIN-PASS...');
    await page.fill('#passcode-input', 'ADMIN-PASS');
    await page.fill('#display-name-input', 'Executive Admin');
    await page.click('#login-submit-btn');

    // Check Admin Console navigation
    console.log('14. Opening Admin Console...');
    await expect(page.locator('#nav-admin-btn')).toBeVisible();
    await page.click('#nav-admin-btn');

    // Verify Admin tabs
    await expect(page.locator('h1')).toContainText('Administrator Control Panel');
    await expect(page.locator('text=Active Cohorts')).toBeVisible();
    await expect(page.locator('text=Demo Cohort')).toBeVisible();

    console.log('✅ ALL LIVE VERIFICATION CHECKS PASSED 100% PERFECTLY!');
  });
});
