import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  CohortProgress,
  TraineeProgress,
} from '../types';
import {
  Award,
  BarChart3,
  Calendar,
  Clock,
  Compass,
  Download,
  Flame,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';

interface ProgressPageProps {
  onSelectScenario: (scenarioId: string) => void;
  onViewSessionEvaluation: (sessionId: string) => void;
  onResumeSession?: (sessionId: string) => void;
}

export const ProgressPage: React.FC<ProgressPageProps> = ({
  onSelectScenario,
  onViewSessionEvaluation,
  onResumeSession,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'me' | 'cohort'>('me');
  const [traineeData, setTraineeData] = useState<TraineeProgress | null>(null);
  const [cohortData, setCohortData] = useState<CohortProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);

  const canViewCohort =
    user?.role === 'group_admin' || user?.role === 'super_admin';

  useEffect(() => {
    loadProgress();
  }, [activeTab]);

  const loadProgress = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'me') {
        const data = await api.getMyProgress();
        setTraineeData(data);
      } else if (activeTab === 'cohort') {
        let cohortIdToFetch = user?.cohort_id;
        if (!cohortIdToFetch && canViewCohort) {
          try {
            const adminCohorts = await api.listAdminCohorts();
            if (adminCohorts && adminCohorts.length > 0) {
              cohortIdToFetch = adminCohorts[0].id;
            }
          } catch (e) {
            console.warn('Could not auto-lookup admin cohorts for progress tab', e);
          }
        }
        if (cohortIdToFetch) {
          const cData = await api.getCohortProgress(cohortIdToFetch);
          setCohortData(cData);
        } else {
          setCohortData(null);
        }
      }
    } catch (err: unknown) {
      console.error('Failed to load progress data', err);
      const msg = err instanceof Error ? err.message : 'Failed to load progress metrics';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    const targetCohortId = cohortData?.cohort_id || user?.cohort_id;
    if (!targetCohortId) return;
    setExportingCsv(true);
    try {
      const blob = await api.exportCohortCsv(targetCohortId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cohort_${targetCohortId}_progress.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('CSV export failed', err);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setExportingCsv(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hrs = (seconds / 3600).toFixed(1);
      return `${hrs} hrs`;
    }
    return `${mins}m ${secs > 0 ? `${secs}s` : ''}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-700 dark:text-emerald-400 border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40';
    if (score >= 65) return 'text-[#FF6500] border-[#FF6500]/40 bg-amber-50 dark:bg-amber-950/40';
    if (score >= 50) return 'text-amber-700 dark:text-amber-400 border-amber-500/40 bg-amber-50 dark:bg-amber-950/40';
    return 'text-rose-700 dark:text-rose-400 border-rose-500/40 bg-rose-50 dark:bg-rose-950/40';
  };

  const getScoreBadgeText = (score: number) => {
    if (score >= 85) return 'Mastery';
    if (score >= 70) return 'Proficient';
    if (score >= 55) return 'Competent';
    return 'Developing';
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100">
      {/* Header & Tabs */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-300 dark:border-[#1E3E62] pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center rounded-lg bg-[#FF6500]/15 border border-[#FF6500]/30 px-2.5 py-0.5 text-xs font-bold text-[#FF6500]">
              PERFORMANCE ANALYTICS
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white font-heading sm:text-4xl">
            Executive Training Progress & Performance Record
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 font-medium">
            Track competency improvement across scenarios, monitor skill gains, and review session history.
          </p>
        </div>

        {/* Tab Switcher */}
        {canViewCohort && (
          <div className="flex rounded-xl bg-slate-100 dark:bg-[#0B192C] p-1 border-2 border-slate-300 dark:border-[#1E3E62] self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('me')}
              className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                activeTab === 'me'
                  ? 'bg-[#FF6500] text-white shadow-md shadow-[#FF6500]/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Target className="h-4 w-4" />
              <span>Personal Performance</span>
            </button>
            <button
              onClick={() => setActiveTab('cohort')}
              className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                activeTab === 'cohort'
                  ? 'bg-[#FF6500] text-white shadow-md shadow-[#FF6500]/25'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Cohort Analytics</span>
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex min-h-[350px] items-center justify-center">
          <div className="flex items-center space-x-3 text-[#FF6500] font-semibold text-sm">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#FF6500] border-t-transparent" />
            <span className="text-slate-700 dark:text-slate-200">Calculating competency analytics...</span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="my-8 rounded-2xl border-2 border-rose-500/40 bg-rose-50 dark:bg-rose-950/40 p-6 text-center">
          <p className="text-rose-700 dark:text-rose-300 font-bold">{error}</p>
          <button
            onClick={loadProgress}
            className="mt-4 inline-flex items-center space-x-2 rounded-xl bg-[#FF6500] hover:bg-[#E05A00] px-4 py-2 text-sm font-bold text-white shadow-md transition"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Trainee Personal View */}
      {!loading && !error && activeTab === 'me' && traineeData && (
        <div className="mt-8 space-y-10">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Completed Sessions */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Sessions Completed
                </span>
                <div className="rounded-xl bg-[#FF6500]/15 p-2 text-[#FF6500] border border-[#FF6500]/30">
                  <Compass className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline space-x-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {traineeData.total_sessions_completed}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">sessions</span>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
                {traineeData.total_sessions_completed > 0
                  ? 'Active scenario engagement'
                  : 'Ready for your first session'}
              </p>
            </div>

            {/* Card 2: Total Flight Time */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Practice Time
                </span>
                <div className="rounded-xl bg-[#FF6500]/15 p-2 text-[#FF6500] border border-[#FF6500]/30">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline space-x-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {formatDuration(traineeData.total_time_seconds)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">Interactive roleplay dialogue</p>
            </div>

            {/* Card 3: Training Streak */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Daily Streak
                </span>
                <div className="rounded-xl bg-amber-500/15 p-2 text-amber-500 border border-amber-500/30">
                  <Flame className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline space-x-2">
                <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
                  {traineeData.current_streak_days}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">days</span>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
                {traineeData.current_streak_days > 0
                  ? 'Consistency building habit'
                  : 'Complete a scenario today!'}
              </p>
            </div>

            {/* Card 4: Overall Average Score */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Average Proficiency
                </span>
                <div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <Award className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline space-x-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {traineeData.overall_average_score > 0
                    ? `${traineeData.overall_average_score}%`
                    : '—'}
                </span>
                {traineeData.overall_average_score > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${getScoreColor(
                      traineeData.overall_average_score
                    )}`}
                  >
                    {getScoreBadgeText(traineeData.overall_average_score)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">Average feedback score</p>
            </div>
          </div>

          {/* Main Grid: Skills Breakdown & Score Progression */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Skill Competence Radar / Breakdown */}
            <div className="rounded-2xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1E3E62] pb-4">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-[#FF6500]" />
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">Assessed Skill Competencies</h2>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold">
                  {traineeData.skill_averages.length} SKILLS TRACKED
                </span>
              </div>

              {traineeData.skill_averages.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    No evaluated training data available yet.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Complete your first conversation to unlock your feedback history.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {traineeData.skill_averages.map((skill) => (
                    <div key={skill.skill_key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {skill.skill_name}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">
                            {skill.session_count} session{skill.session_count > 1 ? 's' : ''}
                          </span>
                          <span
                            className={`font-mono font-bold ${
                              skill.average_score >= 75
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : skill.average_score >= 60
                                ? 'text-[#FF6500]'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {skill.average_score}%
                          </span>
                        </div>
                      </div>
                      {/* Meter bar */}
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-[#0B192C]">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            skill.average_score >= 75
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                              : skill.average_score >= 60
                              ? 'bg-gradient-to-r from-amber-500 to-[#FF6500]'
                              : 'bg-gradient-to-r from-rose-500 to-rose-600'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(8, skill.average_score))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Score Progression Trend Curve */}
            <div className="rounded-2xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1E3E62] pb-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-[#FF6500]" />
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">Score Trajectory Curve</h2>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold">CHRONOLOGICAL</span>
              </div>

              {traineeData.score_trends.length < 2 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Your progress trend appears after two completed conversations.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Keep practicing to plot your performance curve over time!
                  </p>
                </div>
              ) : (
                <div className="mt-6">
                  {/* SVG Line Graph */}
                  <div className="h-48 w-full">
                    <svg viewBox="0 0 500 160" className="h-full w-full overflow-visible">
                      <defs>
                        <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF6500" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#FF6500" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      <line x1="0" y1="20" x2="500" y2="20" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="4" />
                      <line x1="0" y1="70" x2="500" y2="70" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="4" />
                      <line x1="0" y1="120" x2="500" y2="120" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="4" />

                      {/* Area Fill & Line */}
                      {(() => {
                        const pts = traineeData.score_trends.map((pt, idx) => {
                          const x = (idx / (traineeData.score_trends.length - 1)) * 480 + 10;
                          const y = 140 - (pt.score / 100) * 120;
                          return { x, y, pt };
                        });
                        const pathD = pts.reduce(
                          (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`,
                          ''
                        );
                        const areaD = `${pathD} L ${pts[pts.length - 1].x} 140 L ${pts[0].x} 140 Z`;

                        return (
                          <>
                            <path d={areaD} fill="url(#scoreGrad)" />
                            <path
                              d={pathD}
                              fill="none"
                              stroke="#FF6500"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {pts.map((p, i) => (
                              <g key={i}>
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="4"
                                  className="fill-[#FF6500] stroke-white dark:stroke-[#0B192C] stroke-2"
                                />
                                <text
                                  x={p.x}
                                  y={p.y - 8}
                                  textAnchor="middle"
                                  className="fill-slate-700 dark:fill-slate-300"
                                  fontSize="10"
                                  fontWeight="bold"
                                  fontFamily="monospace"
                                >
                                  {p.pt.score}
                                </text>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-2 font-bold">
                    <span>{traineeData.score_trends[0]?.date}</span>
                    <span>
                      {traineeData.score_trends[traineeData.score_trends.length - 1]?.date}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recommended Targeted Drills */}
          {traineeData.recommended_scenarios.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-[#FF6500]" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white font-heading">Recommended Practice Drills</h2>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                Targeted drills to practice your lowest scoring competencies.
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {traineeData.recommended_scenarios.map((rec) => (
                  <div
                    key={rec.scenario_id}
                    className="flex flex-col justify-between rounded-2xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] p-5 transition hover:border-[#FF6500] shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono uppercase font-bold text-[#FF6500]">{rec.track_key}</span>
                        <span className="rounded bg-slate-100 dark:bg-[#0B192C] px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1E3E62]">
                          Diff {rec.difficulty}/5
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">{rec.title}</h3>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 font-medium">{rec.topic}</p>
                      <div className="mt-3 rounded-xl bg-amber-50 dark:bg-[#0B192C] border border-[#FF6500]/30 p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium">
                        {rec.reason}
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectScenario(rec.scenario_id)}
                      className="mt-4 flex items-center justify-center space-x-1.5 rounded-xl bg-[#FF6500] hover:bg-[#E05A00] px-3 py-2 text-xs font-bold text-white shadow-md shadow-[#FF6500]/25 transition"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Start Drill</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flight History Log */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-[#FF6500]" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white font-heading">Recent Practice Sessions</h2>
            </div>

            {traineeData.recent_sessions.length === 0 ? (
              <div className="rounded-2xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] p-8 text-center text-slate-500 dark:text-slate-400 font-medium">
                <p>No recent practice sessions recorded.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-[#1E3E62] text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-[#0B192C] font-mono text-xs uppercase text-slate-600 dark:text-slate-400 font-bold">
                      <tr>
                        <th className="px-5 py-3.5">Scenario</th>
                        <th className="px-5 py-3.5">Mode</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5">Duration</th>
                        <th className="px-5 py-3.5">Score</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-[#1E3E62] text-slate-800 dark:text-slate-200 font-medium">
                      {traineeData.recent_sessions.map((sess) => (
                        <tr key={sess.session_id} className="hover:bg-slate-50 dark:hover:bg-[#1E3E62]/40 transition">
                          <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                            <div>{sess.scenario_title}</div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-mono font-semibold">
                              {sess.track_key}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-mono text-xs uppercase">
                            <span
                              className={`rounded px-2 py-0.5 font-bold ${
                                sess.mode === 'voice'
                                  ? 'bg-[#FF6500]/20 text-[#FF6500] border border-[#FF6500]/40'
                                  : 'bg-slate-100 dark:bg-[#0B192C] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#1E3E62]'
                              }`}
                            >
                              {sess.mode}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                                sess.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-400/50 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'bg-amber-50 text-amber-700 border border-amber-400/50 dark:bg-amber-950/40 dark:text-amber-300'
                              }`}
                            >
                              {sess.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-mono text-xs text-slate-600 dark:text-slate-400 font-semibold">
                            {formatDuration(sess.duration_seconds)}
                          </td>
                          <td className="px-5 py-4 font-mono font-bold">
                            {sess.score !== null && sess.score !== undefined ? (
                              <span
                                className={`rounded px-2 py-0.5 border ${getScoreColor(
                                  sess.score
                                )}`}
                              >
                                {sess.score}%
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            {sess.status === 'completed' ? (
                              <button
                                onClick={() => onViewSessionEvaluation(sess.session_id)}
                                className="inline-flex items-center space-x-1 rounded-xl border border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#0B192C] px-3.5 py-1.5 text-xs font-bold text-[#FF6500] hover:bg-slate-100 dark:hover:bg-[#1E3E62] transition shadow-sm"
                              >
                                <span>Debrief</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  if (onResumeSession) {
                                    onResumeSession(sess.session_id);
                                  } else {
                                    onSelectScenario(sess.scenario_id);
                                  }
                                }}
                                className="inline-flex items-center space-x-1 rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] px-3.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E3E62] transition shadow-sm"
                              >
                                <span>Resume</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cohort Admin View */}
      {!loading && !error && activeTab === 'cohort' && cohortData && (
        <div className="mt-8 space-y-10">
          {/* Cohort Header & Actions */}
          <div className="flex flex-col justify-between gap-4 rounded-2xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] p-6 shadow-sm sm:flex-row sm:items-center">
            <div>
              <span className="font-mono text-xs uppercase font-bold text-[#FF6500]">COHORT ROSTER</span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white font-heading">{cohortData.cohort_name}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono font-semibold">
                ID: {cohortData.cohort_id}
              </p>
            </div>

            <button
              onClick={handleExportCsv}
              disabled={exportingCsv}
              className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-500 transition disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{exportingCsv ? 'Exporting...' : 'Export Progress (CSV)'}</span>
            </button>
          </div>

          {/* Cohort KPI Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] p-5 shadow-sm">
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Total Enrolled</span>
              <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{cohortData.total_members}</div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">Enrolled participants</p>
            </div>

            <div className="rounded-2xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] p-5 shadow-sm">
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Active Participants</span>
              <div className="mt-2 text-3xl font-black text-[#FF6500]">{cohortData.active_members}</div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
                {cohortData.total_members > 0
                  ? `${Math.round((cohortData.active_members / cohortData.total_members) * 100)}% engagement rate`
                  : '0%'}
              </p>
            </div>

            <div className="rounded-2xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] p-5 shadow-sm">
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Total Sessions</span>
              <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                {cohortData.total_sessions_completed}
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">Successfully completed</p>
            </div>

            <div className="rounded-2xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] p-5 shadow-sm">
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Cohort Average</span>
              <div className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {cohortData.cohort_average_score > 0
                  ? `${cohortData.cohort_average_score}%`
                  : '—'}
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">Aggregate rubric score</p>
            </div>
          </div>

          {/* Top 3 Group Weaknesses Card (For Live Instructor Debriefs) */}
          <div className="rounded-2xl border-2 border-[#FF6500]/60 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#FF6500]/30 pb-3">
              <div>
                <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-[#FF6500]">
                  <Target className="h-4 w-4" />
                  <span>Instructor Group Debrief: Top 3 Cohort Weaknesses & Live Agenda</span>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Synthesized across all cohort attempts. Use these 3 core gaps as your primary group talking points during live coaching.
                </p>
              </div>
              <span className="self-start sm:self-auto rounded-full bg-[#FF6500]/15 border border-[#FF6500]/40 px-3 py-1 text-[11px] font-bold text-[#FF6500]">
                Live Group Focus
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {(() => {
                const weakSkills = cohortData.skill_score_distribution || (cohortData as any)?.skill_distribution || [];
                if (weakSkills.length === 0) {
                  return (
                    <div className="rounded-xl border border-dashed border-slate-300 dark:border-[#1E3E62] bg-slate-50/50 dark:bg-[#0B192C]/50 p-6 text-center col-span-3">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Cohort Analytics Initializing
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                        Live coaching focus and group debrief priorities will automatically synthesize here once cohort participants complete scenario simulations.
                      </p>
                    </div>
                  );
                }
                return (
                  <>
                    {weakSkills.slice(0, 3).map((ws: { skill_name?: string; avg_score?: number; score?: number; benchmark?: number; recommendation?: string }, idx: number) => (
                      <div
                        key={ws.skill_name || idx}
                        className="rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] p-4 shadow-sm flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span
                              className={`rounded px-2 py-0.5 font-black uppercase ${
                                idx === 0
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                  : idx === 1
                                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                  : 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
                              }`}
                            >
                              Priority #{idx + 1}
                            </span>
                            <span className="font-mono text-slate-500 text-xs font-bold">
                              {Math.round(ws.avg_score || ws.score || 0)}% Avg
                            </span>
                          </div>
                          <h3 className="mt-2.5 text-sm font-bold text-slate-900 dark:text-white">
                            {ws.skill_name}
                          </h3>
                          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                            Cohort aggregate score: {Math.round(ws.avg_score || ws.score || 0)}% across recorded simulations.
                          </p>
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#1E3E62] text-[11px] font-bold text-[#FF6500]">
                          Target for deliberate practice during upcoming coaching sessions.
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Member Completion Table */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white font-heading">Cohort Roster & Performance</h3>

            <div className="overflow-hidden rounded-2xl border-2 border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-[#1E3E62] text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-[#0B192C] font-mono text-xs uppercase text-slate-600 dark:text-slate-400 font-bold">
                    <tr>
                      <th className="px-5 py-3.5">Name</th>
                      <th className="px-5 py-3.5">Role</th>
                      <th className="px-5 py-3.5">Sessions</th>
                      <th className="px-5 py-3.5">Average Score</th>
                      <th className="px-5 py-3.5">Top Strength</th>
                      <th className="px-5 py-3.5">Development Need</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#1E3E62] text-slate-800 dark:text-slate-200 font-medium">
                    {cohortData.members.map((member) => (
                      <tr key={member.user_id} className="hover:bg-slate-50 dark:hover:bg-[#1E3E62]/40 transition">
                        <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                          {member.display_name}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs uppercase text-slate-600 dark:text-slate-400">
                          {member.role}
                        </td>
                        <td className="px-5 py-4 font-mono font-bold">
                          {member.sessions_completed}
                        </td>
                        <td className="px-5 py-4 font-mono font-bold">
                          {member.average_score !== null && member.average_score !== undefined ? (
                            <span
                              className={`rounded px-2 py-0.5 border ${getScoreColor(
                                member.average_score
                              )}`}
                            >
                              {member.average_score}%
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          {member.top_skill || '—'}
                        </td>
                        <td className="px-5 py-4 text-xs font-bold text-rose-700 dark:text-rose-400">
                          {member.needs_work_skill || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cohort Empty State Fallback */}
      {!loading && !error && activeTab === 'cohort' && !cohortData && (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-slate-300 dark:border-[#2D5B8D] p-12 text-center bg-white dark:bg-[#132B45]/50">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF6500]/15 text-[#FF6500] mb-4 border border-[#FF6500]/30 text-2xl">
            👥
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">No Cohort Progress Data Available</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            No active student cohort was found. Visit the Facilitator Console to manage cohorts or enroll participants to track cohort-wide analytics.
          </p>
        </div>
      )}
    </div>
  );
};
