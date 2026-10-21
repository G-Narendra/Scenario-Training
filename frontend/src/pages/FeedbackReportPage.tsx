import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { FeedbackReport, SimulationSession } from '../types';
import { ThreeHSolutionsLogo } from '../components/ThreeHSolutionsLogo';
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Eye,
  Lightbulb,
  MessageSquare,
  Printer,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
} from 'lucide-react';

interface FeedbackReportPageProps {
  sessionId: string;
  onBackToScenarios: () => void;
  onRetryScenario?: (scenarioId: string) => void;
  onNavigateProgress?: () => void;
}

export const FeedbackReportPage: React.FC<FeedbackReportPageProps> = ({
  sessionId,
  onBackToScenarios,
  onRetryScenario,
  onNavigateProgress,
}) => {
  const [report, setReport] = useState<FeedbackReport | null>(null);
  const [session, setSession] = useState<SimulationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadStep, setLoadStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      setLoadStep(0);
      return;
    }
    const t1 = setTimeout(() => setLoadStep(1), 1000);
    const t2 = setTimeout(() => setLoadStep(2), 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [loading]);

  const loadEvaluation = () => {
    setLoading(true);
    setError(null);

    Promise.all([
      api.getSessionDetail(sessionId),
      api.getSessionEvaluation(sessionId),
    ])
      .then(([sessionData, evalData]) => {
        setSession(sessionData);
        setReport(evalData);
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to load evaluation', err);
        setError(err.message || 'Unable to load evaluation report.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvaluation();
  }, [sessionId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    const steps = [
      'Ingesting session dialogue & turn exchanges...',
      'Calibrating 3H Competency Rubrics (Head, Heart, Hands)...',
      'Synthesizing verbatim quotes, strengths & model responses...',
    ];
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 px-4">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-[#FF6500]/10 animate-ping" />
          <div className="relative h-12 w-12 animate-spin rounded-full border-3 border-[#FF6500] border-t-transparent" />
        </div>
        <div className="text-center max-w-md space-y-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Generating Executive Diagnostic Report
          </h3>
          <p className="font-mono text-xs tracking-wider uppercase text-[#FF6500] font-semibold animate-pulse">
            {steps[loadStep]}
          </p>
          <div className="flex justify-center gap-1.5 pt-2">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className={`h-1.5 w-8 rounded-full transition-all duration-300 ${
                  idx <= loadStep ? 'bg-[#FF6500]' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-xl py-16 px-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Evaluation Unavailable</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{error || 'Session report could not be found.'}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            id="retry-evaluation-btn"
            onClick={loadEvaluation}
            className="rounded-xl bg-[#FF6500] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#E05A00] transition shadow-lg shadow-[#FF6500]/30"
          >
            Retry Evaluation
          </button>
          <button
            onClick={onBackToScenarios}
            className="rounded-xl border-2 border-slate-300 dark:border-[#2D5B8D] px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#132B45] transition"
          >
            Return to Library
          </button>
        </div>
      </div>
    );
  }

  const overall = report.overall_score ?? 0;
  const scoreTier =
    overall >= 85
      ? { label: 'Mastery Demonstrated', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' }
      : overall >= 70
      ? { label: 'Proficient Execution', color: 'text-[#FF6500]', bg: 'bg-[#FF6500]/10 border-[#FF6500]/30' }
      : overall >= 50
      ? { label: 'Developing Competency', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' }
      : { label: 'Foundational Practice Required', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 print:p-0 print:max-w-none text-slate-900 dark:text-slate-100">
      {/* Top Direct Navigation Bar (hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-300 dark:border-[#1E3E62] pb-5 print:hidden">
        {/* Direct Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs font-bold">
          <button
            onClick={onBackToScenarios}
            className="text-slate-500 dark:text-slate-400 hover:text-[#FF6500] dark:hover:text-[#FF6500] transition flex items-center space-x-1"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Scenario Library</span>
          </button>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <span className="text-[#FF6500]">Performance Report</span>
        </nav>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="nav-library-btn"
            onClick={onBackToScenarios}
            className="flex items-center space-x-1.5 rounded-xl border-2 border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-[#2D5B8D] dark:bg-[#132B45] dark:text-slate-200 dark:hover:bg-[#1E3E62] transition shadow-sm"
          >
            <BookOpen className="h-3.5 w-3.5 text-[#FF6500]" />
            <span>Library</span>
          </button>

          {onNavigateProgress && (
            <button
              id="nav-progress-btn"
              onClick={onNavigateProgress}
              className="flex items-center space-x-1.5 rounded-xl border-2 border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-[#2D5B8D] dark:bg-[#132B45] dark:text-slate-200 dark:hover:bg-[#1E3E62] transition shadow-sm"
            >
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span>My Progress</span>
            </button>
          )}

          {session && onRetryScenario && (
            <button
              id="retry-scenario-btn"
              onClick={() => onRetryScenario(session.scenario_id)}
              className="flex items-center space-x-1.5 rounded-xl border-2 border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 dark:border-[#2D5B8D] dark:bg-[#132B45] dark:text-slate-200 dark:hover:bg-[#1E3E62] transition shadow-sm"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[#FF6500]" />
              <span>Retry Scenario</span>
            </button>
          )}

          <button
            id="print-report-btn"
            onClick={handlePrint}
            className="flex items-center space-x-1.5 rounded-xl bg-[#FF6500] hover:bg-[#E05A00] px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-[#FF6500]/20 transition"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print 1-Pager (PDF)</span>
          </button>
        </div>
      </div>

      {/* Executive Printable Header (Visible ONLY on print/PDF export) */}
      <div className="hidden print:block mb-6 border-b-2 border-[#FF6500] pb-4">
        <div className="flex items-start justify-between">
          <div>
            <ThreeHSolutionsLogo size="md" variant="full" />
            <div className="mt-2 text-xs font-bold uppercase tracking-wider text-[#FF6500]">
              Human Development & Corporate Training • Executive 1-Pager Evaluation Debrief
            </div>
            <h1 className="mt-2 text-2xl font-black text-slate-900 font-heading">
              {session?.scenario_title || 'Executive Performance Evaluation'}
            </h1>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-700">
              <div><span className="font-bold text-slate-900">Student:</span> {session?.trainee_name || 'Enrolled Student'}</div>
              <div><span className="font-bold text-slate-900">Cohort:</span> {session?.cohort_name || 'Uzair Executive Training Cohort'}</div>
              <div><span className="font-bold text-slate-900">Evaluator:</span> Uzair (3H Solutions Executive Facilitator)</div>
              <div><span className="font-bold text-slate-900">Date & Mode:</span> {session?.started_at ? new Date(session.started_at).toLocaleDateString() : 'Today'} ({session?.mode === 'voice' ? 'Voice Call' : 'Interactive Text'})</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black text-[#FF6500]">
              {overall}
              <span className="text-sm font-semibold text-slate-500"> / 100</span>
            </div>
            <div className="mt-0.5 inline-block rounded border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-[#B45309]">
              {scoreTier.label}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Header & Score Summary Card */}
      <div className="print-section print-card print-avoid-break mt-6 rounded-3xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#FF6500]">
              <Award className="h-4 w-4" />
              <span>Executive Performance Debrief</span>
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white font-heading sm:text-4xl">
              {session?.scenario_title || 'Executive Performance Debrief'}
            </h1>

            {/* Trainee Attribution Badge Bar */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#0B192C] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#1E3E62] w-fit">
              <span className="flex items-center space-x-1.5">
                <span className="text-slate-400">Student:</span>
                <span className="text-slate-900 dark:text-white font-bold">{session?.trainee_name || 'Enrolled Student'}</span>
              </span>
              <span className="text-slate-400">•</span>
              <span className="flex items-center space-x-1.5">
                <span className="text-slate-400">Cohort:</span>
                <span>{session?.cohort_name || 'Uzair Executive Training Cohort'}</span>
              </span>
              <span className="text-slate-400">•</span>
              <span className="flex items-center space-x-1.5">
                <span className="text-slate-400">Evaluated For:</span>
                <span className="text-[#FF6500] font-bold">Admin Uzair</span>
              </span>
            </div>

            <p className="mt-4 text-base text-slate-700 dark:text-slate-200 max-w-2xl leading-relaxed font-medium">
              {report.overall_summary}
            </p>
          </div>

          {/* Radial Score Gauge */}
          <div className="print-avoid-break flex flex-col items-center justify-center rounded-2xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-slate-50 dark:bg-[#0B192C] p-6 shadow-inner text-center min-w-[200px]">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Overall Rating
            </span>
            <div className="mt-2 flex items-baseline justify-center">
              <span id="overall-score-display" className={`text-5xl font-black tracking-tight ${scoreTier.color}`}>
                {overall}
              </span>
              <span className="text-slate-500 text-lg font-bold">/100</span>
            </div>
            <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${scoreTier.bg} ${scoreTier.color}`}>
              {scoreTier.label}
            </span>
          </div>
        </div>

        {/* Instant Micro-Debrief (1 Win + 1 Actionable Fix) */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-50/90 dark:bg-emerald-950/40 p-5 shadow-sm">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>1 Clear Win (What Worked)</span>
            </div>
            <p className="mt-2 text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-semibold">
              {report.what_worked?.[0]?.why_it_worked || report.what_worked?.[0]?.quote || 'Maintained conversational composure and active listening under resistance.'}
            </p>
          </div>

          <div className="rounded-2xl border-2 border-[#FF6500] bg-amber-50/90 dark:bg-amber-950/40 p-5 shadow-sm">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#B45309] dark:text-[#FF6500]">
              <Target className="h-4 w-4 text-[#FF6500]" />
              <span>1 Immediate Actionable Fix (For Next Attempt)</span>
            </div>
            <p className="mt-2 text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-semibold">
              {report.key_moments?.[0]?.alternative_phrasing || report.what_didnt?.[0]?.why_it_missed || 'Lead with open discovery questions before proposing solutions.'}
            </p>
          </div>
        </div>

        {/* Recommended Best Solutions: 2 Executive Model Options */}
        <div className="print-card print-avoid-break mt-8 rounded-2xl border-2 border-[#FF6500]/60 bg-gradient-to-br from-[#FF6500]/10 via-amber-500/5 to-transparent p-6 shadow-sm">
          <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-[#FF6500]">
            <Award className="h-4 w-4" />
            <span>Recommended Best Solutions (2 Executive Model Options)</span>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
            Two proven executive response options demonstrating ideal framing and tactical de-escalation for this scenario.
          </p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option 1: Collaborative Discovery */}
            <div className="rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span className="text-[#FF6500] font-black">Option 1: Collaborative Discovery</span>
                <span className="rounded bg-[#FF6500]/15 px-2 py-0.5 text-[10px] text-[#FF6500] font-black">Empathy-Led</span>
              </div>
              <blockquote className="mt-2 text-sm font-semibold text-slate-900 dark:text-white leading-relaxed font-serif italic border-l-2 border-[#FF6500] pl-3 py-0.5">
                "{report.key_moments?.[0]?.alternative_phrasing || 'I hear your concern on this. Before we lock in next steps, can you walk me through the key operational friction you are seeing day-to-day?'}"
              </blockquote>
              <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                <strong className="text-slate-800 dark:text-slate-200">Why it works: </strong>
                {report.key_moments?.[0]?.reasoning || 'Defuses defensiveness by validating the counterpart\'s perspective before proposing commitments.'}
              </p>
            </div>

            {/* Option 2: Structured Alignment */}
            <div className="rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span className="text-teal-600 dark:text-teal-400 font-black">Option 2: Structured Alignment</span>
                <span className="rounded bg-teal-500/15 px-2 py-0.5 text-[10px] text-teal-600 dark:text-teal-400 font-black">Framework-Led</span>
              </div>
              <blockquote className="mt-2 text-sm font-semibold text-slate-900 dark:text-white leading-relaxed font-serif italic border-l-2 border-teal-500 pl-3 py-0.5">
                "{report.key_moments?.[1]?.alternative_phrasing || 'Let us anchor on our shared priority for Q4. If we address the bandwidth constraint first, what specific benchmark needs to be met for us to proceed?'}"
              </blockquote>
              <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                <strong className="text-slate-800 dark:text-slate-200">Why it works: </strong>
                {report.key_moments?.[1]?.reasoning || 'Re-centers the conversation around objective business criteria rather than personal friction.'}
              </p>
            </div>
          </div>
        </div>

        {/* Hidden Motivations Reveal Banner */}
        <div className="print-card print-avoid-break mt-8 rounded-2xl border-2 border-[#FF6500]/40 bg-[#FFFBEB] dark:bg-[#0B192C] p-5">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#B45309] dark:text-[#FF6500]">
            <Eye className="h-4 w-4" />
            <span>Counterpart Psychological Drivers (Hidden Agenda Reveal)</span>
          </div>
          <p className="mt-2 text-base text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
            {report.hidden_reveal}
          </p>
        </div>
      </div>

      {/* Skill Breakdown Rubric Section */}
      <div className="print-section mt-8 print-avoid-break">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2 font-heading">
          <Target className="h-5 w-5 text-[#FF6500]" />
          <span>Skill Competency Rubric Scores (Levels 1–5)</span>
        </h2>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.skill_scores.map((skill) => (
            <div
              key={skill.skill}
              className="print-card print-avoid-break rounded-2xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                  {skill.skill.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center space-x-1.5">
                  <span className={`text-sm font-black ${
                    skill.score >= 4 ? 'text-emerald-600 dark:text-emerald-400' :
                    skill.score === 3 ? 'text-[#FF6500]' :
                    'text-rose-600 dark:text-rose-400'
                  }`}>
                    Level {skill.score}
                  </span>
                  <span className="text-slate-400 text-xs font-bold">/ 5</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-2 w-full rounded-full bg-slate-200 dark:bg-[#0B192C] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    skill.score >= 4 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                    skill.score === 3 ? 'bg-gradient-to-r from-amber-500 to-[#FF6500]' :
                    'bg-gradient-to-r from-rose-500 to-rose-600'
                  }`}
                  style={{ width: `${(skill.score / 5) * 100}%` }}
                />
              </div>

              <div className="mt-3 text-xs font-bold text-slate-800 dark:text-slate-200">
                {skill.rubric_level_reached}
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {skill.justification}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* What Worked & What Didn't (Grounded in verbatim transcript moments) */}
      <div className="print-section mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 print-avoid-break">
        {/* Strengths */}
        <div className="print-card print-avoid-break rounded-3xl border-2 border-emerald-500/40 bg-white dark:bg-[#132B45] p-6 shadow-md">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>What Worked Well</span>
          </div>

          <div className="mt-4 space-y-4">
            {report.what_worked.map((item, idx) => (
              <div key={idx} className="print-card print-avoid-break rounded-2xl border border-slate-200 dark:border-[#1E3E62] bg-emerald-50/50 dark:bg-[#0B192C] p-4">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Exchange {item.moment_seq} Quoted:</div>
                <blockquote className="mt-1 font-serif italic text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                  "{item.quote}"
                </blockquote>
                <p className="mt-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {item.why_it_worked}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Growth Areas */}
        <div className="print-card print-avoid-break rounded-3xl border-2 border-rose-500/40 bg-white dark:bg-[#132B45] p-6 shadow-md">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
            <XCircle className="h-4 w-4 text-rose-500" />
            <span>Areas for Immediate Adjustment</span>
          </div>

          <div className="mt-4 space-y-4">
            {report.what_didnt.map((item, idx) => (
              <div key={idx} className="print-card print-avoid-break rounded-2xl border border-slate-200 dark:border-[#1E3E62] bg-rose-50/50 dark:bg-[#0B192C] p-4">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Exchange {item.moment_seq} Quoted:</div>
                <blockquote className="mt-1 font-serif italic text-xs text-rose-800 dark:text-rose-300 font-semibold">
                  "{item.quote}"
                </blockquote>
                <p className="mt-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {item.why_it_missed}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Moments with Alternative Phrasing & Reasoning */}
      <div className="print-section mt-8 print-avoid-break">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2 font-heading">
          <Sparkles className="h-5 w-5 text-[#FF6500]" />
          <span>Key Conversation Moments & Phrasing Refinements</span>
        </h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
          Specific inflection points analyzed with concrete alternative phrasing and tactical reasoning.
        </p>

        <div className="mt-4 space-y-4">
          {report.key_moments.map((km, idx) => (
            <div
              key={idx}
              className="print-card print-avoid-break rounded-2xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] p-6 shadow-md"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold">
                <span className="uppercase tracking-wider text-[#FF6500]">
                  Moment #{idx + 1} • Exchange {km.moment_seq}
                </span>
                <span>{km.what_happened}</span>
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  You Said:
                </span>
                <blockquote className="mt-0.5 text-xs font-serif italic text-slate-800 dark:text-slate-200 font-medium">
                  "{km.quote}"
                </blockquote>
              </div>

              <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
                <strong className="text-slate-800 dark:text-slate-200">Why it matters: </strong>
                {km.why_it_matters}
              </div>

              {/* Alternative Phrasing Recommendation */}
              <div className="mt-4 rounded-xl border-2 border-[#FF6500]/40 bg-amber-50/70 dark:bg-[#0B192C] p-4">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#B45309] dark:text-[#FF6500]">
                  <Lightbulb className="h-4 w-4" />
                  <span>Recommended Alternative Line</span>
                </div>
                <div className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">
                  "{km.alternative_phrasing}"
                </div>
                <div className="mt-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {km.reasoning}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Final Action Plan (3 to 4 Improvement Steps) */}
      <div className="print-section print-card print-avoid-break mt-8 rounded-3xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] p-8 shadow-xl">
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#FF6500]">
          <TrendingUp className="h-4 w-4" />
          <span>Your 3 to 4 Concrete Practice Drills</span>
        </div>
        <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white font-heading">
          Targeted Action Plan
        </h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
          Specific deliberate practice exercises to master before your next live practice session.
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {report.improvement_steps.map((step, idx) => (
            <div
              key={idx}
              className="print-card print-avoid-break flex flex-col justify-between rounded-2xl border-2 border-slate-200 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] p-5 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF6500]/20 text-xs font-bold text-[#FF6500]">
                    {idx + 1}
                  </span>
                  <span className="rounded bg-slate-200 dark:bg-[#132B45] px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300 capitalize">
                    {step.linked_skill.replace(/_/g, ' ')}
                  </span>
                </div>

                <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                  {step.step}
                </h3>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  {step.why}
                </p>
              </div>

              <div className="mt-4 border-t border-slate-200 dark:border-[#1E3E62] pt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF6500]">
                  Practice Drill:
                </span>
                <p className="mt-1 text-xs text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                  {step.practice_drill}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Appendix: Complete Word-for-Word Transcript */}
      {session && session.messages && session.messages.length > 0 && (
        <div className="print-section print-card mt-8 rounded-3xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] p-8 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1E3E62] pb-4">
            <div>
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#FF6500]">
                <MessageSquare className="h-4 w-4" />
                <span>Appendix A: Complete Verbatim Dialogue Transcript</span>
              </div>
              <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white font-heading">
                Key Dialogue Exchanges
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 dark:bg-[#0B192C] border border-slate-300 dark:border-[#1E3E62] px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
              {session.messages.length} Exchanges Recorded
            </span>
          </div>

          <div className="mt-6 space-y-3.5">
            {session.messages.map((msg, idx) => (
              <div
                key={idx}
                className={`rounded-2xl p-4 border-2 text-sm ${
                  msg.role === 'trainee'
                    ? 'border-[#FF6500]/40 bg-amber-50/60 dark:border-[#FF6500]/40 dark:bg-[#0B192C] ml-6'
                    : 'border-slate-300 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0F2238] mr-6'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className={`font-bold uppercase tracking-wider ${msg.role === 'trainee' ? 'text-[#FF6500]' : 'text-slate-600 dark:text-slate-300'}`}>
                    {msg.role === 'trainee' ? 'You' : 'Counterpart'}
                  </span>
                </div>
                <p className="font-medium text-slate-800 dark:text-slate-100 leading-relaxed text-[15px]">
                  {msg.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Direct Navigation Bar */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-300 dark:border-[#1E3E62] pt-6 print:hidden">
        <button
          onClick={onBackToScenarios}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl border-2 border-slate-300 bg-white dark:bg-[#132B45] dark:border-[#2D5B8D] px-5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E3E62] transition shadow-sm"
        >
          <BookOpen className="h-4 w-4 text-[#FF6500]" />
          <span>Return to Scenario Library</span>
        </button>

        <div className="w-full sm:w-auto flex items-center justify-end space-x-3">
          {onNavigateProgress && (
            <button
              onClick={onNavigateProgress}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 rounded-xl border-2 border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/40 px-5 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition shadow-sm"
            >
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span>View Progress Dashboard</span>
            </button>
          )}

          {session && onRetryScenario && (
            <button
              onClick={() => onRetryScenario(session.scenario_id)}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 rounded-xl bg-[#FF6500] hover:bg-[#E05A00] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[#FF6500]/25 transition"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Retry Scenario</span>
            </button>
          )}
        </div>
      </div>

      {/* Print Footer */}
      <div className="hidden print:block mt-8 pt-4 border-t-2 border-[#FF6500] text-center text-xs text-slate-600 font-medium">
        3H Solutions Group • Human Development & Executive Scenario Training • Confidential Performance Debrief • www.3hsolutionsgroup.com
      </div>
    </div>
  );
};
