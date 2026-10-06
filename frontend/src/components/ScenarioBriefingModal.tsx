import React, { useState } from 'react';
import { Clock, MessageSquare, Mic, ShieldAlert, Sparkles, User, X } from 'lucide-react';
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl z-10 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 p-6">
          <div>
            <div className="flex items-center space-x-2">
              <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 capitalize">
                {scenario.track} Track
              </span>
              <span className="text-xs text-slate-400">• Level {scenario.difficulty} of 5</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold text-white tracking-tight">
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
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              The Situation
            </h3>
            <div className="mt-2 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {scenario.brief}
            </div>
          </div>

          {/* Counterpart Persona Profile */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Your Counterpart
            </h3>
            <div className="mt-2 flex items-start space-x-4 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 text-cyan-400">
                <User className="h-6 w-6" />
              </div>
              <div className="text-sm">
                <div className="font-bold text-white text-base">{scenario.persona.name}</div>
                <div className="text-xs font-medium text-cyan-400">{scenario.persona.role}</div>
                <div className="mt-1.5 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Style: </span>
                  {scenario.persona.communication_style}
                </div>
              </div>
            </div>
          </div>

          {/* Assessed Skills & Parameters */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Clock className="h-4 w-4 text-cyan-400" />
                <span>Session Limits</span>
              </div>
              <div className="mt-2 text-sm text-slate-300">
                Max {Math.round(scenario.duration_limit_seconds / 60)} minutes • {scenario.turn_limit} turns
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <span>Skills Evaluated</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {scenario.skills_assessed.map((s) => (
                  <span
                    key={s.skill}
                    className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300"
                  >
                    {s.skill.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Mode Selector (Text vs Voice) */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Select Interaction Mode
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="mode-select-text"
                onClick={() => setSelectedMode('text')}
                className={`flex items-center space-x-3 rounded-2xl border p-4 text-left transition ${
                  selectedMode === 'text'
                    ? 'border-cyan-500 bg-cyan-500/10 text-white'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <MessageSquare className="h-5 w-5 text-cyan-400" />
                <div>
                  <div className="text-sm font-semibold text-white">Interactive Text Chat</div>
                  <div className="text-xs text-slate-400">Real-time token streaming</div>
                </div>
              </button>

              <button
                type="button"
                id="mode-select-voice"
                onClick={() => setSelectedMode('voice')}
                className={`flex items-center space-x-3 rounded-2xl border p-4 text-left transition ${
                  selectedMode === 'voice'
                    ? 'border-indigo-500 bg-indigo-500/10 text-white'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Mic className="h-5 w-5 text-indigo-400" />
                <div>
                  <div className="text-sm font-semibold text-white">Realtime Voice Mode</div>
                  <div className="text-xs text-slate-400">Spoken dialogue & speech</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="border-t border-slate-800 p-6 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <span>Counterpart will introduce realistic pushback.</span>
          </div>

          <button
            id="start-simulation-btn"
            onClick={() => onStartSimulation(scenario.id, selectedMode)}
            disabled={isStarting}
            className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 hover:opacity-95 transition disabled:opacity-50"
          >
            <span>{isStarting ? 'Launching Simulation...' : 'Start Simulation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
