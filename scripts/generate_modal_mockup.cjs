const path = require('path');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright'));

const modalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cohort Sign In Modal</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    h1, h2, h3, h4, .font-heading { font-family: 'Plus Jakarta Sans', sans-serif; }
  </style>
</head>
<body class="bg-slate-900/60 backdrop-blur-md min-h-screen flex items-center justify-center p-6 antialiased">

  <!-- THE MODAL OVERLAY -->
  <div class="relative w-full max-w-lg rounded-3xl border-2 border-slate-300 bg-white p-8 sm:p-10 shadow-2xl shadow-slate-900/30">
    
    <!-- Close button -->
    <button class="absolute top-6 right-6 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
    </button>

    <!-- Header with 3H solutions mark -->
    <div class="flex items-center space-x-3 mb-6">
      <div class="w-10 h-10 rounded-xl bg-[#0B192C] p-1.5 flex items-center justify-center shadow-sm">
        <svg viewBox="0 0 100 100" class="w-full h-full fill-none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="50,6 90,28 90,72 50,94 10,72 10,28" fill="#0B192C" stroke="#FF6500" stroke-width="6"/>
          <path d="M32 28 V72" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/>
          <path d="M50 24 V76" stroke="#FF6500" stroke-width="9" stroke-linecap="round"/>
          <path d="M68 28 V72" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/>
          <path d="M32 50 H68" stroke="#FF6500" stroke-width="7" stroke-linecap="round"/>
        </svg>
      </div>
      <div>
        <span class="text-xs font-black uppercase tracking-wider text-[#FF6500]">Cohort Participant Sign In</span>
        <h2 class="text-xl font-black text-slate-900 font-heading">Executive Scenario Training</h2>
      </div>
    </div>

    <p class="text-xs text-slate-600 font-medium leading-relaxed mb-6">
      Enter your cohort passcode provided by Lead Facilitator Uzair (e.g., <strong class="text-[#0B192C]">UZAIR-2026</strong>) and your enrolled delegate name to unlock your private practice sessions.
    </p>

    <!-- Form -->
    <form class="space-y-4">
      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
          Cohort Passcode *
        </label>
        <div class="relative">
          <input type="text" value="UZAIR-2026" class="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-4 py-3 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-[#0B192C]">
          <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            ✓ Active Cohort
          </span>
        </div>
      </div>

      <div>
        <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
          Your Enrolled Name *
        </label>
        <input type="text" value="Sarah Jenkins" class="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:border-[#0B192C]">
      </div>

      <button type="button" class="w-full mt-2 flex items-center justify-center space-x-2 rounded-xl bg-[#0B192C] hover:bg-[#1E3E62] text-white py-3.5 text-xs font-bold shadow-md transition">
        <span>Enter Executive Practice Environment</span>
        <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
      </button>
    </form>

    <!-- Confidentiality Reassurance -->
    <div class="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
      <span class="flex items-center space-x-1">
        <svg class="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
        <span>100% Confidential</span>
      </span>
      <span>Private Device Sandbox</span>
      <span>Archived for Uzair's 1-on-1 Debrief</span>
    </div>

  </div>

</body>
</html>`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  
  await page.setContent(modalHtml, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const outDir = path.resolve(__dirname, '../recordings');
  const shotPath = path.join(outDir, 'mockup_02_signin_modal.png');
  await page.screenshot({ path: shotPath });
  console.log('Saved modal mockup screenshot to:', shotPath);

  await browser.close();
})();
