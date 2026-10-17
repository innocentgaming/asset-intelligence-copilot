import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Activity } from 'lucide-react';

interface LineVizProps {
  labels: string[];
  series: Array<{
    name: string;
    values: number[];
  }>;
  markers?: Array<{
    index: number;
    label: string;
  }>;
  note?: string;
  title?: string;
}

export const LineViz: React.FC<LineVizProps> = ({
  labels,
  series,
  markers = [],
  note,
  title,
}) => {
  // Transform labels and series into Recharts array of objects
  const chartData = labels.map((label, idx) => {
    const item: Record<string, any> = { label, index: idx };
    series.forEach((s) => {
      item[s.name] = s.values[idx] !== undefined ? s.values[idx] : null;
    });
    return item;
  });

  // Identify wellhead and ambient / air series
  const wellheadSeries = series.find(s =>
    s.name.toLowerCase().includes('wellhead') || s.name.toLowerCase().includes('temp')
  ) || series[0];

  // Custom Dot renderer for markers (Red "X" on the marked points)
  const renderMarkerDot = (props: any) => {
    const { cx, cy, index } = props;
    const marker = markers.find(m => m.index === index);

    if (marker) {
      return (
        <g key={`marker-${index}`}>
          <circle cx={cx} cy={cy} r={7} fill="#ef4444" fillOpacity={0.2} />
          <line x1={cx - 5} y1={cy - 5} x2={cx + 5} y2={cy + 5} stroke="#ef4444" strokeWidth={2.5} />
          <line x1={cx - 5} y1={cy + 5} x2={cx + 5} y2={cy - 5} stroke="#ef4444" strokeWidth={2.5} />
          <text
            x={cx}
            y={cy - 10}
            textAnchor="middle"
            fill="#ef4444"
            fontSize="10"
            fontWeight="bold"
            fontFamily="JetBrains Mono, monospace"
          >
            {marker.label}
          </text>
        </g>
      );
    }
    return <circle key={`dot-${index}`} cx={cx} cy={cy} r={3} fill="#fbbf24" />;
  };

  // Custom Tooltip showing values and temperature delta
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      let wellheadVal: number | null = null;
      let ambientVal: number | null = null;

      payload.forEach((entry: any) => {
        const name = (entry.name || '').toLowerCase();
        if (name.includes('wellhead')) wellheadVal = entry.value;
        if (name.includes('air') || name.includes('ambient')) ambientVal = entry.value;
      });

      const delta = (wellheadVal !== null && ambientVal !== null) ? wellheadVal - ambientVal : null;
      const marker = markers.find(m => m.index === payload[0]?.payload?.index);

      return (
        <div className="bg-industrial-950/95 light:bg-white border border-industrial-700 light:border-slate-300 rounded-lg p-3 shadow-xl text-xs space-y-1.5 font-mono">
          <p className="font-semibold text-slate-200 light:text-slate-800 border-b border-industrial-800 pb-1">
            {label}
          </p>
          {payload.map((entry: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <span style={{ color: entry.color }} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.name}:
              </span>
              <span className="font-bold text-slate-100 light:text-slate-900">
                {entry.value !== null ? `${Number(entry.value).toFixed(1)} °C` : '--'}
              </span>
            </div>
          ))}
          {delta !== null && (
            <div className="flex items-center justify-between gap-4 pt-1 border-t border-industrial-800 text-amber-400">
              <span>Delta (Wellhead − Air):</span>
              <span className="font-bold">{delta.toFixed(1)} °C</span>
            </div>
          )}
          {marker && (
            <div className="mt-1 pt-1 border-t border-industrial-800 text-rose-400 font-semibold text-[11px]">
              ⚠ {marker.label}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-industrial-900 light:bg-white border border-industrial-800 light:border-slate-200 rounded-xl p-4 shadow-lg my-3">
      {/* Title */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-semibold text-slate-200 light:text-slate-800">
            {title || 'Temperature Telemetry Trend (13 Weeks)'}
          </h4>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              fontSize={11}
              fontFamily="JetBrains Mono"
              tickLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              fontFamily="JetBrains Mono"
              tickLine={false}
              unit="°C"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              iconType="circle"
            />
            {series.map((s, idx) => {
              const nameLower = s.name.toLowerCase();
              const isWellhead = nameLower.includes('wellhead') || (!nameLower.includes('air') && idx === 0);
              const color = isWellhead ? '#fbbf24' : '#38bdf8'; // amber for wellhead, sky for air

              return (
                <Line
                  key={s.name}
                  type="monotone"
                  dataKey={s.name}
                  stroke={color}
                  strokeWidth={2}
                  dot={isWellhead ? renderMarkerDot : { r: 3, fill: color }}
                  activeDot={{ r: 5 }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Note under chart */}
      {note && (
        <div className="mt-2 pt-2 border-t border-industrial-800/60 light:border-slate-200 text-xs text-amber-300 light:text-amber-800 bg-amber-950/20 light:bg-amber-50 rounded-lg p-2 font-mono">
          <strong>Note:</strong> {note}
        </div>
      )}
    </div>
  );
};
