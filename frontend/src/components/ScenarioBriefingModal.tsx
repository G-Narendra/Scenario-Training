import React, { useState } from 'react';
import { Clock, MessageSquare, Mic, ShieldAlert, Sparkles, X } from 'lucide-react';
import { ScenarioDetail } from '../types';

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
        className="fixed inset-0 bg-[#090D16]/80 backdrop-blur-md transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl z-10 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 p-6 bg-slate-950/40">
          <div>
            <div className="flex items-center space-x-2">
              <span className="rounded-full bg-indigo-500/15 border border-indigo-500/20 px-2.5 py-0.5 text-xs font-bold text-indigo-300 capitalize">
                {scenario.track} Track
              </span>
              <span className="text-xs text-slate-400 font-semibold">• Difficulty Level {scenario.difficulty} of 5</span>
            </div>
            <h2 className="mt-2 text-2xl font-black text-white tracking-tight font-heading">
              {scenario.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Situation Brief */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Scenario Situation & Context
            </h3>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 text-sm text-slate-200 leading-relaxed whitespace-pre-line">
              {scenario.brief}
            </div>
          </div>

          {/* Conversation partner profile */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Simulated Roleplay Partner
            </h3>
            <div className="flex items-start space-x-4 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 font-bold text-white shadow-md shadow-indigo-600/25">
                {scenario.persona.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="text-sm">
                <div className="font-bold text-white text-base">{scenario.persona.name}</div>
                <div className="text-xs font-semibold text-indigo-300">{scenario.persona.role}</div>
                <div className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                  <span className="font-semibold text-slate-400">Behavioral Style: </span>
                  {scenario.persona.communication_style}
                </div>
              </div>
            </div>
          </div>

          {/* Assessed Skills & Parameters */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Clock className="h-4 w-4 text-indigo-400" />
                <span>Duration Benchmark</span>
              </div>
              <div className="mt-2 text-sm text-slate-200 font-semibold">
                ~{Math.round(scenario.duration_limit_seconds / 60)} minutes • Up to {scenario.turn_limit} exchanges
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Sparkles className="h-4 w-4 text-violet-400" />
                <span>Tested Competencies</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {scenario.skills_assessed.map((s) => (
                  <span
                    key={s.skill}
                    className="rounded-lg bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300"
                  >
                    {s.skill.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Mode Selector (Text vs Voice) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Select Simulation Mode
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="mode-select-text"
                onClick={() => setSelectedMode('text')}
                className={`flex items-center space-x-3 rounded-2xl border p-4 text-left transition ${
                  selectedMode === 'text'
                    ? 'border-indigo-500 bg-indigo-500/15 text-white ring-2 ring-indigo-500/30'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <MessageSquare className="h-5 w-5 text-indigo-400" />
                <div>
                  <div className="text-sm font-bold text-white">Text Roleplay</div>
                  <div className="text-xs text-slate-400">Type responses with live streaming</div>
                </div>
              </button>

              <button
                type="button"
                id="mode-select-voice"
                onClick={() => setSelectedMode('voice')}
                className={`flex items-center space-x-3 rounded-2xl border p-4 text-left transition ${
                  selectedMode === 'voice'
                    ? 'border-indigo-500 bg-indigo-500/15 text-white ring-2 ring-indigo-500/30'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Mic className="h-5 w-5 text-indigo-400" />
                <div>
                  <div className="text-sm font-bold text-white">Voice Roleplay</div>
                  <div className="text-xs text-slate-400">Speech-to-speech with natural cadence</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="border-t border-slate-800 p-6 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <span>AI counterpart adapts dynamically with authentic resistance.</span>
          </div>

          <button
            id="start-simulation-btn"
            onClick={() => onStartSimulation(scenario.id, selectedMode)}
            disabled={isStarting}
            className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 hover:opacity-95 transition disabled:opacity-50"
          >
            <span>{isStarting ? 'Launching Simulation...' : 'Launch Simulation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
