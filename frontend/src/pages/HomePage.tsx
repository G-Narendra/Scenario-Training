import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  HandMetal,
  Heart,
  Lock,
  Mail,
  Menu,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Volume2,
  X,
} from 'lucide-react';
import { ThreeHSolutionsLogo } from '../components/ThreeHSolutionsLogo';
import { SignInModal } from '../components/SignInModal';

interface HomePageProps {
  onOpenSignIn?: () => void;
}

export const HomePage: React.FC<HomePageProps> = () => {
  const { theme, toggleTheme } = useTheme();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'Normal' | 'Challenging' | 'Crisis'>('all');
  const [selectedProfile, setSelectedProfile] = useState<'all' | 'executive' | 'operational'>('all');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  React.useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#login' || window.location.hash === '#signin') {
        setIsSignInModalOpen(true);
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const sampleScenarios = [
    {
      id: 'scen_01',
      title: 'Creative Lead Pushback on Deadlines',
      counterpart: 'Marcus Vance · Senior UX Architect',
      pillar: 'Relational Leadership & Influence',
      profile: 'operational',
      difficulty: 1,
      difficultyLevel: 'Normal',
      duration: '5 min',
      summary: 'Address sprint commitments with an overworked creative lead pushing back against process rigidity.',
      clue: 'Acknowledge Q3 achievement before discussing process. Frame standup attendance as dependency protection, not surveillance.',
    },
    {
      id: 'scen_02',
      title: 'Defending Strategy in a Hostile Activist Boardroom',
      counterpart: 'Victoria Sterling · Activist Investor',
      pillar: 'Strategic & Market Leadership',
      profile: 'executive',
      difficulty: 3,
      difficultyLevel: 'Crisis',
      duration: '10 min',
      summary: 'Defend your multi-year capital allocation and R&D strategy against aggressive margin cut demands.',
      clue: 'Never validate premature margin cuts. Anchor in 3-year enterprise equity value and unit economic trajectory.',
    },
    {
      id: 'scen_03',
      title: 'Coaching an Underperformer Who Blames Tooling',
      counterpart: 'David Chen · Lead Data Engineer',
      pillar: 'Operational Excellence & Accountability',
      profile: 'operational',
      difficulty: 2,
      difficultyLevel: 'Challenging',
      duration: '7 min',
      summary: 'Navigate defensive deflections and establish concrete milestone ownership without escalating conflict.',
      clue: 'Separate systemic infrastructure debt from personal delivery cadence. Secure agreement on a 14-day recovery sprint.',
    },
    {
      id: 'scen_04',
      title: 'Executive Presence in Cross-Functional Crisis',
      counterpart: 'Elena Rostova · VP of Regulatory Compliance',
      pillar: 'Executive Presence & Resilience',
      profile: 'executive',
      difficulty: 3,
      difficultyLevel: 'Crisis',
      duration: '10 min',
      summary: 'Lead cross-functional crisis committee following an urgent compliance disclosure under high ambiguity.',
      clue: 'Demonstrate emotional stillness. Formulate 3 immediate containment lanes before assigning accountability.',
    },
    {
      id: 'scen_05',
      title: 'Specific Recognition for a Quiet High Performer',
      counterpart: 'Priya Sharma · Senior Algorithm Specialist',
      pillar: 'People Leadership & Culture',
      profile: 'operational',
      difficulty: 1,
      difficultyLevel: 'Normal',
      duration: '5 min',
      summary: 'Deliver meaningful, non-superficial recognition that motivates without overwhelming an introverted specialist.',
      clue: 'Cite specific architectural contributions. Offer high-impact autonomy rather than loud public ceremonies.',
    },
    {
      id: 'scen_06',
      title: 'Navigating M&A Organizational Anxiety',
      counterpart: 'Tariq Al-Mansoor · Regional Operations Director',
      pillar: 'Cognitive Agility & Problem Solving',
      profile: 'executive',
      difficulty: 2,
      difficultyLevel: 'Challenging',
      duration: '8 min',
      summary: 'Address senior leadership fears regarding post-merger integration redundancies and cultural preservation.',
      clue: 'Distinguish facts from rumors transparently. Outline governance integration committee involvement for senior leaders.',
    },
  ];

  const filteredScenarios = sampleScenarios.filter((s) => {
    if (selectedDifficulty !== 'all' && s.difficultyLevel !== selectedDifficulty) return false;
    if (selectedProfile !== 'all' && s.profile !== selectedProfile) return false;
    return true;
  });

  const faqs = [
    {
      q: 'How do I access my practice scenarios?',
      a: 'Access is provided via your cohort passcode (e.g. UZAIR-2026) issued by Lead Facilitator Uzair. Click "Cohort Sign In" in the navigation bar, enter your passcode and your enrolled name, and you will be immediately routed to your practice environment.',
    },
    {
      q: 'Why is there a 10-attempt limit for each delegate?',
      a: 'The 10-attempt allocation ensures deliberate, high-stakes preparation. In executive leadership, conversations cannot be reset carelessly. By treating each attempt with boardroom seriousness, leaders engage in deep reflection rather than mindless trial-and-error.',
    },
    {
      q: 'What is the Max 2 runs per scenario limit for?',
      a: 'Deliberate practice follows a 2-stage pedagogical rhythm: Run 1 benchmarks your natural baseline instincts and generates immediate diagnostic feedback. Run 2 gives you an opportunity to immediately apply Uzair’s tactical coaching adjustments to achieve conversational mastery.',
    },
    {
      q: 'Why do I receive a 1-page summary while Uzair has the detailed report?',
      a: 'Senior leaders need fast, actionable insights (1 Key Strength + 1 Priority Adjustment) so they can immediately reflect and adapt. The full report—including verbatim dialogue transcripts and the 6-pillar Multidimensional Spider Graph—is reserved for Uzair to conduct high-value 1-on-1 coaching debriefs during your workshop.',
    },
    {
      q: 'Is my simulation dialogue confidential?',
      a: 'Yes, 100%. Your simulation runs in a private, sandboxed environment. Mistakes are safe learning experiments. Transcripts are confidential and exclusively shared with Lead Facilitator Uzair to guide executive development.',
    },
    {
      q: 'Can I speak naturally using Voice instead of typing?',
      a: 'Yes. Every scenario supports both hands-free neural Voice mode (for live telephone-style dialogue simulation) and structured Text mode (for thoughtful written dialogue).',
    },
  ];

  const handleOpenSignIn = () => {
    setIsSignInModalOpen(true);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070F1E] text-slate-900 dark:text-slate-100 font-sans selection:bg-[#0B192C] selection:text-white dark:selection:bg-[#FF6500] dark:selection:text-white transition-colors duration-200">
      {/* =========================================================================
          1. FROSTED-GLASS TOP NAVIGATION BAR (APPLE-TIER)
         ========================================================================= */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-[#1E3E62] bg-white/90 dark:bg-[#0B192C]/90 backdrop-blur-md transition-colors duration-200">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
          {/* Brand Logo & Website Link */}
          <a
            href="https://www.3hsolutionsgroup.com/"
            target="_blank"
            rel="noopener noreferrer"
            title="Visit 3H Solutions official website (www.3hsolutionsgroup.com)"
            className="flex items-center space-x-3 group transition hover:opacity-95"
          >
            <ThreeHSolutionsLogo size="md" variant="full" />
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 text-xs lg:text-sm font-semibold text-slate-700 dark:text-slate-300">
            <a href="#methodology" className="hover:text-blue-900 dark:hover:text-white transition">
              Methodology
            </a>
            <a href="#framework" className="hover:text-blue-900 dark:hover:text-white transition">
              3H Framework
            </a>
            <a href="#scenarios" className="hover:text-blue-900 dark:hover:text-white transition">
              Scenarios
            </a>
            <a href="#facilitator" className="hover:text-blue-900 dark:hover:text-white transition">
              Facilitator
            </a>
            <a href="#faq" className="hover:text-blue-900 dark:hover:text-white transition">
              FAQ
            </a>
          </nav>

          {/* Right Action Area */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle light/dark theme"
              className="rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-100 dark:bg-[#132B45] p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1E3E62] transition"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-blue-950" />}
            </button>

            {/* Cohort Sign In CTA */}
            <button
              id="home-signin-cta-btn"
              onClick={handleOpenSignIn}
              className="hidden sm:flex items-center space-x-2 rounded-xl bg-[#0B192C] hover:bg-[#1E3E62] text-white dark:bg-[#1E3E62] dark:hover:bg-[#2D5B8D] border border-transparent dark:border-[#2D5B8D] px-4 py-2 text-xs sm:text-sm font-bold shadow-sm transition"
            >
              <Lock className="h-3.5 w-3.5 text-blue-300 dark:text-slate-300" />
              <span>Cohort Sign In</span>
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
              className="md:hidden rounded-xl border border-slate-300 dark:border-[#1E3E62] p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E3E62] transition"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] px-4 pt-3 pb-6 space-y-3">
            <a
              href="#methodology"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#132B45]"
            >
              Methodology
            </a>
            <a
              href="#framework"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#132B45]"
            >
              3H Framework (6 Pillars)
            </a>
            <a
              href="#scenarios"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#132B45]"
            >
              Practice Scenarios (25)
            </a>
            <a
              href="#facilitator"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#132B45]"
            >
              Facilitator Console (Uzair)
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#132B45]"
            >
              Participant FAQ
            </a>

            <div className="pt-2">
              <button
                id="mobile-nav-signin-btn"
                onClick={handleOpenSignIn}
                className="w-full flex items-center justify-center space-x-2 rounded-xl bg-[#0B192C] hover:bg-[#1E3E62] text-white py-3 text-sm font-bold shadow-md transition"
              >
                <Lock className="h-4 w-4" />
                <span>Cohort Sign In</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          2. HERO SECTION (APPLE-TIER TYPOGRAPHY & FLOATING IPAD PREVIEW)
         ========================================================================= */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 lg:pt-28 lg:pb-32">
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_-10%,rgba(30,62,98,0.12),transparent)] dark:bg-[radial-gradient(ellipse_70%_40%_at_50%_-10%,rgba(30,62,98,0.4),transparent)]" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Category Pill */}
            <div className="inline-flex items-center space-x-2 rounded-full border border-blue-900/20 dark:border-blue-400/20 bg-blue-50/80 dark:bg-[#132B45] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-950 dark:text-blue-200 shadow-sm mb-6">
              <Sparkles className="h-3.5 w-3.5 text-[#FF6500]" />
              <span>3H SOLUTIONS GROUP · EXECUTIVE LEARNING PLATFORM</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white font-heading leading-[1.1]">
              Master High-Stakes <br />
              <span className="bg-gradient-to-r from-[#0B192C] via-blue-900 to-[#1E3E62] dark:from-white dark:via-blue-200 dark:to-blue-400 bg-clip-text text-transparent">
                Leadership Conversations.
              </span>
            </h1>

            {/* Narrative Subtitle */}
            <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-300 font-normal leading-relaxed max-w-3xl mx-auto">
              Authentic, AI-driven deliberate practice engineered for corporate leaders and senior executives. 
              Experience unscripted resistance with reactive counterparts, test conversational instincts, 
              and elevate boardroom authority in a 100% confidential environment.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                id="hero-launch-practice-btn"
                onClick={handleOpenSignIn}
                className="w-full sm:w-auto flex items-center justify-center space-x-2.5 rounded-2xl bg-[#0B192C] hover:bg-[#1E3E62] text-white dark:bg-[#1E3E62] dark:hover:bg-[#2D5B8D] border border-transparent dark:border-[#2D5B8D] px-8 py-4 text-base font-bold shadow-lg transition"
              >
                <span>Enter Practice Environment</span>
                <ArrowRight className="h-5 w-5 text-blue-300 dark:text-slate-300" />
              </button>

              <a
                href="#framework"
                className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-2xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] px-7 py-4 text-base font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E3E62] transition shadow-sm"
              >
                <BookOpen className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                <span>Explore 3H Framework</span>
              </a>
            </div>
          </div>

          {/* Floating iPad / Simulation Preview Card */}
          <div className="mt-14 sm:mt-18 max-w-4xl mx-auto">
            <div className="rounded-3xl border-2 border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] p-4 sm:p-6 shadow-2xl transition-colors duration-200">
              {/* Fake Window Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1E3E62] pb-4 mb-5">
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded-full bg-rose-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  <span className="ml-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                    Active Scenario: Creative Lead Pushback · Marcus Vance (Senior UX Architect)
                  </span>
                </div>
                <div className="hidden sm:flex items-center space-x-2">
                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    Live Audio Connected
                  </span>
                </div>
              </div>

              {/* Dialogue Exchanges */}
              <div className="space-y-4">
                {/* Counterpart Exchange */}
                <div className="flex items-start space-x-3 max-w-2xl">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-200 dark:bg-[#1E3E62] text-xs font-black text-slate-800 dark:text-white">
                    MV
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border border-slate-200 dark:border-[#1E3E62] bg-slate-100 dark:bg-[#132B45] p-4 text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 dark:text-white">Marcus Vance (Creative Lead)</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">01:14</span>
                    </div>
                    "Why are we obsessing over an 8-minute standup delay? My team pulled two 14-hour days to beat the Q3 release. Pushing rigid timesheets right now is going to kill morale."
                  </div>
                </div>

                {/* Participant User Bubble (Solid Corporate Navy) */}
                <div className="flex items-start justify-end space-x-3">
                  <div className="rounded-2xl rounded-tr-sm bg-[#0B192C] dark:bg-[#1E3E62] border border-[#0B192C] dark:border-[#2D5B8D] p-4 text-xs sm:text-sm text-white leading-relaxed max-w-2xl shadow-md">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-200">You (Executive Leader)</span>
                      <span className="text-[10px] text-slate-300">01:42</span>
                    </div>
                    "Marcus, I recognize the extraordinary effort the team delivered for Q3. My concern isn't policing minutes; it's protecting team alignment so cross-functional dependencies don't blindside us. Let's look at sprint blockers together."
                  </div>
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#0B192C] dark:bg-[#1E3E62] text-xs font-black text-white">
                    YOU
                  </div>
                </div>
              </div>

              {/* Status Ribbon */}
              <div className="mt-5 pt-4 border-t border-slate-200 dark:border-[#1E3E62] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center space-x-2">
                  <Volume2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Real-Time Voice Synthesis & Emotional Reactivity</span>
                </div>
                <div className="flex items-center space-x-3 font-semibold">
                  <span className="text-slate-700 dark:text-slate-300">Run 1: Diagnostic Baseline</span>
                  <span>•</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">1-Page Debrief upon Completion</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. ORIENTATION & SCOPE METRICS BANNER (DIRECTLY ADDRESSING UZAIR'S FEEDBACK)
         ========================================================================= */}
      <section className="border-y border-slate-200 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8 text-center">
            {/* Metric 1 */}
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-blue-950 dark:text-white font-heading">
                25
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Executive Scenarios
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Head, Heart & Hands
              </div>
            </div>

            {/* Metric 2 */}
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-blue-950 dark:text-white font-heading">
                18
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Curated Segments
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Boardroom to Operations
              </div>
            </div>

            {/* Metric 3 */}
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-[#FF6500] font-heading">
                10
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Attempts Limit
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Deliberate practice budget
              </div>
            </div>

            {/* Metric 4 */}
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-blue-950 dark:text-white font-heading">
                3
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Difficulty Levels
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Normal • Challenging • Crisis
              </div>
            </div>

            {/* Metric 5 */}
            <div className="col-span-2 lg:col-span-1 space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 font-heading">
                1-Page
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Summary PDF
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                + Full Report with Uzair
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. THE 3-STEP DELIBERATE PRACTICE METHOD
         ========================================================================= */}
      <section id="methodology" className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
              The 3H Learning Architecture
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-heading">
              The 3-Step Deliberate Practice Method
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300">
              Designed by Uzair to build enduring conversational muscle memory through iterative reflection rather than passive reading.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="rounded-3xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] p-8 shadow-md relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-[#132B45] text-blue-950 dark:text-blue-200 font-black text-lg mb-6 border border-blue-200 dark:border-[#1E3E62]">
                01
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
                Briefing & Tactical Clues
              </h3>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Review the counterpart’s psychological profile, covert motivations, and Uzair’s actionable coaching clues before entering the dialogue.
              </p>
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-[#1E3E62] text-xs font-semibold text-slate-500 dark:text-slate-400">
                Key focus: Psychological readiness
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-3xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] p-8 shadow-md relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-[#132B45] text-blue-950 dark:text-blue-200 font-black text-lg mb-6 border border-blue-200 dark:border-[#1E3E62]">
                02
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
                Reactive AI Simulation
              </h3>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Engage in natural voice speech or structured text. Counterparts push back dynamically based on your empathy, firmness, and strategic clarity.
              </p>
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-[#1E3E62] text-xs font-semibold text-slate-500 dark:text-slate-400">
                Key focus: Live conversational agility
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-3xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] p-8 shadow-md relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-[#132B45] text-blue-950 dark:text-blue-200 font-black text-lg mb-6 border border-blue-200 dark:border-[#1E3E62]">
                03
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
                1-Page Debrief & Run 2 Mastery
              </h3>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Receive an immediate concise summary (Top Strength + 1 Priority Adjustment) to apply in Run 2. Full Spider Graph & transcripts are reserved for Uzair's 1-on-1 coaching.
              </p>
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-[#1E3E62] text-xs font-semibold text-slate-500 dark:text-slate-400">
                Key focus: Targeted behavioural adjustments
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. THE 3H LEADERSHIP FRAMEWORK (6 PILLARS · 60 COMPETENCIES)
         ========================================================================= */}
      <section id="framework" className="border-t border-slate-200 dark:border-[#1E3E62] bg-slate-100/70 dark:bg-[#081220] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
              Comprehensive Capability Architecture
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-heading">
              The 3H Leadership Framework
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300">
              60 distinct executive competencies rigorously mapped across 6 leadership pillars and the core triad of Head, Heart, and Hands.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* HEAD */}
            <div className="rounded-3xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] p-7 shadow-sm">
              <div className="flex items-center space-x-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-[#1E3E62] text-blue-950 dark:text-blue-200">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading">HEAD</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Strategic Mindset (20 Competencies)</p>
                </div>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <li className="p-3 rounded-xl bg-slate-50 dark:bg-[#132B45]">
                  <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Pillar 1: Strategic & Market Leadership</span>
                  Vision articulation, capital trade-offs, market foresight, board defense.
                </li>
                <li className="p-3 rounded-xl bg-slate-50 dark:bg-[#132B45]">
                  <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Pillar 2: Cognitive Agility & Problem Solving</span>
                  Root-cause deconstruction, navigating ambiguity, high-velocity decisions.
                </li>
              </ul>
            </div>

            {/* HEART */}
            <div className="rounded-3xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] p-7 shadow-sm">
              <div className="flex items-center space-x-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading">HEART</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">People & Culture (20 Competencies)</p>
                </div>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <li className="p-3 rounded-xl bg-slate-50 dark:bg-[#132B45]">
                  <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Pillar 3: Relational Leadership & Influence</span>
                  Empathic listening, defusing defensive pushback, lateral stakeholder persuasion.
                </li>
                <li className="p-3 rounded-xl bg-slate-50 dark:bg-[#132B45]">
                  <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Pillar 4: Org Transformation & Culture</span>
                  Psychological safety, leading restructuring, cultural continuity through change.
                </li>
              </ul>
            </div>

            {/* HANDS */}
            <div className="rounded-3xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] p-7 shadow-sm">
              <div className="flex items-center space-x-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                  <HandMetal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading">HANDS</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Operational Execution (20 Competencies)</p>
                </div>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <li className="p-3 rounded-xl bg-slate-50 dark:bg-[#132B45]">
                  <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Pillar 5: Operational Excellence & Governance</span>
                  Uncompromising accountability, cross-functional rhythm, recovery plans.
                </li>
                <li className="p-3 rounded-xl bg-slate-50 dark:bg-[#132B45]">
                  <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Pillar 6: Executive Presence & Resilience</span>
                  Crisis composure, authoritative boundary setting, sustained executive stamina.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. INTERACTIVE SCENARIO LIBRARY PREVIEW (FILTER BY SENIORITY & LEVEL)
         ========================================================================= */}
      <section id="scenarios" className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                Curated Practice Modules
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-heading">
                Explore Leadership Scenarios
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl">
                Choose your seniority profile and target difficulty level to inspect scenario briefs.
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Seniority Profile Toggle */}
              <div className="flex rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-100 dark:bg-[#132B45] p-1 text-xs font-bold">
                <button
                  onClick={() => setSelectedProfile('all')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    selectedProfile === 'all'
                      ? 'bg-[#0B192C] text-white dark:bg-[#1E3E62]'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  All Profiles
                </button>
                <button
                  onClick={() => setSelectedProfile('executive')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    selectedProfile === 'executive'
                      ? 'bg-[#0B192C] text-white dark:bg-[#1E3E62]'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  C-Suite & Executives
                </button>
                <button
                  onClick={() => setSelectedProfile('operational')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    selectedProfile === 'operational'
                      ? 'bg-[#0B192C] text-white dark:bg-[#1E3E62]'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  Operational Leaders
                </button>
              </div>

              {/* Difficulty Level Dropdown / Pills */}
              <div className="flex rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-100 dark:bg-[#132B45] p-1 text-xs font-bold">
                <button
                  onClick={() => setSelectedDifficulty('all')}
                  className={`px-2.5 py-1.5 rounded-lg transition ${
                    selectedDifficulty === 'all'
                      ? 'bg-[#0B192C] text-white dark:bg-[#1E3E62]'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  All Levels
                </button>
                <button
                  onClick={() => setSelectedDifficulty('Normal')}
                  className={`px-2.5 py-1.5 rounded-lg transition ${
                    selectedDifficulty === 'Normal'
                      ? 'bg-blue-800 text-white dark:bg-blue-700'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  L1: Normal
                </button>
                <button
                  onClick={() => setSelectedDifficulty('Challenging')}
                  className={`px-2.5 py-1.5 rounded-lg transition ${
                    selectedDifficulty === 'Challenging'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  L2: Challenging
                </button>
                <button
                  onClick={() => setSelectedDifficulty('Crisis')}
                  className={`px-2.5 py-1.5 rounded-lg transition ${
                    selectedDifficulty === 'Crisis'
                      ? 'bg-rose-700 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  L3: Crisis
                </button>
              </div>
            </div>
          </div>

          {/* Scenarios Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredScenarios.map((scen) => (
              <div
                key={scen.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] p-6 shadow-md hover:shadow-lg transition group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        scen.difficultyLevel === 'Normal'
                          ? 'bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200'
                          : scen.difficultyLevel === 'Challenging'
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                          : 'bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200'
                      }`}
                    >
                      Level {scen.difficulty}: {scen.difficultyLevel}
                    </span>
                    <span className="flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="h-3 w-3" />
                      <span>{scen.duration}</span>
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading group-hover:text-blue-900 dark:group-hover:text-blue-300 transition">
                    {scen.title}
                  </h3>

                  <div className="mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Counterpart: <span className="text-slate-800 dark:text-slate-200">{scen.counterpart}</span>
                  </div>

                  <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {scen.summary}
                  </p>

                  <div className="mt-4 rounded-xl bg-slate-50 dark:bg-[#132B45] p-3 text-[11px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1E3E62]">
                    <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Uzair's Tactical Clue:</span>
                    {scen.clue}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-[#1E3E62] flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                    {scen.pillar}
                  </span>
                  <button
                    onClick={handleOpenSignIn}
                    className="flex items-center space-x-1 text-xs font-bold text-blue-900 dark:text-blue-300 hover:text-blue-700 transition"
                  >
                    <span>Practice Scenario</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. UZAIR'S FACILITATOR CONSOLE & WORKSHOP OVERSIGHT
         ========================================================================= */}
      <section id="facilitator" className="border-t border-slate-200 dark:border-[#1E3E62] bg-slate-100/70 dark:bg-[#081220] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Narrative */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                Lead Facilitator Oversight
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-heading">
                Personalized Executive Coaching by Uzair
              </h2>
              <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                The platform is purposefully engineered around the instructor-led workshop experience. 
                While delegates receive high-level 1-page summaries to adjust phrasing rapidly, 
                Uzair utilizes the <strong>Facilitator Intelligence Console</strong> to orchestrate 1-on-1 coaching debriefs.
              </p>

              <div className="mt-6 space-y-4">
                <div className="flex items-start space-x-3.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Multidimensional Spider Graph</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Visual 6-axis radar benchmark showing where participants stretch to the 75% executive threshold versus growth areas.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Verbatim Dialogue Transcripts</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Full conversation history and counterpart internal motivators archived for in-depth, undisputed post-session debriefs.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Unlimited Cohort Scalability</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Spawn fresh corporate batches (50+ delegates per batch) with instant passcodes and 1-click batch PDF export for sponsors.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card / Facilitator Console Preview */}
            <div className="rounded-3xl border-2 border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1E3E62] pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Facilitator Command Center
                  </span>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Lead Facilitator: Uzair
                  </h4>
                </div>
                <span className="rounded-full bg-blue-100 dark:bg-[#1E3E62] px-3 py-1 text-xs font-bold text-blue-900 dark:text-blue-200">
                  UZAIR-2026
                </span>
              </div>

              {/* Spider Graph Preview SVG */}
              <div className="py-4 flex flex-col items-center">
                <svg viewBox="0 0 300 240" className="w-full max-w-[280px] overflow-visible">
                  {/* Outer hex grid */}
                  <polygon
                    points="150,20 250,75 250,165 150,220 50,165 50,75"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-slate-300 dark:text-slate-700"
                  />
                  {/* Mid hex grid (75% threshold) */}
                  <polygon
                    points="150,45 225,86 225,154 150,195 75,154 75,86"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    className="text-blue-400 dark:text-blue-500/60"
                  />
                  {/* Center grid */}
                  <polygon
                    points="150,80 185,100 185,140 150,160 115,140 115,100"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-slate-200 dark:text-slate-800"
                  />
                  {/* Delegate Performance Polygon */}
                  <polygon
                    points="150,35 235,80 215,150 150,180 85,140 80,90"
                    fill="rgba(30, 62, 98, 0.3)"
                    stroke="#1E3E62"
                    strokeWidth="2.5"
                    className="dark:fill-blue-500/20 dark:stroke-blue-400"
                  />
                  {/* Labels */}
                  <text x="150" y="12" textAnchor="middle" className="text-[9px] font-bold fill-slate-700 dark:fill-slate-300">Strategic Leadership</text>
                  <text x="260" y="75" textAnchor="start" className="text-[9px] font-bold fill-slate-700 dark:fill-slate-300">Cognitive Agility</text>
                  <text x="260" y="170" textAnchor="start" className="text-[9px] font-bold fill-slate-700 dark:fill-slate-300">Relational Influence</text>
                  <text x="150" y="235" textAnchor="middle" className="text-[9px] font-bold fill-slate-700 dark:fill-slate-300">Culture & Transformation</text>
                  <text x="40" y="170" textAnchor="end" className="text-[9px] font-bold fill-slate-700 dark:fill-slate-300">Operational Excellence</text>
                  <text x="40" y="75" textAnchor="end" className="text-[9px] font-bold fill-slate-700 dark:fill-slate-300">Executive Presence</text>
                </svg>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-2">
                  6-Pillar Competency Radar · 75% Benchmark Threshold
                </div>
              </div>

              {/* Facilitator Sign In Shortcut */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-[#1E3E62] flex justify-between items-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">Facilitator passcode active</span>
                <button
                  onClick={handleOpenSignIn}
                  className="rounded-xl bg-[#0B192C] hover:bg-[#1E3E62] text-white dark:bg-[#1E3E62] dark:hover:bg-[#2D5B8D] px-3.5 py-1.5 text-xs font-bold transition"
                >
                  Enter Facilitator Console
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. PARTICIPANT FAQ ACCORDION
         ========================================================================= */}
      <section id="faq" className="py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
              Frequently Asked Questions
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-heading">
              Participant Guidance & Navigation
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] overflow-hidden shadow-sm transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left text-sm sm:text-base font-bold text-slate-900 dark:text-white hover:text-blue-900 dark:hover:text-blue-300 transition"
                >
                  <span>{faq.q}</span>
                  {openFaqIndex === idx ? (
                    <ChevronUp className="h-5 w-5 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />
                  )}
                </button>
                {openFaqIndex === idx && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-[#1E3E62]/40">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. CORPORATE ADVISORY & COHORT ACCESS
         ========================================================================= */}
      <section className="border-t border-slate-200 dark:border-[#1E3E62] bg-slate-100/70 dark:bg-[#081220] py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] p-8 sm:p-10 shadow-lg flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <ShieldCheck className="h-4 w-4" />
                <span>Executive Cohort Advisory & Support</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white font-heading">
                Ready to elevate your leadership communication?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl">
                <em>"Learning is a process, NOT an event."</em> Guided by Uzair Hassan with over 35 years of executive consulting experience across the UAE and global markets, 3H Solutions delivers measurable behavioral agility. Connect with our advisory team or enter your enrolled cohort.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                onClick={handleOpenSignIn}
                className="flex items-center justify-center space-x-2 rounded-xl bg-[#0B192C] hover:bg-[#1E3E62] dark:bg-[#1E3E62] dark:hover:bg-[#2D5B8D] text-white px-6 py-3.5 text-sm font-bold shadow-md transition"
              >
                <Lock className="h-4 w-4 text-[#FF6500]" />
                <span>Sign In to Cohort</span>
              </button>

              <a
                href="mailto:info@3hsolutionsgroup.com"
                className="flex items-center justify-center space-x-2 rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-100 dark:bg-[#132B45] text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#1E3E62] px-5 py-3.5 text-sm font-bold transition"
              >
                <Mail className="h-4 w-4" />
                <span>Email Advisory</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          10. CORPORATE FOOTER
         ========================================================================= */}
      <footer className="border-t border-slate-200 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] py-10 transition-colors duration-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-200 dark:border-[#1E3E62]">
            <div className="flex flex-col items-center md:items-start space-y-2">
              <ThreeHSolutionsLogo size="md" variant="full" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Three H Solutions Group · Executive Scenario Training & Deliberate Practice Platform
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <a
                href="https://www.3hsolutionsgroup.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-900 dark:hover:text-white transition flex items-center space-x-1"
              >
                <span>3hsolutionsgroup.com</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <a href="#framework" className="hover:text-blue-900 dark:hover:text-white transition">
                3H Framework
              </a>
              <a href="#scenarios" className="hover:text-blue-900 dark:hover:text-white transition">
                Scenarios
              </a>
              <a href="#faq" className="hover:text-blue-900 dark:hover:text-white transition">
                FAQ
              </a>
              <button
                onClick={handleOpenSignIn}
                className="font-bold text-blue-950 dark:text-blue-300 hover:underline"
              >
                Cohort Sign In
              </button>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-3 text-center sm:text-left">
            <div>
              © {new Date().getFullYear()} Three H Solutions Group. All rights reserved. Dubai, United Arab Emirates.
            </div>
            <div className="flex items-center space-x-2">
              <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Enterprise Grade Encryption · 100% Confidential</span>
            </div>
          </div>
        </div>
      </footer>

      {/* =========================================================================
          SIGN IN MODAL OVERLAY
         ========================================================================= */}
      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
      />
    </div>
  );
};
