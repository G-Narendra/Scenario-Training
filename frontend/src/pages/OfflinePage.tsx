import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, ArrowLeft, ShieldCheck, HardDrive } from 'lucide-react';

interface OfflinePageProps {
  onRetryConnection?: () => void;
  onNavigateHome?: () => void;
}

export const OfflinePage: React.FC<OfflinePageProps> = ({ onRetryConnection, onNavigateHome }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [lastChecked, setLastChecked] = useState<string>(new Date().toLocaleTimeString());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkBackendConnection();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkBackendConnection = async () => {
    setIsChecking(true);
    try {
      const res = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
      if (res.ok) {
        setIsOnline(true);
        if (onRetryConnection) {
          onRetryConnection();
        } else {
          window.location.reload();
        }
      } else {
        setIsOnline(false);
      }
    } catch {
      setIsOnline(false);
    } finally {
      setIsChecking(false);
      setLastChecked(new Date().toLocaleTimeString());
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-xl text-center space-y-8 rounded-3xl border border-slate-200 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] p-8 sm:p-12 shadow-2xl">
        {/* Offline Icon with Pulse Ring */}
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-200 dark:border-rose-900/60 shadow-lg">
          <WifiOff className="h-12 w-12 text-[#B91C1C] animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#B91C1C] text-[11px] font-black text-white">
            !
          </span>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div className="inline-flex items-center space-x-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            <span>Connection Interrupted</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
            You Are Currently Offline
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
            The platform lost connection to the executive training server. Your simulation progress and active notes are safeguarded in your browser's local cache.
          </p>
        </div>

        {/* Diagnostic Status Box */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] p-4 text-left space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold">
            <span className="flex items-center space-x-2">
              <HardDrive className="h-4 w-4 text-slate-500" />
              <span>Local Session Cache</span>
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
              <CheckCircle2 className="h-3.5 w-3.5 inline" />
              <span>Preserved Locally</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold border-t border-slate-200 dark:border-[#1E3E62] pt-2">
            <span className="flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-slate-500" />
              <span>Network Interface</span>
            </span>
            <span className={`font-bold ${isOnline ? 'text-emerald-600' : 'text-rose-600 dark:text-rose-400'}`}>
              {isOnline ? 'Network Reconnected' : 'Offline / Disconnected'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 text-right">
            Last probe check: {lastChecked}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={checkBackendConnection}
            disabled={isChecking}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl bg-[#0B192C] hover:bg-[#1E3E62] text-white dark:bg-[#1E3E62] dark:hover:bg-[#2D5B8D] border border-transparent dark:border-[#2D5B8D] px-6 py-3 text-sm font-bold shadow-md transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking Connection...' : 'Retry Connection'}</span>
          </button>

          {onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] hover:bg-slate-100 dark:hover:bg-[#1E3E62] text-slate-800 dark:text-slate-200 px-6 py-3 text-sm font-bold shadow-sm transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Return to Dashboard</span>
            </button>
          )}
        </div>

        {/* Corporate Network Help Hint */}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          If you are on a corporate VPN or hotel network, please ensure WebSocket & HTTPS traffic to <span className="font-mono text-slate-700 dark:text-slate-300">hf.space</span> is permitted by your firewall.
        </p>
      </div>
    </div>
  );
};
