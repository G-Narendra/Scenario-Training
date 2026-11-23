import React from 'react';

export interface RadarDimension {
  label: string;
  score: number; // 0 to 100
  benchmark?: number; // 0 to 100, default 75
}

interface RadarChartProps {
  dimensions: RadarDimension[];
  size?: number;
  className?: string;
  showBenchmark?: boolean;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  dimensions,
  size = 380,
  className = '',
  showBenchmark = true,
}) => {
  if (!dimensions || dimensions.length < 3) {
    return null;
  }

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.34;
  const numAxes = dimensions.length;
  const angleStep = (2 * Math.PI) / numAxes;

  // Grid levels (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Calculate polygon coordinates for a given set of normalized values (0 to 1)
  const getPolygonPoints = (values: number[]) => {
    return values
      .map((val, idx) => {
        const angle = idx * angleStep - Math.PI / 2;
        const clampedVal = Math.max(0.05, Math.min(1.0, val));
        const r = radius * clampedVal;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const participantValues = dimensions.map((d) => Math.max(0.1, Math.min(1.0, d.score / 100)));
  const participantPoints = getPolygonPoints(participantValues);

  const benchmarkValues = dimensions.map((d) => (d.benchmark ?? 75) / 100);
  const benchmarkPoints = getPolygonPoints(benchmarkValues);

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="participantRadarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E3E62" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#B91C1C" stopOpacity="0.25" />
          </linearGradient>
          <filter id="radarShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Concentric Background Grid Polygons */}
        {gridLevels.map((lvl, lvlIdx) => {
          const pts = dimensions
            .map((_, i) => {
              const angle = i * angleStep - Math.PI / 2;
              const r = radius * lvl;
              return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
            })
            .join(' ');

          return (
            <polygon
              key={`grid-${lvlIdx}`}
              points={pts}
              fill={lvlIdx === gridLevels.length - 1 ? '#F8FAFC' : 'none'}
              fillOpacity={lvlIdx === gridLevels.length - 1 ? 0.5 : 0}
              stroke="#CBD5E1"
              strokeWidth={lvlIdx === gridLevels.length - 1 ? '1.5' : '1'}
              strokeDasharray={lvlIdx < gridLevels.length - 1 ? '3 3' : 'none'}
              className="dark:fill-[#0B192C]/40 dark:stroke-[#1E3E62]"
            />
          );
        })}

        {/* Axis Lines from Center to Perimeter */}
        {dimensions.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x2 = cx + radius * Math.cos(angle);
          const y2 = cy + radius * Math.sin(angle);
          return (
            <line
              key={`axis-${i}`}
              x1={cx}
              y1={cy}
              x2={x2}
              y2={y2}
              stroke="#CBD5E1"
              strokeWidth="1"
              className="dark:stroke-[#1E3E62]"
            />
          );
        })}

        {/* Benchmark Polygon (Dashed Slate) */}
        {showBenchmark && (
          <polygon
            points={benchmarkPoints}
            fill="none"
            stroke="#64748B"
            strokeWidth="1.8"
            strokeDasharray="4 4"
            className="dark:stroke-[#94A3B8]"
          />
        )}

        {/* Participant Performance Polygon */}
        <polygon
          points={participantPoints}
          fill="url(#participantRadarGrad)"
          stroke="#0B192C"
          strokeWidth="2.5"
          filter="url(#radarShadow)"
          className="dark:stroke-[#DC2626]"
        />

        {/* Data Points (Dots on Vertices with Score) */}
        {dimensions.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const r = radius * (participantValues[i] || 0.1);
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);

          return (
            <g key={`point-${i}`}>
              <circle
                cx={x}
                cy={y}
                r="4.5"
                fill="#B91C1C"
                stroke="#FFFFFF"
                strokeWidth="2"
                className="dark:stroke-[#0B192C]"
              />
            </g>
          );
        })}

        {/* Dimension Labels around Perimeter */}
        {dimensions.map((dim, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const labelDist = radius + 26;
          const lx = cx + labelDist * Math.cos(angle);
          const ly = cy + labelDist * Math.sin(angle);

          // Anchor alignment based on horizontal position
          const cos = Math.cos(angle);
          let textAnchor: 'middle' | 'start' | 'end' = 'middle';
          if (cos > 0.3) textAnchor = 'start';
          else if (cos < -0.3) textAnchor = 'end';

          return (
            <g key={`label-${i}`} className="text-xs">
              <text
                x={lx}
                y={ly}
                textAnchor={textAnchor}
                className="fill-slate-700 dark:fill-slate-200 font-bold text-[11px] leading-tight"
                dominantBaseline="central"
              >
                {dim.label}
              </text>
              <text
                x={lx}
                y={ly + (ly > cy ? 12 : -12)}
                textAnchor={textAnchor}
                className="fill-[#B91C1C] font-black text-[10px]"
                dominantBaseline="central"
              >
                {Math.round(dim.score)}%
              </text>
            </g>
          );
        })}
      </svg>

      {/* Spider Graph Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold">
        <div className="flex items-center space-x-2">
          <span className="h-3 w-3 rounded-full bg-[#0B192C] dark:bg-[#DC2626] border-2 border-white dark:border-[#0B192C]" />
          <span className="text-slate-800 dark:text-slate-200 font-bold">Delegate Performance</span>
        </div>
        {showBenchmark && (
          <div className="flex items-center space-x-2">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-slate-500 dark:border-slate-400" />
            <span className="text-slate-500 dark:text-slate-400">Executive Benchmark (75%)</span>
          </div>
        )}
      </div>
    </div>
  );
};
