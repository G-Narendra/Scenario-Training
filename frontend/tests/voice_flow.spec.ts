import { test, expect } from '@playwright/test';

test.describe('Scenario Training E2E Voice Simulation Flow', () => {
  test('Launches Voice Mode simulation, captures audio turns, handles counterpart audio, and concludes', async ({ page }) => {
    // 1. Visit the application
    await page.goto('http://127.0.0.1:8000/');

    // 2. Trainee Login
    await expect(page.locator('h1')).toContainText('Scenario Training');
    await page.fill('#passcode-input', 'DEMO-PASS');
    await page.fill('#display-name-input', 'Marcus Voice Trainee');
    await page.click('#login-submit-btn');

    // 3. Select Track
    await expect(page.locator('h1')).toContainText('Choose Your Training Track');
    await page.click('#track-card-sales');

    // 4. Select Scenario and Open Briefing Modal
    const scenarioCard = page.locator('#scenario-card-sales-01-discovery-polite-prospect');
    await expect(scenarioCard).toBeVisible();
    await scenarioCard.click();

    // 5. Choose Voice Mode in Modal
    await expect(page.locator('#mode-select-voice')).toBeVisible();
    await page.click('#mode-select-voice');

    // 6. Launch Simulation
    await page.click('#start-simulation-btn');

    // 7. Verify Voice Mode HUD appears
    await expect(page.locator('#voice-record-btn')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Voice Mode')).toBeVisible();
    await expect(page.locator('text=Ready: Click Speak to start turn')).toBeVisible({ timeout: 10000 });

    // 8. Speak Turn using fake microphone stream
    await page.click('#voice-record-btn');
    await expect(page.locator('text=Listening to you')).toBeVisible();

    // Give fake audio 1 second to capture and stream chunks
    await page.waitForTimeout(1000);

    // Click Done Speaking to commit turn
    await page.click('#voice-record-btn');

    // 9. Verify counterpart replies via voice stream
    // Counterpart speech creates a message in transcript
    const messagesContainer = page.locator('#chat-messages-container');
    await expect(messagesContainer).toBeVisible();
    await expect(messagesContainer.locator('[data-role="counterpart"]')).toHaveCount(2, {
      timeout: 15000,
    });

    // 10. Conclude Simulation
    await page.click('#end-simulation-btn');
    await expect(page.locator('#confirm-end-session-btn')).toBeVisible();
    await page.click('#confirm-end-session-btn');

    // 11. View Evaluation
    await expect(page.locator('text=Practice complete. Your conversation transcript is ready to review.')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#view-evaluation-btn')).toBeVisible();
    await page.click('#view-evaluation-btn');

    await expect(page.locator('#overall-score-display')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Skill Competency Rubric Scores')).toBeVisible();
  });
});
