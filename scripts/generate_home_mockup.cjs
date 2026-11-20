const path = require('path');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../frontend/node_modules/playwright'));

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3H Solutions - Executive Scenario Training</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
    h1, h2, h3, h4, .font-heading { font-family: 'Plus Jakarta Sans', sans-serif; }
  </style>
</head>
<body class="bg-[#F8FAFC] text-slate-900 antialiased selection:bg-[#0B192C] selection:text-white">

  <!-- TOP APPLE-STYLE BLUR NAVBAR -->
  <header class="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl transition-all">
    <div class="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
      
      <!-- Brand Logo -->
      <div class="flex items-center space-x-3 cursor-pointer">
        <div class="w-10 h-10 rounded-xl bg-[#0B192C] p-1.5 flex items-center justify-center shadow-sm">
          <svg viewBox="0 0 100 100" class="w-full h-full fill-none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="50,6 90,28 90,72 50,94 10,72 10,28" fill="#0B192C" stroke="#FF6500" stroke-width="6"/>
            <path d="M32 28 V72" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/>
            <path d="M50 24 V76" stroke="#FF6500" stroke-width="9" stroke-linecap="round"/>
            <path d="M68 28 V72" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/>
            <path d="M32 50 H68" stroke="#FF6500" stroke-width="7" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="flex flex-col">
          <span class="text-base font-black tracking-wider text-slate-900 font-heading leading-tight">
            3H <span class="text-[#FF6500]">SOLUTIONS</span>
          </span>
          <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Executive Leadership Group
          </span>
        </div>
      </div>

      <!-- Center Nav Links -->
      <nav class="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-600">
        <a href="#curriculum" class="hover:text-[#0B192C] transition">Competency Framework</a>
        <a href="#simulations" class="hover:text-[#0B192C] transition">25 Scenarios</a>
        <a href="#methodology" class="hover:text-[#0B192C] transition">Deliberate Practice</a>
        <a href="#facilitator" class="hover:text-[#0B192C] transition">Facilitator Portal</a>
      </nav>

      <!-- Right Action CTA -->
      <div class="flex items-center space-x-4">
        <div class="hidden sm:flex items-center space-x-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Lead Facilitator: Uzair</span>
        </div>
        <button class="flex items-center space-x-2 rounded-xl bg-[#0B192C] hover:bg-[#1E3E62] text-white px-5 py-2.5 text-xs font-bold transition shadow-md hover:shadow-lg">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          <span>Cohort Sign In</span>
        </button>
      </div>

    </div>
  </header>

  <!-- HERO SECTION: APPLE-TIER MINIMALISM & VAST SPACE -->
  <section class="relative overflow-hidden pt-16 pb-24 lg:pt-24 lg:pb-32">
    <div class="mx-auto max-w-7xl px-6 lg:px-8 text-center">
      
      <!-- Overline Pill -->
      <div class="inline-flex items-center space-x-2 rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 shadow-sm mb-8">
        <span class="w-2 h-2 rounded-full bg-[#FF6500]"></span>
        <span>The 3H Solutions Executive Deliberate Practice Platform</span>
      </div>

      <!-- Main Headline -->
      <h1 class="mx-auto max-w-4xl text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 font-heading leading-[1.08]">
        Master High-Stakes Leadership Conversations.
      </h1>

      <!-- Subtitle -->
      <p class="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-slate-600 font-medium leading-relaxed">
        Experience authentic workplace challenges with reactive AI counterparts. Test baseline instincts, receive instant 1-page diagnostic benchmarks, and elevate executive presence in a confidential environment.
      </p>

      <!-- CTA Buttons -->
      <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
        <button class="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-2xl bg-[#0B192C] hover:bg-[#1E3E62] text-white px-8 py-4 text-sm font-bold shadow-xl transition transform hover:-translate-y-0.5">
          <span>Launch Practice Simulation</span>
          <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </button>
        <button class="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-2xl border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-800 px-7 py-4 text-sm font-bold shadow-sm transition">
          <svg class="w-4 h-4 text-[#FF6500]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
          <span>Explore 3H Curriculum Framework</span>
        </button>
      </div>

      <!-- Live Workshop Reassurance Strip -->
      <div class="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-slate-500">
        <div class="flex items-center space-x-2">
          <svg class="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
          <span>25 Curated Leadership Scenarios</span>
        </div>
        <div class="flex items-center space-x-2">
          <svg class="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
          <span>3 Difficulty Levels (Normal, Challenging, Crisis)</span>
        </div>
        <div class="flex items-center space-x-2">
          <svg class="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
          <span>100% Confidential Private Sandbox</span>
        </div>
      </div>

      <!-- FLOATING ELEVATED iPAD SIMULATION PREVIEW (HERO MOCKUP) -->
      <div class="mt-16 mx-auto max-w-5xl rounded-3xl border-2 border-slate-300 bg-white p-4 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-100">
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8 text-left">
          
          <!-- Mockup Top Bar -->
          <div class="flex items-center justify-between pb-4 border-b border-slate-200">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-xl bg-[#0B192C] text-white flex items-center justify-center font-bold text-xs">MV</div>
              <div>
                <h4 class="text-sm font-bold text-slate-900">Marcus Vance <span class="text-xs font-semibold text-[#FF6500] uppercase">· Senior Creative Lead</span></h4>
                <p class="text-[11px] text-slate-500 font-medium">Scenario: Addressing Chronic Punctuality & Meeting Lateness (Level 1: Normal)</p>
              </div>
            </div>
            <span class="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-700">
              Live Voice Call Active
            </span>
          </div>

          <!-- Dialogue Bubbles in Mockup -->
          <div class="mt-6 space-y-4">
            <div class="flex items-start space-x-3 max-w-2xl">
              <div class="w-8 h-8 rounded-lg bg-[#0B192C] text-white flex items-center justify-center font-bold text-[10px] shrink-0">MV</div>
              <div class="rounded-2xl rounded-tl-sm border border-slate-300 bg-white p-4 text-xs font-medium text-slate-800 shadow-sm leading-relaxed">
                "My deliverables are always top tier. Why obsess over 8 minutes when we need creative momentum flowing?"
              </div>
            </div>

            <!-- Participant Bubble: Solid Executive Navy -->
            <div class="flex items-start justify-end space-x-3">
              <div class="max-w-2xl rounded-2xl rounded-tr-sm bg-[#0B192C] text-white p-4 text-xs font-medium shadow-md leading-relaxed">
                "I value your creative output Marcus. However, when the lead architect arrives 10 minutes late, the entire sprint dependency stalls. Let's agree on shifting our core sync so your deep-work hours are protected without holding up delivery."
              </div>
              <div class="w-8 h-8 rounded-lg bg-[#0B192C] text-white flex items-center justify-center font-bold text-[10px] shrink-0 border border-[#1E3E62]">You</div>
            </div>
          </div>

          <!-- Mockup Diagnostic Tag -->
          <div class="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Executive Presence: <strong class="text-emerald-600">Composed & Non-Combative</strong></span>
            <span>Estimated Pacing: <strong class="text-slate-800">4.5 min conversation</strong></span>
          </div>

        </div>
      </div>

    </div>
  </section>

  <!-- THE 3-STEP DELIBERATE PRACTICE METHOD -->
  <section class="py-20 bg-white border-t border-slate-200">
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <div class="text-center max-w-3xl mx-auto">
        <h2 class="text-xs font-black uppercase tracking-wider text-[#FF6500]">Pedagogic Architecture</h2>
        <p class="mt-2 text-3xl sm:text-4xl font-black text-slate-900 font-heading">
          The 3-Step Deliberate Practice Method
        </p>
        <p class="mt-3 text-sm text-slate-600 font-medium">
          Designed by Uzair to build enduring muscle memory for high-stakes leadership moments.
        </p>
      </div>

      <div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        <!-- Step 1 -->
        <div class="rounded-2xl border-2 border-slate-200 bg-[#F8FAFC] p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div class="w-12 h-12 rounded-xl bg-[#0B192C] text-white flex items-center justify-center font-black text-lg mb-6">
              01
            </div>
            <h3 class="text-xl font-bold text-slate-900 font-heading">Select High-Stakes Case</h3>
            <p class="mt-3 text-xs text-slate-600 leading-relaxed font-medium">
              Choose from 25 real-world corporate scenarios categorized by seniority (Senior Executive vs Operational Leader) and difficulty (Normal, Challenging, Crisis).
            </p>
          </div>
          <div class="mt-6 pt-4 border-t border-slate-200 text-xs font-bold text-[#0B192C]">
            Explore 25 Scenarios →
          </div>
        </div>

        <!-- Step 2 -->
        <div class="rounded-2xl border-2 border-slate-200 bg-[#F8FAFC] p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div class="w-12 h-12 rounded-xl bg-[#0B192C] text-white flex items-center justify-center font-black text-lg mb-6">
              02
            </div>
            <h3 class="text-xl font-bold text-slate-900 font-heading">Converse Confidentially</h3>
            <p class="mt-3 text-xs text-slate-600 leading-relaxed font-medium">
              Speak directly via microphone or structured text. Counterparts push back dynamically based on your framing, tone, and objection management.
            </p>
          </div>
          <div class="mt-6 pt-4 border-t border-slate-200 text-xs font-bold text-[#0B192C]">
            Voice & Text Supported →
          </div>
        </div>

        <!-- Step 3 -->
        <div class="rounded-2xl border-2 border-slate-200 bg-[#F8FAFC] p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div class="w-12 h-12 rounded-xl bg-[#0B192C] text-white flex items-center justify-center font-black text-lg mb-6">
              03
            </div>
            <h3 class="text-xl font-bold text-slate-900 font-heading">1-Page Diagnostic Debrief</h3>
            <p class="mt-3 text-xs text-slate-600 leading-relaxed font-medium">
              Immediately receive your Diagnostic Baseline Index, exactly 1 key strength, and 1 high-leverage priority phrasing fix. Detailed spider graphs archived for Uzair.
            </p>
          </div>
          <div class="mt-6 pt-4 border-t border-slate-200 text-xs font-bold text-[#0B192C]">
            Instant Actionable Feedback →
          </div>
        </div>

      </div>
    </div>
  </section>

</body>
</html>`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const outDir = path.resolve(__dirname, '../recordings');
  fs.mkdirSync(outDir, { recursive: true });

  const shotPath = path.join(outDir, 'mockup_01_apple_home_page.png');
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log('Saved mockup screenshot to:', shotPath);

  await browser.close();
})();
