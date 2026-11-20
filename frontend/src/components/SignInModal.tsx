import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, ArrowRight, KeyRound, Lock, ShieldCheck, User as UserIcon, X } from 'lucide-react';
import { ThreeHSolutionsLogo } from './ThreeHSolutionsLogo';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialPasscode?: string;
}

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialPasscode = '',
}) => {
  const { login } = useAuth();
  const [passcode, setPasscode] = useState(initialPasscode || 'UZAIR-2026');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialPasscode) {
      setPasscode(initialPasscode);
    }
  }, [initialPasscode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatPasscode = (val: string) => {
    return val.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase().slice(0, 25);
  };

  const handlePasscodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasscode(formatPasscode(e.target.value));
  };

  const handleQuickFill = (code: string, name: string) => {
    setPasscode(code);
    setDisplayName(name);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = passcode.trim();
    const cleanName = displayName.trim();

    if (!cleanCode || cleanCode.length < 4) {
      setError('Please provide your cohort passcode (e.g. UZAIR-2026 or ADMIN-2026).');
      return;
    }

    if (!cleanName) {
      setError('Please enter your enrolled name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(cleanCode, cleanName);
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please verify with your training administrator.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Frosted Glass Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/70 dark:bg-[#070F1E]/85 backdrop-blur-md transition-opacity duration-200"
      />

      {/* Modal Dialog Container */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] shadow-2xl z-10 transition-all duration-200">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1E3E62] px-6 py-4 bg-slate-50/80 dark:bg-[#081220]/80">
          <div className="flex items-center space-x-2.5">
            <ThreeHSolutionsLogo size="sm" variant="monogram" />
            <span className="text-xs font-bold tracking-wider uppercase text-slate-600 dark:text-slate-300">
              Executive Cohort Authentication
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close sign in dialog"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-[#1E3E62] dark:hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8">
          <div className="text-center sm:text-left mb-6">
            <h2 id="signin-modal-title" className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-heading">
              Cohort Sign In
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Enter your official cohort passcode and enrolled name to access your private simulation workspace.
            </p>
          </div>

          {/* Quick Demo Helper Pills */}
          <div className="mb-5 rounded-2xl border border-slate-200 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#132B45]/50 p-3">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Quick Selection</span>
              <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">Tap to populate</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                id="quick-fill-delegate-btn"
                type="button"
                onClick={() => handleQuickFill('UZAIR-2026', 'Dev')}
                className="flex items-center space-x-1.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/80 dark:bg-[#1E3E62]/40 px-3 py-1.5 text-xs font-semibold text-blue-900 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-[#1E3E62] transition"
              >
                <UserIcon className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                <span>Delegate: Dev (Participant)</span>
              </button>
              <button
                id="quick-fill-facilitator-btn"
                type="button"
                onClick={() => handleQuickFill('UZAIR-2026', 'Uzair')}
                className="flex items-center space-x-1.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 px-3 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition"
              >
                <ShieldCheck className="h-3 w-3 text-[#FF6500]" />
                <span>Facilitator: Uzair</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-5 flex items-start space-x-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="modal-passcode-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Cohort Passcode
              </label>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <KeyRound className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="modal-passcode-input"
                  name="passcode"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. UZAIR-2026"
                  value={passcode}
                  onChange={handlePasscodeChange}
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-4 font-mono text-base font-bold tracking-wider text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-[#1E3E62] dark:bg-[#132B45] dark:text-white dark:placeholder-slate-500"
                  required
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Provided by Lead Facilitator Uzair for your scheduled cohort batch.
              </p>
            </div>

            <div>
              <label htmlFor="modal-displayname-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Enrolled Full Name
              </label>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <UserIcon className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="modal-displayname-input"
                  name="displayName"
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-[#1E3E62] dark:bg-[#132B45] dark:text-white dark:placeholder-slate-500"
                  required
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Must match your whitelisted delegate name on the facilitator roster.
              </p>
            </div>

            <button
              id="modal-signin-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="mt-3 flex w-full items-center justify-center space-x-2 rounded-xl bg-[#0B192C] hover:bg-[#1E3E62] text-white dark:bg-[#1E3E62] dark:hover:bg-[#2D5B8D] border border-transparent dark:border-[#2D5B8D] py-3.5 px-4 text-sm sm:text-base font-bold shadow-md transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Verifying & Entering...' : 'Enter Practice Environment'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Privacy & Confidentiality Guarantee */}
          <div className="mt-6 flex items-center justify-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-200 dark:border-[#1E3E62]/60">
            <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>100% Confidential Sandbox · Transcripts Archived for Uzair's 1-on-1 Debrief</span>
          </div>
        </div>
      </div>
    </div>
  );
};
