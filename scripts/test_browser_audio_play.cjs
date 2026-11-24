const { chromium } = require('../frontend/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://mrdev444-scenario-training-backend.hf.space/app/', { waitUntil: 'networkidle' });

  const result = await page.evaluate(async () => {
    try {
      const audio = new Audio('/api/voice/tts?text=Hello+from+test&voice=male');
      await audio.play();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.name + ': ' + e.message };
    }
  });

  console.log('Direct audio.play() result without user gesture:', result);
  await browser.close();
})();
