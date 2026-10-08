import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ScenarioDetail, ScenarioListItem } from '../types';
import { ScenarioBriefingModal } from '../components/ScenarioBriefingModal';
import { ArrowLeft, Clock, Filter, Search } from 'lucide-react';

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
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<number | 'all'>('all');
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

  const topics = Array.from(new Set(scenarios.map((s) => s.topic)));

  const filteredScenarios = scenarios.filter((s) => {
    if (selectedTopic !== 'all' && s.topic !== selectedTopic) return false;
    if (difficultyFilter !== 'all' && s.difficulty !== difficultyFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchTopic = s.topic.toLowerCase().includes(q);
      const matchTags = s.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchTopic && !matchTags) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <button
            onClick={onBackToTracks}
            className="group flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-indigo-400 transition"
          >
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
            <span>Choose another track</span>
          </button>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white font-heading">
            {selectedTrack === 'sales' ? 'Sales Mastery Scenarios' : 'Leadership Mastery Scenarios'}
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Select a high-stakes conversation, review the briefing dossier, and launch your simulation.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search scenarios by title, topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-md"
          />
        </div>
      </div>

      {/* Filter Controls */}
      <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-4">
        <div className="flex items-center space-x-1 text-xs font-bold uppercase tracking-wider text-slate-400 mr-2">
          <Filter className="h-3.5 w-3.5 text-indigo-400" />
          <span>Topic:</span>
        </div>
        <button
          onClick={() => setSelectedTopic('all')}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
            selectedTopic === 'all'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
              : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          All Topics
        </button>
        {topics.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTopic(t)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition ${
              selectedTopic === t
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {t.replace(/_/g, ' ')}
          </button>
        ))}

        {/* Difficulty Filter */}
        <div className="ml-auto flex items-center space-x-1.5 text-xs text-slate-300">
          <span className="font-semibold text-slate-400">Level:</span>
          <select
            value={difficultyFilter}
            onChange={(e) =>
              setDifficultyFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Levels</option>
            <option value="1">Level 1 (Foundation)</option>
            <option value="2">Level 2 (Standard)</option>
            <option value="3">Level 3 (Challenging)</option>
            <option value="4">Level 4 (Advanced)</option>
            <option value="5">Level 5 (Mastery)</option>
          </select>
        </div>
      </div>

      {/* Scenario Grid */}
      {loading ? (
        <div className="mt-12 text-center py-12 text-slate-400 flex items-center justify-center space-x-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          <span>Loading ScenarioLab scenarios...</span>
        </div>
      ) : filteredScenarios.length === 0 ? (
        <div className="mt-12 text-center py-12 text-slate-500">No scenarios found matching your filters.</div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredScenarios.map((scen) => (
            <div
              key={scen.id}
              id={`scenario-card-${scen.slug}`}
              onClick={() => handleOpenBriefing(scen.id)}
              className="group flex flex-col justify-between cursor-pointer rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/10"
            >
              <div>
                {/* Card Top: Topic & Difficulty Dots */}
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-indigo-500/15 border border-indigo-500/20 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                    {scen.topic.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center space-x-1" title={`Difficulty Level: ${scen.difficulty}/5`}>
                    {[1, 2, 3, 4, 5].map((d) => (
                      <div
                        key={d}
                        className={`h-2 w-2 rounded-full ${
                          d <= scen.difficulty ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <h3 className="mt-4 text-lg font-black text-white font-heading group-hover:text-indigo-300 transition-colors">
                  {scen.title}
                </h3>

                <div className="mt-3 flex items-center space-x-2 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span>Est. {Math.round(scen.duration_limit_seconds / 60)} minutes</span>
                </div>

                {/* Skills Preview */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {scen.skills_assessed.slice(0, 3).map((s) => (
                    <span
                      key={s.skill}
                      className="rounded-lg bg-slate-950/80 px-2 py-0.5 text-[10px] font-medium text-slate-300 border border-slate-800"
                    >
                      {s.skill.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {scen.skills_assessed.length > 3 && (
                    <span className="text-[10px] text-slate-500 self-center">
                      +{scen.skills_assessed.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 border-t border-slate-800/80 pt-4 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Scenario Briefing</span>
                <span className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 group-hover:opacity-95 transition">
                  Start Simulation
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
