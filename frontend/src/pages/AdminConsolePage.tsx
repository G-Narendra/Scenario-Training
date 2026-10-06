import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  AdminCohort,
  AdminScenarioVersion,
  AuditLogEntry,
  UsageSummary,
} from '../types';
import {
  AlertCircle,
  BarChart2,
  BookOpen,
  Check,
  Clock,
  Coins,
  Copy,
  History,
  Key,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';

export const AdminConsolePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'cohorts' | 'scenarios' | 'usage' | 'audit'>('cohorts');
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Cohorts state
  const [cohorts, setCohorts] = useState<AdminCohort[]>([]);
  const [showCreateCohortModal, setShowCreateCohortModal] = useState(false);
  const [newCohortName, setNewCohortName] = useState('');
  const [newCohortDesc, setNewCohortDesc] = useState('');
  const [newCohortDays, setNewCohortDays] = useState(30);
  const [newCohortBudget, setNewCohortBudget] = useState(50);
  const [newCohortMaxMembers, setNewCohortMaxMembers] = useState(25);
  const [createdPasscodeBanner, setCreatedPasscodeBanner] = useState<string | null>(null);

  // Scenarios state
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [showYamlModal, setShowYamlModal] = useState(false);
  const [yamlContent, setYamlContent] = useState('');
  const [yamlValidation, setYamlValidation] = useState<{ valid: boolean; errors: string[]; warnings: string[] } | null>(null);
  const [showAiDraftModal, setShowAiDraftModal] = useState(false);
  const [aiDraftPrompt, setAiDraftPrompt] = useState('');
  const [aiDraftDifficulty, setAiDraftDifficulty] = useState(3);
  const [aiDraftTrack, setAiDraftTrack] = useState('sales');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [selectedScenarioForVersions, setSelectedScenarioForVersions] = useState<any | null>(null);
  const [scenarioVersions, setScenarioVersions] = useState<AdminScenarioVersion[]>([]);

  // Usage state
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditFilterAction, setAuditFilterAction] = useState<string>('');

  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const loadTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'cohorts') {
        const data = await api.listAdminCohorts();
        setCohorts(data);
      } else if (activeTab === 'scenarios') {
        const data = await api.listAdminScenarios();
        setScenarios(data);
      } else if (activeTab === 'usage') {
        const data = await api.getAdminUsage();
        setUsageSummary(data);
      } else if (activeTab === 'audit') {
        const data = await api.getAdminAuditLogs(auditFilterAction || undefined);
        setAuditLogs(data.items);
      }
    } catch (err: any) {
      console.error('Failed to load admin data', err);
      showFeedback(err.message || 'Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cohort Actions
  const handleCreateCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohortName.trim()) return;
    try {
      const created = await api.createCohort({
        name: newCohortName,
        description: newCohortDesc,
        duration_days: newCohortDays,
        budget_cap_usd: newCohortBudget,
        max_members: newCohortMaxMembers,
        track_access: 'both',
      });
      setShowCreateCohortModal(false);
      setNewCohortName('');
      setNewCohortDesc('');
      if (created.initial_passcode) {
        setCreatedPasscodeBanner(`Cohort created! Initial passcode: ${created.initial_passcode}`);
      }
      showFeedback('Cohort created successfully');
      loadTabData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to create cohort', 'error');
    }
  };

  const handleRotatePasscode = async (cohortId: string) => {
    try {
      const res = await api.rotateCohortPasscode(cohortId, 30);
      setCreatedPasscodeBanner(`Passcode rotated! New Code: ${res.new_passcode} (Previous code active for 30 min grace period)`);
      showFeedback('Passcode rotated successfully');
      loadTabData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to rotate passcode', 'error');
    }
  };

  const handleExtendCohort = async (cohortId: string) => {
    try {
      await api.extendCohort(cohortId, 30);
      showFeedback('Cohort duration extended by 30 days');
      loadTabData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to extend cohort', 'error');
    }
  };

  const handleRevokeCohortSessions = async (cohortId: string) => {
    if (!confirm('Are you sure you want to revoke all active sessions for this cohort?')) return;
    try {
      const res = await api.revokeCohortSessions(cohortId);
      showFeedback(res.message);
    } catch (err: any) {
      showFeedback(err.message || 'Failed to revoke sessions', 'error');
    }
  };

  // Scenario Actions
  const handleValidateYaml = async () => {
    if (!yamlContent.trim()) return;
    try {
      const res = await api.validateScenarioYaml(yamlContent);
      setYamlValidation(res);
      if (res.valid) {
        showFeedback('YAML scenario definition is valid!');
      } else {
        showFeedback(`Validation flagged ${res.errors.length} issue(s)`, 'error');
      }
    } catch (err: any) {
      showFeedback(err.message || 'Validation request failed', 'error');
    }
  };

  const handleImportYaml = async () => {
    if (!yamlContent.trim()) return;
    try {
      await api.importScenarioYaml(yamlContent);
      setShowYamlModal(false);
      setYamlContent('');
      setYamlValidation(null);
      showFeedback('Scenario imported and saved successfully');
      loadTabData();
    } catch (err: any) {
      showFeedback(err.message || 'Import failed', 'error');
    }
  };

  const handleGenerateAiDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiDraftPrompt.trim()) return;
    setIsGeneratingAi(true);
    try {
      const draft = await api.generateAiScenarioDraft({
        prompt: aiDraftPrompt,
        track_key: aiDraftTrack,
        difficulty: aiDraftDifficulty,
      });
      setShowAiDraftModal(false);
      setAiDraftPrompt('');
      setShowYamlModal(true);
      setYamlContent(draft.yaml_content);
      showFeedback('AI generated draft scenario! Review and validate below.');
    } catch (err: any) {
      showFeedback(err.message || 'AI generation failed', 'error');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handlePublishScenario = async (id: string) => {
    try {
      await api.publishScenario(id);
      showFeedback('Scenario published for trainees');
      loadTabData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to publish', 'error');
    }
  };

  const handleArchiveScenario = async (id: string) => {
    try {
      await api.archiveScenario(id);
      showFeedback('Scenario archived');
      loadTabData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to archive', 'error');
    }
  };

  const handleDuplicateScenario = async (id: string) => {
    try {
      await api.duplicateScenario(id);
      showFeedback('Scenario duplicated as new draft');
      loadTabData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to duplicate', 'error');
    }
  };

  const handleDeleteScenario = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scenario?')) return;
    try {
      await api.deleteScenario(id);
      showFeedback('Scenario deleted');
      loadTabData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to delete scenario', 'error');
    }
  };

  const handleOpenVersions = async (scenario: any) => {
    setSelectedScenarioForVersions(scenario);
    try {
      const vList = await api.getScenarioVersions(scenario.id);
      setScenarioVersions(vList);
      setShowVersionHistoryModal(true);
    } catch (err: any) {
      showFeedback('Failed to load version history', 'error');
    }
  };

  const handleRestoreVersion = async (scenId: string, versionNum: number) => {
    if (!confirm(`Restore scenario to snapshot v${versionNum}?`)) return;
    try {
      await api.restoreScenarioVersion(scenId, versionNum);
      setShowVersionHistoryModal(false);
      showFeedback(`Successfully restored to version ${versionNum}`);
      loadTabData();
    } catch (err: any) {
      showFeedback(err.message || 'Failed to restore version', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Banner / Feedback */}
      {feedbackMsg && (
        <div
          className={`fixed top-20 right-6 z-50 rounded-xl border p-4 shadow-2xl backdrop-blur-md transition-all ${
            feedbackMsg.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-950/90 text-emerald-200'
              : 'border-rose-500/30 bg-rose-950/90 text-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2 text-sm font-medium">
            {feedbackMsg.type === 'success' ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        </div>
      )}

      {createdPasscodeBanner && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-cyan-500/40 bg-cyan-950/60 p-4 text-cyan-200">
          <div className="flex items-center space-x-3">
            <Key className="h-5 w-5 text-cyan-400" />
            <span className="font-mono text-sm font-bold">{createdPasscodeBanner}</span>
          </div>
          <button
            onClick={() => setCreatedPasscodeBanner(null)}
            className="rounded p-1 text-cyan-400 hover:bg-cyan-900/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
              ORGANIZATION CONTROL
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Admin Management Console
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Provision training cohorts, manage scenarios with YAML studio, inspect audit logs, and monitor compute budgets.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-900 p-1 border border-slate-800">
          <button
            id="admin-tab-cohorts"
            onClick={() => setActiveTab('cohorts')}
            className={`flex items-center space-x-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              activeTab === 'cohorts'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Cohorts</span>
          </button>
          <button
            id="admin-tab-scenarios"
            onClick={() => setActiveTab('scenarios')}
            className={`flex items-center space-x-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              activeTab === 'scenarios'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Scenario Studio</span>
          </button>
          <button
            id="admin-tab-usage"
            onClick={() => setActiveTab('usage')}
            className={`flex items-center space-x-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              activeTab === 'usage'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart2 className="h-4 w-4" />
            <span>Usage & Costs</span>
          </button>
          <button
            id="admin-tab-audit"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center space-x-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              activeTab === 'audit'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Audit Logs</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="flex items-center space-x-3 text-cyan-400 font-mono text-sm">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <span>FETCHING CONTROL TELEMETRY...</span>
          </div>
        </div>
      )}

      {/* 1. COHORTS TAB */}
      {!loading && activeTab === 'cohorts' && (
        <div className="mt-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Active & Scheduled Cohorts</h2>
            <button
              id="create-cohort-modal-btn"
              onClick={() => setShowCreateCohortModal(true)}
              className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-indigo-500 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Cohort</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {cohorts.map((cohort) => (
              <div
                key={cohort.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-white">{cohort.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{cohort.description || 'Standard 30-day cohort'}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      cohort.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {cohort.is_active ? 'Active' : 'Expired'}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
                  <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/80">
                    <span className="text-slate-500 uppercase font-mono text-[10px]">Expires</span>
                    <div className="mt-1 font-semibold">{new Date(cohort.expires_at).toLocaleDateString()}</div>
                  </div>
                  <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/80">
                    <span className="text-slate-500 uppercase font-mono text-[10px]">Budget Cap</span>
                    <div className="mt-1 font-semibold font-mono">${cohort.budget_cap_usd.toFixed(2)} USD</div>
                  </div>
                  <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/80">
                    <span className="text-slate-500 uppercase font-mono text-[10px]">Max Trainees</span>
                    <div className="mt-1 font-semibold">{cohort.max_members} seats</div>
                  </div>
                  <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/80">
                    <span className="text-slate-500 uppercase font-mono text-[10px]">Tracks</span>
                    <div className="mt-1 font-semibold capitalize">
                      {Array.isArray(cohort.track_access)
                        ? cohort.track_access.join(', ')
                        : cohort.track_access || 'All Tracks'}
                    </div>
                  </div>
                </div>

                {/* Cohort Control Actions */}
                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-800/80 pt-4">
                  <button
                    onClick={() => handleRotatePasscode(cohort.id)}
                    className="flex items-center space-x-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Rotate Passcode</span>
                  </button>
                  <button
                    onClick={() => handleExtendCohort(cohort.id)}
                    className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>Extend +30 Days</span>
                  </button>
                  <button
                    onClick={() => handleRevokeCohortSessions(cohort.id)}
                    className="flex items-center space-x-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>Revoke Sessions</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. SCENARIO STUDIO TAB */}
      {!loading && activeTab === 'scenarios' && (
        <div className="mt-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Scenario Studio & Content Manager</h2>
              <p className="text-xs text-slate-400">Edit, test, validate, and version simulation scenarios.</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAiDraftModal(true)}
                className="flex items-center space-x-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
              >
                <Sparkles className="h-4 w-4" />
                <span>AI Scenario Generator</span>
              </button>
              <button
                id="yaml-studio-btn"
                onClick={() => {
                  setYamlContent('');
                  setYamlValidation(null);
                  setShowYamlModal(true);
                }}
                className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-indigo-500 transition"
              >
                <UploadCloud className="h-4 w-4" />
                <span>YAML Studio / Import</span>
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-950/60 font-mono text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Title & Topic</th>
                  <th className="px-5 py-3.5">Difficulty</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Version</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {scenarios.map((scen) => (
                  <tr key={scen.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-4 font-medium text-white">
                      <div>{scen.title}</div>
                      <span className="text-[11px] text-slate-500 font-mono">{scen.topic}</span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">
                        Level {scen.difficulty}/5
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          scen.status === 'published'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : scen.status === 'draft'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {scen.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-400">
                      v{scen.version}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {scen.status === 'draft' ? (
                          <button
                            onClick={() => handlePublishScenario(scen.id)}
                            className="rounded bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition"
                          >
                            Publish
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchiveScenario(scen.id)}
                            className="rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-400 hover:text-white transition"
                          >
                            Archive
                          </button>
                        )}
                        <button
                          onClick={() => handleDuplicateScenario(scen.id)}
                          title="Duplicate"
                          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-cyan-300 transition"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenVersions(scen)}
                          title="Version History"
                          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-indigo-300 transition"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        {scen.status === 'draft' && (
                          <button
                            onClick={() => handleDeleteScenario(scen.id)}
                            title="Delete Draft"
                            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. USAGE & COSTS TAB */}
      {!loading && activeTab === 'usage' && usageSummary && (
        <div className="mt-8 space-y-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <span className="text-xs font-semibold uppercase text-slate-400">Total Tokens</span>
              <div className="mt-2 text-3xl font-extrabold text-white font-mono">
                {usageSummary.total_tokens.toLocaleString()}
              </div>
              <p className="mt-1 text-xs text-slate-400">Input and output dialogue tokens</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <span className="text-xs font-semibold uppercase text-slate-400">Voice Audio Duration</span>
              <div className="mt-2 text-3xl font-extrabold text-indigo-400 font-mono">
                {(usageSummary.total_audio_seconds / 60).toFixed(1)} min
              </div>
              <p className="mt-1 text-xs text-slate-400">Real-time voice streaming time</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <span className="text-xs font-semibold uppercase text-slate-400">Estimated Spend</span>
              <div className="mt-2 text-3xl font-extrabold text-emerald-400 font-mono">
                ${usageSummary.total_cost_usd.toFixed(4)} USD
              </div>
              <p className="mt-1 text-xs text-slate-400">Live API usage estimate</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <span className="text-xs font-semibold uppercase text-slate-400">Recorded Usage Events</span>
              <div className="mt-2 text-3xl font-extrabold text-cyan-400 font-mono">
                {usageSummary.recent_events_count}
              </div>
              <p className="mt-1 text-xs text-slate-400">Granular billing telemetry events</p>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Compute Model Breakdown</h3>
            <div className="space-y-3">
              {usageSummary.breakdown_by_type.map((b) => (
                <div key={b.type} className="flex items-center justify-between text-sm py-2 border-b border-slate-800/60">
                  <div className="flex items-center space-x-2 font-mono uppercase text-slate-300">
                    <Coins className="h-4 w-4 text-cyan-400" />
                    <span>{b.type}</span>
                  </div>
                  <div className="flex items-center space-x-6 font-mono">
                    <span className="text-slate-400">{b.total_units} units</span>
                    <span className="font-bold text-emerald-400">${b.total_cost_usd.toFixed(4)} USD</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. AUDIT LOGS TAB */}
      {!loading && activeTab === 'audit' && (
        <div className="mt-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">System Audit & Compliance Log</h2>
            <select
              value={auditFilterAction}
              onChange={(e) => {
                setAuditFilterAction(e.target.value);
                setTimeout(loadTabData, 50);
              }}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Actions</option>
              <option value="passcode.rotate">passcode.rotate</option>
              <option value="session.revoke">session.revoke</option>
              <option value="scenario.create">scenario.create</option>
              <option value="scenario.publish">scenario.publish</option>
              <option value="cohort.create">cohort.create</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-950/60 font-mono text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-5 py-3.5">Entity</th>
                  <th className="px-5 py-3.5">IP</th>
                  <th className="px-5 py-3.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 text-xs">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3 font-mono text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-mono font-bold text-cyan-300">
                      {log.action}
                    </td>
                    <td className="px-5 py-3 text-slate-300">
                      {log.entity} {log.entity_id ? `(${log.entity_id.slice(0, 8)}...)` : ''}
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-400">
                      {log.ip || '—'}
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE COHORT MODAL */}
      {showCreateCohortModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Create 30-Day Training Cohort</h3>
              <button
                onClick={() => setShowCreateCohortModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCohort} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300">Cohort Name</label>
                <input
                  id="cohort-name-input"
                  type="text"
                  required
                  value={newCohortName}
                  onChange={(e) => setNewCohortName(e.target.value)}
                  placeholder="e.g. Q4 Executive Sales Cohort"
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Description</label>
                <textarea
                  id="cohort-desc-input"
                  value={newCohortDesc}
                  onChange={(e) => setNewCohortDesc(e.target.value)}
                  placeholder="Optional notes or team information"
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={newCohortDays}
                    onChange={(e) => setNewCohortDays(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Max Members</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={newCohortMaxMembers}
                    onChange={(e) => setNewCohortMaxMembers(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Budget Cap ($)</label>
                  <input
                    type="number"
                    min="10"
                    value={newCohortBudget}
                    onChange={(e) => setNewCohortBudget(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateCohortModal(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  id="cohort-submit-btn"
                  type="submit"
                  className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition"
                >
                  Create Cohort
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* YAML STUDIO / IMPORT MODAL */}
      {showYamlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Scenario YAML Studio</h3>
                <p className="text-xs text-slate-400">Strict schema: Title, persona, curveballs, and skills assessed.</p>
              </div>
              <button
                onClick={() => setShowYamlModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Validation Message */}
            {yamlValidation && (
              <div
                id="yaml-validation-box"
                className={`my-3 rounded-lg p-3 text-xs ${
                  yamlValidation.valid
                    ? 'border border-emerald-500/30 bg-emerald-950/60 text-emerald-300'
                    : 'border border-rose-500/30 bg-rose-950/60 text-rose-300'
                }`}
              >
                {yamlValidation.valid ? (
                  <div>Valid scenario definition ready for publishing!</div>
                ) : (
                  <div>
                    <span className="font-bold">Validation Errors:</span>
                    <ul className="list-disc ml-5 mt-1">
                      {yamlValidation.errors.map((e, idx) => (
                        <li key={idx}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 my-3 overflow-hidden">
              <textarea
                id="yaml-content-textarea"
                value={yamlContent}
                onChange={(e) => setYamlContent(e.target.value)}
                placeholder="Paste or write scenario YAML here..."
                rows={16}
                className="w-full h-full font-mono text-xs rounded-xl border border-slate-800 bg-slate-950 p-4 text-cyan-200 focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <button
                id="yaml-validate-btn"
                type="button"
                onClick={handleValidateYaml}
                className="flex items-center space-x-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Validate Schema</span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowYamlModal(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  id="yaml-import-btn"
                  type="button"
                  onClick={handleImportYaml}
                  className="rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-indigo-500 transition"
                >
                  Save & Publish Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI SCENARIO DRAFT MODAL */}
      {showAiDraftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">AI Scenario Generator</h3>
              </div>
              <button
                onClick={() => setShowAiDraftModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateAiDraft} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Conversation Goal & Scenario Context
                </label>
                <textarea
                  required
                  value={aiDraftPrompt}
                  onChange={(e) => setAiDraftPrompt(e.target.value)}
                  placeholder="e.g. Hostile vendor demanding a 40% rate increase during contract renewal while threatening to terminate services..."
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Track</label>
                  <select
                    value={aiDraftTrack}
                    onChange={(e) => setAiDraftTrack(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="sales">Sales Track</option>
                    <option value="leadership">Leadership Track</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Difficulty Level</label>
                  <select
                    value={aiDraftDifficulty}
                    onChange={(e) => setAiDraftDifficulty(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value={1}>1 - Novice</option>
                    <option value={2}>2 - Developing</option>
                    <option value={3}>3 - Intermediate</option>
                    <option value={4}>4 - Advanced</option>
                    <option value={5}>5 - Master</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAiDraftModal(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingAi}
                  className="flex items-center space-x-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-500 transition disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isGeneratingAi ? 'Drafting Persona...' : 'Generate YAML'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VERSION HISTORY MODAL */}
      {showVersionHistoryModal && selectedScenarioForVersions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Version History</h3>
                <p className="text-xs text-slate-400">{selectedScenarioForVersions.title}</p>
              </div>
              <button
                onClick={() => setShowVersionHistoryModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto space-y-3">
              {scenarioVersions.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-cyan-400">Version {v.version}</span>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(v.created_at).toLocaleString()}
                    </div>
                    {v.change_note && (
                      <div className="text-slate-300 italic mt-1">{v.change_note}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRestoreVersion(selectedScenarioForVersions.id, v.version)}
                    className="rounded bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-700 transition"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
