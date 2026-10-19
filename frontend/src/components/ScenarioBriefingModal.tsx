import React, { useState } from 'react';
import { Clock, MessageSquare, Mic, Sparkles, X, Target, UserCheck, Shield } from 'lucide-react';
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
              <DifficultyBadge difficulty={scenario.difficulty} difficultyLevel={scenario.difficulty_level} size="sm" />
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
          {/* Primary Capability Banner */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:border-[#1E3E62] dark:bg-[#0B192C] p-4 shadow-sm">
            <div className="flex items-center space-x-2 text-xs font-bold text-[#FF6500] uppercase tracking-wider">
              <Target className="h-4 w-4 text-[#FF6500]" />
              <span>Core Focus Area</span>
            </div>
            <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
              {scenario.primary_capability || scenario.target_capabilities?.[0] || 'Executive Competency'}
            </p>
          </div>

          {/* Tactical Coaching Clue — Prominent high-contrast card */}
          {scenario.tactical_coaching_clue && (
            <TacticalClueCard
              clue={scenario.tactical_coaching_clue}
              scenarioTitle={scenario.title}
              targetCapabilities={scenario.target_capabilities}
            />
          )}

          {/* CRITICAL ROLE CLARITY: WHO IS THE STUDENT VS WHO IS THE AI */}
          <div className="rounded-2xl border-2 border-[#FF6500]/60 bg-gradient-to-br from-[#FF6500]/15 via-[#FF6500]/5 to-transparent p-5 shadow-sm">
            <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-[#FF6500] mb-3">
              <UserCheck className="h-4 w-4" />
              <span>Your Role & Mission in This Scenario</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] p-4">
                <div className="flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-wider text-[#FF6500]">
                  <Shield className="h-3.5 w-3.5" />
                  <span>You Are (The Student)</span>
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white mt-1">
                  {scenario.track === 'sales' ? 'Enterprise Account Executive / Seller' : 'Direct Manager / Team Leader'}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed font-medium">
                  {scenario.track === 'sales'
                    ? `You are in a strategic negotiation meeting with ${scenario.persona.name}. You lead the conversation to navigate objections and secure agreement.`
                    : `${scenario.persona.name} is a key team member who reports to you. You are running this performance/operational meeting.`}
                </p>
              </div>

              <div className="rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Simulated AI Counterpart
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white mt-1">
                  {scenario.persona.name} • <span className="text-xs font-semibold text-[#FF6500]">{scenario.persona.role}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed font-medium">
                  Communication Style: {scenario.persona.communication_style}
                </p>
              </div>
            </div>
          </div>

          {/* Situation Brief */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
              Context & Situation
            </h3>
            <div className="rounded-2xl border border-slate-300 bg-slate-50 dark:border-[#1E3E62] dark:bg-[#0B192C] p-5 text-base text-slate-900 dark:text-white leading-relaxed whitespace-pre-line font-medium">
              {scenario.brief}
            </div>
          </div>

          {/* Conversation partner profile */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
              Counterpart
            </h3>
            <div className="flex items-start space-x-4 rounded-2xl border border-slate-300 bg-slate-50 dark:border-[#1E3E62] dark:bg-[#0B192C] p-5">
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#0B192C] border border-[#1E3E62] font-bold text-base text-white shadow-sm avatar-counterpart"
                style={{ color: '#ffffff' }}
              >
                <span className="text-white font-bold" style={{ color: '#ffffff' }}>
                  {scenario.persona.name.split(' ').map((n) => n[0]).join('')}
                </span>
              </div>
              <div className="text-sm flex-1">
                <div className="font-bold text-slate-900 dark:text-white text-base">{scenario.persona.name}</div>
                <div className="text-xs font-semibold text-[#FF6500] uppercase tracking-wider">{scenario.persona.role}</div>
                <div className="mt-2 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  <span className="font-semibold text-slate-900 dark:text-white">Communication Style: </span>
                  {scenario.persona.communication_style}
                </div>
              </div>
            </div>
          </div>

          {/* Key Competencies Evaluated */}
          {scenario.target_capabilities && scenario.target_capabilities.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2 flex items-center space-x-1.5">
                <Target className="h-4 w-4 text-[#FF6500]" />
                <span>Competencies Evaluated</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {scenario.target_capabilities.map((cap, i) => (
                  <span
                    key={i}
                    className="rounded-lg border border-slate-300 bg-white dark:border-[#1E3E62] dark:bg-[#0B192C] px-3 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100"
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
                ~{Math.round(scenario.duration_limit_seconds / 60)} minutes
              </div>
            </div>

            <div className="rounded-2xl border border-slate-300 bg-slate-50 dark:border-[#1E3E62] dark:bg-[#0B192C] p-4">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                <Sparkles className="h-4 w-4 text-[#FF6500]" />
                <span>Competency Rubrics</span>
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
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
              Select Practice Mode
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="mode-select-text"
                onClick={() => setSelectedMode('text')}
                className={`flex items-center space-x-3 rounded-2xl border-2 p-4 text-left transition ${
                  selectedMode === 'text'
                    ? 'border-[#FF6500] bg-amber-50 text-slate-900 ring-2 ring-[#FF6500]/30 dark:bg-[#0B192C] dark:text-white dark:border-[#FF6500]'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-[#1E3E62] dark:bg-[#0B192C] dark:text-slate-300 dark:hover:border-[#2D5B8D]'
                }`}
              >
                <MessageSquare className={`h-5 w-5 ${selectedMode === 'text' ? 'text-[#FF6500]' : 'text-slate-500'}`} />
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Text Practice</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Interactive direct dialogue</div>
                </div>
              </button>

              <button
                type="button"
                id="mode-select-voice"
                onClick={() => setSelectedMode('voice')}
                className={`flex items-center space-x-3 rounded-2xl border-2 p-4 text-left transition ${
                  selectedMode === 'voice'
                    ? 'border-[#FF6500] bg-amber-50 text-slate-900 ring-2 ring-[#FF6500]/30 dark:bg-[#0B192C] dark:text-white dark:border-[#FF6500]'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-[#1E3E62] dark:bg-[#0B192C] dark:text-slate-300 dark:hover:border-[#2D5B8D]'
                }`}
              >
                <Mic className={`h-5 w-5 ${selectedMode === 'voice' ? 'text-[#FF6500]' : 'text-slate-500'}`} />
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Voice Practice</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Speech dialogue with audio</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="border-t border-slate-300 dark:border-[#1E3E62] p-6 bg-slate-50 dark:bg-[#0B192C] flex items-center justify-between">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            10 practice attempts allocated per scenario
          </div>

          <button
            id="start-simulation-btn"
            onClick={() => onStartSimulation(scenario.id, selectedMode)}
            disabled={isStarting}
            className="flex items-center space-x-2 rounded-xl bg-[#FF6500] hover:bg-[#E05A00] px-7 py-3 text-base font-bold text-white shadow-lg shadow-[#FF6500]/30 transition disabled:opacity-50"
          >
            <span>{isStarting ? 'Starting Practice...' : 'Start Practice'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
