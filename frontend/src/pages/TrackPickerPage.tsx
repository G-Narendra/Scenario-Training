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
        <div className="inline-flex items-center space-x-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Interactive Roleplay Environment</span>
        </div>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Choose Your Training Track
        </h1>
        <p className="mt-3 text-lg text-slate-400">
          Select a discipline to practice high-stakes conversations with realistic, pushback-driven AI counterparts.
        </p>
      </div>

      {/* Track Selection Cards */}
      <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Sales Track */}
        <div
          id="track-card-sales"
          onClick={() => onSelectTrack('sales')}
          className="group relative cursor-pointer overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-cyan-500/10 hover:shadow-2xl"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 transition-colors group-hover:bg-cyan-500 group-hover:text-white">
            <TrendingUp className="h-7 w-7" />
          </div>

          <h2 className="mt-6 text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">
            Sales Mastery Track
          </h2>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Navigate complex client objections, budget freezes, aggressive procurement directors, demographic adaptation, and high-value closing negotiations.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {['Objection Handling', 'Value Articulation', 'Renewal Price Defense', 'Closing', 'Discovery'].map(
              (tag) => (
                <span
                  key={tag}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-xs text-slate-300"
                >
                  {tag}
                </span>
              )
            )}
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-slate-800/80 pt-6">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              7 Curated Scenarios • Difficulty 1–5
            </span>
            <div className="flex items-center space-x-1.5 text-sm font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span>Enter Track</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Leadership Track */}
        <div
          id="track-card-leadership"
          onClick={() => onSelectTrack('leadership')}
          className="group relative cursor-pointer overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/50 hover:shadow-indigo-500/10 hover:shadow-2xl"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 transition-colors group-hover:bg-indigo-500 group-hover:text-white">
            <Users className="h-7 w-7" />
          </div>

          <h2 className="mt-6 text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors">
            Leadership & Communication Track
          </h2>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Master the hardest conversations in management: delivering specific praise, coaching defensive underperformers, peer conflict resolution, and managing up.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {['Feedback Specificity', 'Coaching', 'Conflict Resolution', 'Managing Up', 'Empathy'].map((tag) => (
              <span
                key={tag}
                className="rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-xs text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-slate-800/80 pt-6">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              7 Curated Scenarios • Difficulty 1–5
            </span>
            <div className="flex items-center space-x-1.5 text-sm font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
              <span>Enter Track</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
