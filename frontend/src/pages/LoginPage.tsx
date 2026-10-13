import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AlertCircle, ArrowRight, KeyRound, Moon, Shield, Sparkles, Sun, User as UserIcon } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [passcode, setPasscode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatPasscode = (val: string) => {
    // Keep uppercase alphanumeric and hyphens, up to 20 chars
    const clean = val.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase().slice(0, 20);
    // If user entered raw 8-character code without hyphen, format as XXXX-XXXX
    if (!clean.includes('-') && clean.length > 4) {
      return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
    }
    return clean;
  };

  const handlePasscodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasscode(formatPasscode(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passcode || passcode.trim().length < 4) {
      setError('Please provide a valid cohort passcode (e.g. DEMO-PASS or K7QM-4PXD).');
      return;
    }

    if (!displayName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(passcode, displayName.trim());
    } catch (err: any) {
      setError(err.message || 'Invalid or expired passcode. Please verify with your training administrator.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 dark:bg-[#0B0F19] px-4 py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button
          id="login-theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle light/dark theme"
          className="flex items-center space-x-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-600" />}
          <span className="hidden sm:inline">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>

      {/* Subtle executive surface gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(30,41,59,0.4),rgba(11,15,25,1))]" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/20">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-900 dark:text-white font-heading sm:text-4xl">
            ScenarioLab <span className="text-xl font-bold text-slate-500 dark:text-slate-400 block sm:inline">• Scenario Training</span>
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 font-medium">
            Practice workplace conversations in realistic AI roleplays
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Sales discovery, performance feedback, and negotiation with real-time feedback
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-[#111827] dark:shadow-2xl transition-colors duration-200">
          {error && (
            <div className="mb-6 flex items-start space-x-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="passcode-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Cohort Passcode
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <KeyRound className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="passcode-input"
                  name="passcode"
                  type="text"
                  autoComplete="off"
                  placeholder="DEMO-PASS"
                  value={passcode}
                  onChange={handlePasscodeChange}
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-4 font-mono text-base font-bold tracking-wider text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950/80 dark:text-white dark:placeholder-slate-600"
                  required
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                Passcodes are issued by your organization. Active for 30-day cohorts.
              </p>
            </div>

            <div>
              <label htmlFor="display-name-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Your Display Name
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <UserIcon className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="display-name-input"
                  name="displayName"
                  type="text"
                  placeholder="Alex Trainee"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950/80 dark:text-white dark:placeholder-slate-600"
                  required
                />
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-3.5 px-4 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Entering ScenarioLab...' : 'Enter ScenarioLab'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 border-t border-slate-200 dark:border-slate-800/80 pt-4">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 text-center mb-2">
              Instant Demo Access:
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPasscode('DEMO-PASS');
                  setDisplayName('Alex Trainee');
                }}
                className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-indigo-500/50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:text-white transition"
              >
                <Sparkles className="h-3 w-3 text-indigo-500 dark:text-indigo-400" />
                <span>Trainee Demo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPasscode('ADMIN-PASS');
                  setDisplayName('Sarah Admin');
                }}
                className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-emerald-500/50 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-emerald-500/50 dark:hover:text-white transition"
              >
                <Shield className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                <span>Admin Console</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
