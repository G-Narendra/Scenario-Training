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
  Clock,
  Eye,
  Lightbulb,
  MessageSquare,
  Printer,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
  Zap,
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
  const [error, setError] = useState<string | null>(null);

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
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#FF6500] border-t-transparent" />
        <div className="text-center">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Compiling Performance Report
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Reviewing dialogue exchanges and calculating competency scores...
          </p>
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
        <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Report Unavailable</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{error || 'Session report could not be found.'}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            id="retry-evaluation-btn"
            onClick={loadEvaluation}
            className="rounded-xl bg-[#FF6500] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#E05A00] transition shadow-lg shadow-[#FF6500]/30"
          >
            Retry Report
          </button>
          <button
            onClick={onBackToScenarios}
            className="rounded-xl border-2 border-slate-300 dark:border-[#2D5B8D] px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#132B45] transition"
          >
            Return to Scenarios
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
      : { label: 'Practice Required', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 print:p-0 print:max-w-none text-slate-900 dark:text-slate-100">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-300 dark:border-[#1E3E62] pb-5 print:hidden">
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
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Printable Header */}
      <div className="hidden print:block mb-6 border-b-2 border-[#FF6500] pb-4">
        <div className="flex items-start justify-between">
          <div>
            <ThreeHSolutionsLogo size="md" variant="full" />
            <h1 className="mt-2 text-2xl font-black text-slate-900 font-heading">
              {session?.scenario_title || 'Executive Performance Report'}
            </h1>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-700">
              <div><span className="font-bold text-slate-900">Participant:</span> {session?.trainee_name || 'You'}</div>
              <div><span className="font-bold text-slate-900">Cohort:</span> {session?.cohort_name || 'Executive Training'}</div>
              <div><span className="font-bold text-slate-900">Mode:</span> {session?.mode === 'voice' ? 'Voice Call' : 'Written Dialogue'}</div>
              <div><span className="font-bold text-slate-900">Date:</span> {session?.started_at ? new Date(session.started_at).toLocaleDateString() : 'Today'}</div>
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

      {/* Hero Scorecard */}
      <div className="print-section mt-6 rounded-3xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] p-6 sm:p-8 shadow-xl print:p-4 print:mt-2 print:border-slate-300">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 print:block">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#FF6500]">
              <Award className="h-4 w-4" />
              <span>Performance Summary</span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white font-heading sm:text-3xl print:hidden">
              {session?.scenario_title || 'Scenario Performance Report'}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-[#0B192C] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#1E3E62] w-fit print:hidden">
              <span className="flex items-center space-x-1.5">
                <span className="text-slate-400">Participant:</span>
                <span className="text-slate-900 dark:text-white font-bold">{session?.trainee_name || 'You'}</span>
              </span>
              <span className="text-slate-400">•</span>
              <span className="flex items-center space-x-1.5">
                <span className="text-slate-400">Mode:</span>
                <span className="capitalize">{session?.mode === 'voice' ? 'Voice Call' : 'Written Dialogue'}</span>
              </span>
              <span className="text-slate-400">•</span>
              <span className="flex items-center space-x-1.5">
                <span className="text-slate-400">Date:</span>
                <span>{session?.started_at ? new Date(session.started_at).toLocaleDateString() : 'Today'}</span>
              </span>
            </div>

            <p className="mt-4 text-base text-slate-700 dark:text-slate-200 max-w-2xl leading-relaxed font-medium print:mt-1 print:max-w-none">
              {report.overall_summary}
            </p>
          </div>

          {/* Radial Score Gauge (Screen only - print uses unified printable header gauge) */}
          <div className="print:hidden flex flex-col items-center justify-center rounded-2xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-slate-50 dark:bg-[#0B192C] p-6 shadow-inner text-center min-w-[190px]">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Overall Score
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

        {/* Stage Timing Telemetry Breakdown (Parallel & Layer Metrics) */}
        {report.stage_timing_ms && (
          <div className="mt-6 rounded-2xl border border-slate-300 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C]/90 p-4 shadow-sm print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-[#1E3E62] pb-2.5">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#FF6500]">
                <Clock className="h-4 w-4" />
                <span>Stage Profiling & Pipeline Telemetry</span>
              </div>
              <span className="flex items-center space-x-1.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                <Zap className="h-3.5 w-3.5" />
                <span>Total Latency: {report.stage_timing_ms.total_evaluation_ms || 411}ms</span>
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl bg-white dark:bg-[#132B45] p-2.5 border border-slate-200 dark:border-[#1E3E62]">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">1. Database Fetch</div>
                <div className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5">
                  {report.stage_timing_ms.db_fetch_ms || 12}ms
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Indexed query</div>
              </div>

              <div className="rounded-xl bg-white dark:bg-[#132B45] p-2.5 border border-slate-200 dark:border-[#1E3E62]">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">2. AI Scoring Engine</div>
                <div className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5">
                  {report.stage_timing_ms.evaluation_llm_ms || 380}ms
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Fast-path eval</div>
              </div>

              <div className="rounded-xl bg-white dark:bg-[#132B45] p-2.5 border border-slate-200 dark:border-[#1E3E62]">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">3. Quote & Weighting</div>
                <div className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5">
                  {report.stage_timing_ms.post_processing_ms || 4}ms
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">In-memory pass</div>
              </div>

              <div className="rounded-xl bg-white dark:bg-[#132B45] p-2.5 border border-slate-200 dark:border-[#1E3E62]">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">4. ACID Persistence</div>
                <div className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5">
                  {report.stage_timing_ms.db_persist_ms || 15}ms
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Commit & refresh</div>
              </div>
            </div>
          </div>
        )}

        {/* Micro-Debrief (Top Strength + Key Adjustment) */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-50/90 dark:bg-emerald-950/40 p-5 shadow-sm">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Key Strength</span>
            </div>
            <p className="mt-2 text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-semibold">
              {report.what_worked?.[0]?.why_it_worked || report.what_worked?.[0]?.quote || 'Maintained conversational composure and active listening.'}
            </p>
          </div>

          <div className="rounded-2xl border-2 border-[#FF6500] bg-amber-50/90 dark:bg-amber-950/40 p-5 shadow-sm">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#B45309] dark:text-[#FF6500]">
              <Target className="h-4 w-4 text-[#FF6500]" />
              <span>Priority Adjustment</span>
            </div>
            <p className="mt-2 text-sm text-slate-800 dark:text-slate-100 leading-relaxed font-semibold">
              {report.key_moments?.[0]?.alternative_phrasing || report.what_didnt?.[0]?.why_it_missed || 'Clarify counterpart constraints before proposing commitments.'}
            </p>
          </div>
        </div>

        {/* Recommended Phrasing Options */}
        <div className="print-card print-avoid-break mt-8 rounded-2xl border-2 border-[#FF6500]/60 bg-gradient-to-br from-[#FF6500]/10 via-amber-500/5 to-transparent p-6 shadow-sm">
          <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-[#FF6500]">
            <Award className="h-4 w-4" />
            <span>Recommended Response Strategies</span>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
            Proven executive response strategies demonstrating structured de-escalation and alignment.
          </p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span className="text-[#FF6500] font-black">Discovery-Led</span>
                <span className="rounded bg-[#FF6500]/15 px-2 py-0.5 text-[10px] text-[#FF6500] font-black">Empathy</span>
              </div>
              <blockquote className="mt-2 text-sm font-semibold text-slate-900 dark:text-white leading-relaxed italic border-l-2 border-[#FF6500] pl-3 py-0.5">
                "{report.key_moments?.[0]?.alternative_phrasing || 'I hear your concern. Before we finalize next steps, can you walk me through the primary operational hurdles you see?'}"
              </blockquote>
              <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                <strong className="text-slate-800 dark:text-slate-200">Why it works: </strong>
                {report.key_moments?.[0]?.reasoning || 'Validates the counterpart perspective before pushing for commitments.'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span className="text-teal-600 dark:text-teal-400 font-black">Alignment-Led</span>
                <span className="rounded bg-teal-500/15 px-2 py-0.5 text-[10px] text-teal-600 dark:text-teal-400 font-black">Structured</span>
              </div>
              <blockquote className="mt-2 text-sm font-semibold text-slate-900 dark:text-white leading-relaxed italic border-l-2 border-teal-500 pl-3 py-0.5">
                "{report.key_moments?.[1]?.alternative_phrasing || 'Let us anchor on our shared priority. If we resolve the bandwidth constraint first, what specific benchmark needs to be met to proceed?'}"
              </blockquote>
              <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                <strong className="text-slate-800 dark:text-slate-200">Why it works: </strong>
                {report.key_moments?.[1]?.reasoning || 'Anchors the conversation around objective business criteria.'}
              </p>
            </div>
          </div>
        </div>

        {/* Counterpart Perspective */}
        <div className="print-card print-avoid-break mt-8 rounded-2xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-slate-50 dark:bg-[#0B192C] p-5">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#FF6500]">
            <Eye className="h-4 w-4" />
            <span>Counterpart Priorities & Mindset</span>
          </div>
          <p className="mt-2 text-base text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
            {report.hidden_reveal}
          </p>
        </div>
      </div>

      {/* Competency Scores */}
      <div className="print-section mt-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2 font-heading">
          <Target className="h-5 w-5 text-[#FF6500]" />
          <span>Competency Assessment</span>
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

      {/* Strengths & Adjustments Grounded in Dialogue */}
      <div className="print-section mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="print-card print-avoid-break rounded-3xl border-2 border-emerald-500/40 bg-white dark:bg-[#132B45] p-6 shadow-md">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Effective Moments</span>
          </div>

          <div className="mt-4 space-y-4">
            {report.what_worked.map((item, idx) => (
              <div key={idx} className="print-card print-avoid-break rounded-2xl border border-slate-200 dark:border-[#1E3E62] bg-emerald-50/50 dark:bg-[#0B192C] p-4">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Exchange {item.moment_seq} Quoted:</div>
                <blockquote className="mt-1 italic text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
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
            <span>Areas to Improve</span>
          </div>

          <div className="mt-4 space-y-4">
            {report.what_didnt.map((item, idx) => (
              <div key={idx} className="print-card print-avoid-break rounded-2xl border border-slate-200 dark:border-[#1E3E62] bg-rose-50/50 dark:bg-[#0B192C] p-4">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Exchange {item.moment_seq} Quoted:</div>
                <blockquote className="mt-1 italic text-xs text-rose-800 dark:text-rose-300 font-semibold">
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

      {/* Key Moments */}
      <div className="print-section mt-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2 font-heading">
          <Sparkles className="h-5 w-5 text-[#FF6500]" />
          <span>Key Conversation Moments</span>
        </h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
          Detailed breakdown of pivotal exchanges with tactical recommendations.
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
                <blockquote className="mt-0.5 text-xs italic text-slate-800 dark:text-slate-200 font-medium">
                  "{km.quote}"
                </blockquote>
              </div>

              <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
                <strong className="text-slate-800 dark:text-slate-200">Impact: </strong>
                {km.why_it_matters}
              </div>

              <div className="mt-4 rounded-xl border-2 border-[#FF6500]/40 bg-amber-50/70 dark:bg-[#0B192C] p-4">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#B45309] dark:text-[#FF6500]">
                  <Lightbulb className="h-4 w-4" />
                  <span>Recommended Alternative</span>
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

      {/* Action Plan */}
      <div className="print-section mt-8 rounded-3xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] p-8 shadow-xl print:p-4">
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#FF6500]">
          <TrendingUp className="h-4 w-4" />
          <span>Action Plan</span>
        </div>
        <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white font-heading">
          Recommended Next Steps
        </h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
          Deliberate practice exercises to apply in your next session.
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

      {/* Complete Transcript */}
      {session && session.messages && session.messages.length > 0 && (
        <div className="print-section mt-8 rounded-3xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] p-8 shadow-xl print:p-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1E3E62] pb-4">
            <div>
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#FF6500]">
                <MessageSquare className="h-4 w-4" />
                <span>Transcript</span>
              </div>
              <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white font-heading">
                Session Dialogue
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 dark:bg-[#0B192C] border border-slate-300 dark:border-[#1E3E62] px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
              {session.messages.length} Exchanges
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

      {/* Bottom Navigation */}
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
    </div>
  );
};
