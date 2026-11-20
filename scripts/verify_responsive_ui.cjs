const path = require('path');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright'));

async function runResponsiveVerification() {
  const recordingsDir = path.resolve(__dirname, '../recordings');
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  try {
    // =========================================================================
    // 1. DESKTOP VERIFICATION (1440 x 900)
    // =========================================================================
    console.log('--- [1/2] Verifying Desktop Layout (1440x900) ---');
    const contextDesktop = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await contextDesktop.newPage();

    console.log('Navigating to http://127.0.0.1:8000/app/ ...');
    await page.goto('http://127.0.0.1:8000/app/', { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Master High-Stakes', { timeout: 10000 });

    // Verify key sections on Home Page
    const heroVisible = await page.isVisible('text=Master High-Stakes');
    const signInBtnVisible = await page.isVisible('#home-signin-cta-btn');
    const methodVisible = await page.isVisible('text=The 3-Step Deliberate Practice Method');
    const frameworkVisible = await page.isVisible('text=The 3H Leadership Framework');
    const scenariosVisible = await page.isVisible('text=Explore Leadership Scenarios');
    const facilitatorVisible = await page.isVisible('text=Lead Facilitator: Uzair');
    const faqVisible = await page.isVisible('text=Participant Guidance & Navigation');
    const conciergeVisible = await page.isVisible("text=Have any questions? We're happy to help.");

    console.log('Desktop Visibility Check:');
    console.log(`- Hero: ${heroVisible}`);
    console.log(`- Sign In CTA: ${signInBtnVisible}`);
    console.log(`- 3-Step Method: ${methodVisible}`);
    console.log(`- 3H Framework: ${frameworkVisible}`);
    console.log(`- Scenarios: ${scenariosVisible}`);
    console.log(`- Facilitator: ${facilitatorVisible}`);
    console.log(`- FAQ: ${faqVisible}`);
    console.log(`- Concierge: ${conciergeVisible}`);

    if (!heroVisible || !signInBtnVisible || !methodVisible) {
      throw new Error('Desktop elements missing on Home Page');
    }

    // Check horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    console.log(`Desktop ScrollWidth: ${scrollWidth}, ClientWidth: ${clientWidth}`);
    if (scrollWidth > clientWidth + 1) {
      throw new Error(`Desktop horizontal overflow detected: ${scrollWidth} > ${clientWidth}`);
    }

    // Screenshot Desktop Home Page
    const desktopHomePath = path.join(recordingsDir, 'verified_desktop_home_page.png');
    await page.screenshot({ path: desktopHomePath, fullPage: false });
    console.log(`Saved screenshot: ${desktopHomePath}`);

    // Click "Cohort Sign In" button to open modal
    console.log('Opening Cohort Sign In modal...');
    await page.click('#home-signin-cta-btn');
    await page.waitForSelector('#modal-passcode-input', { timeout: 5000 });

    const modalPath = path.join(recordingsDir, 'verified_desktop_signin_modal.png');
    await page.screenshot({ path: modalPath });
    console.log(`Saved screenshot: ${modalPath}`);

    // Fill "Delegate: Dev (Participant)"
    console.log('Filling delegate credentials and signing in...');
    await page.fill('#modal-passcode-input', 'UZAIR-2026');
    await page.fill('#modal-displayname-input', 'Dev');
    await page.click('#modal-signin-submit-btn');

    // Wait for Curriculum & Practice view to load
    await page.waitForSelector('text=Participant Orientation & Practice Guide', { timeout: 10000 });
    await page.waitForTimeout(1000);
    console.log('Successfully signed in as Delegate Dev!');

    const studentLibraryPath = path.join(recordingsDir, 'verified_desktop_student_library.png');
    await page.screenshot({ path: studentLibraryPath });
    console.log(`Saved screenshot: ${studentLibraryPath}`);

    // Sign Out
    console.log('Signing out...');
    await page.click('#logout-btn');
    await page.waitForSelector('text=Master High-Stakes', { timeout: 10000 });
    console.log('Successfully returned to public Home Page after logout!');

    // Sign In as Uzair (Facilitator)
    console.log('Signing in as Lead Facilitator Uzair...');
    await page.click('#home-signin-cta-btn');
    await page.waitForSelector('#signin-modal-title', { timeout: 5000 });
    await page.fill('#modal-passcode-input', 'UZAIR-2026');
    await page.fill('#modal-displayname-input', 'Uzair');
    await page.click('#modal-signin-submit-btn');

    await page.waitForSelector('text=Facilitator Console', { timeout: 10000 });
    console.log('Successfully signed in as Lead Facilitator Uzair!');

    const uzairConsolePath = path.join(recordingsDir, 'verified_desktop_uzair_console.png');
    await page.screenshot({ path: uzairConsolePath });
    console.log(`Saved screenshot: ${uzairConsolePath}`);

    await contextDesktop.close();

    // =========================================================================
    // 2. MOBILE VERIFICATION (375 x 812 - iPhone)
    // =========================================================================
    console.log('\n--- [2/2] Verifying Mobile Layout (375x812) ---');
    const contextMobile = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const pageMobile = await contextMobile.newPage();

    console.log('Navigating to http://127.0.0.1:8000/app/ on mobile...');
    await pageMobile.goto('http://127.0.0.1:8000/app/', { waitUntil: 'networkidle' });
    await pageMobile.waitForSelector('text=Master High-Stakes', { timeout: 10000 });

    // Verify Mobile Horizontal Overflow
    const scrollWidthM = await pageMobile.evaluate(() => document.documentElement.scrollWidth);
    const clientWidthM = await pageMobile.evaluate(() => document.documentElement.clientWidth);
    console.log(`Mobile ScrollWidth: ${scrollWidthM}, ClientWidth: ${clientWidthM}`);
    if (scrollWidthM > clientWidthM + 1) {
      throw new Error(`Mobile horizontal overflow detected: ${scrollWidthM} > ${clientWidthM}`);
    }

    const mobileHomePath = path.join(recordingsDir, 'verified_mobile_home_page.png');
    await pageMobile.screenshot({ path: mobileHomePath });
    console.log(`Saved screenshot: ${mobileHomePath}`);

    // Open Mobile Hamburger Menu
    console.log('Opening mobile hamburger menu...');
    const hamburgerBtn = pageMobile.locator("button[aria-label='Toggle mobile menu']");
    await hamburgerBtn.click();
    await pageMobile.waitForSelector('text=WhatsApp Concierge', { timeout: 5000 });

    const mobileMenuPath = path.join(recordingsDir, 'verified_mobile_menu_open.png');
    await pageMobile.screenshot({ path: mobileMenuPath });
    console.log(`Saved screenshot: ${mobileMenuPath}`);

    // Click Cohort Sign In inside mobile menu
    console.log('Clicking Cohort Sign In on mobile...');
    await pageMobile.locator("button:has-text('Cohort Sign In')").last().click();
    await pageMobile.waitForSelector('#modal-passcode-input', { timeout: 5000 });

    // Verify Modal does not overflow mobile screen
    const modalScrollM = await pageMobile.evaluate(() => document.documentElement.scrollWidth);
    if (modalScrollM > clientWidthM + 1) {
      throw new Error(`Mobile modal overflow detected: ${modalScrollM} > ${clientWidthM}`);
    }

    const mobileModalPath = path.join(recordingsDir, 'verified_mobile_signin_modal.png');
    await pageMobile.screenshot({ path: mobileModalPath });
    console.log(`Saved screenshot: ${mobileModalPath}`);

    // Complete Mobile Sign In
    console.log('Logging in as delegate on mobile...');
    await pageMobile.fill('#modal-passcode-input', 'UZAIR-2026');
    await pageMobile.fill('#modal-displayname-input', 'Dev');
    await pageMobile.click('#modal-signin-submit-btn');

    await pageMobile.waitForSelector('text=Participant Orientation & Practice Guide', { timeout: 10000 });
    await pageMobile.waitForTimeout(1000);
    console.log('Successfully navigated to student library on mobile!');

    const mobileLibraryPath = path.join(recordingsDir, 'verified_mobile_student_library.png');
    await pageMobile.screenshot({ path: mobileLibraryPath });
    console.log(`Saved screenshot: ${mobileLibraryPath}`);

    await contextMobile.close();

    console.log('\n======================================================');
    console.log('ALL RESPONSIVE DESKTOP & MOBILE CHECKS PASSED (100%)');
    console.log('======================================================');
  } catch (err) {
    console.error('Responsive verification failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runResponsiveVerification();
