import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, ArrowRight, Compass, KeyRound, Sparkles, User as UserIcon } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
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
      setError('Please enter your name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(passcode, displayName.trim());
    } catch (err: any) {
      setError(err.message || 'Invalid or expired passcode. Please check with your training owner.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Ambient Glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-cyan-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-indigo-600/10 blur-[120px]" />

      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-xl shadow-cyan-500/25">
            <Compass className="h-9 w-9 text-white animate-pulse" />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Flight Simulator
          </h1>
          <p className="mt-2 text-sm text-cyan-400 font-medium">
            Master Difficult Conversations in Low-Risk AI Simulations
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-6 flex items-start space-x-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="passcode-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Cohort Passcode
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <KeyRound className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="passcode-input"
                  name="passcode"
                  type="text"
                  autoComplete="off"
                  placeholder="K7QM-4PXD"
                  value={passcode}
                  onChange={handlePasscodeChange}
                  className="block w-full rounded-xl border border-slate-700 bg-slate-950/80 py-3 pl-11 pr-4 font-mono text-lg font-bold tracking-widest text-white placeholder-slate-600 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  required
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Passcodes are provided by your training administrator and expire in 30 days.
              </p>
            </div>

            <div>
              <label htmlFor="display-name-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Your Display Name
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <UserIcon className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="display-name-input"
                  name="displayName"
                  type="text"
                  placeholder="Jane Smith"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="block w-full rounded-xl border border-slate-700 bg-slate-950/80 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  required
                />
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Entering Simulator...' : 'Enter Flight Simulator'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Demo Access Note */}
          <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setPasscode('DEMO-PASS');
                setDisplayName('Alex Trainee');
              }}
              className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-cyan-400 transition"
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>Click to auto-fill sample demo credentials</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
