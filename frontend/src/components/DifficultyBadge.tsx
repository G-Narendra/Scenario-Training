import React from 'react';

export interface DifficultyBadgeProps {
  difficulty?: number; // 1 to 5
  difficultyLevel?: 'Normal' | 'Challenging' | 'Crisis' | string;
  showPips?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface DifficultyMeta {
  level: number;
  label: string;
  badgeBgDark: string;
  badgeTextDark: string;
  badgeBorderDark: string;
  badgeBgLight: string;
  badgeTextLight: string;
  badgeBorderLight: string;
  pipActiveColor: string;
  totalPips: number;
}

const THREE_TIER_MAP: Record<string, DifficultyMeta> = {
  Normal: {
    level: 1,
    label: 'Level 1: Normal',
    badgeBgDark: 'bg-emerald-950/70',
    badgeTextDark: 'text-emerald-300',
    badgeBorderDark: 'border-emerald-600/50',
    badgeBgLight: 'bg-emerald-50',
    badgeTextLight: 'text-emerald-800',
    badgeBorderLight: 'border-emerald-300',
    pipActiveColor: 'bg-emerald-500',
    totalPips: 3,
  },
  Challenging: {
    level: 2,
    label: 'Level 2: Challenging',
    badgeBgDark: 'bg-amber-950/70',
    badgeTextDark: 'text-amber-300',
    badgeBorderDark: 'border-amber-600/50',
    badgeBgLight: 'bg-amber-50',
    badgeTextLight: 'text-amber-900',
    badgeBorderLight: 'border-amber-400',
    pipActiveColor: 'bg-[#FF6500]',
    totalPips: 3,
  },
  Crisis: {
    level: 3,
    label: 'Level 3: Crisis',
    badgeBgDark: 'bg-rose-950/80',
    badgeTextDark: 'text-rose-200',
    badgeBorderDark: 'border-rose-600/60',
    badgeBgLight: 'bg-rose-50',
    badgeTextLight: 'text-rose-950',
    badgeBorderLight: 'border-rose-400',
    pipActiveColor: 'bg-rose-600',
    totalPips: 3,
  },
};

export const DifficultyBadge: React.FC<DifficultyBadgeProps> = ({
  difficulty = 1,
  difficultyLevel,
  showPips = true,
  size = 'md',
  className = '',
}) => {
  // Determine tier
  let tierKey: 'Normal' | 'Challenging' | 'Crisis' = 'Normal';
  if (difficultyLevel) {
    if (difficultyLevel.toLowerCase().includes('crisis') || difficultyLevel.toLowerCase().includes('high') || difficultyLevel.toLowerCase().includes('advanced')) {
      tierKey = 'Crisis';
    } else if (difficultyLevel.toLowerCase().includes('challenging') || difficultyLevel.toLowerCase().includes('intermediate')) {
      tierKey = 'Challenging';
    } else {
      tierKey = 'Normal';
    }
  } else {
    if (difficulty <= 1) tierKey = 'Normal';
    else if (difficulty <= 3) tierKey = 'Challenging';
    else tierKey = 'Crisis';
  }

  const meta = THREE_TIER_MAP[tierKey];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 space-x-1.5',
    md: 'text-xs px-2.5 py-1 space-x-2',
    lg: 'text-sm px-3.5 py-1.5 space-x-2.5 font-semibold',
  };

  const pipSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <div
      role="status"
      aria-label={`Difficulty ${meta.label}`}
      className={`inline-flex items-center rounded-lg border font-medium transition-colors select-none ${meta.badgeBgLight} ${meta.badgeTextLight} ${meta.badgeBorderLight} dark:${meta.badgeBgDark} dark:${meta.badgeTextDark} dark:${meta.badgeBorderDark} ${sizeClasses[size]} ${className}`}
    >
      {/* Visual Pip Indicators */}
      {showPips && (
        <div className="flex items-center space-x-1" aria-hidden="true">
          {Array.from({ length: meta.totalPips }, (_, i) => i + 1).map((pip) => (
            <span
              key={pip}
              className={`rounded-full transition-all ${pipSizes[size]} ${
                pip <= meta.level
                  ? meta.pipActiveColor
                  : 'bg-slate-300 dark:bg-slate-700/60'
              }`}
            />
          ))}
        </div>
      )}

      <span>{meta.label}</span>
    </div>
  );
};
