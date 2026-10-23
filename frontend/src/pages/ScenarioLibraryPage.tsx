import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { CapabilityItem, ScenarioDetail, ScenarioListItem } from '../types';
import { ScenarioBriefingModal } from '../components/ScenarioBriefingModal';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { ArrowRight, BookOpen, Clock, Lightbulb, Search, Sparkles, Target } from 'lucide-react';

interface ScenarioLibraryPageProps {
  selectedTrack: string;
  onBackToTracks: () => void;
  onLaunchSimulation: (scenarioId: string, mode: 'text' | 'voice') => void;
  isStarting: boolean;
}

export const ScenarioLibraryPage: React.FC<ScenarioLibraryPageProps> = ({
  selectedTrack,
  onBackToTracks,
  onLaunchSimulation,
  isStarting,
}) => {
  const [scenarios, setScenarios] = useState<ScenarioListItem[]>([]);
  const [capabilities, setCapabilities] = useState<CapabilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'scenarios' | 'capabilities'>('scenarios');
  const [difficultyFilter, setDifficultyFilter] = useState<string | 'all'>('all');
  const [selectedPillar, setSelectedPillar] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [briefingScenario, setBriefingScenario] = useState<ScenarioDetail | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getScenarios({ track: selectedTrack }),
      api.getCapabilities().catch(() => [] as CapabilityItem[]),
    ])
      .then(([scenData, capData]) => {
        setScenarios(scenData);
        setCapabilities(capData);
      })
      .catch((err) => console.error('Failed to load scenarios/capabilities', err))
      .finally(() => setLoading(false));
  }, [selectedTrack]);

  const handleOpenBriefing = async (scenId: string) => {
    try {
      const detail = await api.getScenarioDetail(scenId);
      setBriefingScenario(detail);
    } catch (err) {
      console.error('Failed to load scenario detail', err);
    }
  };

  const pillars = [
    { key: 'all', label: 'All 60 Capabilities' },
    { key: 'Strategic & Market Leadership', label: '1. Strategy & Market (#1-10)' },
    { key: 'Cognitive Agility & Problem Solving', label: '2. Cognitive Agility (#11-20)' },
    { key: 'People Leadership & Culture', label: '3. People & Culture (#21-30)' },
    { key: 'Operational Execution & Performance', label: '4. Operational Execution (#31-40)' },
    { key: 'Personal Mastery & Resilience', label: '5. Personal Mastery (#41-50)' },
    { key: 'Influence, Communication & Executive Presence', label: '6. Influence & Presence (#51-60)' },
  ];

  const filteredCapabilities = capabilities.filter((cap) => {
    if (selectedPillar !== 'all' && cap.pillar !== selectedPillar) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = cap.name.toLowerCase().includes(q);
      const matchDesc = cap.description.toLowerCase().includes(q);
      const matchPillar = cap.pillar.toLowerCase().includes(q);
      const matchNum = String(cap.number) === q;
      if (!matchName && !matchDesc && !matchPillar && !matchNum) return false;
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

  const difficultyTabs: Array<{ level: string | 'all'; label: string }> = [
    { level: 'all', label: 'All Scenarios' },
    { level: 'Normal', label: 'Level 1: Normal' },
    { level: 'Challenging', label: 'Level 2: Challenging' },
    { level: 'Crisis', label: 'Level 3: Crisis' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <nav className="flex items-center space-x-2 text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
            <button
              onClick={onBackToTracks}
              className="rounded-lg bg-slate-100 dark:bg-[#132B45] border border-slate-300 dark:border-[#1E3E62] px-2.5 py-1 text-slate-700 dark:text-slate-200 hover:text-[#FF6500] dark:hover:text-[#FF6500] transition"
            >
              Curriculum Tracks
            </button>
            <span className="text-slate-400">›</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {selectedTrack === 'sales' ? 'Enterprise Sales Curriculum' : '3H Solutions Executive Curriculum'}
            </span>
          </nav>
          <div className="flex items-center space-x-3 mt-1">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white font-heading">
              {viewMode === 'capabilities'
                ? "Uzair's 60 Executive Capabilities"
                : selectedTrack === 'sales'
                ? 'Enterprise Sales Scenarios'
                : 'Executive Leadership Scenarios'}
            </h1>
            <span className="rounded-full bg-[#FF6500]/15 px-3 py-1 text-xs font-bold text-[#FF6500] border border-[#FF6500]/30">
              {viewMode === 'capabilities' ? `${capabilities.length} Capabilities` : `${scenarios.length} Scenarios Available`}
            </span>
          </div>
          <p className="mt-1 text-base text-slate-700 dark:text-slate-200 font-medium">
            {viewMode === 'capabilities'
              ? 'Browse all 60 core competencies across 6 strategic pillars. Select any capability to launch a targeted practice session.'
              : 'Select an executive scenario, review the briefing dossier, and begin deliberate workplace practice.'}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={viewMode === 'capabilities' ? 'Search 60 capabilities...' : 'Search scenarios, skills...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-[#FF6500] focus:outline-none focus:ring-2 focus:ring-[#FF6500]/25 shadow-sm dark:border-[#2D5B8D] dark:bg-[#132B45] dark:text-white dark:placeholder-slate-500"
          />
        </div>
      </div>

      {/* View Mode Switcher: Scenarios vs 60 Capabilities */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-[#1E3E62] pb-4">
        <div className="flex items-center space-x-2">
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
            <span>Scenario Catalog ({scenarios.length})</span>
          </button>

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
            <span>Uzair's 60 Capabilities Matrix</span>
          </button>
        </div>

        {viewMode === 'scenarios' ? (
          /* Difficulty Filters for Scenarios */
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mr-1">
              Difficulty:
            </span>
            {difficultyTabs.map((tab) => (
              <button
                key={String(tab.level)}
                id={`difficulty-filter-${tab.level}`}
                onClick={() => setDifficultyFilter(tab.level)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                  difficultyFilter === tab.level
                    ? 'bg-[#0B192C] text-white border border-[#FF6500] shadow-sm dark:bg-[#FF6500] dark:border-[#FF6500]'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 dark:bg-[#132B45] dark:text-slate-300 dark:border-[#1E3E62] dark:hover:bg-[#1E3E62]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          /* Pillar Filters for 60 Capabilities */
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto max-w-full">
            {pillars.map((p) => (
              <button
                key={p.key}
                onClick={() => setSelectedPillar(p.key)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition whitespace-nowrap ${
                  selectedPillar === p.key
                    ? 'bg-[#FF6500] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#0B192C] dark:text-slate-300 dark:hover:bg-[#1E3E62]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF6500] border-t-transparent" />
        </div>
      ) : viewMode === 'capabilities' ? (
        /* ========================================================================= */
        /* UZAIR'S 60 CAPABILITIES MATRIX (100% COVERAGE & DIRECT PRACTICE)          */
        /* ========================================================================= */
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 dark:border-[#1E3E62] dark:bg-[#0B192C]">
            <div className="flex items-center space-x-2 text-xs font-bold text-[#FF6500] uppercase tracking-wider">
              <Target className="h-4 w-4" />
              <span>Uzair's Shortlisted 60 Executive Capabilities</span>
            </div>
            <p className="mt-1 text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
              Every capability below is mapped directly to realistic workplace practice scenarios. Click <strong>Practice Capability</strong> on any item to review its executive briefing and begin dialogue.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredCapabilities.map((cap) => (
              <div
                key={cap.key}
                id={`capability-card-${cap.number}`}
                className="group flex flex-col justify-between rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-sm dark:border-[#2D5B8D] dark:bg-[#132B45] transition-all duration-200 hover:-translate-y-1 hover:border-[#FF6500] hover:shadow-xl"
              >
                <div>
                  {/* Top Bar: Number Badge + Pillar Tag */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF6500] text-xs font-black text-white shadow-sm">
                      #{cap.number}
                    </span>
                    <span className="rounded-md bg-slate-100 dark:bg-[#0B192C] border border-slate-300 dark:border-[#1E3E62] px-2.5 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate max-w-[200px]">
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
                  {cap.matching_scenario_title && (
                    <div className="mt-4 rounded-xl border border-slate-200 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] p-3 text-xs">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Practice Scenario
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                        {cap.matching_scenario_title}
                      </div>
                      <div className="mt-1 flex items-center space-x-2">
                        <DifficultyBadge difficulty={cap.matching_scenario_difficulty || 2} difficultyLevel={cap.matching_scenario_difficulty_level} size="sm" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct Practice Button */}
                <div className="mt-6 border-t border-slate-200 dark:border-[#1E3E62] pt-4 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Competency #{cap.number}
                  </span>
                  <button
                    onClick={() => {
                      if (cap.matching_scenario_id) {
                        handleOpenBriefing(cap.matching_scenario_id);
                      }
                    }}
                    className="flex items-center space-x-1.5 rounded-xl bg-[#FF6500] hover:bg-[#E05A00] px-4 py-2 text-xs font-bold text-white shadow-sm transition"
                  >
                    <span>Practice Capability</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
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
        />
      )}
    </div>
  );
};
