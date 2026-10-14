import React from 'react';

interface ThreeHSolutionsLogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'monogram';
  size?: 'sm' | 'md' | 'lg';
}

export const ThreeHSolutionsLogo: React.FC<ThreeHSolutionsLogoProps> = ({
  className = '',
  variant = 'full',
  size = 'md',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const titleSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  };

  const subSizes = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-xs',
  };

  return (
    <div className={`flex items-center space-x-3 select-none ${className}`}>
      {/* 3H Emblem Icon */}
      <div
        className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#0B192C] to-[#1E3E62] border border-[#FF6500]/50 shadow-md shadow-[#0B192C]/40 ${iconSizes[size]}`}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-3/4 h-3/4"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Hexagonal Shield Background */}
          <polygon
            points="50,6 90,28 90,72 50,94 10,72 10,28"
            fill="#0B192C"
            stroke="#FF6500"
            strokeWidth="5"
          />
          {/* 3 Pillars (Head, Heart, Hands) */}
          <path
            d="M32 28 V72"
            stroke="#FFFFFF"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M50 24 V76"
            stroke="#FF6500"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M68 28 V72"
            stroke="#FFFFFF"
            strokeWidth="7"
            strokeLinecap="round"
          />
          {/* Crossbeam linking pillars */}
          <path
            d="M32 50 H68"
            stroke="#FF6500"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Typography */}
      {variant !== 'monogram' && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center space-x-1.5">
            <span
              className={`font-black tracking-wider text-slate-900 dark:text-white font-heading ${titleSizes[size]}`}
            >
              3H <span className="text-[#FF6500]">SOLUTIONS</span>
            </span>
            <span className="rounded bg-[#FF6500]/15 px-1.5 py-0.2 text-[10px] font-bold text-[#FF6500] uppercase tracking-widest border border-[#FF6500]/30">
              GROUP
            </span>
          </div>
          {variant === 'full' && (
            <span
              className={`font-medium tracking-wide text-slate-500 dark:text-slate-300 ${subSizes[size]}`}
            >
              Executive Scenario Training
            </span>
          )}
        </div>
      )}
    </div>
  );
};
