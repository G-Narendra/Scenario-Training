import React, { useState } from 'react';
import { Clock, MessageSquare, Mic, ShieldAlert, Sparkles, X, Target } from 'lucide-react';
import { ScenarioDetail } from '../types';
import { DifficultyBadge } from './DifficultyBadge';
import { TacticalClueCard } from './TacticalClueCard';

interface ScenarioBriefingModalProps {
  scenario: ScenarioDetail;
  onClose: () => void;
  onStartSimulation: (scenarioId: string, mode: 'text' | 'voice') => void;
  isStarting: boolean;
}

export const ScenarioBriefingModal: React.FC<ScenarioBriefingModalProps> = ({
  scenario,
  onClose,
  onStartSimulation,
  isStarting,
}) => {
  const [selectedMode, setSelectedMode] = useState<'text' | 'voice'>('text');

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/70 dark:bg-[#0B192C]/85 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border-2 border-slate-300 bg-white dark:border-[#2D5B8D] dark:bg-[#132B45] shadow-2xl z-10 max-h-[90vh] flex flex-col transition-colors duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-300 dark:border-[#1E3E62] p-6 bg-slate-50 dark:bg-[#0B192C]">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="rounded-full bg-[#FF6500]/15 border border-[#FF6500]/30 px-2.5 py-0.5 text-xs font-bold text-[#FF6500] uppercase tracking-wider">
                {scenario.track} Track
              </span>
              <DifficultyBadge difficulty={scenario.difficulty} size="sm" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-heading">
              {scenario.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-[#1E3E62] dark:hover:text-white transition"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Tactical Coaching Clue — Prominent high-contrast card */}
          {scenario.tactical_coaching_clue && (
            <TacticalClueCard
              clue={scenario.tactical_coaching_clue}
              scenarioTitle={scenario.title}
              targetCapabilities={scenario.target_capabilities}
            />
          )}

          {/* Situation Brief */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Organizational Context & Situation
            </h3>
            <div className="rounded-2xl border border-slate-300 bg-slate-50 dark:border-[#1E3E62] dark:bg-[#0B192C] p-5 text-base sm:text-[17px] text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-line font-medium">
              {scenario.brief}
            </div>
          </div>

          {/* Conversation partner profile */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
              Simulated Counterpart Character
            </h3>
            <div className="flex items-start space-x-4 rounded-2xl border border-slate-300 bg-slate-50 dark:border-[#1E3E62] dark:bg-[#0B192C] p-5">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#0B192C] to-[#1E3E62] border border-[#FF6500]/50 font-black text-lg text-[#FF6500] shadow-md">
                {scenario.persona.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="text-sm flex-1">
                <div className="font-black text-slate-900 dark:text-white text-lg">{scenario.persona.name}</div>
                <div className="text-xs font-bold text-[#FF6500] uppercase tracking-wider">{scenario.persona.role}</div>
                <div className="mt-2 text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  <span className="font-bold text-slate-900 dark:text-slate-100">Communication Persona: </span>
                  {scenario.persona.communication_style}
                </div>
              </div>
            </div>
          </div>

          {/* Target Capabilities (160 Rubric) */}
          {scenario.target_capabilities && scenario.target_capabilities.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2 flex items-center space-x-1.5">
                <Target className="h-4 w-4 text-[#FF6500]" />
                <span>Target Leadership Capabilities (160 Rubric)</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {scenario.target_capabilities.map((cap, i) => (
                  <span
                    key={i}
                    className="rounded-lg border border-[#FF6500]/40 bg-amber-50 dark:bg-[#0B192C] px-3 py-1 text-xs font-semibold text-slate-900 dark:text-amber-200"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Assessed Skills & Parameters */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-300 bg-slate-50 dark:border-[#1E3E62] dark:bg-[#0B192C] p-4">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <Clock className="h-4 w-4 text-[#FF6500]" />
                <span>Duration Benchmark</span>
              </div>
              <div className="mt-2 text-sm text-slate-900 dark:text-slate-100 font-bold">
                ~{Math.round(scenario.duration_limit_seconds / 60)} minutes • Up to {scenario.turn_limit} exchanges
              </div>
            </div>

            <div className="rounded-2xl border border-slate-300 bg-slate-50 dark:border-[#1E3E62] dark:bg-[#0B192C] p-4">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <Sparkles className="h-4 w-4 text-[#FF6500]" />
                <span>Evaluation Rubrics</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {scenario.skills_assessed.map((s) => (
                  <span
                    key={s.skill}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-800 dark:border-[#2D5B8D] dark:bg-[#1E3E62] dark:text-slate-200"
                  >
                    {s.skill.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Mode Selector (Text vs Voice) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Select Simulation Mode
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="mode-select-text"
                onClick={() => setSelectedMode('text')}
                className={`flex items-center space-x-3 rounded-2xl border p-4 text-left transition ${
                  selectedMode === 'text'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/30 dark:bg-indigo-500/15 dark:text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400 dark:hover:border-slate-700'
                }`}
              >
                <MessageSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Text Roleplay</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Type responses with live streaming</div>
                </div>
              </button>

              <button
                type="button"
                id="mode-select-voice"
                onClick={() => setSelectedMode('voice')}
                className={`flex items-center space-x-3 rounded-2xl border p-4 text-left transition ${
                  selectedMode === 'voice'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/30 dark:bg-indigo-500/15 dark:text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400 dark:hover:border-slate-700'
                }`}
              >
                <Mic className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Voice Roleplay</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Speech-to-speech with natural cadence</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-6 bg-slate-50 dark:bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldAlert className="h-4 w-4 text-amber-500 dark:text-amber-400" />
            <span>Your counterpart pushes back realistically based on your questions and tone.</span>
          </div>

          <button
            id="start-simulation-btn"
            onClick={() => onStartSimulation(scenario.id, selectedMode)}
            disabled={isStarting}
            className="flex items-center space-x-2 rounded-xl bg-[#FF6500] hover:bg-[#E05A00] px-7 py-3 text-base font-bold text-white shadow-lg shadow-[#FF6500]/30 transition disabled:opacity-50"
          >
            <span>{isStarting ? 'Launching Simulation...' : 'Launch Simulation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
