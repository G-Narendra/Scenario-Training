import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ScenarioDetail, ScenarioListItem } from '../types';
import { ScenarioBriefingModal } from '../components/ScenarioBriefingModal';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { Clock, Lightbulb, Search } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [difficultyFilter, setDifficultyFilter] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [briefingScenario, setBriefingScenario] = useState<ScenarioDetail | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getScenarios({ track: selectedTrack })
      .then((data) => setScenarios(data))
      .catch((err) => console.error('Failed to load scenarios', err))
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
      {/* Top Header */}
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
              {selectedTrack === 'sales' ? 'Enterprise Sales Scenarios' : 'Executive Leadership Scenarios'}
            </span>
          </nav>
          <div className="flex items-center space-x-3 mt-1">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white font-heading">
              {selectedTrack === 'sales' ? 'Enterprise Sales Scenarios' : 'Executive Leadership Scenarios'}
            </h1>
            <span className="rounded-full bg-[#FF6500]/15 px-3 py-1 text-xs font-bold text-[#FF6500] border border-[#FF6500]/30">
              {scenarios.length} Scenarios Available
            </span>
          </div>
          <p className="mt-1 text-base text-slate-700 dark:text-slate-200 font-medium">
            Select an executive scenario, review the briefing, and start your practice session.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search scenarios, capabilities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-[#FF6500] focus:outline-none focus:ring-2 focus:ring-[#FF6500]/25 shadow-sm dark:border-[#2D5B8D] dark:bg-[#132B45] dark:text-white dark:placeholder-slate-500"
          />
        </div>
      </div>

      {/* Difficulty Level Tabs Filter */}
      <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-[#1E3E62] pb-4">
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
                ? 'bg-[#FF6500] text-white shadow-sm shadow-[#FF6500]/30'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 dark:bg-[#132B45] dark:text-slate-200 dark:hover:bg-[#1E3E62] dark:border-[#2D5B8D]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Scenario Grid */}
      {loading ? (
        <div className="mt-12 text-center py-16 text-slate-500 dark:text-slate-400 flex items-center justify-center space-x-3">
          <div className="h-6 w-6 animate-spin rounded-full border-3 border-[#FF6500] border-t-transparent" />
          <span className="text-base font-semibold">Loading 3H Solutions Scenarios...</span>
        </div>
      ) : filteredScenarios.length === 0 ? (
        <div className="mt-12 text-center py-16 text-slate-500 dark:text-slate-400 text-base font-medium">
          No scenarios found matching your selected filters.
        </div>
      ) : (
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

                {/* Tactical Coaching Clue Teaser (High Contrast) */}
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
