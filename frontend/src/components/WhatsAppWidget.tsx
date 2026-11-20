import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

export const WhatsAppWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenWhatsApp = () => {
    const phone = '919840000000'; // 3H Solutions official contact line
    const text = encodeURIComponent(
      'Hi Uzair & 3H Solutions Team, I am participating in the Executive Scenario Training and have a question regarding the platform.'
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <aside aria-label="3H Solutions WhatsApp Support" className="fixed bottom-5 right-5 z-40 flex flex-col items-end print:hidden select-none">
      {/* Expanded Quick Help Card */}
      {isOpen && (
        <div className="mb-3 w-72 rounded-2xl border-2 border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1E3E62] pb-2">
            <div className="flex items-center space-x-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#25D366] text-white">
                <MessageCircle className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white font-heading">
                3H Facilitator Support
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              title="Close help preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
            Have a question about your scenario, cohort access, or debrief? Connect directly with Uzair and the training team.
          </p>

          <button
            onClick={handleOpenWhatsApp}
            className="mt-3 flex w-full items-center justify-center space-x-2 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white py-2 px-3 text-xs font-bold shadow-md transition"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Chat on WhatsApp</span>
          </button>
        </div>
      )}

      {/* Floating Trigger Pill */}
      <div className="flex items-center space-x-2">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center space-x-1.5 rounded-full border border-slate-300 dark:border-[#1E3E62] bg-white dark:bg-[#0B192C] px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-md hover:bg-slate-50 dark:hover:bg-[#132B45] transition"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#25D366]" />
            </span>
            <span>Have questions?</span>
          </button>
        )}

        <button
          id="floating-whatsapp-btn"
          onClick={() => {
            if (isOpen) {
              handleOpenWhatsApp();
            } else {
              setIsOpen(true);
            }
          }}
          title="Chat with 3H Solutions on WhatsApp"
          aria-label="Open WhatsApp Support"
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-xl transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#25D366]/50"
        >
          <span className="sr-only">Open 3H Solutions WhatsApp Support</span>
          <MessageCircle className="h-6 w-6 fill-current" />
        </button>
      </div>
    </aside>
  );
};
