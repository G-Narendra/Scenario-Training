import React, { useState, useEffect } from 'react';
import { Lightbulb, Maximize2, X, Compass, CheckCircle2 } from 'lucide-react';

export interface TacticalClueCardProps {
  clue?: string;
  scenarioTitle?: string;
  targetCapabilities?: string[];
  initialExpanded?: boolean;
  className?: string;
}

export const TacticalClueCard: React.FC<TacticalClueCardProps> = ({
  clue,
  scenarioTitle,
  targetCapabilities = [],
  initialExpanded = false,
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(initialExpanded);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  if (!clue) return null;

  return (
    <>
      {/* High-Visibility Tactical Clue Card */}
      <section
        aria-label="Tactical Coaching Clue"
        className={`relative overflow-hidden rounded-xl border-2 border-[#FF6500] bg-[#FFFBEB] dark:bg-[#132B45] p-4 sm:p-5 shadow-lg shadow-[#FF6500]/10 transition-all ${className}`}
      >
        {/* Subtle decorative accent pill */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-300 dark:border-[#1E3E62]">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6500] text-white shadow-sm">
              <Lightbulb className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#B45309] dark:text-[#FBBF24]">
                3H Tactical Coaching Clue
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Senior Executive Guidance
              </p>
            </div>
          </div>

          {/* Modal Expansion Button for Senior Eyesight Accessibility */}
          <button
            id="clue-expand-modal-btn"
            onClick={() => setIsModalOpen(true)}
            aria-label="Expand coaching clue in high-contrast full reader"
            title="Expand clue to high-contrast large print"
            className="flex items-center space-x-1.5 rounded-lg border border-[#FF6500]/40 bg-white dark:bg-[#0B192C] px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-white hover:bg-amber-100 dark:hover:bg-[#1E3E62] transition shadow-sm"
          >
            <Maximize2 className="h-3.5 w-3.5 text-[#FF6500]" />
            <span className="hidden sm:inline">Large Print / Expand</span>
          </button>
        </div>

        {/* Clue Text — minimum 16px high-contrast for senior readability */}
        <p className="text-base sm:text-[17px] font-medium leading-relaxed text-slate-900 dark:text-white">
          {clue}
        </p>

        {/* Target Capabilities Pill Preview */}
        {targetCapabilities.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-amber-200 dark:border-[#1E3E62]/70">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Focus Capabilities:
            </span>
            {targetCapabilities.map((cap, idx) => (
              <span
                key={idx}
                className="inline-flex items-center space-x-1 rounded-md bg-white/80 dark:bg-[#0B192C] px-2 py-0.5 text-xs font-semibold text-[#B45309] dark:text-amber-300 border border-amber-300 dark:border-amber-500/30"
              >
                <CheckCircle2 className="h-3 w-3 text-[#FF6500]" />
                <span>{cap}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Expandable High-Contrast Modal for Senior Trainees */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clue-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6"
        >
          <div className="relative w-full max-w-2xl rounded-2xl border-2 border-[#FF6500] bg-[#0B192C] p-6 sm:p-8 text-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1E3E62] pb-4 mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6500] text-white">
                  <Compass className="h-6 w-6" />
                </div>
                <div>
                  <h3
                    id="clue-modal-title"
                    className="text-xl font-bold tracking-tight text-white font-heading"
                  >
                    Executive Tactical Coaching Clue
                  </h3>
                  {scenarioTitle && (
                    <p className="text-sm text-slate-300">
                      Scenario: {scenarioTitle}
                    </p>
                  )}
                </div>
              </div>
              <button
                id="close-clue-modal-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close high-contrast reader"
                className="rounded-lg p-2 text-slate-300 hover:bg-[#1E3E62] hover:text-white transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Clue Body — 19px for effortless executive readability */}
            <div className="rounded-xl border border-[#FF6500]/40 bg-[#132B45] p-5 sm:p-6 mb-5">
              <p className="text-lg sm:text-[19px] leading-relaxed text-white font-medium">
                "{clue}"
              </p>
            </div>

            {/* Target Capabilities Details */}
            {targetCapabilities.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold uppercase tracking-wider text-[#FF6500]">
                  Targeted Leadership Capabilities (160 Rubric)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {targetCapabilities.map((cap, i) => (
                    <div
                      key={i}
                      className="flex items-center space-x-1.5 rounded-lg border border-[#FF6500]/30 bg-[#1E3E62] px-3 py-1.5 text-sm font-medium text-white"
                    >
                      <CheckCircle2 className="h-4 w-4 text-[#FF6500]" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="mt-6 flex justify-end pt-4 border-t border-[#1E3E62]">
              <button
                id="confirm-clue-modal-btn"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl bg-[#FF6500] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#E05A00] transition shadow-md"
              >
                Got It — Return to Simulation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
