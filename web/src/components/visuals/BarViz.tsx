import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';
import { BarChart3 } from 'lucide-react';

interface BarVizProps {
  labels: string[];
  series: Array<{
    name: string;
    values: number[];
  }>;
  sublabels?: string[];
  title?: string;
}

export const BarViz: React.FC<BarVizProps> = ({
  labels,
  series,
  sublabels,
  title,
}) => {
  const chartData = labels.map((label, idx) => {
    const item: Record<string, any> = {
      label,
      sublabel: sublabels && sublabels[idx] ? sublabels[idx] : '',
      index: idx,
    };
    series.forEach((s) => {
      item[s.name] = s.values[idx] !== undefined ? s.values[idx] : 0;
    });
    return item;
  });

  // Custom tick for X Axis to render main label and sublabel on 2 lines
  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const index = payload.index;
    const sublabel = sublabels && sublabels[index] ? sublabels[index] : '';

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={12}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={11}
          fontFamily="JetBrains Mono, monospace"
        >
          {payload.value}
        </text>
        {sublabel && (
          <text
            x={0}
            y={0}
            dy={25}
            textAnchor="middle"
            fill="#64748b"
            fontSize={9}
            fontFamily="JetBrains Mono, monospace"
          >
            {sublabel}
          </text>
        )}
      </g>
    );
  };

  const colors = ['#fbbf24', '#38bdf8', '#f87171', '#34d399', '#a78bfa'];

  return (
    <div className="bg-industrial-900 light:bg-white border border-industrial-800 light:border-slate-200 rounded-xl p-4 shadow-lg my-3">
      {/* Title */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-semibold text-slate-200 light:text-slate-800">
            {title || 'Downtime & Outage Hours Comparison'}
          </h4>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 20, left: -10, bottom: sublabels?.length ? 20 : 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              interval={0}
              tick={<CustomXAxisTick />}
              height={sublabels?.length ? 45 : 30}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              fontFamily="JetBrains Mono"
              tickLine={false}
              unit="h"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#060a12',
                borderColor: '#334155',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono',
                color: '#f8fafc',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              iconType="square"
            />
            {series.map((s, idx) => {
              const barColor = colors[idx % colors.length];
              return (
                <Bar key={s.name} dataKey={s.name} fill={barColor} radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey={s.name}
                    position="top"
                    fill="#cbd5e1"
                    fontSize={10}
                    fontFamily="JetBrains Mono"
                    formatter={(val: any) => (val > 0 ? `${val}h` : '')}
                  />
                </Bar>
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
