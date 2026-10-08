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
        <div className="inline-flex items-center space-x-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-300">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>ScenarioLab Executive Tracks</span>
        </div>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-white font-heading sm:text-5xl">
          Choose Your Training Track
        </h1>
        <p className="mt-3 text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Select a specialized curriculum to practice high-stakes workplace conversations with realistic, pushback-driven AI roleplay partners.
        </p>
      </div>

      {/* Track Selection Cards */}
      <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Sales Track */}
        <div
          id="track-card-sales"
          onClick={() => onSelectTrack('sales')}
          className="group relative cursor-pointer overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/50 hover:shadow-indigo-500/10"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400 transition-colors group-hover:bg-indigo-600 group-hover:text-white shadow-lg shadow-indigo-600/20">
            <TrendingUp className="h-7 w-7" />
          </div>

          <h2 className="mt-6 text-2xl font-black text-white font-heading group-hover:text-indigo-300 transition-colors">
            Sales Mastery Track
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Navigate complex client objections, budget freezes, procurement directors, demographic adaptation, and high-value closing negotiations.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {['Discovery Questions', 'Objection Handling', 'Value Articulation', 'Price Defense', 'Closing Next Steps'].map(
              (tag) => (
                <span
                  key={tag}
                  className="rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-1 text-xs font-medium text-slate-300"
                >
                  {tag}
                </span>
              )
            )}
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-slate-800/80 pt-6">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              7 Curated Scenarios • Difficulty 1–5
            </span>
            <div className="flex items-center space-x-1.5 text-sm font-bold text-indigo-400 group-hover:translate-x-1 transition-transform">
              <span>Enter Track</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Leadership Track */}
        <div
          id="track-card-leadership"
          onClick={() => onSelectTrack('leadership')}
          className="group relative cursor-pointer overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/50 hover:shadow-violet-500/10"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400 transition-colors group-hover:bg-violet-600 group-hover:text-white shadow-lg shadow-violet-600/20">
            <Users className="h-7 w-7" />
          </div>

          <h2 className="mt-6 text-2xl font-black text-white font-heading group-hover:text-violet-300 transition-colors">
            Leadership & Communication Track
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Master the hardest conversations in management: constructive feedback, coaching defensive underperformers, peer conflict resolution, and managing up.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {['Feedback Specificity', 'Active Listening', 'Conflict Resolution', 'Managing Up', 'Empathy & Rapport'].map(
              (tag) => (
                <span
                  key={tag}
                  className="rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-1 text-xs font-medium text-slate-300"
                >
                  {tag}
                </span>
              )
            )}
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-slate-800/80 pt-6">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              7 Curated Scenarios • Difficulty 1–5
            </span>
            <div className="flex items-center space-x-1.5 text-sm font-bold text-violet-400 group-hover:translate-x-1 transition-transform">
              <span>Enter Track</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
