import { test, expect } from '@playwright/test';

test.describe('Flight Simulator Admin Console E2E Flow', () => {
  test('Admin login, cohort management, YAML studio validation, and telemetry tabs', async ({ page }) => {
    // 1. Visit application
    await page.goto('http://127.0.0.1:8000/');

    // 2. Admin Login using ADMIN-PASS
    await expect(page.locator('h1')).toContainText('Flight Simulator');
    await page.fill('#passcode-input', 'ADMIN-PASS');
    await page.fill('#display-name-input', 'Admin User');
    await page.click('#login-submit-btn');

    // Verify successful login
    await expect(page.locator('h1')).toContainText('Choose Your Training Track');

    // Admin nav button should be visible for admin role
    const adminNavBtn = page.locator('#nav-admin-btn');
    await expect(adminNavBtn).toBeVisible();

    // 3. Navigate to Admin Console
    await adminNavBtn.click();
    await expect(page.locator('h1')).toContainText('Admin Management Console');

    // 4. Verify Cohorts Tab & Create New Cohort
    const cohortsTab = page.getByRole('button', { name: 'Cohorts' });
    await expect(cohortsTab).toBeVisible();
    await expect(page.locator('text=Active & Scheduled Cohorts')).toBeVisible({ timeout: 10000 });

    // Click Create Cohort
    await page.click('#create-cohort-modal-btn');
    await expect(page.locator('#cohort-name-input')).toBeVisible();

    const uniqueCohortName = `E2E Cohort ${Date.now()}`;
    await page.fill('#cohort-name-input', uniqueCohortName);
    await page.fill('#cohort-desc-input', 'Automated E2E test cohort');
    await page.click('#cohort-submit-btn');

    // Verify newly created cohort is in list
    await expect(page.locator(`text=${uniqueCohortName}`)).toBeVisible({ timeout: 10000 });

    // 5. Test Scenario Studio Tab & YAML Validation
    await page.getByRole('button', { name: 'Scenario Studio' }).click();
    await expect(page.locator('text=Scenario Studio & Content Manager')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#yaml-studio-btn')).toBeVisible();

    // Open YAML modal
    await page.click('#yaml-studio-btn');
    await expect(page.locator('#yaml-content-textarea')).toBeVisible();

    const validYaml = `slug: test-e2e-scenario-${Date.now()}
track: sales
title: "E2E Automated Negotiation Test"
topic: discovery_questions
difficulty: 2
duration_limit_seconds: 600
turn_limit: 20
brief: |
  Briefing description for automated E2E test scenario.
persona:
  name: Alex Miller
  role: Procurement Manager
  personality: [direct, analytical, cautious]
  communication_style: "Direct, no-nonsense executive style."
hidden_motivations:
  - "Needs to close vendor before quarter end."
objections:
  - "Your pricing is higher than our budget."
success_criteria:
  - "Trainee asks discovery questions."
skills_assessed:
  - skill: discovery_questions
    weight: 0.5
  - skill: closing_next_steps
    weight: 0.5
opening_line: "Alex here. I have 10 minutes so give me your best offer."
`;

    await page.fill('#yaml-content-textarea', validYaml);
    await page.click('#yaml-validate-btn');

    // Verify YAML schema validation passes
    await expect(page.locator('#yaml-validation-box')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#yaml-validation-box')).toContainText('Valid scenario definition ready for publishing');

    // Close YAML modal
    await page.click('button:has-text("Cancel")');

    // 6. Test Usage & Costs Tab
    await page.getByRole('button', { name: 'Usage & Costs' }).click();
    await expect(page.locator('text=Total Tokens')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Voice Audio Duration')).toBeVisible();
    await expect(page.locator('text=Estimated Spend')).toBeVisible();
    await expect(page.locator('text=Recorded Usage Events')).toBeVisible();

    // 7. Test Audit Logs Tab
    await page.getByRole('button', { name: 'Audit Logs' }).click();
    await expect(page.locator('text=System Audit & Compliance Log')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('th:has-text("Action")')).toBeVisible();
    await expect(page.locator('th:has-text("Timestamp")')).toBeVisible();
  });
});
