import React, { useState } from 'react';
import { Flame } from 'lucide-react';

interface HeatmapVizProps {
  x: string[]; // YYYY-MM
  y: string[]; // Areas or categories
  values: number[][]; // values[rowIdx][colIdx]
  totals?: number[];
  title?: string;
}

export const HeatmapViz: React.FC<HeatmapVizProps> = ({
  x,
  y,
  values,
  totals,
  title,
}) => {
  const [hoveredCell, setHoveredCell] = useState<{
    area: string;
    month: string;
    val: number;
    xPos: number;
    yPos: number;
  } | null>(null);

  // Format month label from "2026-01" -> "Jan"
  const formatMonth = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 2) {
      const monthNum = parseInt(parts[1], 10);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (monthNum >= 1 && monthNum <= 12) {
        return months[monthNum - 1];
      }
    }
    return dateStr;
  };

  // Compute maximum value for color scaling
  let maxValue = 1;
  values.forEach(row => {
    row.forEach(val => {
      if (val > maxValue) maxValue = val;
    });
  });

  // Calculate totals if not provided
  const rowTotals = totals || values.map(row => row.reduce((sum, v) => sum + (v || 0), 0));

  return (
    <div className="bg-industrial-900 light:bg-white border border-industrial-800 light:border-slate-200 rounded-xl p-4 shadow-lg my-3 relative">
      {/* Title */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-rose-500" />
          <h4 className="text-xs font-semibold text-slate-200 light:text-slate-800">
            {title || 'Incident & Environmental Spill Heatmap (2026)'}
          </h4>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Max: {maxValue} incidents
        </span>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px] border border-industrial-800 light:border-slate-300 rounded-lg overflow-hidden">
          {/* Header row (Columns) */}
          <div
            className="grid text-center font-mono text-[11px] font-semibold bg-industrial-950 light:bg-slate-100 text-slate-300 light:text-slate-700 border-b border-industrial-800 light:border-slate-300"
            style={{
              gridTemplateColumns: `160px repeat(${x.length}, minmax(40px, 1fr)) 60px`,
            }}
          >
            <div className="p-2 text-left pl-3 text-slate-400 uppercase tracking-wider text-[10px]">
              Area
            </div>
            {x.map((col, idx) => (
              <div key={idx} className="p-2 border-l border-industrial-800 light:border-slate-200">
                {formatMonth(col)}
              </div>
            ))}
            <div className="p-2 border-l border-industrial-800 light:border-slate-200 text-amber-400">
              Total
            </div>
          </div>

          {/* Rows */}
          {y.map((rowLabel, rIdx) => {
            const rowVals = values[rIdx] || [];
            const rTotal = rowTotals[rIdx] ?? rowVals.reduce((a, b) => a + b, 0);

            return (
              <div
                key={rIdx}
                className="grid text-center font-mono text-xs border-b border-industrial-800/60 light:border-slate-200 last:border-b-0"
                style={{
                  gridTemplateColumns: `160px repeat(${x.length}, minmax(40px, 1fr)) 60px`,
                }}
              >
                {/* Row Label */}
                <div className="p-2 text-left pl-3 font-semibold text-slate-300 light:text-slate-800 bg-industrial-950/40 light:bg-slate-50 truncate border-r border-industrial-800 light:border-slate-200">
                  {rowLabel}
                </div>

                {/* Values for each month */}
                {x.map((monthKey, cIdx) => {
                  const val = rowVals[cIdx] || 0;
                  const intensity = val > 0 ? Math.min(Math.max(val / maxValue, 0.15), 1) : 0;
                  const bgColor = val > 0
                    ? `rgba(239, 68, 68, ${0.15 + intensity * 0.75})`
                    : 'transparent';

                  return (
                    <div
                      key={cIdx}
                      className="p-2 flex items-center justify-center border-r border-industrial-800/40 light:border-slate-200 cursor-pointer transition-colors relative"
                      style={{ backgroundColor: bgColor }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredCell({
                          area: rowLabel,
                          month: formatMonth(monthKey),
                          val,
                          xPos: rect.left + rect.width / 2,
                          yPos: rect.top,
                        });
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      <span className={val > 0 ? 'text-white font-bold drop-shadow-sm' : 'text-slate-600'}>
                        {val}
                      </span>
                    </div>
                  );
                })}

                {/* Total Column */}
                <div className="p-2 flex items-center justify-center font-bold text-amber-400 bg-industrial-950/60 light:bg-slate-100">
                  {rTotal}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hover Tooltip floating */}
      {hoveredCell && (
        <div className="mt-2 text-xs font-mono text-center text-slate-300 light:text-slate-700 bg-industrial-950 light:bg-slate-100 p-2 rounded border border-industrial-800 light:border-slate-300">
          <span className="font-semibold text-amber-400">{hoveredCell.area}</span> ·{' '}
          <span className="font-semibold text-sky-400">{hoveredCell.month}</span>: {hoveredCell.val} {hoveredCell.val === 1 ? 'spill' : 'spills'}
        </div>
      )}
    </div>
  );
};
