import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { FeedbackReport, SimulationSession } from '../types';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  CheckCircle2,
  Eye,
  Lightbulb,
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
}

export const FeedbackReportPage: React.FC<FeedbackReportPageProps> = ({
  sessionId,
  onBackToScenarios,
  onRetryScenario,
}) => {
  const [report, setReport] = useState<FeedbackReport | null>(null);
  const [session, setSession] = useState<SimulationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getSessionDetail(sessionId),
      api.getSessionEvaluation(sessionId),
    ])
      .then(([sessionData, evalData]) => {
        setSession(sessionData);
        setReport(evalData);
      })
      .catch((err) => {
        console.error('Failed to load evaluation', err);
        setError(err.message || 'Unable to load evaluation report.');
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-indigo-400">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-indigo-400 border-t-transparent" />
        <p className="font-mono text-xs tracking-wider uppercase text-slate-300">
          Evaluating session performance against rubric...
        </p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-xl py-16 px-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-white">Evaluation Unavailable</h2>
        <p className="mt-2 text-sm text-slate-400">{error || 'Session report could not be found.'}</p>
        <button
          onClick={onBackToScenarios}
          className="mt-6 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30"
        >
          Return to Library
        </button>
      </div>
    );
  }

  const overall = report.overall_score ?? 0;
  const scoreTier =
    overall >= 85
      ? { label: 'Mastery Demonstrated', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' }
      : overall >= 70
      ? { label: 'Proficient Execution', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30' }
      : overall >= 50
      ? { label: 'Developing Competency', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' }
      : { label: 'Foundational Practice Required', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 print:p-0 print:max-w-none">
      {/* Top Action Bar (hidden on print) */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 print:hidden">
        <button
          id="back-to-scenarios-btn"
          onClick={onBackToScenarios}
          className="group flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-indigo-400 transition"
        >
          <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
          <span>Back to Scenarios</span>
        </button>

        <div className="flex items-center space-x-3">
          {session && onRetryScenario && (
            <button
              onClick={() => onRetryScenario(session.scenario_id)}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Retry Scenario</span>
            </button>
          )}

          <button
            id="print-report-btn"
            onClick={handlePrint}
            className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:opacity-95 transition"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Executive Printable Header (Visible ONLY on print/PDF export) */}
      <div className="hidden print:block mb-6 border-b-2 border-indigo-600 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-black tracking-tight text-slate-900 font-heading">ScenarioLab</div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Workplace Scenario Training • Performance Evaluation Report
            </div>
            <h1 className="mt-2 text-xl font-bold text-slate-900 font-heading">
              {session?.scenario_title || 'Simulation Performance Evaluation'}
            </h1>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-indigo-600">
              {overall}
              <span className="text-sm font-semibold text-slate-500"> / 100</span>
            </div>
            <div className="mt-0.5 inline-block rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-900">
              {scoreTier.label}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Generated: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Header & Score Summary Card */}
      <div className="print-section print-card print-avoid-break mt-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
              <Award className="h-4 w-4" />
              <span>Executive Performance Debrief</span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white font-heading sm:text-4xl">
              {session?.scenario_title || 'Simulation Performance Debrief'}
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
              {report.overall_summary}
            </p>
          </div>

          {/* Radial Score Gauge */}
          <div className="print-avoid-break flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/80 p-6 shadow-inner text-center min-w-[200px]">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
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

        {/* Hidden Motivations Reveal Banner */}
        <div className="print-card print-avoid-break mt-8 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-5">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
            <Eye className="h-4 w-4" />
            <span>Counterpart Psychological Drivers (Hidden Reveal)</span>
          </div>
          <p className="mt-2 text-sm text-indigo-200/90 leading-relaxed">
            {report.hidden_reveal}
          </p>
        </div>
      </div>

      {/* Skill Breakdown Rubric Section */}
      <div className="print-section mt-8 print-avoid-break">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2 font-heading">
          <Target className="h-5 w-5 text-indigo-400" />
          <span>Skill Competency Rubric Scores (Levels 1–5)</span>
        </h2>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.skill_scores.map((skill) => (
            <div
              key={skill.skill}
              className="print-card print-avoid-break rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white capitalize">
                  {skill.skill.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center space-x-1.5">
                  <span className="text-sm font-black text-indigo-400">Level {skill.score}</span>
                  <span className="text-slate-600 text-xs">/ 5</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                  style={{ width: `${(skill.score / 5) * 100}%` }}
                />
              </div>

              <div className="mt-3 text-xs font-semibold text-slate-300">
                {skill.rubric_level_reached}
              </div>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                {skill.justification}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* What Worked & What Didn't (Grounded in verbatim transcript moments) */}
      <div className="print-section mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 print-avoid-break">
        {/* Strengths */}
        <div className="print-card print-avoid-break rounded-3xl border border-emerald-500/20 bg-slate-900/50 p-6">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>What Worked Well</span>
          </div>

          <div className="mt-4 space-y-4">
            {report.what_worked.map((item, idx) => (
              <div key={idx} className="print-card print-avoid-break rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                <div className="text-[11px] font-semibold text-slate-500">Exchange {item.moment_seq} Quoted:</div>
                <blockquote className="mt-1 font-serif italic text-xs text-emerald-300">
                  "{item.quote}"
                </blockquote>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                  {item.why_it_worked}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Growth Areas */}
        <div className="print-card print-avoid-break rounded-3xl border border-rose-500/20 bg-slate-900/50 p-6">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-rose-400">
            <XCircle className="h-4 w-4" />
            <span>Areas for Immediate Adjustment</span>
          </div>

          <div className="mt-4 space-y-4">
            {report.what_didnt.map((item, idx) => (
              <div key={idx} className="print-card print-avoid-break rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                <div className="text-[11px] font-semibold text-slate-500">Exchange {item.moment_seq} Quoted:</div>
                <blockquote className="mt-1 font-serif italic text-xs text-rose-300">
                  "{item.quote}"
                </blockquote>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                  {item.why_it_missed}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Moments with Alternative Phrasing & Reasoning */}
      <div className="print-section mt-8 print-avoid-break">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-indigo-400" />
          <span>Pivotal Conversation Moments & Phrasing Refinements</span>
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Specific inflection points analyzed with concrete alternative phrasing and tactical reasoning.
        </p>

        <div className="mt-4 space-y-4">
          {report.key_moments.map((km, idx) => (
            <div
              key={idx}
              className="print-card print-avoid-break rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-md"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-indigo-400">
                  Moment #{idx + 1} • Exchange {km.moment_seq}
                </span>
                <span className="text-slate-500">{km.what_happened}</span>
              </div>

              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  You Said:
                </span>
                <blockquote className="mt-0.5 text-xs font-serif italic text-slate-200">
                  "{km.quote}"
                </blockquote>
              </div>

              <div className="mt-3 text-xs text-slate-400">
                <strong className="text-slate-300">Why it matters: </strong>
                {km.why_it_matters}
              </div>

              {/* Alternative Phrasing Recommendation */}
              <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                  <Lightbulb className="h-4 w-4" />
                  <span>Recommended Alternative Line</span>
                </div>
                <div className="mt-1.5 text-sm font-semibold text-white">
                  "{km.alternative_phrasing}"
                </div>
                <div className="mt-2 text-xs text-indigo-200/80 leading-relaxed">
                  {km.reasoning}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Final Action Plan (3 to 4 Improvement Steps) */}
      <div className="print-section print-card print-avoid-break mt-8 rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 p-8 shadow-2xl">
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
          <TrendingUp className="h-4 w-4" />
          <span>Your 3 to 4 Concrete Practice Drills</span>
        </div>
        <h2 className="mt-2 text-2xl font-black text-white">
          Targeted Action Plan
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Specific deliberate practice exercises to master before your next live simulation.
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {report.improvement_steps.map((step, idx) => (
            <div
              key={idx}
              className="print-card print-avoid-break flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-400">
                    {idx + 1}
                  </span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300 capitalize">
                    {step.linked_skill.replace(/_/g, ' ')}
                  </span>
                </div>

                <h3 className="mt-3 text-sm font-bold text-white">
                  {step.step}
                </h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  {step.why}
                </p>
              </div>

              <div className="mt-4 border-t border-slate-800/80 pt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
                  Practice Drill:
                </span>
                <p className="mt-1 text-xs text-slate-300 font-medium leading-relaxed">
                  {step.practice_drill}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Print Footer */}
      <div className="hidden print:block mt-8 pt-4 border-t border-slate-300 text-center text-[10px] text-slate-500 font-mono">
        ScenarioLab • Confidential Executive Coaching Report • Powered by ScenarioLab Engine
      </div>
    </div>
  );
};
