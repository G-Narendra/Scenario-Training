import React, { useState } from 'react';
import { Globe, HelpCircle, Mail, MessageCircle, Shield, X } from 'lucide-react';

export const Footer: React.FC = () => {
  const [showFaqModal, setShowFaqModal] = useState(false);

  const faqs = [
    {
      q: 'What is ScenarioLab Executive Training?',
      a: 'ScenarioLab is a realistic, scenario-based simulation platform designed by 3H Solutions Group. You engage in authentic, high-stakes leadership and enterprise sales dialogues to test and sharpen your decision-making and communication agility.',
    },
    {
      q: 'How many practice attempts do I have?',
      a: 'Each enrolled participant is allocated up to 2 deliberate practice runs per scenario to ensure high-stakes, focused preparation. Attempts are recorded and monitored via cohort access controls.',
    },
    {
      q: 'What reports do I receive after a scenario?',
      a: 'Immediately following your scenario dialogue, you receive an instant concise summary debrief highlighting your top strength, priority adjustments, and tactical drills. A comprehensive diagnostic report—including full verbatim transcripts and competency scoring—is delivered directly to your 3H Solutions Facilitator (Uzair) for personalized executive coaching.',
    },
    {
      q: 'How do Voice and Text modes differ?',
      a: 'Text mode provides a structured, thoughtful typing experience. Voice mode simulates a live, hands-free conversational phone call with ultra-low latency speech recognition and neural audio synthesis.',
    },
    {
      q: 'Who do I contact if I need assistance?',
      a: 'You can reach out directly to the 3H Solutions team via WhatsApp or email at info@3hsolutionsgroup.com. We are happy to assist you throughout your training.',
    },
  ];

  return (
    <>
      <footer className="print:hidden border-t border-slate-200 dark:border-[#1E3E62] bg-white/90 dark:bg-[#0B192C]/90 backdrop-blur-md py-6 mt-auto transition-colors duration-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            {/* Brand & Copyright */}
            <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-3 text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                3H <span className="text-[#FF6500]">Solutions</span> Group
              </span>
              <span className="hidden sm:inline text-slate-400">•</span>
              <span>Executive Capability & Scenario Training</span>
              <span className="hidden sm:inline text-slate-400">•</span>
              <span>© {new Date().getFullYear()} All Rights Reserved</span>
            </div>

            {/* Quick Links & Help Channels */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold">
              <a
                href="https://www.3hsolutionsgroup.com/"
                target="_blank"
                rel="noopener noreferrer"
                title="Visit 3H Solutions official website"
                className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 hover:text-[#FF6500] dark:hover:text-[#FF6500] transition"
              >
                <Globe className="h-3.5 w-3.5 text-[#FF6500]" />
                <span>3H Website</span>
              </a>

              <a
                href="mailto:info@3hsolutionsgroup.com"
                title="Email 3H Solutions Support"
                className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 hover:text-[#FF6500] dark:hover:text-[#FF6500] transition"
              >
                <Mail className="h-3.5 w-3.5 text-[#FF6500]" />
                <span>Contact Us</span>
              </a>

              <a
                href="https://wa.me/?text=Hello%203H%20Solutions%20Team%2C%20I%20have%20a%20question%20regarding%20the%20ScenarioLab%20assessment."
                target="_blank"
                rel="noopener noreferrer"
                title="Chat with 3H Solutions on WhatsApp"
                className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                <span>WhatsApp Help</span>
              </a>

              <button
                type="button"
                onClick={() => setShowFaqModal(true)}
                className="flex items-center space-x-1.5 rounded-lg border border-slate-300 dark:border-[#1E3E62] bg-slate-100 dark:bg-[#132B45] px-2.5 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#1E3E62] hover:text-[#FF6500] transition"
              >
                <HelpCircle className="h-3.5 w-3.5 text-[#FF6500]" />
                <span>Participant FAQ</span>
              </button>
            </div>

            {/* Assessment Clarification Notice */}
            <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 text-center lg:text-right max-w-md font-medium">
              <Shield className="h-3.5 w-3.5 text-[#FF6500] flex-shrink-0 hidden sm:inline" />
              <span>
                Instant summary debrief upon completion. Full evaluation dossier & transcripts reserved for your Facilitator (Uzair).
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Participant FAQ Modal */}
      {showFaqModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div
            className="fixed inset-0 bg-slate-900/75 dark:bg-[#0B192C]/85 backdrop-blur-sm"
            onClick={() => setShowFaqModal(false)}
          />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border-2 border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#112240] p-6 sm:p-8 shadow-2xl z-10 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1E3E62] pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6500]/15 text-[#FF6500]">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black font-heading text-slate-900 dark:text-white">
                    Participant Guidelines & FAQ
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Key information regarding scenarios, evaluations, and practice limits
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFaqModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-[#1E3E62] dark:hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 dark:border-[#1E3E62] bg-slate-50 dark:bg-[#0B192C] p-4 text-xs"
                >
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5 flex items-start space-x-2">
                    <span className="text-[#FF6500] font-black">{idx + 1}.</span>
                    <span>{faq.q}</span>
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium pl-5">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-[#1E3E62] pt-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Have more questions? Contact{' '}
                <a
                  href="mailto:info@3hsolutionsgroup.com"
                  className="font-bold text-[#FF6500] hover:underline"
                >
                  info@3hsolutionsgroup.com
                </a>
              </div>
              <button
                type="button"
                onClick={() => setShowFaqModal(false)}
                className="w-full sm:w-auto rounded-xl bg-[#FF6500] hover:bg-[#E05A00] px-5 py-2 text-xs font-bold text-white shadow-md transition"
              >
                Close FAQ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

