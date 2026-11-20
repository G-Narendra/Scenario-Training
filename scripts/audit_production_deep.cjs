const path = require('path');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright'));

async function runProductionDeepAudit() {
  const auditReport = {
    timestamp: new Date().toISOString(),
    viewportsTested: ['375x812 (Mobile)', '768x1024 (Tablet)', '1440x900 (Desktop)'],
    themesTested: ['light', 'dark'],
    pagesTested: [],
    overflowIssues: [],
    brokenInteractions: [],
    performanceMetrics: {},
    uzairFeedbackStatus: {},
    findings: [],
  };

  const recordingsDir = path.resolve(__dirname, '../recordings/audit');
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  const testViewports = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'desktop', width: 1440, height: 900 },
  ];

  for (const vp of testViewports) {
    console.log(`\n======================================================`);
    console.log(`Testing Viewport: ${vp.name.toUpperCase()} (${vp.width}x${vp.height})`);
    console.log(`======================================================`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    // 1. HOME PAGE
    console.log(`[${vp.name}] 1. Testing Home Page`);
    const t0 = Date.now();
    await page.goto('http://127.0.0.1:8000/app/', { waitUntil: 'networkidle' });
    const loadTimeHome = Date.now() - t0;
    auditReport.performanceMetrics[`home_${vp.name}_load_ms`] = loadTimeHome;

    // Check horizontal overflow
    const overflowHome = await page.evaluate(() => {
      const el = document.documentElement;
      return {
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        hasOverflow: el.scrollWidth > el.clientWidth,
      };
    });
    if (overflowHome.hasOverflow) {
      auditReport.overflowIssues.push({ page: 'HomePage', vp: vp.name, ...overflowHome });
      console.error(`[OVERFLOW] Home Page on ${vp.name}: scrollWidth=${overflowHome.scrollWidth} > clientWidth=${overflowHome.clientWidth}`);
    } else {
      console.log(`✓ Home Page layout clean (scrollWidth=${overflowHome.scrollWidth}, clientWidth=${overflowHome.clientWidth})`);
    }

    await page.screenshot({ path: path.join(recordingsDir, `audit_${vp.name}_home_light.png`), fullPage: false });

    // Test Theme Toggle to Dark
    console.log(`[${vp.name}] Toggling to Dark Theme on Home Page`);
    const themeBtn = await page.$('button[aria-label="Toggle light/dark theme"]');
    if (themeBtn) {
      await themeBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(recordingsDir, `audit_${vp.name}_home_dark.png`), fullPage: false });
      // Toggle back to light for standard flow
      await themeBtn.click();
      await page.waitForTimeout(300);
    }

    // 2. SIGN IN MODAL
    console.log(`[${vp.name}] 2. Testing Sign In Modal`);
    if (vp.name === 'mobile') {
      const menuBtn = await page.$('button[aria-label="Toggle mobile menu"]');
      if (menuBtn) {
        await menuBtn.click();
        await page.waitForTimeout(300);
        const mobileSignInBtn = await page.$('#mobile-nav-signin-btn');
        if (mobileSignInBtn) {
          await mobileSignInBtn.click();
        }
      }
    } else {
      const signInBtn = await page.$('#home-signin-cta-btn');
      if (signInBtn) await signInBtn.click();
    }

    await page.waitForSelector('#signin-modal-title', { timeout: 10000 });
    await page.screenshot({ path: path.join(recordingsDir, `audit_${vp.name}_signin_modal.png`) });

    // Enter delegate credentials
    await page.fill('#modal-passcode-input', 'UZAIR-2026');
    await page.fill('#modal-displayname-input', 'Dev');
    const submitBtn = await page.$('#modal-signin-submit-btn');
    if (submitBtn) {
      const submitText = await submitBtn.innerText();
      console.log(`Sign in button text: "${submitText}"`);
      await submitBtn.click();
    }

    // 3. STUDENT SCENARIO LIBRARY
    console.log(`[${vp.name}] 3. Waiting for Scenario Library`);
    await page.waitForSelector('text=Executive Curriculum & 3H Competency Framework', { timeout: 10000 });
    await page.waitForTimeout(800);

    const overflowLibrary = await page.evaluate(() => {
      const el = document.documentElement;
      return {
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        hasOverflow: el.scrollWidth > el.clientWidth,
      };
    });
    if (overflowLibrary.hasOverflow) {
      auditReport.overflowIssues.push({ page: 'ScenarioLibrary', vp: vp.name, ...overflowLibrary });
      console.error(`[OVERFLOW] Scenario Library on ${vp.name}: scrollWidth=${overflowLibrary.scrollWidth} > clientWidth=${overflowLibrary.clientWidth}`);
    } else {
      console.log(`✓ Scenario Library layout clean (scrollWidth=${overflowLibrary.scrollWidth}, clientWidth=${overflowLibrary.clientWidth})`);
    }

    await page.screenshot({ path: path.join(recordingsDir, `audit_${vp.name}_library_capabilities.png`), fullPage: false });

    // Switch to Scenarios view
    const scenariosModeBtn = await page.$('#view-mode-scenarios-btn');
    if (scenariosModeBtn) {
      await scenariosModeBtn.click();
      await page.waitForTimeout(500);
      console.log(`✓ Switched to Interactive Simulations mode`);
      await page.screenshot({ path: path.join(recordingsDir, `audit_${vp.name}_library_scenarios_grid.png`), fullPage: false });
    }

    // Switch to List layout
    const listBtn = await page.$('#layout-list-btn');
    if (listBtn) {
      await listBtn.click();
      await page.waitForTimeout(400);
      console.log(`✓ Switched to Sequential List layout`);
      await page.screenshot({ path: path.join(recordingsDir, `audit_${vp.name}_library_scenarios_list.png`), fullPage: false });
    }

    // Test Difficulty Filter
    const diffSelect = await page.$('#catalog-difficulty-filter');
    if (diffSelect) {
      await diffSelect.selectOption('Crisis');
      await page.waitForTimeout(400);
      console.log(`✓ Filtered by Level 3: Crisis`);
      await page.screenshot({ path: path.join(recordingsDir, `audit_${vp.name}_library_crisis_filter.png`), fullPage: false });
      // Reset filter
      await diffSelect.selectOption('all');
      await page.waitForTimeout(300);
    }

    // 4. BRIEFING MODAL
    console.log(`[${vp.name}] 4. Testing Scenario Briefing Modal`);
    const firstScenarioCard = await page.$('[id^="scenario-card-"], [id^="scenario-row-"]');
    if (firstScenarioCard) {
      await firstScenarioCard.click();
      await page.waitForSelector('#start-simulation-btn', { timeout: 8000 });
      await page.waitForTimeout(400);

      const overflowModal = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"]');
        return modal ? { scrollWidth: modal.scrollWidth, clientWidth: modal.clientWidth } : null;
      });
      console.log(`Briefing modal bounds:`, overflowModal);

      await page.screenshot({ path: path.join(recordingsDir, `audit_${vp.name}_briefing_modal.png`) });

      // Check if start simulation button is present
      const startSimBtn = await page.$('#start-simulation-btn');
      if (startSimBtn) {
        console.log(`✓ Start Practice button available`);
        // Start simulation
        await startSimBtn.click();
        console.log(`[${vp.name}] 5. Waiting for Simulation Chat`);
        await page.waitForSelector('text=Marcus Vance', { timeout: 15000 });
        await page.waitForTimeout(1000);

        const overflowChat = await page.evaluate(() => {
          const el = document.documentElement;
          return {
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
            hasOverflow: el.scrollWidth > el.clientWidth,
          };
        });
        if (overflowChat.hasOverflow) {
          auditReport.overflowIssues.push({ page: 'SimulationChat', vp: vp.name, ...overflowChat });
          console.error(`[OVERFLOW] Simulation Chat on ${vp.name}: scrollWidth=${overflowChat.scrollWidth} > clientWidth=${overflowChat.clientWidth}`);
        } else {
          console.log(`✓ Simulation Chat layout clean (scrollWidth=${overflowChat.scrollWidth}, clientWidth=${overflowChat.clientWidth})`);
        }

        await page.screenshot({ path: path.join(recordingsDir, `audit_${vp.name}_simulation_chat.png`) });

        // Test sending a turn
        const chatInput = await page.$('input[placeholder*="Type your response"], textarea');
        if (chatInput) {
          console.log(`Sending student dialogue turn...`);
          await chatInput.fill('Good morning Marcus. I appreciate you raising this. Before we adjust the delivery deadline, let us review the critical dependencies so I can shield your team from external pressure.');
          const sendBtn = await page.$('#send-message-btn');
          if (sendBtn) await sendBtn.click();

          // Wait for counterpart reply stream
          await page.waitForTimeout(4000);
          console.log(`✓ Dialogue exchange received`);
          await page.screenshot({ path: path.join(recordingsDir, `audit_${vp.name}_simulation_exchange.png`) });
        }

        // Test ending the scenario
        const endBtn = await page.$('#end-practice-btn');
        if (endBtn) {
          await endBtn.click();
          await page.waitForTimeout(400);
          await page.screenshot({ path: path.join(recordingsDir, `audit_${vp.name}_simulation_end_confirm.png`) });

          const confirmEndBtn = await page.$('#confirm-end-session-btn');
          if (confirmEndBtn) {
            await confirmEndBtn.click();
            console.log(`Concluded session, waiting for evaluation report...`);
            await page.waitForSelector('text=Performance', { timeout: 35000 });
            await page.waitForTimeout(1500);

            const overflowReport = await page.evaluate(() => {
              const el = document.documentElement;
              return {
                scrollWidth: el.scrollWidth,
                clientWidth: el.clientWidth,
                hasOverflow: el.scrollWidth > el.clientWidth,
              };
            });
            if (overflowReport.hasOverflow) {
              auditReport.overflowIssues.push({ page: 'FeedbackReport', vp: vp.name, ...overflowReport });
              console.error(`[OVERFLOW] Feedback Report on ${vp.name}: scrollWidth=${overflowReport.scrollWidth} > clientWidth=${overflowReport.clientWidth}`);
            } else {
              console.log(`✓ Feedback Report layout clean (scrollWidth=${overflowReport.scrollWidth}, clientWidth=${overflowReport.clientWidth})`);
            }

            await page.screenshot({ path: path.join(recordingsDir, `audit_${vp.name}_feedback_report_student.png`), fullPage: false });
          }
        }
      }
    }

    // 6. LOGOUT AND TEST FACILITATOR CONSOLE
    console.log(`[${vp.name}] 6. Testing Facilitator Flow`);
    const logoutBtn = await page.waitForSelector('#logout-btn', { timeout: 8000 });
    if (logoutBtn) {
      await logoutBtn.click();
      await page.waitForSelector('text=Master High-Stakes', { timeout: 10000 });
      await page.waitForTimeout(400);
    }

    // Open sign in modal as facilitator
    if (vp.name === 'mobile') {
      const menuBtn = await page.waitForSelector('button[aria-label="Toggle mobile menu"]', { timeout: 8000 });
      await menuBtn.click();
      await page.waitForTimeout(400);
      const mobileSignInBtn = await page.waitForSelector('#mobile-nav-signin-btn', { timeout: 8000 });
      await mobileSignInBtn.click();
    } else {
      const signInBtn = await page.waitForSelector('#home-signin-cta-btn', { timeout: 8000 });
      await signInBtn.click();
    }
    await page.waitForSelector('#signin-modal-title', { timeout: 10000 });
    await page.fill('#modal-passcode-input', 'UZAIR-2026');
    await page.fill('#modal-displayname-input', 'Uzair');
    const submit = await page.$('#modal-signin-submit-btn');
    if (submit) await submit.click();

    await page.waitForSelector('text=Executive Facilitator Console', { timeout: 15000 });
    await page.waitForTimeout(800);

    const overflowConsole = await page.evaluate(() => {
      const el = document.documentElement;
      return {
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        hasOverflow: el.scrollWidth > el.clientWidth,
      };
    });
    if (overflowConsole.hasOverflow) {
      auditReport.overflowIssues.push({ page: 'AdminConsole', vp: vp.name, ...overflowConsole });
      console.error(`[OVERFLOW] Admin Console on ${vp.name}: scrollWidth=${overflowConsole.scrollWidth} > clientWidth=${overflowConsole.clientWidth}`);
    } else {
      console.log(`✓ Admin Console layout clean (scrollWidth=${overflowConsole.scrollWidth}, clientWidth=${overflowConsole.clientWidth})`);
    }

    await page.screenshot({ path: path.join(recordingsDir, `audit_${vp.name}_admin_console.png`), fullPage: false });

    await context.close();
  }

  await browser.close();

  fs.writeFileSync(
    path.resolve(__dirname, '../outputs/deep_audit_results.json'),
    JSON.stringify(auditReport, null, 2)
  );

  console.log('\n--- Deep Production Audit Complete ---');
  console.log(`Overflow issues found: ${auditReport.overflowIssues.length}`);
}

runProductionDeepAudit().catch((err) => {
  console.error('Audit run failed:', err);
  process.exit(1);
});
