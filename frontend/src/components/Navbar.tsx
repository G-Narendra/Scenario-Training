import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, Moon, ShieldCheck, Sun, User as UserIcon } from 'lucide-react';
import { ThreeHSolutionsLogo } from './ThreeHSolutionsLogo';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-300 bg-white/95 dark:border-[#1E3E62] dark:bg-[#0B192C]/95 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand: 3H Solutions Group Official */}
        <div
          onClick={() => onNavigate('tracks')}
          className="flex cursor-pointer items-center transition hover:opacity-95 flex-shrink-0"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onNavigate('tracks');
          }}
          aria-label="3H Solutions Scenario Training home"
        >
          <div className="hidden sm:block">
            <ThreeHSolutionsLogo size="md" variant="full" />
          </div>
          <div className="block sm:hidden">
            <ThreeHSolutionsLogo size="md" variant="monogram" />
          </div>
        </div>

        {/* Navigation Actions */}
        {user && (
          <div className="flex items-center space-x-1.5 sm:space-x-4">
            <nav className="flex items-center space-x-1 rounded-xl border border-slate-300 bg-slate-100 p-1 dark:border-[#1E3E62] dark:bg-[#132B45]">
              <button
                id="nav-tracks-btn"
                onClick={() => onNavigate('tracks')}
                className={`rounded-lg px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                  currentView === 'tracks'
                    ? 'bg-[#FF6500] text-white shadow-sm shadow-[#FF6500]/30'
                    : 'text-slate-700 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-[#1E3E62] dark:hover:text-white'
                }`}
              >
                <span className="hidden sm:inline">Curriculum </span>Tracks
              </button>

              <button
                id="nav-scenarios-btn"
                onClick={() => onNavigate('scenarios')}
                className={`rounded-lg px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                  currentView === 'scenarios'
                    ? 'bg-[#FF6500] text-white shadow-sm shadow-[#FF6500]/30'
                    : 'text-slate-700 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-[#1E3E62] dark:hover:text-white'
                }`}
              >
                <span className="hidden sm:inline">Scenario </span>Library
              </button>

              <button
                id="nav-progress-btn"
                onClick={() => onNavigate('progress')}
                className={`rounded-lg px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                  currentView === 'progress'
                    ? 'bg-[#FF6500] text-white shadow-sm shadow-[#FF6500]/30'
                    : 'text-slate-700 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-[#1E3E62] dark:hover:text-white'
                }`}
              >
                <span className="hidden sm:inline">My </span>Progress
              </button>

              {user.role === 'group_admin' || user.role === 'super_admin' ? (
                <button
                  id="nav-admin-btn"
                  onClick={() => onNavigate('admin')}
                  className={`flex items-center space-x-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition ${
                    currentView === 'admin'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                      : 'text-slate-700 hover:bg-slate-200 hover:text-emerald-600 dark:text-slate-200 dark:hover:bg-[#1E3E62] dark:hover:text-emerald-400'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              ) : null}
            </nav>

            {/* User Pill — Desktop/Tablet only for optimal mobile spacing */}
            <div className="hidden lg:flex items-center space-x-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-800 shadow-sm dark:border-[#1E3E62] dark:bg-[#0B192C] dark:text-slate-200">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF6500]/20 text-[#FF6500]">
                <UserIcon className="h-3 w-3" />
              </div>
              <span className="font-bold text-slate-900 dark:text-white max-w-[120px] truncate">{user.display_name}</span>
              <span className="rounded bg-[#FF6500]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#FF6500] uppercase tracking-wider border border-[#FF6500]/30">
                {user.role === 'trainee' ? 'Participant' : user.role === 'super_admin' ? 'Super Admin' : user.role === 'group_admin' ? 'Facilitator' : user.role}
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
              id="logout-btn"
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
