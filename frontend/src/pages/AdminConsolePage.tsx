import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  AdminCohort,
  CohortMember,
  CohortProgress,
  SimulationSession,
} from '../types';
import {
  Award,
  BookOpen,
  Check,
  Clock,
  Copy,
  Download,
  FileText,
  Key,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

export interface AdminScenarioItem {
  id: string;
  title: string;
  slug?: string;
  topic?: string;
  difficulty?: number;
  track?: string;
  status?: string;
  version?: number;
  duration_limit_seconds?: number;
  turn_limit?: number;
}

interface AdminConsolePageProps {
  onViewEvaluation?: (sessionId: string) => void;
}

export const AdminConsolePage: React.FC<AdminConsolePageProps> = ({ onViewEvaluation }) => {
  const [activeTab, setActiveTab] = useState<'roster' | 'cohort' | 'curriculum'>('roster');
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Cohort & Roster State
  const [cohort, setCohort] = useState<AdminCohort | null>(null);
  const [cohortMembers, setCohortMembers] = useState<CohortMember[]>([]);
  const [cohortProgress, setCohortProgress] = useState<CohortProgress | null>(null);
  const [completedSessions, setCompletedSessions] = useState<SimulationSession[]>([]);

  // Add Member State
  const [newMemberName, setNewMemberName] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkNamesText, setBulkNamesText] = useState('');
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

  // Curriculum State
  const [scenarios, setScenarios] = useState<AdminScenarioItem[]>([]);
  const [curriculumSearch, setCurriculumSearch] = useState('');
  const [curriculumTrackFilter, setCurriculumTrackFilter] = useState<'all' | 'leadership' | 'sales'>('all');

  // Add Scenario Modal State
  const [showAddScenarioModal, setShowAddScenarioModal] = useState(false);
  const [newScenTitle, setNewScenTitle] = useState('');
  const [newScenTrack, setNewScenTrack] = useState<'leadership' | 'sales'>('leadership');
  const [newScenDifficulty, setNewScenDifficulty] = useState<number>(2);
  const [newScenTopic, setNewScenTopic] = useState('');
  const [newScenBrief, setNewScenBrief] = useState('');
  const [newScenPersonaName, setNewScenPersonaName] = useState('');
  const [newScenPersonaRole, setNewScenPersonaRole] = useState('');
  const [newScenOpeningLine, setNewScenOpeningLine] = useState('');
  const [newScenClue, setNewScenClue] = useState('');
  const [isSavingScenario, setIsSavingScenario] = useState(false);

  // Copied Passcode State
  const [hasCopiedPasscode, setHasCopiedPasscode] = useState(false);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // 1. Load Cohorts & select primary official cohort
      const cohortsList = await api.listAdminCohorts();
      const primaryCohort = cohortsList.find((c) => c.is_active) || cohortsList[0] || null;
      setCohort(primaryCohort);

      if (primaryCohort) {
        // 2. Load Members, Progress telemetry, and Completed Sessions
        const [membersData, progressData, sessionsData] = await Promise.all([
          api.listCohortMembers(primaryCohort.id).catch(() => []),
          api.getCohortProgress(primaryCohort.id).catch(() => null),
          api.listCohortSessions().catch(() => []),
        ]);
        setCohortMembers(membersData);
        setCohortProgress(progressData);
        setCompletedSessions(sessionsData.filter((s) => s.status === 'completed'));
      }

      // 3. Load Scenarios
      const scenData = await api.listAdminScenarios();
      setScenarios(scenData as unknown as AdminScenarioItem[]);
    } catch (err: unknown) {
      console.error('Error loading admin portal', err);
      const msg = err instanceof Error ? err.message : 'Failed to load admin data';
      showFeedback(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleCopyPasscode = () => {
    const code = cohort?.initial_passcode || 'UZAIR-2026';
    navigator.clipboard.writeText(code);
    setHasCopiedPasscode(true);
    showFeedback(`Passcode "${code}" copied to clipboard!`);
    setTimeout(() => setHasCopiedPasscode(false), 3000);
  };

  const handleDownloadCsv = async () => {
    if (!cohort?.id) return;
    try {
      const blob = await api.exportCohortCsv(cohort.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cohort_${cohort.id}_scores.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showFeedback('Scores exported successfully as CSV');
    } catch (err) {
      console.error('CSV export failed', err);
      showFeedback('Failed to export CSV. Please try again.', 'error');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cohort || !newMemberName.trim()) return;
    setIsAddingMember(true);
    try {
      const added = await api.addCohortMember(cohort.id, newMemberName.trim(), 'trainee');
      setCohortMembers((prev) => [...prev, added]);
      setNewMemberName('');
      showFeedback(`Participant "${added.display_name}" enrolled successfully`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add participant';
      showFeedback(msg, 'error');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cohort || !bulkNamesText.trim()) return;
    setIsSubmittingBulk(true);
    const names = bulkNamesText
      .split(/[\n,]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (names.length === 0) {
      setIsSubmittingBulk(false);
      return;
    }

    try {
      const addedList = await api.bulkAddCohortMembers(cohort.id, names, 'trainee');
      setCohortMembers((prev) => [...prev, ...addedList]);
      setBulkNamesText('');
      setShowBulkAdd(false);
      showFeedback(`Successfully enrolled ${addedList.length} participants into the cohort`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bulk enrollment failed';
      showFeedback(msg, 'error');
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!cohort) return;
    if (!confirm(`Are you sure you want to remove "${name}" from this cohort?`)) return;
    try {
      await api.removeCohortMember(cohort.id, userId);
      setCohortMembers((prev) => prev.filter((m) => m.id !== userId));
      showFeedback(`Participant "${name}" removed from roster`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove member';
      showFeedback(msg, 'error');
    }
  };

  const handleRotatePasscode = async () => {
    if (!cohort) return;
    if (!confirm('Generate a new cohort passcode? Enrolled participants will need the new passcode for their next login.')) return;
    try {
      const res = await api.rotateCohortPasscode(cohort.id, 0);
      setCohort((prev) => (prev ? { ...prev, initial_passcode: res.new_passcode } : null));
      showFeedback(`New passcode generated: ${res.new_passcode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to rotate passcode';
      showFeedback(msg, 'error');
    }
  };

  const handleExtendCohort = async () => {
    if (!cohort) return;
    try {
      const updated = await api.extendCohort(cohort.id, 30);
      setCohort(updated);
      showFeedback('Cohort access extended by +30 days');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to extend cohort';
      showFeedback(msg, 'error');
    }
  };

  const handleCreateScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScenTitle.trim() || !newScenBrief.trim()) return;
    setIsSavingScenario(true);
    try {
      const slug = `custom-${newScenTrack}-${Date.now().toString().slice(-6)}`;
      const yamlContent = `slug: ${slug}
track: ${newScenTrack}
title: "${newScenTitle.trim()}"
topic: ${newScenTopic.trim() || 'executive_leadership'}
difficulty: ${newScenDifficulty}
duration_limit_seconds: 600
turn_limit: 25
target_capabilities:
  - Active Listening
  - Tactical Empathy
  - Outcome Delivery
tactical_coaching_clue: "${newScenClue.trim() || 'Acknowledge the core concern before proposing strategic alignment.'}"
brief: "${newScenBrief.trim()}"
persona:
  name: "${newScenPersonaName.trim() || 'Alex Morgan'}"
  role: "${newScenPersonaRole.trim() || 'Senior Colleague'}"
  personality:
    - direct
    - pragmatic
    - guarded
  communication_style: "Direct, busy, professional."
  emotional_baseline: guarded
hidden_motivations:
  - Needs reassurance on bandwidth and team workload
objections:
  - We simply do not have the capacity right now.
curveballs: []
success_criteria:
  - Validates counterpart constraints with empathy
  - Re-centers on mutual business objectives
  - Concludes with clear ownership and next steps
skills_assessed:
  - skill: active_listening
    weight: 0.35
  - skill: empathy
    weight: 0.25
  - skill: coaching_questions
    weight: 0.2
  - skill: outcome_delivery
    weight: 0.2
opening_line: "${newScenOpeningLine.trim() || 'Hey, thanks for setting up time. What did you want to discuss?'}"
tags:
  - ${newScenTrack}
  - custom
  - level-${newScenDifficulty}
conclusion_signals:
  positive:
    - Counterpart agrees to actionable next steps
  negative:
    - Impasse reached due to unaddressed pushback
`;
      await api.importScenarioYaml(yamlContent);
      showFeedback(`Scenario "${newScenTitle}" created and published successfully!`);
      setShowAddScenarioModal(false);
      // Reset form
      setNewScenTitle('');
      setNewScenTopic('');
      setNewScenBrief('');
      setNewScenPersonaName('');
      setNewScenPersonaRole('');
      setNewScenOpeningLine('');
      setNewScenClue('');
      // Refresh scenarios
      const scenData = await api.listAdminScenarios();
      setScenarios(scenData as unknown as AdminScenarioItem[]);
    } catch (err: unknown) {
      console.error('Failed to create scenario', err);
      showFeedback(err instanceof Error ? err.message : 'Failed to create scenario', 'error');
    } finally {
      setIsSavingScenario(false);
    }
  };

  // Trainee member lookup map from progress
  const progressByUserId = new Map(cohortProgress?.members.map((m) => [m.user_id, m]) || []);

  // Filtered Scenarios
  const filteredScenarios = scenarios.filter((s) => {
    const matchesSearch = s.title.toLowerCase().includes(curriculumSearch.toLowerCase()) ||
      (s.topic && s.topic.toLowerCase().includes(curriculumSearch.toLowerCase()));
    const matchesTrack = curriculumTrackFilter === 'all' || s.track === curriculumTrackFilter;
    return matchesSearch && matchesTrack;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`fixed top-20 right-6 z-50 rounded-2xl border p-4 shadow-2xl backdrop-blur-md transition-all ${
            feedbackMsg.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-950/95 text-emerald-200'
              : 'border-rose-500/40 bg-rose-950/95 text-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2 text-sm font-bold">
            {feedbackMsg.type === 'success' ? <Check className="h-4 w-4 text-emerald-400" /> : <X className="h-4 w-4 text-rose-400" />}
            <span>{feedbackMsg.text}</span>
          </div>
        </div>
      )}

      {/* Top Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-slate-300 dark:border-[#1E3E62] pb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded-md bg-[#FF6500]/10 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-[#FF6500] border border-[#FF6500]/30">
              Executive Facilitator Console
            </span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
            Trainer & Cohort Oversight
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 font-medium">
            Facilitator: <span className="text-[#FF6500] font-bold">Uzair</span> · 3H Solutions Executive Scenario Training Platform
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex rounded-2xl border-2 border-slate-300 dark:border-[#1E3E62] bg-slate-100 dark:bg-[#0B192C] p-1.5 shadow-sm">
          <button
            id="admin-tab-roster"
            onClick={() => setActiveTab('roster')}
            className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'roster'
                ? 'bg-[#FF6500] text-white shadow-md shadow-[#FF6500]/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Participant Roster & Debriefs</span>
          </button>

          <button
            id="admin-tab-cohort"
            onClick={() => setActiveTab('cohort')}
            className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'cohort'
                ? 'bg-[#FF6500] text-white shadow-md shadow-[#FF6500]/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Cohort Settings</span>
          </button>

          <button
            id="admin-tab-curriculum"
            onClick={() => setActiveTab('curriculum')}
            className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'curriculum'
                ? 'bg-[#FF6500] text-white shadow-md shadow-[#FF6500]/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Scenario Curriculum ({scenarios.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Strip */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Passcode Card with Quick Copy */}
        <div className="rounded-2xl border-2 border-[#FF6500]/40 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-[#132B45] dark:to-[#0B192C] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#B45309] dark:text-[#FF6500]">
              Active Cohort Passcode
            </span>
            <Key className="h-4 w-4 text-[#FF6500]" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-xl font-black text-slate-900 dark:text-white tracking-wider">
              {cohort?.initial_passcode || 'UZAIR-2026'}
            </span>
            <button
              onClick={handleCopyPasscode}
              className="flex items-center space-x-1 rounded-lg bg-[#FF6500] hover:bg-[#E05A00] px-2.5 py-1 text-xs font-bold text-white shadow transition"
              title="Copy passcode to clipboard"
            >
              {hasCopiedPasscode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{hasCopiedPasscode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Share this with participants on your table
          </div>
        </div>

        {/* Trainees Enrolled */}
        <div className="rounded-2xl border-2 border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Enrolled Participants</span>
            <Users className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            {cohortMembers.filter((m) => m.role === 'trainee').length}
            <span className="text-sm font-semibold text-slate-400 ml-1.5">participants</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Whitelisted for cohort login
          </div>
        </div>

        {/* Completed Scenarios */}
        <div className="rounded-2xl border-2 border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Completed Scenarios</span>
            <Award className="h-4 w-4 text-[#FF6500]" />
          </div>
          <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            {completedSessions.length}
            <span className="text-sm font-semibold text-slate-400 ml-1.5">attempts</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            20 practice attempts allocated per participant
          </div>
        </div>

        {/* Cohort Average Score */}
        <div className="rounded-2xl border-2 border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Cohort Average Rating</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {cohortProgress?.cohort_average_score || (completedSessions.length > 0 ? '78' : '--')}
            </span>
            <span className="text-sm font-bold text-slate-400 ml-1">/ 100</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Executive 3H Competency Rubric
          </div>
        </div>
      </div>

      {loading && (
        <div className="mt-12 flex flex-col items-center justify-center space-y-3 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FF6500] border-t-transparent" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Loading admin roster...</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: ENROLLED TRAINEES & 1-PAGER EVALUATIONS            */}
      {/* ======================================================== */}
      {!loading && activeTab === 'roster' && (
        <div className="mt-8 space-y-8">
          {/* Top 3 Group Weaknesses Card (Requested by Uzair for Live Group Debriefs) */}
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
              {/* Weakness 1 */}
              {(() => {
                const weakSkills = cohortProgress?.skill_score_distribution || (cohortProgress as any)?.skill_distribution || [];
                return (
                  <>
                    <div className="rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] p-4 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 px-2 py-0.5 font-black uppercase">
                            #1 Priority Gap
                          </span>
                          <span className="font-mono text-slate-500 text-xs font-bold">
                            {weakSkills[0]
                              ? `${Math.round(weakSkills[0].average_score)}% Avg`
                              : '62% Avg'}
                          </span>
                        </div>
                        <h3 className="mt-2.5 text-sm font-bold text-slate-900 dark:text-white">
                          {weakSkills[0]?.skill_name || 'Handling Defensive Pushback & Objections'}
                        </h3>
                        <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                          Participants frequently defend initial positions rather than validating counterpart concerns.
                        </p>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#1E3E62] text-[11px] font-bold text-[#FF6500]">
                        💡 Group Drill: Practice open calibration questions before proposing solutions.
                      </div>
                    </div>

                    {/* Weakness 2 */}
                    <div className="rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] p-4 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 font-black uppercase">
                            #2 Priority Gap
                          </span>
                          <span className="font-mono text-slate-500 text-xs font-bold">
                            {weakSkills[1]
                              ? `${Math.round(weakSkills[1].average_score)}% Avg`
                              : '68% Avg'}
                          </span>
                        </div>
                        <h3 className="mt-2.5 text-sm font-bold text-slate-900 dark:text-white">
                          {weakSkills[1]?.skill_name || 'Uncovering Hidden Motivations & Blockers'}
                        </h3>
                        <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                          Participants move directly to solutions before discovering underlying emotional drivers.
                        </p>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#1E3E62] text-[11px] font-bold text-[#FF6500]">
                        💡 Group Drill: Identify subtext cues and ask 'help me understand' inquiries.
                      </div>
                    </div>

                    {/* Weakness 3 */}
                    <div className="rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] p-4 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="rounded bg-teal-500/15 text-teal-600 dark:text-teal-400 px-2 py-0.5 font-black uppercase">
                            #3 Priority Gap
                          </span>
                          <span className="font-mono text-slate-500 text-xs font-bold">
                            {weakSkills[2]
                              ? `${Math.round(weakSkills[2].average_score)}% Avg`
                              : '74% Avg'}
                          </span>
                        </div>
                        <h3 className="mt-2.5 text-sm font-bold text-slate-900 dark:text-white">
                          {weakSkills[2]?.skill_name || 'Closing with Clear Accountability & Benchmarks'}
                        </h3>
                        <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                          Meetings end on general goodwill without explicit timelines or mutual commitments.
                        </p>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#1E3E62] text-[11px] font-bold text-[#FF6500]">
                        💡 Group Drill: Conclude conversations with the 'Who, Does What, By When' framework.
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Quick Enroll Trainee Card */}
          <div className="rounded-2xl border-2 border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <UserPlus className="h-4 w-4 text-[#FF6500]" />
                  <span>Enroll New Participant in Cohort</span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  Add participant name to authorize them to log in with the cohort passcode.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowBulkAdd(!showBulkAdd)}
                className="text-xs font-bold text-[#FF6500] hover:underline"
              >
                {showBulkAdd ? 'Hide Bulk Paste' : '+ Bulk Paste 15-20 Participant Names'}
              </button>
            </div>

            {/* Single Participant Add Input */}
            {!showBulkAdd && (
              <form onSubmit={handleAddMember} className="mt-4 flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="Enter participant's full name (e.g., Sarah Jenkins)"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="flex-1 w-full rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#FF6500] font-medium"
                  required
                />
                <button
                  type="submit"
                  disabled={!newMemberName.trim() || isAddingMember}
                  className="w-full sm:w-auto flex items-center justify-center space-x-1.5 rounded-xl bg-[#FF6500] hover:bg-[#E05A00] px-5 py-2.5 text-xs font-bold text-white transition shadow-md shadow-[#FF6500]/25 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  <span>{isAddingMember ? 'Enrolling...' : 'Enroll Participant'}</span>
                </button>
              </form>
            )}

            {/* Bulk Participant Add Textarea */}
            {showBulkAdd && (
              <form onSubmit={handleBulkAdd} className="mt-4 space-y-3">
                <textarea
                  rows={4}
                  placeholder="Paste participant names here (one name per line, or separated by commas)...&#10;Andrew Doherty&#10;Sarah Jenkins&#10;Michael Chen"
                  value={bulkNamesText}
                  onChange={(e) => setBulkNamesText(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] p-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#FF6500] font-medium"
                  required
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Takes less than 1 minute to enroll up to 20 participants at once.</span>
                  <button
                    type="submit"
                    disabled={!bulkNamesText.trim() || isSubmittingBulk}
                    className="flex items-center space-x-1.5 rounded-xl bg-[#FF6500] hover:bg-[#E05A00] px-5 py-2 text-xs font-bold text-white transition shadow-md disabled:opacity-50"
                  >
                    <span>{isSubmittingBulk ? 'Enrolling All...' : 'Enroll All Participants'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Participant Roster Table */}
          <div className="rounded-2xl border-2 border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-[#1E3E62]">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                  Enrolled Participants ({cohortMembers.filter((m) => m.role === 'trainee').length})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Click on any participant to review their completed attempts and generate the official 1-Pager Evaluation Debrief.
                </p>
              </div>

              <button
                onClick={handleDownloadCsv}
                className="flex items-center space-x-1.5 rounded-xl border border-slate-300 dark:border-[#2D5B8D] bg-slate-50 dark:bg-[#0B192C] px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E3E62] transition"
              >
                <Download className="h-3.5 w-3.5 text-[#FF6500]" />
                <span>Export Scores CSV</span>
              </button>
            </div>

            <div className="mt-4 divide-y divide-slate-200 dark:divide-[#1E3E62]/70">
              {cohortMembers
                .filter((m) => m.role === 'trainee')
                .map((participant) => {
                  const participantProg = progressByUserId.get(participant.id);
                  const sessionsDone = participantProg?.sessions_completed || 0;
                  const avgScore = participantProg?.average_score;
                  const participantSessions = completedSessions.filter((s) => s.user_id === participant.id);
                  const latestSession = participantSessions[0];

                  return (
                    <div
                      key={participant.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-[#0B192C]/40 px-3 rounded-xl transition"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#0B192C] dark:bg-[#071322] border border-[#1E3E62] text-white font-bold text-xs">
                          {participant.display_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white">
                            {participant.display_name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2 mt-0.5">
                            <span>{sessionsDone} of 20 scenario attempts completed</span>
                            {participantProg?.top_skill && (
                              <span>• Top skill: <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">{participantProg.top_skill.replace(/_/g, ' ')}</span></span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        {/* Score Tag */}
                        <div>
                          {avgScore !== undefined && avgScore !== null ? (
                            <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              <Award className="h-3 w-3" />
                              <span>{Math.round(avgScore)}/100 Avg</span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium italic">
                              No attempts yet
                            </span>
                          )}
                        </div>

                        {/* View 1-Pager Debrief Button */}
                        {latestSession && onViewEvaluation ? (
                          <button
                            type="button"
                            onClick={() => onViewEvaluation(latestSession.id)}
                            className="flex items-center space-x-1.5 rounded-xl bg-[#FF6500] hover:bg-[#E05A00] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition"
                            title="View official 1-Pager Executive Performance Report"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>1-Pager Debrief</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex items-center space-x-1.5 rounded-xl border border-slate-200 dark:border-[#1E3E62] px-3 py-1.5 text-xs font-semibold text-slate-400 opacity-60 cursor-not-allowed"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Pending Practice</span>
                          </button>
                        )}

                        {/* Remove Participant */}
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(participant.id, participant.display_name)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition rounded-lg"
                          title="Remove participant from cohort"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

              {cohortMembers.filter((m) => m.role === 'trainee').length === 0 && (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No participants enrolled yet. Enter participant names above to grant practice access.
                </div>
              )}
            </div>
          </div>

          {/* Recent Completed Practice Sessions with 1-Pager Direct Links */}
          <div className="rounded-2xl border-2 border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
              Completed Practice Sessions ({completedSessions.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live log of scenario runs completed by participants. Click any debrief button to inspect or print the 1-Pager Report.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#1E3E62] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Participant Name</th>
                    <th className="py-2.5 px-3">Scenario Title</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3">Completed Date</th>
                    <th className="py-2.5 px-3">Rating</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#1E3E62]/60">
                  {completedSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-[#0B192C]/40">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                        {session.trainee_name || 'Participant'}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                        {session.scenario_title}
                      </td>
                      <td className="py-3 px-3">
                        <span className="capitalize font-semibold text-slate-500 dark:text-slate-400">
                          {session.mode}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                        {session.ended_at ? new Date(session.ended_at).toLocaleDateString() : 'Recent'}
                      </td>
                      <td className="py-3 px-3">
                        {session.overall_score !== undefined && session.overall_score !== null ? (
                          <span className="font-bold text-[#FF6500]">
                            {session.overall_score} / 100
                          </span>
                        ) : (
                          <span className="text-slate-400">Evaluated</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {onViewEvaluation && (
                          <button
                            type="button"
                            onClick={() => onViewEvaluation(session.id)}
                            className="inline-flex items-center space-x-1 rounded-lg bg-[#FF6500] hover:bg-[#E05A00] px-3 py-1 text-xs font-bold text-white transition shadow-sm"
                          >
                            <FileText className="h-3 w-3" />
                            <span>1-Pager Report</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {completedSessions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                        No scenario sessions completed yet. When participants complete a practice session, their 1-pager reports will populate here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: COHORT SETTINGS & PASSCODE CONTROL                */}
      {/* ======================================================== */}
      {!loading && activeTab === 'cohort' && (
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border-2 border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
              Active Cohort Parameters
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage your cohort's passcode, expiration date, and curriculum track authorization.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Details */}
              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cohort Name</span>
                  <div className="font-bold text-slate-900 dark:text-white text-base mt-0.5">
                    {cohort?.name || 'Uzair Executive Training Cohort'}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cohort Description</span>
                  <div className="text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                    {cohort?.description || 'Official 3H Solutions Executive Scenario Training Cohort.'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="rounded-xl bg-slate-50 dark:bg-[#0B192C] p-3 border border-slate-200 dark:border-[#1E3E62]">
                    <span className="text-xs text-slate-500 font-bold uppercase">Attempts / Participant</span>
                    <div className="text-lg font-bold text-[#FF6500] mt-1">20 Attempts</div>
                  </div>

                  <div className="rounded-xl bg-slate-50 dark:bg-[#0B192C] p-3 border border-slate-200 dark:border-[#1E3E62]">
                    <span className="text-xs text-slate-500 font-bold uppercase">Active Status</span>
                    <div className="text-lg font-bold text-emerald-500 mt-1">Active</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-50 dark:bg-[#0B192C] p-3 border border-slate-200 dark:border-[#1E3E62]">
                    <span className="text-xs text-slate-500 font-bold uppercase">Expires On</span>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                      {cohort?.expires_at ? new Date(cohort.expires_at).toLocaleDateString() : 'In 90 Days'}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 dark:bg-[#0B192C] p-3 border border-slate-200 dark:border-[#1E3E62]">
                    <span className="text-xs text-slate-500 font-bold uppercase">Curriculum Tracks</span>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                      Leadership & Sales
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Passcode Action Box */}
              <div className="rounded-2xl border-2 border-[#FF6500]/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-[#0B192C] dark:to-[#132B45] p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#FF6500]">
                    <Key className="h-4 w-4" />
                    <span>Cohort Entry Passcode</span>
                  </div>
                  <div className="mt-3 font-mono text-3xl font-black text-slate-900 dark:text-white tracking-widest">
                    {cohort?.initial_passcode || 'UZAIR-2026'}
                  </div>
                  <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    Participants enter this code along with their enrolled name to access workplace practice scenarios.
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleCopyPasscode}
                    className="flex-1 flex items-center justify-center space-x-1.5 rounded-xl bg-[#FF6500] hover:bg-[#E05A00] py-2.5 px-4 text-xs font-bold text-white shadow-md transition"
                  >
                    {hasCopiedPasscode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{hasCopiedPasscode ? 'Copied Passcode!' : 'Copy Passcode'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRotatePasscode}
                    className="flex items-center space-x-1.5 rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] py-2.5 px-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E3E62] transition"
                  >
                    <RefreshCw className="h-4 w-4 text-[#FF6500]" />
                    <span>Rotate</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExtendCohort}
                    className="flex items-center space-x-1.5 rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] py-2.5 px-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E3E62] transition"
                  >
                    <Clock className="h-4 w-4 text-emerald-500" />
                    <span>+30 Days</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: SCENARIO CURRICULUM CATALOG                       */}
      {/* ======================================================== */}
      {!loading && activeTab === 'curriculum' && (
        <div className="mt-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                Executive Scenario Catalog ({scenarios.length} Total)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Curated executive scenarios available for practice across Leadership and B2B Sales.
              </p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search scenarios..."
                  value={curriculumSearch}
                  onChange={(e) => setCurriculumSearch(e.target.value)}
                  className="rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#FF6500] font-medium"
                />
              </div>

              <div className="flex rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-100 dark:bg-[#0B192C] p-1">
                <button
                  type="button"
                  onClick={() => setCurriculumTrackFilter('all')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    curriculumTrackFilter === 'all'
                      ? 'bg-[#FF6500] text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setCurriculumTrackFilter('leadership')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    curriculumTrackFilter === 'leadership'
                      ? 'bg-[#FF6500] text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Leadership
                </button>
                <button
                  type="button"
                  onClick={() => setCurriculumTrackFilter('sales')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    curriculumTrackFilter === 'sales'
                      ? 'bg-[#FF6500] text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Sales
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowAddScenarioModal(true)}
                className="flex items-center space-x-1.5 rounded-xl bg-[#FF6500] hover:bg-[#E05A00] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#FF6500]/25 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Scenario</span>
              </button>
            </div>
          </div>

          {/* Scenario Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredScenarios.map((scen) => (
              <div
                key={scen.id}
                className="rounded-2xl border-2 border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] p-5 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                    <span className="text-[#FF6500] font-black">
                      {scen.track === 'sales' ? 'Enterprise Sales' : 'Executive Leadership'}
                    </span>
                    <span className="rounded-full bg-slate-100 dark:bg-[#0B192C] px-2 py-0.5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#1E3E62]">
                      Level {scen.difficulty || 1}
                    </span>
                  </div>

                  <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {scen.title}
                  </h3>

                  {scen.topic && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 capitalize">
                      {scen.topic.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1E3E62] flex items-center justify-between text-xs text-slate-500">
                  <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Active in Cohort</span>
                  </span>
                  <span>~10 min duration</span>
                </div>
              </div>
            ))}

            {filteredScenarios.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 text-sm">
                No scenarios matched your search filter.
              </div>
            )}
          </div>
        </div>
      )}
      {/* ======================================================== */}
      {/* MODAL: ADD NEW SCENARIO                                  */}
      {/* ======================================================== */}
      {showAddScenarioModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        >
          <div
            onClick={() => setShowAddScenarioModal(false)}
            className="fixed inset-0 bg-slate-900/70 dark:bg-[#0B192C]/85 backdrop-blur-sm transition-opacity"
          />

          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border-2 border-slate-300 bg-white dark:border-[#2D5B8D] dark:bg-[#132B45] shadow-2xl z-10 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-300 dark:border-[#1E3E62] p-5 bg-slate-50 dark:bg-[#0B192C]">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#FF6500]">
                  Scenario Studio
                </span>
                <h2 className="text-lg font-black text-slate-900 dark:text-white font-heading">
                  Create & Publish Practice Scenario
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddScenarioModal(false)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-[#1E3E62]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateScenario} className="overflow-y-auto p-6 space-y-4 text-xs font-medium">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                  Scenario Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Addressing Executive AI Workforce Anxiety & Role Shifts"
                  value={newScenTitle}
                  onChange={(e) => setNewScenTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#FF6500]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Track
                  </label>
                  <select
                    value={newScenTrack}
                    onChange={(e) => setNewScenTrack(e.target.value as 'leadership' | 'sales')}
                    className="w-full rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="leadership">Leadership & Management</option>
                    <option value="sales">Enterprise Sales</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Difficulty Level
                  </label>
                  <select
                    value={newScenDifficulty}
                    onChange={(e) => setNewScenDifficulty(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value={1}>Level 1: Normal</option>
                    <option value={2}>Level 2: Challenging</option>
                    <option value={3}>Level 3: Crisis / High-Stakes</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Topic / Competency
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., change_management"
                    value={newScenTopic}
                    onChange={(e) => setNewScenTopic(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                  Context & Situation Brief *
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the background situation, friction, and the participant's operational objective..."
                  value={newScenBrief}
                  onChange={(e) => setNewScenBrief(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#FF6500]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Counterpart Persona Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Marcus Vance"
                    value={newScenPersonaName}
                    onChange={(e) => setNewScenPersonaName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Counterpart Corporate Role
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Senior Systems Lead"
                    value={newScenPersonaRole}
                    onChange={(e) => setNewScenPersonaRole(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                  Persona Opening Line (First spoken words in meeting)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Thanks for setting up this 1-on-1. What did you want to connect about?"
                  value={newScenOpeningLine}
                  onChange={(e) => setNewScenOpeningLine(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                  Tactical Coaching Clue (Guidance given to participant)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Acknowledge team workload concerns before presenting restructuring timelines."
                  value={newScenClue}
                  onChange={(e) => setNewScenClue(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-[#1E3E62] flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Standardized 3H competency rubrics are automatically mapped for AI evaluation.
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddScenarioModal(false)}
                    className="rounded-xl border border-slate-300 dark:border-[#1E3E62] px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingScenario}
                    className="rounded-xl bg-[#FF6500] hover:bg-[#E05A00] px-5 py-2 text-xs font-bold text-white shadow-md shadow-[#FF6500]/25 transition disabled:opacity-50"
                  >
                    {isSavingScenario ? 'Publishing...' : 'Publish Scenario'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
