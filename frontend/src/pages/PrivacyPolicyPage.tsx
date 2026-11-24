import React from 'react';
import { Shield, Lock, EyeOff, Server, ArrowLeft } from 'lucide-react';

interface PolicyProps {
  onBack?: () => void;
}

export const PrivacyPolicyPage: React.FC<PolicyProps> = ({ onBack }) => {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-[#1E3E62] pb-6 flex items-center justify-between">
        <div>
          <div className="inline-flex items-center space-x-2 rounded-full bg-slate-100 dark:bg-[#1E3E62] px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Shield className="h-3.5 w-3.5 text-[#B91C1C]" />
            <span>Governance & Compliance</span>
          </div>
          <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
            Privacy Policy & Audio Governance
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Last Updated: November 2026 • 3H Solutions Group Executive Simulation
          </p>
        </div>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center space-x-1.5 rounded-xl border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] hover:bg-slate-100 dark:hover:bg-[#1E3E62] text-slate-800 dark:text-slate-200 px-4 py-2 text-xs font-bold shadow-sm transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>
        )}
      </div>

      {/* Main Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] p-5 shadow-sm space-y-2">
          <EyeOff className="h-6 w-6 text-[#B91C1C]" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading">Zero Audio Retention</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Raw microphone audio recordings are converted into text in transient memory and discarded immediately. No voice biometric files are stored on disk.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] p-5 shadow-sm space-y-2">
          <Lock className="h-6 w-6 text-[#B91C1C]" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading">Encrypted In Transit</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            All data exchanges between client, API gateway, and LLM reasoning engines are strictly encrypted via TLS 1.3 cryptographic protocols.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] p-5 shadow-sm space-y-2">
          <Server className="h-6 w-6 text-[#B91C1C]" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading">Cohort Isolation</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Participant evaluations and session transcripts are partitioned by client cohort passcode and cannot be accessed across different organizations.
          </p>
        </div>
      </div>

      {/* Structured Sections */}
      <div className="rounded-3xl border border-slate-200 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] p-6 sm:p-8 space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed shadow-lg">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
            1. Purpose of Data Collection
          </h2>
          <p>
            The 3H Solutions Group Executive Scenario Training Platform captures participant text dialogues and quantitative skill metrics solely to generate executive coaching feedback, score behavioral leadership capabilities, and deliver cohort analytics for executive sponsors.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
            2. Audio & Speech Processing
          </h2>
          <p>
            When utilizing Voice Mode or voice dictation, your browser's audio stream is sent directly to our self-hosted Faster-Whisper transcription service. The audio payload is evaluated in volatile memory and purged immediately upon transcript resolution. No audio recordings are used for third-party model retraining.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
            3. Participant Anonymity & Data Ownership
          </h2>
          <p>
            Participants are identified within sessions using their display name and assigned cohort passcode. All aggregated capability reports and training evaluations remain the exclusive intellectual property of the enterprise client sponsoring the executive training.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
            4. Contact Data Governance Officer
          </h2>
          <p>
            For inquiries regarding cohort data retention, complete transcript expungement, or corporate privacy compliance, contact 3H Solutions Group at <span className="font-semibold text-slate-900 dark:text-white">privacy@3hsolutionsgroup.com</span>.
          </p>
        </section>
      </div>
    </div>
  );
};
