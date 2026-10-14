import React from 'react';
import { ArrowRight, Sparkles, TrendingUp, Users } from 'lucide-react';

interface TrackPickerPageProps {
  onSelectTrack: (trackKey: string) => void;
}

export const TrackPickerPage: React.FC<TrackPickerPageProps> = ({ onSelectTrack }) => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero Heading */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center space-x-2 rounded-full border border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800/60 px-3.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
          <span>ScenarioLab Curriculum Tracks</span>
        </div>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 dark:text-white font-heading sm:text-5xl">
          Choose Your Training Track
        </h1>
        <p className="mt-3 text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Select a curriculum to practice difficult workplace conversations with realistic roleplay partners.
        </p>
      </div>

      {/* Track Selection Cards */}
      <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Leadership Track */}
        <div
          id="track-card-leadership"
          onClick={() => onSelectTrack('leadership')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-slate-300 bg-white dark:border-[#2D5B8D] dark:bg-[#132B45] p-8 shadow-md dark:shadow-xl transition-all duration-200 hover:-translate-y-1 hover:border-[#FF6500] hover:shadow-xl"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF6500]/15 text-[#FF6500] dark:bg-[#FF6500]/20 dark:text-[#FF6500] group-hover:bg-[#FF6500] group-hover:text-white transition-colors">
            <Users className="h-7 w-7" />
          </div>

          <div className="mt-6 flex items-center space-x-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white font-heading group-hover:text-[#FF6500] transition-colors">
              Leadership & Executive Track
            </h2>
            <span className="rounded-full bg-[#FF6500]/15 px-2.5 py-0.5 text-xs font-bold text-[#FF6500] border border-[#FF6500]/30">
              25 Scenarios
            </span>
          </div>

          <p className="mt-2 text-base text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
            Master the 160 Core Leadership Capabilities: handling underperformers, psychological safety in reorgs, board crises, toxic stars, and ethical whistleblowers.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {['Psychological Safety', 'Conflict Resolution', 'Crisis Decision Making', 'Ethical Governance', 'Strategic Realignment'].map(
              (tag) => (
                <span
                  key={tag}
                  className="rounded-lg border border-slate-300 bg-slate-50 dark:border-[#1E3E62] dark:bg-[#0B192C] px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  {tag}
                </span>
              )
            )}
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-slate-300 dark:border-[#1E3E62] pt-6">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              25 Scenarios • Difficulty Levels 1–5
            </span>
            <div className="flex items-center space-x-1.5 text-base font-bold text-[#FF6500] group-hover:translate-x-1 transition-transform">
              <span>Enter Track</span>
              <ArrowRight className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Sales Track */}
        <div
          id="track-card-sales"
          onClick={() => onSelectTrack('sales')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-slate-300 bg-white dark:border-[#2D5B8D] dark:bg-[#132B45] p-8 shadow-md dark:shadow-xl transition-all duration-200 hover:-translate-y-1 hover:border-[#FF6500] hover:shadow-xl"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 group-hover:bg-[#FF6500] group-hover:text-white transition-colors">
            <TrendingUp className="h-7 w-7" />
          </div>

          <div className="mt-6 flex items-center space-x-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white font-heading group-hover:text-[#FF6500] transition-colors">
              Enterprise Sales Track
            </h2>
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30">
              25 Scenarios
            </span>
          </div>

          <p className="mt-2 text-base text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
            Conquer enterprise deal cycles: cold Fortune 500 discovery, displacing entrenched incumbents, defending ROI to skeptical CFOs, and handling aggressive procurement.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {['Discovery Excellence', 'Incumbent Displacement', 'CFO ROI Defense', 'Procurement Hardball', 'Multi-Stakeholder Consensus'].map(
              (tag) => (
                <span
                  key={tag}
                  className="rounded-lg border border-slate-300 bg-slate-50 dark:border-[#1E3E62] dark:bg-[#0B192C] px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  {tag}
                </span>
              )
            )}
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-slate-300 dark:border-[#1E3E62] pt-6">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              25 Scenarios • Difficulty Levels 1–5
            </span>
            <div className="flex items-center space-x-1.5 text-base font-bold text-[#FF6500] group-hover:translate-x-1 transition-transform">
              <span>Enter Track</span>
              <ArrowRight className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
