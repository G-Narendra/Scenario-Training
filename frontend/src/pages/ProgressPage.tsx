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
}

export const ProgressPage: React.FC<ProgressPageProps> = ({
  onSelectScenario,
  onViewSessionEvaluation,
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
      } else if (activeTab === 'cohort' && user?.cohort_id) {
        const cData = await api.getCohortProgress(user.cohort_id);
        setCohortData(cData);
      }
    } catch (err: any) {
      console.error('Failed to load progress data', err);
      setError(err.message || 'Failed to load progress metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    if (!user?.cohort_id) return;
    setExportingCsv(true);
    try {
      const blob = await api.exportCohortCsv(user.cohort_id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cohort_${user.cohort_id}_progress.csv`;
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
    if (score >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 65) return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
    if (score >= 50) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  const getScoreBadgeText = (score: number) => {
    if (score >= 85) return 'Mastery';
    if (score >= 70) return 'Proficient';
    if (score >= 55) return 'Competent';
    return 'Developing';
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header & Tabs */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center rounded-lg bg-indigo-500/15 border border-indigo-500/25 px-2.5 py-0.5 text-xs font-bold text-indigo-300">
              PERFORMANCE ANALYTICS
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white font-heading sm:text-4xl">
            Executive Training Progress — Skill Performance Record
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Track competency improvement across scenarios, monitor skill gains, and review session history.
          </p>
        </div>

        {/* Tab Switcher */}
        {canViewCohort && (
          <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('me')}
              className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                activeTab === 'me'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Target className="h-4 w-4" />
              <span>Personal Performance</span>
            </button>
            <button
              onClick={() => setActiveTab('cohort')}
              className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                activeTab === 'cohort'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-white'
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
          <div className="flex items-center space-x-3 text-indigo-400 font-semibold text-sm">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
            <span>Calculating competency analytics...</span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="my-8 rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
          <p className="text-rose-400 font-medium">{error}</p>
          <button
            onClick={loadProgress}
            className="mt-4 inline-flex items-center space-x-2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
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
            <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Simulations Completed
                </span>
                <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-400 border border-cyan-500/20">
                  <Compass className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline space-x-2">
                <span className="text-3xl font-extrabold text-white">
                  {traineeData.total_sessions_completed}
                </span>
                <span className="text-xs text-slate-400">sessions</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {traineeData.total_sessions_completed > 0
                  ? 'Active scenario engagement'
                  : 'Ready for your first session'}
              </p>
            </div>

            {/* Card 2: Total Flight Time */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Simulation Time
                </span>
                <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400 border border-indigo-500/20">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline space-x-2">
                <span className="text-3xl font-extrabold text-white">
                  {formatDuration(traineeData.total_time_seconds)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">Interactive roleplay dialogue</p>
            </div>

            {/* Card 3: Training Streak */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Daily Streak
                </span>
                <div className="rounded-xl bg-amber-500/10 p-2 text-amber-400 border border-amber-500/20">
                  <Flame className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline space-x-2">
                <span className="text-3xl font-extrabold text-amber-300">
                  {traineeData.current_streak_days}
                </span>
                <span className="text-xs text-slate-400">days</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {traineeData.current_streak_days > 0
                  ? 'Consistency building habit'
                  : 'Complete a scenario today!'}
              </p>
            </div>

            {/* Card 4: Overall Average Score */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Average Proficiency
                </span>
                <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20">
                  <Award className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline space-x-2">
                <span className="text-3xl font-extrabold text-white">
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
                  <p className="mt-1 text-xs text-slate-400">Average feedback score</p>
            </div>
          </div>

          {/* Main Grid: Skills Breakdown & Score Progression */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Skill Competence Radar / Breakdown */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-cyan-400" />
                  <h2 className="text-lg font-bold text-white">Assessed Skill Competencies</h2>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {traineeData.skill_averages.length} SKILLS TRACKED
                </span>
              </div>

              {traineeData.skill_averages.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                  <p className="text-sm text-slate-400">
                    No evaluated training data available yet.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Complete your first conversation to unlock your feedback history.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {traineeData.skill_averages.map((skill) => (
                    <div key={skill.skill_key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-200">
                          {skill.skill_name}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-400">
                            {skill.session_count} session{skill.session_count > 1 ? 's' : ''}
                          </span>
                          <span
                            className={`font-mono font-bold ${
                              skill.average_score >= 75
                                ? 'text-emerald-400'
                                : skill.average_score >= 60
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {skill.average_score}%
                          </span>
                        </div>
                      </div>
                      {/* Meter bar */}
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            skill.average_score >= 75
                              ? 'bg-gradient-to-r from-teal-500 to-emerald-400'
                              : skill.average_score >= 60
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                              : 'bg-gradient-to-r from-rose-500 to-red-400'
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
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-indigo-400" />
                  <h2 className="text-lg font-bold text-white">Score Trajectory Curve</h2>
                </div>
                <span className="text-xs text-slate-400 font-mono">CHRONOLOGICAL</span>
              </div>

              {traineeData.score_trends.length < 2 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                  <p className="text-sm text-slate-400">
                    Your progress trend appears after two completed conversations.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
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
                          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      <line x1="0" y1="20" x2="500" y2="20" stroke="#1e293b" strokeDasharray="4" />
                      <line x1="0" y1="70" x2="500" y2="70" stroke="#1e293b" strokeDasharray="4" />
                      <line x1="0" y1="120" x2="500" y2="120" stroke="#1e293b" strokeDasharray="4" />

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
                              stroke="#38bdf8"
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
                                  className="fill-cyan-400 stroke-slate-900 stroke-2"
                                />
                                <text
                                  x={p.x}
                                  y={p.y - 8}
                                  textAnchor="middle"
                                  fill="#cbd5e1"
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
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-2">
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
                <Sparkles className="h-5 w-5 text-amber-400" />
                <h2 className="text-xl font-bold text-white">Recommended Practice Drills</h2>
              </div>
              <p className="text-sm text-slate-400">
                Targeted drills to practice your lowest scoring competencies.
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {traineeData.recommended_scenarios.map((rec) => (
                  <div
                    key={rec.scenario_id}
                    className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-cyan-500/40 hover:bg-slate-900/90"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono uppercase text-cyan-400">{rec.track_key}</span>
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">
                          Diff {rec.difficulty}/5
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-bold text-white">{rec.title}</h3>
                      <p className="mt-1 text-xs text-slate-400 line-clamp-2">{rec.topic}</p>
                      <div className="mt-3 rounded-lg bg-cyan-950/40 border border-cyan-800/30 p-2.5 text-xs text-cyan-300">
                        {rec.reason}
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectScenario(rec.scenario_id)}
                      className="mt-4 flex items-center justify-center space-x-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-indigo-500 transition"
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
              <Calendar className="h-5 w-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-white">Recent Simulation Log</h2>
            </div>

            {traineeData.recent_sessions.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
                <p>No recent simulation sessions recorded.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                    <thead className="bg-slate-950/60 font-mono text-xs uppercase text-slate-400">
                      <tr>
                        <th className="px-5 py-3.5">Scenario</th>
                        <th className="px-5 py-3.5">Mode</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5">Duration</th>
                        <th className="px-5 py-3.5">Score</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {traineeData.recent_sessions.map((sess) => (
                        <tr key={sess.session_id} className="hover:bg-slate-800/30 transition">
                          <td className="px-5 py-4 font-medium text-white">
                            <div>{sess.scenario_title}</div>
                            <span className="text-[11px] text-slate-500 uppercase font-mono">
                              {sess.track_key}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-mono text-xs uppercase">
                            <span
                              className={`rounded px-2 py-0.5 ${
                                sess.mode === 'voice'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {sess.mode}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                                sess.status === 'completed'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-amber-500/10 text-amber-400'
                              }`}
                            >
                              {sess.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-mono text-xs text-slate-400">
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
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            {sess.status === 'completed' ? (
                              <button
                                onClick={() => onViewSessionEvaluation(sess.session_id)}
                                className="inline-flex items-center space-x-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition"
                              >
                                <span>Debrief</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => onSelectScenario(sess.scenario_id)}
                                className="inline-flex items-center space-x-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
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
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:flex-row sm:items-center">
            <div>
              <span className="font-mono text-xs uppercase text-cyan-400">COHORT ROSTER</span>
              <h2 className="text-2xl font-bold text-white">{cohortData.cohort_name}</h2>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                ID: {cohortData.cohort_id}
              </p>
            </div>

            <button
              onClick={handleExportCsv}
              disabled={exportingCsv}
              className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:from-teal-400 hover:to-emerald-500 transition disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{exportingCsv ? 'Exporting...' : 'Export Progress (CSV)'}</span>
            </button>
          </div>

          {/* Cohort KPI Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <span className="text-xs font-semibold uppercase text-slate-400">Total Enrolled</span>
              <div className="mt-2 text-3xl font-extrabold text-white">{cohortData.total_members}</div>
              <p className="mt-1 text-xs text-slate-400">Trainees and members</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <span className="text-xs font-semibold uppercase text-slate-400">Active Participants</span>
              <div className="mt-2 text-3xl font-extrabold text-cyan-400">{cohortData.active_members}</div>
              <p className="mt-1 text-xs text-slate-400">
                {cohortData.total_members > 0
                  ? `${Math.round((cohortData.active_members / cohortData.total_members) * 100)}% engagement rate`
                  : '0%'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <span className="text-xs font-semibold uppercase text-slate-400">Total Simulations</span>
              <div className="mt-2 text-3xl font-extrabold text-indigo-400">
                {cohortData.total_sessions_completed}
              </div>
              <p className="mt-1 text-xs text-slate-400">Successfully completed</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <span className="text-xs font-semibold uppercase text-slate-400">Cohort Average</span>
              <div className="mt-2 text-3xl font-extrabold text-emerald-400">
                {cohortData.cohort_average_score > 0
                  ? `${cohortData.cohort_average_score}%`
                  : '—'}
              </div>
              <p className="mt-1 text-xs text-slate-400">Aggregate rubric score</p>
            </div>
          </div>

          {/* Member Completion Table */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">Trainee Roster & Performance</h3>

            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                  <thead className="bg-slate-950/60 font-mono text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5">Name</th>
                      <th className="px-5 py-3.5">Role</th>
                      <th className="px-5 py-3.5">Simulations</th>
                      <th className="px-5 py-3.5">Average Score</th>
                      <th className="px-5 py-3.5">Top Strength</th>
                      <th className="px-5 py-3.5">Development Need</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {cohortData.members.map((member) => (
                      <tr key={member.user_id} className="hover:bg-slate-800/30 transition">
                        <td className="px-5 py-4 font-medium text-white">
                          {member.display_name}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs uppercase text-slate-400">
                          {member.role}
                        </td>
                        <td className="px-5 py-4 font-mono font-medium">
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
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-emerald-400">
                          {member.top_skill || '—'}
                        </td>
                        <td className="px-5 py-4 text-xs text-rose-400">
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
    </div>
  );
};
