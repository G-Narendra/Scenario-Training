import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { CapabilityItem, ScenarioDetail, ScenarioListItem } from '../types';
import { ScenarioBriefingModal } from '../components/ScenarioBriefingModal';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { ArrowRight, BookOpen, Clock, LayoutGrid, Lightbulb, List, Search, Sparkles } from 'lucide-react';

interface ScenarioLibraryPageProps {
  selectedTrack: string;
  onBackToTracks?: () => void;
  onLaunchSimulation: (scenarioId: string, mode: 'text' | 'voice') => void;
  isStarting: boolean;
}

export const ScenarioLibraryPage: React.FC<ScenarioLibraryPageProps> = ({
  selectedTrack,
  onLaunchSimulation,
  isStarting,
}) => {
  const [scenarios, setScenarios] = useState<ScenarioListItem[]>([]);
  const [capabilities, setCapabilities] = useState<CapabilityItem[]>([]);
  const [mySessions, setMySessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'capabilities' | 'scenarios'>('capabilities');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [trackFilter, setTrackFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string | 'all'>('all');
  const [selectedPillar, setSelectedPillar] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [briefingScenario, setBriefingScenario] = useState<ScenarioDetail | null>(null);

  useEffect(() => {
    if (selectedTrack && selectedTrack !== 'all' && selectedTrack !== 'both') {
      setTrackFilter(selectedTrack);
    }
  }, [selectedTrack]);

  useEffect(() => {
    setLoading(true);
    const query = trackFilter === 'all' ? undefined : { track: trackFilter };
    Promise.all([
      api.getScenarios(query),
      api.getCapabilities().catch(() => [] as CapabilityItem[]),
      api.listMySessions().catch(() => []),
    ])
      .then(([scenData, capData, sessData]) => {
        setScenarios(scenData);
        if (sessData) setMySessions(sessData);
        if (capData && capData.length > 0) {
          setCapabilities(capData);
        } else if (scenData && scenData.length > 0) {
          // Resilient fallback: map capabilities directly from scenarios if capabilities endpoint is unavailable
          const synthesized: CapabilityItem[] = scenData.map((sc, i) => {
            const primaryCap =
              sc.target_capabilities && sc.target_capabilities.length > 0
                ? sc.target_capabilities[0]
                : sc.topic.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || sc.title;
            const pillar =
              sc.track === 'sales'
                ? 'Strategy & Market Leadership'
                : 'People Leadership & Culture';
            return {
              number: i + 1,
              key: sc.topic || `cap_${i + 1}`,
              name: primaryCap,
              pillar,
              description: sc.tactical_coaching_clue || sc.title,
              rubric: {},
              matching_scenario_id: sc.id,
              matching_scenario_slug: sc.slug,
              matching_scenario_title: sc.title,
              matching_scenario_difficulty: sc.difficulty,
              matching_scenario_difficulty_level:
                sc.difficulty_level || (sc.difficulty <= 1 ? 'Normal' : sc.difficulty <= 3 ? 'Challenging' : 'Crisis'),
            };
          });
          setCapabilities(synthesized);
        }
      })
      .catch((err) => console.error('Failed to load scenarios/capabilities', err))
      .finally(() => setLoading(false));
  }, [trackFilter]);

  const handleOpenBriefing = async (scenId: string) => {
    try {
      const detail = await api.getScenarioDetail(scenId);
      setBriefingScenario(detail);
    } catch (err) {
      console.error('Failed to load scenario detail', err);
    }
  };

  const pillars = [
    { key: 'all', label: 'All Capabilities (60)' },
    { key: 'Strategy & Market Leadership', label: 'Strategy & Market Leadership (10)' },
    { key: 'Cognitive Agility & Problem Solving', label: 'Cognitive Agility & Problem Solving (10)' },
    { key: 'People Leadership & Culture', label: 'People Leadership & Culture (10)' },
    { key: 'Operational Execution & Governance', label: 'Operational Execution & Governance (10)' },
    { key: 'Personal Mastery & Resilience', label: 'Personal Mastery & Resilience (10)' },
    { key: 'Influence & Executive Presence', label: 'Influence & Executive Presence (10)' },
  ];

  const difficultyOrder: Record<string, number> = {
    Normal: 1,
    Challenging: 2,
    Crisis: 3,
  };

  const filteredCapabilities = capabilities.filter((cap) => {
    if (trackFilter !== 'all') {
      const capTrack = (cap.matching_scenario_track || '').toLowerCase();
      if (capTrack && capTrack !== trackFilter.toLowerCase()) return false;
    }
    if (difficultyFilter !== 'all') {
      const diffVal = cap.matching_scenario_difficulty ?? 1;
      const capDifficulty = cap.matching_scenario_difficulty_level || (diffVal <= 1 ? 'Normal' : diffVal <= 3 ? 'Challenging' : 'Crisis');
      if (capDifficulty !== difficultyFilter) return false;
    }
    if (selectedPillar !== 'all') {
      const capPillar = (cap.pillar || '').toLowerCase().trim();
      const sel = selectedPillar.toLowerCase().trim();
      let matches = false;
      if (sel.includes('strategy')) {
        matches = capPillar.includes('strateg') || capPillar.includes('market');
      } else if (sel.includes('cognitive')) {
        matches = capPillar.includes('cognitive') || capPillar.includes('problem');
      } else if (sel.includes('people')) {
        matches = capPillar.includes('people') || capPillar.includes('culture');
      } else if (sel.includes('operational')) {
        matches = capPillar.includes('operational') || capPillar.includes('governance') || capPillar.includes('execution') || capPillar.includes('performance');
      } else if (sel.includes('personal')) {
        matches = capPillar.includes('personal') || capPillar.includes('mastery') || capPillar.includes('resilience');
      } else if (sel.includes('influence')) {
        matches = capPillar.includes('influence') || capPillar.includes('presence') || capPillar.includes('communication');
      } else {
        matches = capPillar === sel || capPillar.includes(sel);
      }
      if (!matches) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const cleanQ = q.replace(/^#/, '');
      const matchName = (cap.name || '').toLowerCase().includes(q) || (cap.name || '').toLowerCase().includes(cleanQ);
      const matchDesc = (cap.description || '').toLowerCase().includes(q) || (cap.description || '').toLowerCase().includes(cleanQ);
      const matchPillar = (cap.pillar || '').toLowerCase().includes(q) || (cap.pillar || '').toLowerCase().includes(cleanQ);
      const matchNum = String(cap.number) === cleanQ || String(cap.number) === q;
      const matchScenario = (cap.matching_scenario_title || '').toLowerCase().includes(q) || (cap.matching_scenario_title || '').toLowerCase().includes(cleanQ);
      if (!matchName && !matchDesc && !matchPillar && !matchNum && !matchScenario) return false;
    }
    return true;
  });

  const sortedCapabilities = [...filteredCapabilities].sort((a, b) => {
    const aDiff = a.matching_scenario_difficulty ?? 1;
    const aTier = a.matching_scenario_difficulty_level || (aDiff <= 1 ? 'Normal' : aDiff <= 3 ? 'Challenging' : 'Crisis');
    const bDiff = b.matching_scenario_difficulty ?? 1;
    const bTier = b.matching_scenario_difficulty_level || (bDiff <= 1 ? 'Normal' : bDiff <= 3 ? 'Challenging' : 'Crisis');
    const diff = (difficultyOrder[aTier] || 2) - (difficultyOrder[bTier] || 2);
    if (diff !== 0) return diff;
    return (a.number || 0) - (b.number || 0);
  });

  const filteredScenarios = scenarios.filter((s) => {
    if (trackFilter === 'executive') {
      const tier = s.difficulty_level || (s.difficulty <= 1 ? 'Normal' : s.difficulty <= 3 ? 'Challenging' : 'Crisis');
      if (tier === 'Normal' && !s.title.toLowerCase().includes('board') && !s.title.toLowerCase().includes('restruct')) return false;
    } else if (trackFilter === 'operational') {
      const tier = s.difficulty_level || (s.difficulty <= 1 ? 'Normal' : s.difficulty <= 3 ? 'Challenging' : 'Crisis');
      if (tier === 'Crisis') return false;
    } else if (trackFilter === 'sales') {
      if (s.track !== 'sales') return false;
    } else if (trackFilter === 'leadership') {
      if (s.track === 'sales') return false;
    }

    if (difficultyFilter !== 'all') {
      const tier = s.difficulty_level || (s.difficulty <= 1 ? 'Normal' : s.difficulty <= 3 ? 'Challenging' : 'Crisis');
      if (tier !== difficultyFilter) return false;
    }
    if (searchQuery.trim()) {
      const rawQ = searchQuery.toLowerCase().trim();
      const q = rawQ.replace(/^#/, '');
      const matchTitle = s.title.toLowerCase().includes(rawQ) || s.title.toLowerCase().includes(q);
      const matchTopic = s.topic.toLowerCase().includes(rawQ) || s.topic.toLowerCase().includes(q);
      const matchTags = s.tags.some((t) => t.toLowerCase().includes(rawQ) || t.toLowerCase().includes(q));
      const matchCapabilities = s.target_capabilities?.some((c) => c.toLowerCase().includes(rawQ) || c.toLowerCase().includes(q));
      // Number-based search: typing "47" or "#47" accurately matches scenario #47
      const numQuery = Number(q);
      const matchNum = !isNaN(numQuery) && numQuery > 0 && (scenarios.findIndex((x) => x.id === s.id) + 1 === numQuery);
      if (!matchTitle && !matchTopic && !matchTags && !matchCapabilities && !matchNum) return false;
    }
    return true;
  });

  const sortedScenarios = [...filteredScenarios].sort((a, b) => {
    const aTier = sTier(a);
    const bTier = sTier(b);
    const diff = (difficultyOrder[aTier] || 2) - (difficultyOrder[bTier] || 2);
    if (diff !== 0) return diff;
    return a.difficulty - b.difficulty;
  });

  function sTier(s: ScenarioListItem) {
    return s.difficulty_level || (s.difficulty <= 1 ? 'Normal' : s.difficulty <= 3 ? 'Challenging' : 'Crisis');
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-4 border-b border-slate-200 dark:border-[#1E3E62]">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-[#B91C1C] mb-1">
            <span className="rounded-full bg-[#B91C1C]/10 px-2.5 py-0.5 text-xs font-bold text-[#B91C1C] border border-[#B91C1C]/30">
              3H Solutions Executive Training
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white font-heading">
            {viewMode === 'capabilities'
              ? 'Executive Curriculum & 3H Competency Framework'
              : trackFilter === 'sales'
              ? 'Enterprise Sales Scenarios'
              : trackFilter === 'leadership'
              ? 'Executive Leadership Scenarios'
              : 'Executive Practice Scenarios'}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
            {viewMode === 'capabilities'
              ? 'Explore the 60 executive competencies taught by Uzair. Review briefings and launch targeted deliberate practice.'
              : 'Authentic workplace dialogue simulations with simulated counterparts.'}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={viewMode === 'capabilities' ? 'Search capabilities or #number...' : 'Search scenarios, skills, or type #47...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-[#0B192C] dark:focus:border-[#B91C1C] focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-[#B91C1C]/25 shadow-sm dark:border-[#2D5B8D] dark:bg-[#132B45] dark:text-white dark:placeholder-slate-500"
          />
        </div>
      </div>

      {/* Executive Participant Orientation & Guide Banner */}
      <div className="mt-5 rounded-2xl border-2 border-slate-300 dark:border-[#1E3E62] bg-gradient-to-r from-slate-50 via-white to-blue-50/40 dark:from-[#0B192C] dark:via-[#0F243A] dark:to-[#132B45] p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-[#0B192C] dark:text-[#60A5FA]">
              <Sparkles className="h-4 w-4 text-[#1E3E62] dark:text-[#60A5FA]" />
              <span>Participant Orientation & Practice Guide</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading">
              Executive Deliberate Practice Platform
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              Welcome to 3H Solutions Executive Scenario Training. Here you engage in realistic, AI-powered workplace leadership situations—practicing high-stakes conversations, handling objections, and refining executive presence via voice or text in a confidential environment.
            </p>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold pt-1">
              Curriculum includes <strong>60 executive scenarios</strong> mapped to the 60 competencies of Uzair's 3H Leadership Framework.
            </div>
          </div>

          {/* Core Limits & Structure Badges */}
          <div className="flex flex-wrap lg:flex-col items-start lg:items-end gap-2 shrink-0">
            <span className="rounded-xl border border-slate-300 dark:border-[#2D5B8D] bg-white dark:bg-[#132B45] px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-sm flex items-center space-x-1.5">
              <span>🎯</span>
              <span>60 Leadership Scenarios</span>
            </span>
            <span className="rounded-xl bg-[#0B192C] text-white dark:bg-[#1E3E62] px-3 py-1.5 text-xs font-bold shadow-sm flex items-center space-x-1.5">
              <span>🔒</span>
              <span>10 Attempts Limit / Delegate</span>
            </span>
            <span className="rounded-xl border border-blue-500/30 bg-blue-500/10 dark:bg-blue-900/30 px-3 py-1.5 text-xs font-bold text-[#0B192C] dark:text-[#60A5FA] shadow-sm flex items-center space-x-1.5">
              <span>⚡</span>
              <span>3 Levels: Normal • Challenging • Crisis</span>
            </span>
          </div>
        </div>
      </div>

      {/* View Mode Switcher: Capabilities Framework vs Interactive Simulations */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-[#1E3E62] pb-4">
        <div className="flex items-center space-x-2">
          <button
            id="view-mode-capabilities-btn"
            onClick={() => setViewMode('capabilities')}
            className={`flex items-center space-x-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              viewMode === 'capabilities'
                ? 'bg-[#0B192C] text-white dark:bg-[#1E3E62] dark:border dark:border-[#2D5B8D] shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#0B192C] dark:text-slate-300 dark:hover:bg-[#1E3E62]'
            }`}
            title="Browse the 60 3H Executive Competency Definitions"
          >
            <Sparkles className="h-4 w-4" />
            <span>3H Competency Framework (60)</span>
          </button>

          <button
            id="view-mode-scenarios-btn"
            onClick={() => setViewMode('scenarios')}
            className={`flex items-center space-x-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              viewMode === 'scenarios'
                ? 'bg-[#0B192C] text-white dark:bg-[#1E3E62] dark:border dark:border-[#2D5B8D] shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#0B192C] dark:text-slate-300 dark:hover:bg-[#1E3E62]'
            }`}
            title="Launch Interactive Dialogue Simulations with Counterparts"
          >
            <BookOpen className="h-4 w-4" />
            <span>Interactive Simulations (Start Practice)</span>
          </button>
        </div>

        {/* Dynamic Filters Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Seniority / Leadership Profile Dropdown (Requested by Uzair) */}
          <div className="flex items-center space-x-2 bg-white dark:bg-[#132B45] border-2 border-slate-300 dark:border-[#1E3E62] rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Profile:</span>
            <select
              id="scenario-track-filter"
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer pr-2"
            >
              <option value="all" className="dark:bg-[#0B192C]">All Leadership Profiles</option>
              <option value="executive" className="dark:bg-[#0B192C]">Senior Executive & C-Suite</option>
              <option value="operational" className="dark:bg-[#0B192C]">Operational Leaders & Managers</option>
              <option value="leadership" className="dark:bg-[#0B192C]">Executive Leadership (All)</option>
              <option value="sales" className="dark:bg-[#0B192C]">Enterprise Commercial / Sales</option>
            </select>
          </div>

          {/* In Capabilities Mode: Pillar Filter */}
          {viewMode === 'capabilities' && (
            <div className="flex items-center space-x-2 bg-white dark:bg-[#132B45] border-2 border-slate-300 dark:border-[#1E3E62] rounded-xl px-3 py-1.5 shadow-sm">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Pillar:</span>
              <select
                id="capability-pillar-filter"
                value={selectedPillar}
                onChange={(e) => setSelectedPillar(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer pr-2 max-w-[180px] sm:max-w-none truncate"
              >
                {pillars.map((p) => (
                  <option key={p.key} value={p.key} className="dark:bg-[#0B192C]">
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Difficulty Level Dropdown (Available in both views per Uzair's request) */}
          <div className="flex items-center space-x-2 bg-white dark:bg-[#132B45] border-2 border-slate-300 dark:border-[#1E3E62] rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Difficulty:</span>
            <select
              id="catalog-difficulty-filter"
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer pr-2"
            >
              <option value="all" className="dark:bg-[#0B192C]">All Levels (1 to 3)</option>
              <option value="Normal" className="dark:bg-[#0B192C]">Level 1: Normal</option>
              <option value="Challenging" className="dark:bg-[#0B192C]">Level 2: Challenging</option>
              <option value="Crisis" className="dark:bg-[#0B192C]">Level 3: Crisis</option>
            </select>
          </div>

          {/* Grid vs List View Switcher (Requested by Uzair for Executive Scanning) */}
          {viewMode === 'scenarios' && (
            <div className="flex items-center rounded-xl border-2 border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] p-0.5 shadow-sm">
              <button
                id="layout-grid-btn"
                type="button"
                onClick={() => setLayoutMode('grid')}
                title="Grid View (Cards)"
                className={`p-1.5 rounded-lg transition ${
                  layoutMode === 'grid'
                    ? 'bg-[#0B192C] text-white dark:bg-[#1E3E62] dark:border dark:border-[#2D5B8D]'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                id="layout-list-btn"
                type="button"
                onClick={() => setLayoutMode('list')}
                title="List View (Compact Sequential Roster)"
                className={`p-1.5 rounded-lg transition ${
                  layoutMode === 'list'
                    ? 'bg-[#0B192C] text-white dark:bg-[#1E3E62] dark:border dark:border-[#2D5B8D]'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="flex h-96 flex-col items-center justify-center space-y-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#B91C1C] border-t-transparent" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 animate-pulse">
            Loading executive curriculum & scenarios...
          </p>
        </div>
      ) : viewMode === 'capabilities' ? (
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {sortedCapabilities.map((cap) => (
              <div
                key={cap.key}
                id={`capability-card-${cap.key}`}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:border-[#2D5B8D] dark:bg-[#132B45] dark:ring-0 transition-all duration-200 hover:-translate-y-1 hover:border-[#B91C1C] hover:shadow-xl"
              >
                <div>
                  {/* Top Bar: Number Badge + Pillar Tag & Difficulty Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-9 items-center justify-center rounded-md bg-[#B91C1C]/15 border border-[#B91C1C]/30 font-mono text-[10px] font-black text-[#B91C1C] flex-shrink-0">
                        #{String(cap.number).padStart(2, '0')}
                      </span>
                      <span className="rounded-md bg-amber-500/10 dark:bg-[#0B192C] border border-[#B91C1C]/30 px-2.5 py-0.5 text-[11px] font-bold text-[#B91C1C] uppercase tracking-wider">
                        {cap.pillar}
                      </span>
                    </div>
                    <DifficultyBadge
                      difficulty={cap.matching_scenario_difficulty || 2}
                      difficultyLevel={cap.matching_scenario_difficulty_level || 'Normal'}
                      size="sm"
                    />
                  </div>

                  {/* Capability Name */}
                  <h3 className="mt-3 text-lg font-black text-slate-900 dark:text-white font-heading group-hover:text-[#B91C1C] transition-colors leading-snug">
                    {cap.name}
                  </h3>

                  {/* Executive Description */}
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed line-clamp-2">
                    {cap.description}
                  </p>

                  {/* Mapped Practice Scenario Preview */}
                  <div className="mt-3.5 rounded-xl border border-slate-200 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] p-3 text-xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Practice Scenario
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white mt-1 text-sm line-clamp-1">
                      {cap.matching_scenario_title || 'Authentic Workplace Dialogue'}
                    </div>
                  </div>
                </div>

                {/* Direct Action Button */}
                <div className="mt-4 border-t border-slate-100 dark:border-[#1E3E62] pt-3 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Deliberate Practice</span>
                  <button
                    id={`practice-btn-${cap.key || cap.number}`}
                    onClick={() => {
                      if (cap.matching_scenario_id) {
                        handleOpenBriefing(cap.matching_scenario_id);
                      } else if (scenarios.length > 0) {
                        handleOpenBriefing(scenarios[0].id);
                      }
                    }}
                    className="flex items-center space-x-1.5 rounded-xl bg-[#0B192C] hover:bg-[#1E3E62] text-white dark:bg-[#1E3E62] dark:hover:bg-[#2D5B8D] border border-transparent dark:border-[#2D5B8D] px-3.5 py-1.5 text-xs font-bold transition shadow-sm"
                  >
                    <span>Practice Scenario</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredCapabilities.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-[#1E3E62] p-12 text-center">
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                No capabilities match your current filter.
              </p>
              <button
                onClick={() => {
                  setSelectedPillar('all');
                  setSearchQuery('');
                }}
                className="mt-4 rounded-xl bg-[#B91C1C] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#BE2626] transition"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      ) : filteredScenarios.length === 0 ? (
        <div className="mt-12 rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center text-base text-slate-600 dark:border-[#1E3E62] dark:text-slate-300 font-medium">
          No scenarios found matching your selected filters.
        </div>
      ) : layoutMode === 'list' ? (
        /* ========================================================================= */
        /* SCENARIO SEQUENTIAL LIST VIEW (Requested by Uzair for Executive Scanning) */
        /* ========================================================================= */
        <div className="mt-8 overflow-hidden rounded-2xl border-2 border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] shadow-sm">
          <div className="divide-y divide-slate-200 dark:divide-[#1E3E62]">
            {sortedScenarios.map((scen, idx) => (
              <div
                key={scen.id}
                id={`scenario-row-${scen.slug}`}
                onClick={() => handleOpenBriefing(scen.id)}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-[#0B192C]/50 cursor-pointer transition group"
              >
                <div className="flex items-start sm:items-center space-x-3.5">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#B91C1C] font-mono text-[10px] font-black text-white border border-[#B91C1C]/50 shadow-sm">
                    #{String(idx + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-[#0B192C] dark:group-hover:text-[#B91C1C]">
                        {scen.title}
                      </h3>
                      <DifficultyBadge difficulty={scen.difficulty} difficultyLevel={scen.difficulty_level} size="sm" />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">
                        {scen.topic.replace(/_/g, ' ')}
                      </span>
                      <span>•</span>
                      <span>🎯 Skill: {scen.primary_capability || scen.target_capabilities?.[0] || 'Leadership'}</span>
                      <span>•</span>
                      <span>⏱️ ~{Math.round(scen.duration_limit_seconds / 60)} min</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenBriefing(scen.id);
                  }}
                  className="flex-shrink-0 flex items-center space-x-1.5 rounded-xl bg-[#0B192C] hover:bg-[#1E3E62] text-white dark:bg-[#1E3E62] dark:hover:bg-[#2D5B8D] border border-transparent dark:border-[#2D5B8D] px-4 py-2 text-xs font-bold transition shadow-sm"
                >
                  <span>Start Practice</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* SCENARIO CATALOG GRID                                                     */
        /* ========================================================================= */
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedScenarios.map((scen, idx) => (
            <div
              key={scen.id}
              id={`scenario-card-${scen.slug}`}
              onClick={() => handleOpenBriefing(scen.id)}
              className="group flex flex-col justify-between cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 shadow-md ring-1 ring-slate-100 dark:border-[#2D5B8D] dark:bg-[#132B45] dark:ring-0 transition-all duration-200 hover:-translate-y-1 hover:border-[#B91C1C] hover:shadow-2xl hover:ring-[#B91C1C]/20"
            >
              <div>
                {/* Card Top: Scenario Number + Topic & Difficulty Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#B91C1C] text-white font-black text-[10px] tracking-tight shadow-sm flex-shrink-0">
                      #{String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="rounded-md bg-slate-100 dark:bg-[#0B192C] border border-slate-300 dark:border-[#1E3E62] px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {scen.topic.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <DifficultyBadge difficulty={scen.difficulty} difficultyLevel={scen.difficulty_level} size="sm" />
                </div>

                {/* Scenario Title */}
                <h3 className="mt-4 text-xl font-black text-slate-900 dark:text-white font-heading group-hover:text-[#B91C1C] transition-colors leading-snug">
                  {scen.title}
                </h3>

                {/* Primary Target Capability Highlight */}
                <div className="mt-2.5">
                  <span className="inline-flex items-center rounded-md bg-[#B91C1C]/15 px-2.5 py-1 text-xs font-bold text-[#B91C1C] border border-[#B91C1C]/30">
                    🎯 Target Skill: {scen.primary_capability || scen.target_capabilities?.[0] || 'Leadership Capability'}
                  </span>
                </div>

                {/* Tactical Coaching Clue Teaser */}
                {scen.tactical_coaching_clue && (
                  <div className="mt-3.5 rounded-xl border border-amber-400/60 bg-amber-50/90 dark:border-[#DC2626]/40 dark:bg-[#0B192C] p-3 text-xs text-slate-800 dark:text-amber-100 flex items-start space-x-2">
                    <Lightbulb className="h-4 w-4 text-[#B91C1C] flex-shrink-0 mt-0.5" />
                    <p className="line-clamp-2 italic font-medium leading-relaxed">
                      "{scen.tactical_coaching_clue}"
                    </p>
                  </div>
                )}

                {/* Duration Benchmark */}
                <div className="mt-3.5 flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                  <Clock className="h-3.5 w-3.5 text-[#B91C1C]" />
                  <span>Est. {Math.round(scen.duration_limit_seconds / 60)} minutes</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 border-t border-slate-200 dark:border-[#1E3E62] pt-4 flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">Briefing Dossier</span>
                <span className="rounded-xl bg-[#0B192C] group-hover:bg-[#1E3E62] text-white dark:bg-[#1E3E62] dark:group-hover:bg-[#2D5B8D] border border-transparent dark:border-[#2D5B8D] px-4 py-1.5 text-xs font-bold transition shadow-sm">
                  Start Practice
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Briefing Modal */}
      {briefingScenario && (
        <ScenarioBriefingModal
          scenario={briefingScenario}
          onClose={() => setBriefingScenario(null)}
          onStartSimulation={onLaunchSimulation}
          isStarting={isStarting}
          completedAttemptsCount={mySessions.filter((s) => (s.scenario_id === briefingScenario.id || s.scenario_title === briefingScenario.title) && s.status === 'completed').length}
        />
      )}
    </div>
  );
};
