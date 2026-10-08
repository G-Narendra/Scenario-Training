import { test, expect } from '@playwright/test';

test.describe('Scenario Training E2E Simulation Flow', () => {
  test('Low-friction start (<3 clicks) and interactive conversation with AI counterpart', async ({ page }) => {
    // 1. Visit the application
    await page.goto('http://127.0.0.1:8000/');

    // 2. Trainee Login
    await expect(page.locator('h1')).toContainText('Scenario Training');
    await page.fill('#passcode-input', 'DEMO-PASS');
    await page.fill('#display-name-input', 'Jane Trainee');
    await page.click('#login-submit-btn');

    // Verify successful login into Track Picker
    await expect(page.locator('h1')).toContainText('Choose Your Training Track');

    // Click 1 (after login): Select Sales Track
    await page.click('#track-card-sales');

    // Verify Scenario Library loaded
    await expect(page.locator('h1')).toContainText('Sales Mastery Scenarios');

    // Click 2: Open Briefing Modal for scenario 1
    const scenarioCard = page.locator('#scenario-card-sales-01-discovery-polite-prospect');
    await expect(scenarioCard).toBeVisible();
    await scenarioCard.click();

    // Verify Briefing Modal is open
    await expect(page.locator('#start-simulation-btn')).toBeVisible();

    // Click 3: Launch Simulation (<3 clicks from login to live simulation achieved!)
    await page.click('#start-simulation-btn');

    // 3. Verify Live Simulation Room
    await expect(page.locator('#chat-message-input')).toBeVisible({ timeout: 15000 });
    const messagesContainer = page.locator('#chat-messages-container');
    await expect(messagesContainer).toBeVisible();

    // Opening message from counterpart should be visible
    await expect(messagesContainer).toContainText('Thanks for reaching out');

    // 4. Send a trainee message
    await page.fill(
      '#chat-message-input',
      'Good morning Arthur, thank you for meeting. Could you share what your top priorities are for this quarter?'
    );
    await page.click('#send-message-btn');

    // Verify trainee message appears in transcript
    await expect(messagesContainer).toContainText('Could you share what your top priorities are');

    // Verify counterpart AI responds (streamed response from MockLLMProvider)
    await expect(messagesContainer.locator('[data-role="counterpart"]')).toHaveCount(2, {
      timeout: 15000,
    });

    // 5. Conclude Simulation
    await page.click('#end-simulation-btn');
    await expect(page.locator('#confirm-end-session-btn')).toBeVisible();
    await page.click('#confirm-end-session-btn');

    // Verify conclusion state
    await expect(page.locator('text=Practice complete. Your conversation transcript is ready to review.')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#view-evaluation-btn')).toBeVisible();

    // 6. Navigate to Evaluation Report
    await page.click('#view-evaluation-btn');
    await expect(page.locator('#overall-score-display')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Skill Competency Rubric Scores')).toBeVisible();
    await expect(page.locator('text=Targeted Action Plan')).toBeVisible();
    await expect(page.locator('#print-report-btn')).toBeVisible();

    // 7. Verify Progress Dashboard from Navbar
    await page.click('button:has-text("Progress")');
    await expect(page.locator('h1')).toContainText('Flight Log & Trajectory');
    await expect(page.locator('text=Simulations Completed')).toBeVisible();
    await expect(page.locator('text=Recent Simulation Log')).toBeVisible();
  });
});

