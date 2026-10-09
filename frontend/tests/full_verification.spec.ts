import { test, expect } from '@playwright/test';

test.describe('ScenarioLab Comprehensive System Verification', () => {
  const BASE_URL = 'http://127.0.0.1:8000';

  test('1. Authentication, Form Validation, and Demo Short-cuts', async ({ page }) => {
    await page.goto(BASE_URL);

    // Initial heading verification
    await expect(page.locator('h1')).toContainText('ScenarioLab');
    await expect(page.locator('h1')).toContainText('Scenario Training');

    // 1.1 Error handling on empty inputs
    await page.fill('#passcode-input', '');
    await page.fill('#display-name-input', '');
    // Trigger submit via enter or button
    await page.click('#login-submit-btn');
    // HTML5 validation or form error state
    await page.fill('#passcode-input', 'BAD');
    await page.fill('#display-name-input', 'Test User');
    await page.click('#login-submit-btn');
    await expect(page.locator('text=Please provide a valid cohort passcode')).toBeVisible();

    // 1.2 Test Instant Demo Trainee Button
    await page.click('button:has-text("Trainee Demo")');
    await expect(page.locator('#passcode-input')).toHaveValue('DEMO-PASS');
    await expect(page.locator('#display-name-input')).toHaveValue('Alex Trainee');
    await page.click('#login-submit-btn');

    // Should land on Track Picker
    await expect(page.locator('h1')).toContainText('Choose Your Training Track');
    await expect(page.locator('text=Sales Track')).toBeVisible();
    await expect(page.locator('text=Leadership & Communication Track')).toBeVisible();

    // Sign out to test Admin quick login
    const logoutBtn = page.locator('button[aria-label="Sign Out"]');
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // 1.3 Test Instant Demo Admin Button
    await expect(page.locator('h1')).toContainText('Scenario Training');
    await page.click('button:has-text("Admin Console")');
    await expect(page.locator('#passcode-input')).toHaveValue('ADMIN-PASS');
    await expect(page.locator('#display-name-input')).toHaveValue('Sarah Admin');
    await page.click('#login-submit-btn');

    // Should land on Track Picker with Admin Nav button
    await expect(page.locator('h1')).toContainText('Choose Your Training Track');
    await expect(page.locator('#nav-admin-btn')).toBeVisible();
  });

  test('2. Track Selection, Search, Filters, and Scenario Briefing Modal', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('button:has-text("Trainee Demo")');
    await page.click('#login-submit-btn');
    await expect(page.locator('h1')).toContainText('Choose Your Training Track');

    // 2.1 Select Sales Track
    await page.click('#track-card-sales');
    await expect(page.locator('h1')).toContainText('Sales Mastery Scenarios');

    // 2.2 Search filter
    const searchInput = page.locator('input[placeholder*="Search scenarios"]');
    await searchInput.fill('objection');
    await expect(page.locator('text=Overcoming the \'We Already Have a Vendor\' Objection')).toBeVisible();
    await searchInput.fill('');

    // 2.3 Topic filters
    const allTopicBtn = page.getByRole('button', { name: 'All Topics' });
    await expect(allTopicBtn).toBeVisible();
    const objectionTopicBtn = page.getByRole('button', { name: 'objection handling' });
    if (await objectionTopicBtn.count() > 0) {
      await objectionTopicBtn.click();
      await allTopicBtn.click();
    }

    // 2.4 Back to tracks
    await page.click('button:has-text("Choose another track")');
    await expect(page.locator('h1')).toContainText('Choose Your Training Track');

    // 2.5 Select Leadership Track
    await page.click('#track-card-leadership');
    await expect(page.locator('h1')).toContainText('Leadership Mastery Scenarios');

    // 2.6 Open Briefing Modal
    const leaderScenarioCard = page.locator('#scenario-card-leadership-01-quiet-high-performer');
    await expect(leaderScenarioCard).toBeVisible();
    await leaderScenarioCard.click();

    // Verify Briefing modal content
    const modal = page.locator('div[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=Scenario Situation & Context')).toBeVisible();
    await expect(modal.locator('text=Simulated Roleplay Partner')).toBeVisible();
    await expect(modal.locator('text=Tested Competencies')).toBeVisible();
    await expect(modal.locator('#mode-select-text')).toBeVisible();
    await expect(modal.locator('#mode-select-voice')).toBeVisible();

    // Test ESC to close modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    // Re-open modal and verify Mode toggle
    await leaderScenarioCard.click();
    await expect(modal).toBeVisible();
    await page.click('#mode-select-voice');
    await page.click('#mode-select-text');
    await page.locator('button:has(svg.lucide-x)').click();
    await expect(modal).not.toBeVisible();
  });

  test('3. Text Simulation: Live Chat, Cockpit Tabs, Dynamic Reactions, and Conclude', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('button:has-text("Trainee Demo")');
    await page.click('#login-submit-btn');
    await page.click('#track-card-sales');

    // Launch Sales Scenario 1
    const scenarioCard = page.locator('#scenario-card-sales-01-discovery-polite-prospect');
    await scenarioCard.click();
    await page.click('#start-simulation-btn');

    // Verify Simulation Cockpit
    await expect(page.locator('#chat-message-input')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Text Mode')).toBeVisible();
    await expect(page.locator('text=Exchange 1')).toBeVisible();

    // Test Sidebar tabs
    await page.click('button:has-text("Mission & Goals")');
    await expect(page.locator('text=Primary Mission Target')).toBeVisible();
    await page.click('button:has-text("Skills Tested")');
    await expect(page.locator('text=Executive Competencies Evaluated')).toBeVisible();
    await page.click('button:has-text("Partner Profile")');
    await expect(page.locator('text=Real-Time Emotional Baseline')).toBeVisible();

    // Test Sidebar Collapse & Expand
    const hideBriefBtn = page.getByRole('button', { name: 'Hide Brief' });
    await hideBriefBtn.click();
    const expandBtn = page.locator('button[aria-label="Expand Scenario Briefing"]');
    await expect(expandBtn).toBeVisible();
    await expandBtn.click();

    // Verify Opening message from counterpart
    const messages = page.locator('#chat-messages-container');
    await expect(messages).toContainText('Thanks for reaching out');

    // Send a message
    const chatInput = page.locator('#chat-message-input');
    await chatInput.fill('Good morning Marcus. Can you share what specific daily bottlenecks your team is dealing with?');
    await page.click('#send-message-btn');

    // Verify trainee message is in container
    await expect(messages).toContainText('specific daily bottlenecks');

    // Verify counterpart replies
    await expect(messages.locator('[data-role="counterpart"]')).toHaveCount(2, { timeout: 15000 });

    // Test Conclude Modal - cancel flow
    await page.click('#end-simulation-btn');
    const confirmModal = page.locator('div[role="alertdialog"]');
    await expect(confirmModal).toBeVisible();
    await page.click('button:has-text("Keep Practicing")');
    await expect(confirmModal).not.toBeVisible();

    // Conclude Simulation - confirm flow
    await page.click('#end-simulation-btn');
    await page.click('#confirm-end-session-btn');

    // Verify Conclusion Banner
    await expect(page.locator('text=Practice complete. Your conversation transcript is ready to review.')).toBeVisible({ timeout: 10000 });
    const viewEvalBtn = page.locator('#view-evaluation-btn');
    await expect(viewEvalBtn).toBeVisible();
    await viewEvalBtn.click();

    // Verify Evaluation Report Page
    await expect(page.locator('#overall-score-display')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Counterpart Psychological Drivers')).toBeVisible();
    await expect(page.locator('text=Skill Competency Rubric Scores (Levels 1–5)')).toBeVisible();
    await expect(page.locator('text=What Worked Well')).toBeVisible();
    await expect(page.locator('text=Areas for Immediate Adjustment')).toBeVisible();
    await expect(page.locator('text=Pivotal Conversation Moments & Phrasing Refinements')).toBeVisible();
    await expect(page.locator('text=Targeted Action Plan')).toBeVisible();
    await expect(page.locator('#print-report-btn')).toBeVisible();

    // Test Back to Scenarios
    await page.click('#back-to-scenarios-btn');
    await expect(page.locator('h1')).toContainText('Sales Mastery Scenarios');
  });

  test('4. Progress Analytics, KPI Cards, and Practice Drills', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('button:has-text("Trainee Demo")');
    await page.click('#login-submit-btn');

    // Navigate to Progress tab
    await page.click('#nav-progress-btn');
    await expect(page.locator('h1')).toContainText('Flight Log & Trajectory');

    // Verify 4 KPI cards
    await expect(page.locator('text=Simulations Completed')).toBeVisible();
    await expect(page.locator('text=Total Flight Time')).toBeVisible();
    await expect(page.locator('text=Daily Streak')).toBeVisible();
    await expect(page.locator('text=Average Proficiency')).toBeVisible();

    // Verify Recommended Practice Drills
    await expect(page.locator('text=Recommended Practice Drills')).toBeVisible();

    // Verify Recent Simulation Log Table
    await expect(page.locator('text=Recent Simulation Log')).toBeVisible();
    await expect(page.locator('th:has-text("Scenario")')).toBeVisible();
    await expect(page.locator('th:has-text("Mode")')).toBeVisible();
    await expect(page.locator('th:has-text("Score")')).toBeVisible();
  });

  test('5. Voice Simulation: HUD, Microphone Toggle, Counterpart Speech, and Text Fallback', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('button:has-text("Trainee Demo")');
    await page.click('#login-submit-btn');
    await page.click('#track-card-sales');

    // Open Scenario 1 Briefing
    const scenarioCard = page.locator('#scenario-card-sales-01-discovery-polite-prospect');
    await scenarioCard.click();

    // Select Voice Mode
    await page.click('#mode-select-voice');
    await page.click('#start-simulation-btn');

    // Verify Voice HUD
    await expect(page.locator('text=Voice Mode')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#voice-record-btn')).toBeVisible();

    // Toggle mic
    await page.click('#voice-record-btn');
    await expect(page.locator('text=Listening to you')).toBeVisible();
    await page.waitForTimeout(500);
    await page.click('#voice-record-btn');

    // Verify message stream has counterpart response
    const messages = page.locator('#chat-messages-container');
    await expect(messages.locator('[data-role="counterpart"]')).toHaveCount(2, { timeout: 15000 });

    // Test Fallback to Text Mode Button
    const fallbackBtn = page.locator('#fallback-to-text-btn');
    await expect(fallbackBtn).toBeVisible();
    await fallbackBtn.click();

    // Verify mode switched to text
    await expect(page.locator('text=Text Mode')).toBeVisible();
    await expect(page.locator('#chat-message-input')).toBeVisible();

    // End session
    await page.click('#end-simulation-btn');
    await page.click('#confirm-end-session-btn');
    await expect(page.locator('#view-evaluation-btn')).toBeVisible();
  });

  test('6. Admin Console: Cohorts, YAML Studio, Usage & Costs, and Audit Logs', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('button:has-text("Admin Console")');
    await page.click('#login-submit-btn');

    // Navigate to Admin
    await page.click('#nav-admin-btn');
    await expect(page.locator('h1')).toContainText('Admin Management Console');

    // 6.1 Cohorts Tab: Create, Rotate, Extend, Revoke
    const cohortsTab = page.locator('#admin-tab-cohorts');
    await expect(cohortsTab).toBeVisible();
    await expect(page.locator('text=Active & Scheduled Cohorts')).toBeVisible();

    // Open create cohort modal
    await page.click('#create-cohort-modal-btn');
    const testCohortName = `Verif Cohort ${Date.now()}`;
    await page.fill('#cohort-name-input', testCohortName);
    await page.fill('#cohort-desc-input', 'Verification test cohort');
    await page.click('#cohort-submit-btn');
    await expect(page.locator(`text=${testCohortName}`)).toBeVisible({ timeout: 10000 });

    // Rotate passcode on first cohort
    const rotateBtn = page.locator('button:has-text("Rotate Passcode")').first();
    await rotateBtn.click();
    await expect(page.locator('text=Passcode rotated successfully')).toBeVisible({ timeout: 10000 });

    // Extend cohort
    const extendBtn = page.locator('button:has-text("Extend +30 Days")').first();
    await extendBtn.click();
    await expect(page.locator('text=Cohort duration extended by 30 days')).toBeVisible({ timeout: 10000 });

    // 6.2 Scenario Studio Tab
    await page.click('#admin-tab-scenarios');
    await expect(page.locator('text=Scenario Studio & Content Manager')).toBeVisible();

    // YAML Studio Modal
    await page.click('#yaml-studio-btn');
    const yamlModal = page.locator('div:has-text("Scenario YAML Studio")').last();
    await expect(yamlModal).toBeVisible();
    await page.fill('#yaml-content-textarea', `slug: test-verif-${Date.now()}
track: sales
title: "Test Verification Negotiation"
topic: discovery_questions
difficulty: 2
duration_limit_seconds: 600
turn_limit: 20
brief: "Test brief."
persona:
  name: Taylor Director
  role: Director
  personality: [direct]
  communication_style: "Direct"
hidden_motivations: ["Needs ROI."]
objections: ["Budget tight."]
success_criteria: ["Asks questions."]
skills_assessed:
  - {skill: discovery_questions, weight: 1.0}
opening_line: "Hello."
`);
    await page.click('#yaml-validate-btn');
    await expect(page.locator('#yaml-validation-box')).toContainText('Valid scenario definition ready for publishing');
    await page.click('button:has-text("Cancel")');

    // Duplicate Scenario action
    const duplicateBtn = page.locator('button[title="Duplicate"]').first();
    await duplicateBtn.click();
    await expect(page.locator('text=Scenario duplicated as new draft')).toBeVisible({ timeout: 10000 });

    // 6.3 Usage & Costs Tab
    await page.click('#admin-tab-usage');
    await expect(page.locator('text=Total Tokens')).toBeVisible();
    await expect(page.locator('text=Voice Audio Duration')).toBeVisible();
    await expect(page.locator('text=Estimated Spend')).toBeVisible();
    await expect(page.locator('text=Compute Model Breakdown')).toBeVisible();

    // 6.4 Audit Logs Tab
    await page.click('#admin-tab-audit');
    await expect(page.locator('text=System Audit & Compliance Log')).toBeVisible();
    await expect(page.locator('th:has-text("Action")')).toBeVisible();
    await expect(page.locator('th:has-text("Timestamp")')).toBeVisible();
  });
});
