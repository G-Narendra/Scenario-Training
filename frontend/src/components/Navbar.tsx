import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Compass, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div
          onClick={() => onNavigate('tracks')}
          className="flex cursor-pointer items-center space-x-3 transition hover:opacity-90"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-md shadow-cyan-500/20">
            <Compass className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">Flight Simulator</span>
            <span className="hidden text-xs text-cyan-400 sm:inline sm:ml-2 font-mono">
              Difficult Conversations
            </span>
          </div>
        </div>

        {/* Navigation Actions */}
        {user && (
          <div className="flex items-center space-x-4">
            <button
              id="nav-scenarios-btn"
              onClick={() => onNavigate('tracks')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                currentView === 'tracks' || currentView === 'scenarios'
                  ? 'bg-slate-800 text-cyan-400'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              Scenarios
            </button>

            <button
              id="nav-progress-btn"
              onClick={() => onNavigate('progress')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                currentView === 'progress'
                  ? 'bg-slate-800 text-cyan-400'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              Progress
            </button>

            {user.role === 'group_admin' || user.role === 'super_admin' ? (
              <button
                id="nav-admin-btn"
                onClick={() => onNavigate('admin')}
                className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  currentView === 'admin'
                    ? 'bg-slate-800 text-cyan-400'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Admin</span>
              </button>
            ) : null}

            {/* User Pill */}
            <div className="flex items-center space-x-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
              <UserIcon className="h-3.5 w-3.5 text-cyan-400" />
              <span className="font-medium text-white">{user.display_name}</span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 uppercase">
                {user.role}
              </span>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              title="Sign Out"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-900 hover:text-rose-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
