import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  AdminCohort,
  CohortMember,
  CohortProgress,
  FeedbackReport,
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
  Printer,
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

export const AdminConsolePage: React.FC<AdminConsolePageProps> = ({ onViewEvaluation: _onViewEvaluation }) => {
  const [activeTab, setActiveTab] = useState<'roster' | 'cohort' | 'curriculum'>('roster');
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Cohort & Roster State
  const [allCohorts, setAllCohorts] = useState<AdminCohort[]>([]);
  const [cohort, setCohort] = useState<AdminCohort | null>(null);
  const [cohortMembers, setCohortMembers] = useState<CohortMember[]>([]);
  const [cohortProgress, setCohortProgress] = useState<CohortProgress | null>(null);
  const [completedSessions, setCompletedSessions] = useState<SimulationSession[]>([]);

  // 1-Pager Executive Evaluation Report Modal State (Scoped within Admin Console)
  const [reportSessionId, setReportSessionId] = useState<string | null>(null);
  const [reportData, setReportData] = useState<FeedbackReport | null>(null);
  const [reportSession, setReportSession] = useState<SimulationSession | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false);


  // Add Member State
  const [newMemberName, setNewMemberName] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkNamesText, setBulkNamesText] = useState('');
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

  // Create Cohort Modal State
  const [showCreateCohortModal, setShowCreateCohortModal] = useState(false);
  const [newCohortName, setNewCohortName] = useState('');
  const [newCohortDesc, setNewCohortDesc] = useState('');
  const [newCohortDuration, setNewCohortDuration] = useState(90);
  const [newCohortPasscode, setNewCohortPasscode] = useState('');
  const [isCreatingCohort, setIsCreatingCohort] = useState(false);

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

  const loadAdminData = async (targetCohortId?: string) => {
    setLoading(true);
    try {
      // 1. Parallel Load: Cohorts List and Scenarios
      const [cohortsList, scenData] = await Promise.all([
        api.listAdminCohorts(),
        api.listAdminScenarios(),
      ]);
      setAllCohorts(cohortsList);
      setScenarios(scenData as unknown as AdminScenarioItem[]);

      const selectedCohort = targetCohortId
        ? cohortsList.find((c) => c.id === targetCohortId) || cohortsList[0] || null
        : cohortsList.find((c) => c.is_active) || cohortsList[0] || null;

      setCohort(selectedCohort);

      if (selectedCohort) {
        // 2. Parallel Load: Members, Progress Telemetry, and Completed Sessions (Strictly scoped to selected cohort)
        const [membersData, progressData, sessionsData] = await Promise.all([
          api.listCohortMembers(selectedCohort.id).catch(() => []),
          api.getCohortProgress(selectedCohort.id).catch(() => null),
          api.listCohortSessions(selectedCohort.id).catch(() => []),
        ]);
        setCohortMembers(membersData);
        setCohortProgress(progressData);
        setCompletedSessions(sessionsData.filter((s) => s.status === 'completed'));
      }
    } catch (err: unknown) {
      console.error('Error loading admin portal', err);
      const msg = err instanceof Error ? err.message : 'Failed to load admin data';
      showFeedback(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOnePagerReport = async (sessionId: string) => {
    setReportSessionId(sessionId);
    setIsLoadingReport(true);
    try {
      const [evalReport, sessionDetail] = await Promise.all([
        api.getSessionEvaluation(sessionId),
        api.getSessionDetail(sessionId).catch(() => null),
      ]);
      setReportData(evalReport);
      setReportSession(sessionDetail);
    } catch (err: unknown) {
      console.error('Failed to load 1-pager report', err);
      showFeedback('Failed to load performance report for this session', 'error');
      setReportSessionId(null);
    } finally {
      setIsLoadingReport(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleCopyPasscode = () => {
    const code = cohort?.initial_passcode || (cohort?.name?.toLowerCase().includes('uzair') ? 'UZAIR-2026' : '');
    if (!code) {
      showFeedback('No active passcode found for this cohort', 'error');
      return;
    }
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

  const handleResetAttempts = async (userId: string, name: string) => {
    if (!cohort) return;
    if (!confirm(`Reset scenario practice attempts for "${name}"? This will grant a fresh 10 attempts.`)) return;
    try {
      await api.resetCohortMemberAttempts(cohort.id, userId);
      showFeedback(`Practice attempts for "${name}" reset to 10 chances.`);
      await loadAdminData(cohort.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset attempts';
      showFeedback(msg, 'error');
    }
  };

  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohortName.trim()) return;
    setIsCreatingCohort(true);
    try {
      const created = await api.createCohort({
        name: newCohortName.trim(),
        description: newCohortDesc.trim() || undefined,
        duration_days: newCohortDuration || 90,
        custom_passcode: newCohortPasscode.trim() || undefined,
      });
      showFeedback(`Cohort "${created.name}" created with passcode: ${created.initial_passcode}`);
      setShowCreateCohortModal(false);
      setNewCohortName('');
      setNewCohortDesc('');
      setNewCohortPasscode('');
      await loadAdminData(created.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create cohort';
      showFeedback(msg, 'error');
    } finally {
      setIsCreatingCohort(false);
    }
  };

  const handleDeleteCohort = async () => {
    if (!cohort) return;
    const confirmName = prompt(`To permanently delete this cohort, type "${cohort.name}":`);
    if (confirmName !== cohort.name) {
      if (confirmName !== null) showFeedback('Cohort name did not match. Deletion cancelled.', 'error');
      return;
    }
    try {
      await api.deleteCohort(cohort.id);
      showFeedback(`Cohort "${cohort.name}" deleted successfully.`);
      await loadAdminData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete cohort';
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
    const sTrack = (s.track || (s.slug?.startsWith('sales') ? 'sales' : 'leadership')).toLowerCase();
    const matchesTrack = curriculumTrackFilter === 'all' || sTrack === curriculumTrackFilter;
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-300 dark:border-[#1E3E62] pb-6">
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

        {/* Cohort Selector & Quick Actions */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white dark:bg-[#132B45] border-2 border-slate-300 dark:border-[#1E3E62] rounded-xl px-3.5 py-2 shadow-sm">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Cohort:</span>
            <select
              id="admin-cohort-selector"
              value={cohort?.id || ''}
              onChange={(e) => {
                const selectedId = e.target.value;
                if (selectedId === '__new__') {
                  setShowCreateCohortModal(true);
                } else if (selectedId) {
                  loadAdminData(selectedId);
                }
              }}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer pr-2"
            >
              {allCohorts.map((c) => (
                <option key={c.id} value={c.id} className="dark:bg-[#0B192C]">
                  {c.name} ({c.initial_passcode || 'Passcode'})
                </option>
              ))}
              <option value="__new__" className="text-[#FF6500] font-bold">
                + Create New Cohort...
              </option>
            </select>
          </div>

          <button
            id="admin-quick-enroll-btn"
            onClick={() => {
              setActiveTab('roster');
              setTimeout(() => {
                const el = document.getElementById('enroll-student-input');
                if (el) el.focus();
              }, 50);
            }}
            className="flex items-center space-x-1.5 rounded-xl bg-[#FF6500] hover:bg-[#E05A00] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-[#FF6500]/25 transition flex-shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Enroll Student</span>
          </button>
        </div>
      </div>

      {/* Dedicated Clean Sub-Navigation Tab Bar */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-[#1E3E62] pb-4">
        <div className="flex rounded-xl border-2 border-slate-300 dark:border-[#1E3E62] bg-slate-100 dark:bg-[#0B192C] p-1 shadow-sm">
          <button
            id="admin-tab-roster"
            onClick={() => setActiveTab('roster')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'roster'
                ? 'bg-[#FF6500] text-white shadow-md shadow-[#FF6500]/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Participant Roster</span>
          </button>

          <button
            id="admin-tab-cohort"
            onClick={() => setActiveTab('cohort')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
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
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'curriculum'
                ? 'bg-[#FF6500] text-white shadow-md shadow-[#FF6500]/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Scenarios</span>
          </button>
        </div>

        {cohort && (
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Active Cohort:</span>
            <span className="font-bold text-slate-900 dark:text-slate-200">{cohort.name}</span>
          </div>
        )}
      </div>

      {/* KPI Stat Cards Strip */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Passcode Card with Quick Copy */}
        <div className="rounded-2xl border-2 border-[#FF6500]/40 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-[#132B45] dark:to-[#0B192C] p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#B45309] dark:text-[#FF6500]">
                Active Cohort Passcode
              </span>
              <Key className="h-4 w-4 text-[#FF6500]" />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-mono text-xl font-black text-slate-900 dark:text-white tracking-wider">
                {cohort?.initial_passcode || (cohort?.name?.toLowerCase().includes('uzair') ? 'UZAIR-2026' : '—')}
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
          </div>
          <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            Share this with participants on your table
          </div>
        </div>

        {/* Trainees Enrolled */}
        <div className="rounded-2xl border-2 border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Enrolled Participants</span>
              <Users className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
              {cohortMembers.filter((m) => m.role === 'trainee').length}
              <span className="text-sm font-semibold text-slate-400 ml-1.5">participants</span>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            Whitelisted for cohort login
          </div>
        </div>

        {/* Completed Scenarios */}
        <div className="rounded-2xl border-2 border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Completed Scenarios</span>
              <Award className="h-4 w-4 text-[#FF6500]" />
            </div>
            <div className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
              {completedSessions.length}
              <span className="text-sm font-semibold text-slate-400 ml-1.5">attempts</span>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
            {cohortMembers.filter((m) => m.role === 'trainee').length > 0
              ? `${completedSessions.length} completed of ${cohortMembers.filter((m) => m.role === 'trainee').length * 10} total attempts capacity`
              : 'Completed in this cohort'}
          </div>
        </div>

        {/* Cohort Average Score */}
        <div className="rounded-2xl border-2 border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Cohort Average Rating</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-3 flex items-baseline">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {cohortProgress?.cohort_average_score || (completedSessions.length > 0 ? '78' : '--')}
              </span>
              <span className="text-sm font-bold text-slate-400 ml-1">/ 100</span>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
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
          {/* Quick Enroll Trainee Card */}
          <div className="rounded-2xl border-2 border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <UserPlus className="h-4 w-4 text-[#FF6500]" />
                  <span>Enroll New Participant into {cohort?.name || 'Cohort'}</span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  Authorized participants can log in using cohort passcode <strong className="text-[#FF6500] font-mono">{cohort?.initial_passcode || (cohort?.name?.toLowerCase().includes('uzair') ? 'UZAIR-2026' : '—')}</strong>.
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
                  id="enroll-student-input"
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

          {/* Top 3 Group Weaknesses Card (Requested by Uzair for Live Group Debriefs) */}
          <div className="rounded-2xl border-2 border-[#FF6500]/60 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#FF6500]/30 pb-3">
              <div>
                <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-[#FF6500]">
                  <Target className="h-4 w-4" />
                  <span>Instructor Group Debrief: Cohort Weaknesses & Live Agenda</span>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Synthesized across all cohort attempts. Use these core gaps as your primary group talking points during live coaching.
                </p>
              </div>
              <span className="self-start sm:self-auto rounded-full bg-[#FF6500]/15 border border-[#FF6500]/40 px-3 py-1 text-[11px] font-bold text-[#FF6500]">
                Live Group Focus
              </span>
            </div>

            {(() => {
              const weakSkills = cohortProgress?.skill_score_distribution || (cohortProgress as any)?.skill_distribution || [];
              if (weakSkills.length === 0) {
                return (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-300 dark:border-[#1E3E62] bg-slate-50/50 dark:bg-[#0B192C]/50 p-6 text-center">
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
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                          Cohort score average: {Math.round(ws.avg_score || ws.score || 0)}% across recorded attempts.
                        </p>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#1E3E62] text-[11px] font-bold text-[#FF6500]">
                        💡 Focus Area: Target for deliberate practice during live facilitation.
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
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
                            <span>{sessionsDone} of 10 scenario attempts completed</span>
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
                        {latestSession ? (
                          <button
                            type="button"
                            onClick={() => handleOpenOnePagerReport(latestSession.id)}
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

                        {/* Reset Participant Attempts */}
                        <button
                          type="button"
                          onClick={() => handleResetAttempts(participant.id, participant.display_name)}
                          className="p-1.5 text-slate-400 hover:text-[#FF6500] transition rounded-lg"
                          title="Reset practice chances to 10 for this participant"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>

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
                        <button
                          type="button"
                          onClick={() => handleOpenOnePagerReport(session.id)}
                          className="inline-flex items-center space-x-1 rounded-lg bg-[#FF6500] hover:bg-[#E05A00] px-3 py-1 text-xs font-bold text-white transition shadow-sm"
                          title="View official 1-Pager Executive Performance Report"
                        >
                          <FileText className="h-3 w-3" />
                          <span>1-Pager Report</span>
                        </button>
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-[#1E3E62] pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                  Active Cohort Parameters
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage your cohort's passcode, expiration date, and curriculum track authorization.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {allCohorts.length > 1 && (
                  <select
                    value={cohort?.id || ''}
                    onChange={(e) => loadAdminData(e.target.value)}
                    className="rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {allCohorts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.initial_passcode})
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => setShowCreateCohortModal(true)}
                  className="flex items-center space-x-1.5 rounded-xl bg-[#FF6500] hover:bg-[#E05A00] px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Cohort</span>
                </button>
              </div>
            </div>

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
                    <div className="text-lg font-bold text-[#FF6500] mt-1">10 Attempts</div>
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
                    {cohort?.initial_passcode || (cohort?.name?.toLowerCase().includes('uzair') ? 'UZAIR-2026' : '—')}
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

            {/* Danger Zone: Delete Cohort */}
            <div className="mt-8 pt-6 border-t border-rose-500/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-rose-500">
                    Danger Zone · Permanent Cohort Deletion
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Deletes this cohort, enrolled participants, and attempt history. Narendra and Uzair super administrator logins are permanently protected.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteCohort}
                  className="flex items-center space-x-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-md transition flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Cohort</span>
                </button>
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
      {/* ======================================================== */}
      {/* MODAL: CREATE NEW COHORT                                 */}
      {/* ======================================================== */}
      {showCreateCohortModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        >
          <div
            onClick={() => setShowCreateCohortModal(false)}
            className="fixed inset-0 bg-slate-900/70 dark:bg-[#0B192C]/85 backdrop-blur-sm transition-opacity"
          />

          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border-2 border-slate-300 bg-white dark:border-[#2D5B8D] dark:bg-[#132B45] shadow-2xl z-10 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-300 dark:border-[#1E3E62] p-5 bg-slate-50 dark:bg-[#0B192C]">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#FF6500]">
                  Cohort Management
                </span>
                <h2 className="text-lg font-black text-slate-900 dark:text-white font-heading">
                  Create New Training Cohort
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateCohortModal(false)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-[#1E3E62]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCohort} className="p-6 space-y-4 text-xs font-medium">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                  Cohort Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Executive Leadership Q4 Cohort"
                  value={newCohortName}
                  onChange={(e) => setNewCohortName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#FF6500]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                  Custom Entry Passcode (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., UZAIR-OCT26 (Leave blank for auto-generated)"
                  value={newCohortPasscode}
                  onChange={(e) => setNewCohortPasscode(e.target.value.toUpperCase())}
                  className="w-full font-mono rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#FF6500]"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Participants will use this passcode together with their enrolled name to log in.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min={7}
                    max={365}
                    value={newCohortDuration}
                    onChange={(e) => setNewCohortDuration(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Chances / Scenario
                  </label>
                  <div className="rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-100 dark:bg-[#0B192C] px-3 py-2 text-xs font-bold text-[#FF6500]">
                    10 Attempts
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., High-stakes simulation practice for senior leadership teams."
                  value={newCohortDesc}
                  onChange={(e) => setNewCohortDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#FF6500]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-[#1E3E62] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateCohortModal(false)}
                  className="rounded-xl border border-slate-300 dark:border-[#1E3E62] px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCohort || !newCohortName.trim()}
                  className="rounded-xl bg-[#FF6500] hover:bg-[#E05A00] px-5 py-2 text-xs font-bold text-white shadow-md shadow-[#FF6500]/25 transition disabled:opacity-50"
                >
                  {isCreatingCohort ? 'Creating...' : 'Create Cohort'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1-PAGER EXECUTIVE EVALUATION REPORT CARD MODAL           */}
      {/* (Self-contained in Admin Console for Facilitator Uzair)  */}
      {/* ======================================================== */}
      {reportSessionId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
        >
          <div
            className="fixed inset-0"
            onClick={() => {
              setReportSessionId(null);
              setReportData(null);
              setReportSession(null);
            }}
          />

          <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border-2 border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] shadow-2xl z-10 overflow-hidden text-slate-900 dark:text-white">
            {/* Modal Top Action Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1E3E62] px-6 py-4 bg-slate-50 dark:bg-[#132B45] flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6500]/15 text-[#FF6500] border border-[#FF6500]/30 font-bold text-sm">
                  3H
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#FF6500] block">
                    Executive Facilitator Report Card
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading">
                    1-Pager Executive Performance Evaluation
                  </h3>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E3E62] transition shadow-sm"
                  title="Print or Save as PDF"
                >
                  <Printer className="h-4 w-4 text-[#FF6500]" />
                  <span>Print Report</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReportSessionId(null);
                    setReportData(null);
                    setReportSession(null);
                  }}
                  className="rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
                  title="Close Report Card"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto p-6 space-y-6 text-sm">
              {isLoadingReport ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#FF6500] border-t-transparent" />
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    Generating Official 1-Pager Executive Performance Report...
                  </p>
                </div>
              ) : reportData ? (
                <div className="space-y-6 print:p-0">
                  {/* Trainee & Scenario Identity Dossier */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-slate-200 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#132B45] text-xs">
                    <div>
                      <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">Participant</span>
                      <p className="font-black text-slate-900 dark:text-white text-sm mt-0.5">
                        {reportSession?.trainee_name || 'Cohort Participant'}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">Practice Scenario</span>
                      <p className="font-bold text-slate-900 dark:text-white text-xs mt-0.5 line-clamp-1">
                        {reportSession?.scenario_title || 'Simulation Dialogue'}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">Simulation Mode</span>
                      <p className="font-bold text-[#FF6500] text-xs mt-0.5 capitalize">
                        {reportSession?.mode === 'voice' ? '🎙️ Live Voice Dialogue' : '💬 Interactive Text Dialogue'}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block">Concluded Date</span>
                      <p className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">
                        {reportSession?.ended_at ? new Date(reportSession.ended_at).toLocaleDateString() : 'Recent Session'}
                      </p>
                    </div>
                  </div>

                  {/* Executive Score & Level Hero */}
                  <div className="rounded-2xl border-2 border-[#FF6500]/50 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#FF6500]/25 pb-4">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#FF6500]">
                          3H Executive Rubric Rating
                        </span>
                        <div className="flex items-baseline space-x-3 mt-1">
                          <span className="text-4xl font-black text-slate-900 dark:text-white font-mono">
                            {reportData.overall_score}
                          </span>
                          <span className="text-sm font-bold text-slate-400">/ 100</span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                              reportData.overall_score >= 85
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : reportData.overall_score >= 70
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {reportData.overall_score >= 85
                              ? 'Executive Mastery'
                              : reportData.overall_score >= 70
                              ? 'Proficient'
                              : reportData.overall_score >= 50
                              ? 'Developing'
                              : 'Needs Targeted Coaching'}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 sm:text-right">
                        <div>Evaluated against 3H Deliberate Practice Standard</div>
                        <div className="font-bold text-[#FF6500] mt-0.5">Facilitator: Uzair</div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Executive Summary
                      </span>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                        {reportData.overall_summary}
                      </p>
                    </div>

                    {reportData.hidden_reveal && (
                      <div className="mt-3.5 pt-3.5 border-t border-amber-500/20 text-xs">
                        <span className="font-black uppercase tracking-wider text-[#FF6500] text-[10px]">
                          Counterpart Hidden Motivations Revealed:
                        </span>
                        <p className="mt-0.5 text-slate-600 dark:text-slate-300 font-medium">
                          {reportData.hidden_reveal}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Assessed Competency Rubric Grid */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                      Assessed Executive Competencies
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {reportData.skill_scores.map((skill, idx) => (
                        <div
                          key={skill.skill || idx}
                          className="rounded-xl border border-slate-200 dark:border-[#1E3E62] bg-slate-50/70 dark:bg-[#132B45]/70 p-3.5 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-slate-900 dark:text-white capitalize">
                                {skill.skill.replace(/_/g, ' ')}
                              </span>
                              <span className="font-mono text-[#FF6500] text-sm">
                                {skill.score}%
                              </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  skill.score >= 80 ? 'bg-emerald-500' : skill.score >= 60 ? 'bg-[#FF6500]' : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, skill.score))}%` }}
                              />
                            </div>

                            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                              {skill.justification}
                            </p>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-[#1E3E62] text-[10px] font-bold text-slate-400">
                            Rubric Level: <span className="text-slate-700 dark:text-slate-200 capitalize">{skill.rubric_level_reached}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Success Criteria Assessment */}
                  {reportData.success_criteria_results && reportData.success_criteria_results.length > 0 && (
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                        Simulation Objectives & Outcomes
                      </h4>
                      <div className="space-y-2">
                        {reportData.success_criteria_results.map((sc, i) => (
                          <div
                            key={i}
                            className={`flex items-start space-x-3 p-3 rounded-xl border text-xs ${
                              sc.met
                                ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                                : 'border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200'
                            }`}
                          >
                            <span className="font-bold flex-shrink-0 text-sm mt-[-1px]">
                              {sc.met ? '✓' : '✗'}
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="font-bold block">{sc.criterion}</span>
                              {sc.evidence && (
                                <p className="mt-1 text-[11px] opacity-80 italic">
                                  Evidence: "{sc.evidence}"
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2-Column: Key Strengths vs Coaching Growth Priorities */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* What Worked */}
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20 p-4">
                      <div className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 pb-2 border-b border-emerald-500/20">
                        <Check className="h-4 w-4" />
                        <span>Strengths Demonstrated (What Worked)</span>
                      </div>
                      <div className="mt-3 space-y-3">
                        {reportData.what_worked && reportData.what_worked.length > 0 ? (
                          reportData.what_worked.map((item, idx) => (
                            <div key={idx} className="text-xs">
                              {item.quote && (
                                <p className="italic text-slate-700 dark:text-slate-300 font-semibold">
                                  "{item.quote}"
                                </p>
                              )}
                              <p className="mt-0.5 text-emerald-800 dark:text-emerald-300 font-medium">
                                • {item.why_it_worked}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 italic">No specific strengths recorded.</p>
                        )}
                      </div>
                    </div>

                    {/* What Didn't / Coaching Actions */}
                    <div className="rounded-xl border border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/20 p-4">
                      <div className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 pb-2 border-b border-amber-500/20">
                        <Target className="h-4 w-4" />
                        <span>Growth Priorities (Live Coaching Agenda)</span>
                      </div>
                      <div className="mt-3 space-y-3">
                        {reportData.what_didnt && reportData.what_didnt.length > 0 ? (
                          reportData.what_didnt.map((item, idx) => (
                            <div key={idx} className="text-xs">
                              {item.quote && (
                                <p className="italic text-slate-700 dark:text-slate-300 font-semibold">
                                  "{item.quote}"
                                </p>
                              )}
                              <p className="mt-0.5 text-amber-800 dark:text-amber-300 font-medium">
                                • {item.why_it_missed}
                              </p>
                            </div>
                          ))
                        ) : reportData.improvement_steps && reportData.improvement_steps.length > 0 ? (
                          reportData.improvement_steps.map((step, idx) => (
                            <div key={idx} className="text-xs">
                              <p className="font-bold text-slate-800 dark:text-white">
                                {step.step}
                              </p>
                              <p className="mt-0.5 text-amber-800 dark:text-amber-300 font-medium">
                                • {step.why}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 italic">No developmental items recorded.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Facilitator Sign-off & Seal */}
                  <div className="pt-4 border-t border-slate-200 dark:border-[#1E3E62] flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
                    <div>
                      <span>Facilitator Oversight: </span>
                      <strong className="text-slate-800 dark:text-slate-200">Uzair</strong>
                      <span> · 3H Solutions Executive Scenario Training Platform</span>
                    </div>
                    <div className="text-[11px] font-mono">
                      Session ID: {reportSession?.id || reportSessionId}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 italic">
                  No evaluation details available for this session.
                </div>
              )}
            </div>

            {/* Modal Bottom Close Bar */}
            <div className="border-t border-slate-200 dark:border-[#1E3E62] px-6 py-3 bg-slate-50 dark:bg-[#132B45] flex items-center justify-between flex-shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Official deliberate practice debrief record for facilitator review
              </span>
              <button
                type="button"
                onClick={() => {
                  setReportSessionId(null);
                  setReportData(null);
                  setReportSession(null);
                }}
                className="rounded-xl bg-[#FF6500] hover:bg-[#E05A00] px-5 py-2 text-xs font-bold text-white shadow-md transition"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

