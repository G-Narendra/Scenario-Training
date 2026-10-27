import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { CapabilityItem, ScenarioDetail, ScenarioListItem } from '../types';
import { ScenarioBriefingModal } from '../components/ScenarioBriefingModal';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { ArrowRight, BookOpen, Clock, Lightbulb, Search, Sparkles } from 'lucide-react';

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
    { key: 'all', label: 'All Capabilities' },
    { key: 'Strategy & Market Leadership', label: 'Strategy & Market Leadership' },
    { key: 'Cognitive Agility & Problem Solving', label: 'Cognitive Agility & Problem Solving' },
    { key: 'People Leadership & Culture', label: 'People Leadership & Culture' },
    { key: 'Operational Execution & Governance', label: 'Operational Execution & Governance' },
    { key: 'Personal Mastery & Resilience', label: 'Personal Mastery & Resilience' },
    { key: 'Influence & Executive Presence', label: 'Influence & Executive Presence' },
  ];

  const filteredCapabilities = capabilities.filter((cap) => {
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
      const q = searchQuery.toLowerCase();
      const matchName = (cap.name || '').toLowerCase().includes(q);
      const matchDesc = (cap.description || '').toLowerCase().includes(q);
      const matchPillar = (cap.pillar || '').toLowerCase().includes(q);
      const matchNum = String(cap.number) === q;
      const matchScenario = (cap.matching_scenario_title || '').toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchPillar && !matchNum && !matchScenario) return false;
    }
    return true;
  });

  const filteredScenarios = scenarios.filter((s) => {
    if (difficultyFilter !== 'all') {
      const tier = s.difficulty_level || (s.difficulty <= 1 ? 'Normal' : s.difficulty <= 3 ? 'Challenging' : 'Crisis');
      if (tier !== difficultyFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchTopic = s.topic.toLowerCase().includes(q);
      const matchTags = s.tags.some((t) => t.toLowerCase().includes(q));
      const matchCapabilities = s.target_capabilities?.some((c) => c.toLowerCase().includes(q));
      if (!matchTitle && !matchTopic && !matchTags && !matchCapabilities) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-[#FF6500] mb-2">
            <span className="rounded-full bg-[#FF6500]/10 px-3 py-0.5 text-xs font-bold text-[#FF6500] border border-[#FF6500]/30">
              3H Solutions Executive Training
            </span>
          </div>
          <div className="flex items-center space-x-3 mt-1">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white font-heading">
              {viewMode === 'capabilities'
                ? 'Executive Curriculum & Core Capabilities'
                : trackFilter === 'sales'
                ? 'Enterprise Sales Scenarios'
                : trackFilter === 'leadership'
                ? 'Executive Leadership Scenarios'
                : 'Executive Practice Scenarios'}
            </h1>
          </div>
          {viewMode === 'scenarios' && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 font-medium">
              Select an authentic workplace scenario, review the briefing dossier, and begin deliberate practice.
            </p>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={viewMode === 'capabilities' ? 'Search capabilities...' : 'Search scenarios, skills...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-[#FF6500] focus:outline-none focus:ring-2 focus:ring-[#FF6500]/25 shadow-sm dark:border-[#2D5B8D] dark:bg-[#132B45] dark:text-white dark:placeholder-slate-500"
          />
        </div>
      </div>

      {/* View Mode Switcher: Capabilities vs Practice Scenarios */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-[#1E3E62] pb-4">
        <div className="flex items-center space-x-2">
          <button
            id="view-mode-capabilities-btn"
            onClick={() => setViewMode('capabilities')}
            className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              viewMode === 'capabilities'
                ? 'bg-[#FF6500] text-white shadow-md shadow-[#FF6500]/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#0B192C] dark:text-slate-300 dark:hover:bg-[#1E3E62]'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Capability Curriculum</span>
          </button>

          <button
            id="view-mode-scenarios-btn"
            onClick={() => setViewMode('scenarios')}
            className={`flex items-center space-x-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              viewMode === 'scenarios'
                ? 'bg-[#FF6500] text-white shadow-md shadow-[#FF6500]/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#0B192C] dark:text-slate-300 dark:hover:bg-[#1E3E62]'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Practice Scenarios</span>
          </button>
        </div>

        {viewMode === 'scenarios' ? (
          /* Track & Difficulty Filters for Scenarios (Dropdowns) */
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 bg-white dark:bg-[#132B45] border-2 border-slate-300 dark:border-[#1E3E62] rounded-xl px-3 py-1.5 shadow-sm">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Track:</span>
              <select
                id="scenario-track-filter"
                value={trackFilter}
                onChange={(e) => setTrackFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer pr-2"
              >
                <option value="all" className="dark:bg-[#0B192C]">All Scenarios</option>
                <option value="leadership" className="dark:bg-[#0B192C]">Leadership</option>
                <option value="sales" className="dark:bg-[#0B192C]">Sales</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 bg-white dark:bg-[#132B45] border-2 border-slate-300 dark:border-[#1E3E62] rounded-xl px-3 py-1.5 shadow-sm">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Difficulty:</span>
              <select
                id="scenario-difficulty-filter"
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer pr-2"
              >
                <option value="all" className="dark:bg-[#0B192C]">All Levels</option>
                <option value="Normal" className="dark:bg-[#0B192C]">Level 1: Normal</option>
                <option value="Challenging" className="dark:bg-[#0B192C]">Level 2: Challenging</option>
                <option value="Crisis" className="dark:bg-[#0B192C]">Level 3: Crisis</option>
              </select>
            </div>
          </div>
        ) : (
          /* Pillar Dropdown Filter for Capabilities */
          <div className="flex items-center space-x-2 bg-white dark:bg-[#132B45] border-2 border-slate-300 dark:border-[#1E3E62] rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Pillar:</span>
            <select
              id="capability-pillar-filter"
              value={selectedPillar}
              onChange={(e) => setSelectedPillar(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer pr-2"
            >
              {pillars.map((p) => (
                <option key={p.key} value={p.key} className="dark:bg-[#0B192C]">
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF6500] border-t-transparent" />
        </div>
      ) : viewMode === 'capabilities' ? (
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredCapabilities.map((cap) => (
              <div
                key={cap.key}
                id={`capability-card-${cap.key}`}
                className="group flex flex-col justify-between rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-sm dark:border-[#2D5B8D] dark:bg-[#132B45] transition-all duration-200 hover:-translate-y-1 hover:border-[#FF6500] hover:shadow-xl"
              >
                <div>
                  {/* Top Bar: Pillar Tag */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-amber-500/10 dark:bg-[#0B192C] border border-[#FF6500]/30 px-2.5 py-0.5 text-[11px] font-bold text-[#FF6500] uppercase tracking-wider truncate max-w-[200px]">
                      {cap.pillar}
                    </span>
                  </div>

                  {/* Capability Name */}
                  <h3 className="mt-4 text-xl font-black text-slate-900 dark:text-white font-heading group-hover:text-[#FF6500] transition-colors leading-snug">
                    {cap.name}
                  </h3>

                  {/* Executive Description */}
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                    {cap.description}
                  </p>

                  {/* Mapped Practice Scenario Preview */}
                  <div className="mt-4 rounded-xl border border-slate-200 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] p-3 text-xs">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Practice Scenario</span>
                      <span className="text-[#FF6500] font-semibold">Simulated Dialogue</span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white mt-1 text-sm line-clamp-2">
                      {cap.matching_scenario_title || 'Authentic Workplace Dialogue Simulation'}
                    </div>
                    <div className="mt-2 flex items-center space-x-2">
                      <DifficultyBadge
                        difficulty={cap.matching_scenario_difficulty || 2}
                        difficultyLevel={cap.matching_scenario_difficulty_level || 'Challenging'}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Direct Practice Button */}
                <div className="mt-6 border-t border-slate-200 dark:border-[#1E3E62] pt-4 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Executive Practice
                  </span>
                  <button
                    id={`practice-btn-${cap.key || cap.number}`}
                    onClick={() => {
                      if (cap.matching_scenario_id) {
                        handleOpenBriefing(cap.matching_scenario_id);
                      } else if (scenarios.length > 0) {
                        handleOpenBriefing(scenarios[0].id);
                      }
                    }}
                    className="flex items-center space-x-1.5 rounded-xl bg-[#FF6500] hover:bg-[#E05A00] px-4 py-2 text-xs font-bold text-white shadow-sm transition"
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
                className="mt-4 rounded-xl bg-[#FF6500] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#E05A00] transition"
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
      ) : (
        /* ========================================================================= */
        /* SCENARIO CATALOG GRID                                                     */
        /* ========================================================================= */
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredScenarios.map((scen) => (
            <div
              key={scen.id}
              id={`scenario-card-${scen.slug}`}
              onClick={() => handleOpenBriefing(scen.id)}
              className="group flex flex-col justify-between cursor-pointer rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-sm dark:border-[#2D5B8D] dark:bg-[#132B45] transition-all duration-200 hover:-translate-y-1 hover:border-[#FF6500] hover:shadow-xl"
            >
              <div>
                {/* Card Top: Topic & Difficulty Badge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-slate-100 dark:bg-[#0B192C] border border-slate-300 dark:border-[#1E3E62] px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {scen.topic.replace(/_/g, ' ')}
                  </span>
                  <DifficultyBadge difficulty={scen.difficulty} difficultyLevel={scen.difficulty_level} size="sm" />
                </div>

                {/* Scenario Title */}
                <h3 className="mt-4 text-xl font-black text-slate-900 dark:text-white font-heading group-hover:text-[#FF6500] transition-colors leading-snug">
                  {scen.title}
                </h3>

                {/* Primary Target Capability Highlight */}
                <div className="mt-2.5">
                  <span className="inline-flex items-center rounded-md bg-[#FF6500]/15 px-2.5 py-1 text-xs font-bold text-[#FF6500] border border-[#FF6500]/30">
                    🎯 Target Skill: {scen.primary_capability || scen.target_capabilities?.[0] || 'Leadership Capability'}
                  </span>
                </div>

                {/* Tactical Coaching Clue Teaser */}
                {scen.tactical_coaching_clue && (
                  <div className="mt-3.5 rounded-xl border border-amber-400/60 bg-amber-50/90 dark:border-[#FF6500]/40 dark:bg-[#0B192C] p-3 text-xs text-slate-800 dark:text-amber-100 flex items-start space-x-2">
                    <Lightbulb className="h-4 w-4 text-[#FF6500] flex-shrink-0 mt-0.5" />
                    <p className="line-clamp-2 italic font-medium leading-relaxed">
                      "{scen.tactical_coaching_clue}"
                    </p>
                  </div>
                )}

                {/* Duration Benchmark */}
                <div className="mt-3.5 flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                  <Clock className="h-3.5 w-3.5 text-[#FF6500]" />
                  <span>Est. {Math.round(scen.duration_limit_seconds / 60)} minutes</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 border-t border-slate-200 dark:border-[#1E3E62] pt-4 flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">Briefing Dossier</span>
                <span className="rounded-xl bg-[#FF6500] group-hover:bg-[#E05A00] px-4 py-1.5 text-xs font-bold text-white shadow-sm transition">
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
