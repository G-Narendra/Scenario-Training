import React, { useState } from 'react';

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
  const [imageError, setImageError] = useState(false);

  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
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
      {/* 3H Official Logo with cleanly curved corners */}
      {!imageError ? (
        <div className={`${iconSizes[size]} flex items-center justify-center rounded-xl overflow-hidden shadow-sm flex-shrink-0 bg-white/90 dark:bg-[#071322] p-1 border border-slate-200 dark:border-[#1E3E62]`}>
          <img
            src="/logo_3h_solutions.webp"
            alt="3H Solutions"
            className="w-full h-full object-contain rounded-lg overflow-hidden"
            onError={() => setImageError(true)}
          />
        </div>
      ) : (
        <div
          className={`flex items-center justify-center bg-[#0B192C] ${iconSizes[size]} rounded-xl overflow-hidden shadow-sm`}
        >
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
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
      )}

      {/* Typography */}
      {variant !== 'monogram' && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center space-x-1.5">
            <span
              className={`font-black tracking-wider text-slate-900 dark:text-white font-heading ${titleSizes[size]}`}
            >
              3H <span className="text-[#FF6500]">SOLUTIONS</span>
            </span>
          </div>
          {variant === 'full' && (
            <span
              className={`font-semibold tracking-wide text-slate-600 dark:text-slate-300 ${subSizes[size]}`}
            >
              Executive Scenario Training
            </span>
          )}
        </div>
      )}
    </div>
  );
};

