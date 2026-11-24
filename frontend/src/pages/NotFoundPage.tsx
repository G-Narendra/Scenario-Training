import React from 'react';
import { Compass, BookOpen, BarChart3, Home, Activity, ArrowRight } from 'lucide-react';

interface NotFoundPageProps {
  onNavigate: (view: 'scenarios' | 'progress' | 'home' | 'status') => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl text-center space-y-8 rounded-3xl border border-slate-200 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] p-8 sm:p-12 shadow-2xl">
        {/* Error Badge & 404 Headline */}
        <div className="space-y-3">
          <div className="inline-flex items-center space-x-2 rounded-full bg-[#B91C1C]/10 border border-[#B91C1C]/30 px-3.5 py-1 text-xs font-black text-[#B91C1C]">
            <span>HTTP 404 • ROUTE UNRESOLVED</span>
          </div>
          <h1 className="text-6xl sm:text-7xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
            404
          </h1>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200 font-heading">
            Executive Resource Not Found
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
            The requested scenario dossier, reporting view, or platform route could not be found or has moved. Explore the available leadership curriculum below.
          </p>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left pt-2">
          <button
            type="button"
            onClick={() => onNavigate('scenarios')}
            className="group flex items-start space-x-3.5 rounded-2xl border border-slate-200 dark:border-[#1E3E62] bg-slate-50 hover:bg-slate-100 dark:bg-[#0B192C] dark:hover:bg-[#1A3450] p-4 transition-all shadow-sm hover:border-[#B91C1C]"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#0B192C] text-white dark:bg-[#1E3E62]">
              <BookOpen className="h-5 w-5 text-rose-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#B91C1C] transition-colors">
                  Scenario Library
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-[#B91C1C] transition-all" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Browse 50+ leadership practice scenarios (#01 to #60).
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('progress')}
            className="group flex items-start space-x-3.5 rounded-2xl border border-slate-200 dark:border-[#1E3E62] bg-slate-50 hover:bg-slate-100 dark:bg-[#0B192C] dark:hover:bg-[#1A3450] p-4 transition-all shadow-sm hover:border-[#B91C1C]"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#0B192C] text-white dark:bg-[#1E3E62]">
              <BarChart3 className="h-5 w-5 text-emerald-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#B91C1C] transition-colors">
                  My Progress
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-[#B91C1C] transition-all" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review completed evaluations, debriefs, and scorecards.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="group flex items-start space-x-3.5 rounded-2xl border border-slate-200 dark:border-[#1E3E62] bg-slate-50 hover:bg-slate-100 dark:bg-[#0B192C] dark:hover:bg-[#1A3450] p-4 transition-all shadow-sm hover:border-[#B91C1C]"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#0B192C] text-white dark:bg-[#1E3E62]">
              <Home className="h-5 w-5 text-amber-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#B91C1C] transition-colors">
                  Platform Home
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-[#B91C1C] transition-all" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Return to the 3H Solutions Group overview portal.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('status')}
            className="group flex items-start space-x-3.5 rounded-2xl border border-slate-200 dark:border-[#1E3E62] bg-slate-50 hover:bg-slate-100 dark:bg-[#0B192C] dark:hover:bg-[#1A3450] p-4 transition-all shadow-sm hover:border-[#B91C1C]"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#0B192C] text-white dark:bg-[#1E3E62]">
              <Activity className="h-5 w-5 text-cyan-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#B91C1C] transition-colors">
                  System Status
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 group-hover:text-[#B91C1C] transition-all" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Check live API, AI reasoning, TTS, and STT health.
              </p>
            </div>
          </button>
        </div>

        {/* Footer Support Info */}
        <div className="pt-4 border-t border-slate-200 dark:border-[#1E3E62] flex items-center justify-center space-x-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <Compass className="h-4 w-4 text-[#B91C1C]" />
          <span>3H Solutions Group Executive Scenario Training Platform</span>
        </div>
      </div>
    </div>
  );
};
