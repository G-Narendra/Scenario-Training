import React from 'react';

export interface DifficultyBadgeProps {
  difficulty: number; // 1 to 5
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
}

const DIFFICULTY_MAP: Record<number, DifficultyMeta> = {
  1: {
    level: 1,
    label: 'Level 1: Foundational',
    badgeBgDark: 'bg-emerald-950/70',
    badgeTextDark: 'text-emerald-300',
    badgeBorderDark: 'border-emerald-600/50',
    badgeBgLight: 'bg-emerald-50',
    badgeTextLight: 'text-emerald-800',
    badgeBorderLight: 'border-emerald-300',
    pipActiveColor: 'bg-emerald-500',
  },
  2: {
    level: 2,
    label: 'Level 2: Intermediate',
    badgeBgDark: 'bg-cyan-950/70',
    badgeTextDark: 'text-cyan-300',
    badgeBorderDark: 'border-cyan-600/50',
    badgeBgLight: 'bg-cyan-50',
    badgeTextLight: 'text-cyan-800',
    badgeBorderLight: 'border-cyan-300',
    pipActiveColor: 'bg-cyan-500',
  },
  3: {
    level: 3,
    label: 'Level 3: Advanced',
    badgeBgDark: 'bg-amber-950/70',
    badgeTextDark: 'text-amber-300',
    badgeBorderDark: 'border-amber-600/50',
    badgeBgLight: 'bg-amber-50',
    badgeTextLight: 'text-amber-900',
    badgeBorderLight: 'border-amber-400',
    pipActiveColor: 'bg-amber-500',
  },
  4: {
    level: 4,
    label: 'Level 4: High-Stakes',
    badgeBgDark: 'bg-orange-950/70',
    badgeTextDark: 'text-orange-300',
    badgeBorderDark: 'border-orange-600/50',
    badgeBgLight: 'bg-orange-50',
    badgeTextLight: 'text-orange-900',
    badgeBorderLight: 'border-orange-400',
    pipActiveColor: 'bg-orange-500',
  },
  5: {
    level: 5,
    label: 'Level 5: Crisis / Executive',
    badgeBgDark: 'bg-rose-950/80',
    badgeTextDark: 'text-rose-200',
    badgeBorderDark: 'border-rose-600/60',
    badgeBgLight: 'bg-rose-50',
    badgeTextLight: 'text-rose-950',
    badgeBorderLight: 'border-rose-400',
    pipActiveColor: 'bg-rose-600',
  },
};

export const DifficultyBadge: React.FC<DifficultyBadgeProps> = ({
  difficulty,
  showPips = true,
  size = 'md',
  className = '',
}) => {
  const clampedLevel = Math.max(1, Math.min(5, difficulty || 1));
  const meta = DIFFICULTY_MAP[clampedLevel];

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
          {[1, 2, 3, 4, 5].map((pip) => (
            <span
              key={pip}
              className={`rounded-full transition-all ${pipSizes[size]} ${
                pip <= clampedLevel
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
