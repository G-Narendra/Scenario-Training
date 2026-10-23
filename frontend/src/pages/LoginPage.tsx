import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AlertCircle, ArrowRight, KeyRound, Moon, Sun, User as UserIcon } from 'lucide-react';
import { ThreeHSolutionsLogo } from '../components/ThreeHSolutionsLogo';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [passcode, setPasscode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatPasscode = (val: string) => {
    // Keep uppercase alphanumeric and hyphens, up to 25 chars
    return val.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase().slice(0, 25);
  };

  const handlePasscodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasscode(formatPasscode(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = passcode.trim();
    const cleanName = displayName.trim();

    if (!cleanCode || cleanCode.length < 4) {
      setError('Please provide your cohort passcode (e.g. UZAIR-2026 or NARENDRA-2026).');
      return;
    }

    if (!cleanName) {
      setError('Please enter your enrolled name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(cleanCode, cleanName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please verify with your training administrator.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 dark:bg-[#0B192C] px-4 py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button
          id="login-theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle light/dark theme"
          className="flex items-center space-x-2 rounded-xl border border-slate-300 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-slate-100 dark:border-[#1E3E62] dark:bg-[#132B45] dark:text-slate-200 dark:hover:bg-[#1E3E62]"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-[#FF6500]" />}
          <span className="hidden sm:inline">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>

      {/* Subtle executive surface gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,101,0,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(30,62,98,0.5),rgba(11,25,44,1))]" />

      <div className="w-full max-w-md relative z-10">
        {/* Header 3H Solutions Branding */}
        <div className="flex flex-col items-center text-center">
          <ThreeHSolutionsLogo size="lg" variant="full" className="justify-center mb-4" />
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white font-heading sm:text-3xl">
            Executive Scenario Training
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-200 font-medium max-w-sm">
            High-Impact Corporate Training & Scenario Practice
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Executive Scenario Practice Platform
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 rounded-2xl border border-slate-300 bg-white p-8 shadow-xl dark:border-[#2D5B8D] dark:bg-[#132B45] dark:shadow-2xl transition-colors duration-200">
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
                  placeholder="Enter Cohort Passcode"
                  value={passcode}
                  onChange={handlePasscodeChange}
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-4 font-mono text-base font-bold tracking-wider text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-[#FF6500] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6500]/30 dark:border-[#2D5B8D] dark:bg-[#0B192C] dark:text-white dark:placeholder-slate-500"
                  required
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                Official passcode issued by your training administrator.
              </p>
            </div>

            <div>
              <label htmlFor="display-name-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Your Full Name
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <UserIcon className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="display-name-input"
                  name="displayName"
                  type="text"
                  placeholder="Enter your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-[#FF6500] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6500]/30 dark:border-[#2D5B8D] dark:bg-[#0B192C] dark:text-white dark:placeholder-slate-500"
                  required
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                Must match your enrolled name on the cohort roster.
              </p>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center space-x-2 rounded-xl bg-[#FF6500] hover:bg-[#E05A00] py-3.5 px-4 text-base font-bold text-white shadow-md shadow-[#FF6500]/30 transition focus:outline-none focus:ring-2 focus:ring-[#FF6500] focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Verifying & Entering...' : 'Enter Training Platform'}</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
