import React from 'react';
import { FileText, Award, AlertCircle, ArrowLeft } from 'lucide-react';

interface TermsProps {
  onBack?: () => void;
}

export const TermsOfServicePage: React.FC<TermsProps> = ({ onBack }) => {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-[#1E3E62] pb-6 flex items-center justify-between">
        <div>
          <div className="inline-flex items-center space-x-2 rounded-full bg-slate-100 dark:bg-[#1E3E62] px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-200">
            <FileText className="h-3.5 w-3.5 text-[#B91C1C]" />
            <span>Platform Terms & Conditions</span>
          </div>
          <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
            Terms of Executive Simulation Use
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Effective Date: November 2026 • 3H Solutions Group
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

      {/* Structured Sections */}
      <div className="rounded-3xl border border-slate-200 dark:border-[#1E3E62] bg-white dark:bg-[#132B45] p-6 sm:p-8 space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed shadow-lg">
        <section className="space-y-2">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-heading font-bold text-base">
            <Award className="h-5 w-5 text-[#B91C1C]" />
            <h2>1. Professional Purpose & Practice Integrity</h2>
          </div>
          <p>
            The Executive Scenario Training Platform is designed to benchmark and enhance leadership communication, critical negotiation, crisis resolution, and commercial acumen. Participants are expected to engage realistically in character. The platform reserves the right to rate nonsensical or bad-faith inputs with zero scores to preserve cohort assessment validity.
          </p>
        </section>

        <section className="space-y-2">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-heading font-bold text-base">
            <FileText className="h-5 w-5 text-[#B91C1C]" />
            <h2>2. Proprietary Scenario Intellectual Property</h2>
          </div>
          <p>
            All 60 leadership scenarios, curveball mechanics, counterpart personas, tactical clues, and scoring rubrics are the exclusive proprietary property of 3H Solutions Group. Unauthorized reproduction, distribution, scraping, or external dissemination is strictly prohibited.
          </p>
        </section>

        <section className="space-y-2">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-heading font-bold text-base">
            <AlertCircle className="h-5 w-5 text-[#B91C1C]" />
            <h2>3. AI Evaluator Methodology & Disclaimer</h2>
          </div>
          <p>
            Coaching evaluations and debrief reports are generated utilizing frontier enterprise LLM reasoning calibrated against FAANG and Fortune 500 leadership rubrics. These evaluations serve as deliberate development feedback and do not constitute formal employment or legal determinations.
          </p>
        </section>

        <section className="space-y-2 border-t border-slate-100 dark:border-[#1E3E62] pt-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            For master corporate training agreements or license inquiries, contact 3H Solutions Group Executive Operations at <span className="font-semibold text-slate-900 dark:text-white">executive@3hsolutionsgroup.com</span>.
          </p>
        </section>
      </div>
    </div>
  );
};
