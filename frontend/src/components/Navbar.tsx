import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, Moon, ShieldCheck, Sparkles, Sun, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-[#0B0F19]/90 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div
          onClick={() => onNavigate('tracks')}
          className="flex cursor-pointer items-center space-x-3 transition hover:opacity-95"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onNavigate('tracks');
          }}
          aria-label="ScenarioLab home"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white font-heading">
                ScenarioLab
              </span>
              <span className="hidden rounded-full border border-indigo-500/20 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 sm:inline">
                Enterprise Training
              </span>
            </div>
            <span className="hidden text-[11px] text-slate-500 dark:text-slate-400 sm:inline -mt-0.5">
              Workplace Roleplay Simulations
            </span>
          </div>
        </div>

        {/* Navigation Actions */}
        {user && (
          <div className="flex items-center space-x-2 sm:space-x-4">
            <nav className="flex items-center space-x-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800/80 dark:bg-slate-900/50">
              <button
                id="nav-scenarios-btn"
                onClick={() => onNavigate('tracks')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  currentView === 'tracks' || currentView === 'scenarios'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white'
                }`}
              >
                Scenarios
              </button>

              <button
                id="nav-progress-btn"
                onClick={() => onNavigate('progress')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  currentView === 'progress'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white'
                }`}
              >
                Progress
              </button>

              {user.role === 'group_admin' || user.role === 'super_admin' ? (
                <button
                  id="nav-admin-btn"
                  onClick={() => onNavigate('admin')}
                  className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    currentView === 'admin'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-emerald-600 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-emerald-400'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Admin</span>
                </button>
              ) : null}
            </nav>

            {/* User Pill */}
            <div className="flex items-center space-x-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                <UserIcon className="h-3 w-3" />
              </div>
              <span className="font-semibold text-slate-900 dark:text-white max-w-[120px] truncate">{user.display_name}</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 uppercase tracking-wider dark:bg-slate-800 dark:text-indigo-300">
                {user.role}
              </span>
            </div>

            {/* Theme Toggle Button */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle light/dark theme"
              className="rounded-lg p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-amber-300 transition hover:bg-slate-100 dark:hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              title="Sign Out"
              aria-label="Sign Out"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
