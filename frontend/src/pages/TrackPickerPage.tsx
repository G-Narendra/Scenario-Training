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
        <div className="inline-flex items-center space-x-2 rounded-full border border-slate-700 bg-slate-800/60 px-3.5 py-1 text-xs font-semibold text-slate-300">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>ScenarioLab Curriculum Tracks</span>
        </div>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-white font-heading sm:text-5xl">
          Choose Your Training Track
        </h1>
        <p className="mt-3 text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Select a curriculum to practice difficult workplace conversations with realistic roleplay partners.
        </p>
      </div>

      {/* Track Selection Cards */}
      <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Sales Track */}
        <div
          id="track-card-sales"
          onClick={() => onSelectTrack('sales')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-800 bg-[#111827] p-8 shadow-xl transition-all duration-200 hover:-translate-y-1 hover:border-indigo-500/50"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <TrendingUp className="h-6 w-6" />
          </div>

          <h2 className="mt-6 text-2xl font-black text-white font-heading group-hover:text-indigo-300 transition-colors">
            Sales Track
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Navigate customer objections, budget freezes, procurement reviews, and closing negotiations.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {['Discovery Questions', 'Objection Handling', 'Value Articulation', 'Price Defense', 'Closing Next Steps'].map(
              (tag) => (
                <span
                  key={tag}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300"
                >
                  {tag}
                </span>
              )
            )}
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-6">
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
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-800 bg-[#111827] p-8 shadow-xl transition-all duration-200 hover:-translate-y-1 hover:border-violet-500/50"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 group-hover:bg-violet-600 group-hover:text-white transition-colors">
            <Users className="h-6 w-6" />
          </div>

          <h2 className="mt-6 text-2xl font-black text-white font-heading group-hover:text-violet-300 transition-colors">
            Leadership & Communication Track
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Practice key management conversations: constructive feedback, coaching defensive team members, peer conflict, and executive updates.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {['Feedback Specificity', 'Active Listening', 'Conflict Resolution', 'Managing Up', 'Empathy & Rapport'].map(
              (tag) => (
                <span
                  key={tag}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300"
                >
                  {tag}
                </span>
              )
            )}
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-6">
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
