import React from 'react';
import {
  Visual,
  CardVisual,
  TableVisual,
  LineVisual,
  BarVisual,
  MapVisual,
  HeatmapVisual,
} from '../../types';
import { WellCardGrid } from './WellCard';
import { DataTable } from './DataTable';
import { LineViz } from './LineViz';
import { BarViz } from './BarViz';
import { MapViz } from './MapViz';
import { HeatmapViz } from './HeatmapViz';
import { FileText } from 'lucide-react';

interface VisualRendererProps {
  visual: Visual;
}

export const VisualRenderer: React.FC<VisualRendererProps> = ({ visual }) => {
  if (!visual || !visual.type) {
    return null;
  }

  const renderContent = () => {
    switch (visual.type) {
      case 'card': {
        const v = visual as CardVisual;
        return <WellCardGrid cards={v.cards || []} />;
      }
      case 'table': {
        const v = visual as TableVisual;
        return <DataTable columns={v.columns || []} rows={v.rows || []} title={v.title} />;
      }
      case 'line': {
        const v = visual as LineVisual;
        return (
          <LineViz
            labels={v.labels || []}
            series={v.series || []}
            markers={v.markers}
            note={v.note}
            title={v.title}
          />
        );
      }
      case 'bar': {
        const v = visual as BarVisual;
        return (
          <BarViz
            labels={v.labels || []}
            series={v.series || []}
            sublabels={v.sublabels}
            title={v.title}
          />
        );
      }
      case 'map': {
        const v = visual as MapVisual;
        return <MapViz points={v.points || []} title={v.title} />;
      }
      case 'heatmap': {
        const v = visual as HeatmapVisual;
        return (
          <HeatmapViz
            x={v.x || []}
            y={v.y || []}
            values={v.values || []}
            totals={v.totals}
            title={v.title}
          />
        );
      }
      default: {
        return (
          <div className="bg-industrial-900 light:bg-slate-50 border border-industrial-800 light:border-slate-300 rounded-xl p-4 my-3 text-xs overflow-x-auto">
            <div className="text-amber-400 font-mono font-semibold mb-2">
              Visual: {String(visual.type)}
            </div>
            <pre className="font-mono text-slate-300 light:text-slate-700 whitespace-pre-wrap">
              {JSON.stringify(visual, null, 2)}
            </pre>
          </div>
        );
      }
    }
  };

  return (
    <div className="my-2">
      {renderContent()}
      {visual.sources && visual.sources.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mt-1 px-1 text-[11px] text-slate-400">
          <FileText className="w-3 h-3 text-slate-500" />
          <span className="font-semibold text-slate-500">Visual Sources:</span>
          {visual.sources.map((src: string, sIdx: number) => (
            <span
              key={sIdx}
              className="px-2 py-0.5 rounded font-mono bg-industrial-950 light:bg-slate-200 border border-industrial-800 light:border-slate-300 text-slate-300 light:text-slate-700"
            >
              {src}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
