import React from 'react';
import {
  Flame,
  Table,
  LineChart,
  BarChart2,
  MapPin,
  Calendar,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

interface PromptCard {
  title: string;
  query: string;
  icon: React.ReactNode;
  category: string;
  expectedType: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onSelectPrompt }) => {
  const suggestedQuestions: PromptCard[] = [
    {
      title: 'WELL-0001 Operating Status',
      query: 'What is the current status of WELL-0001, including delta temperature and last inspection?',
      icon: <Flame className="w-5 h-5 text-amber-400" />,
      category: 'Asset Inspection',
      expectedType: 'Status Card',
    },
    {
      title: 'NE Block 8 Non-Producing Wells',
      query: 'List all wells in Northeast Block 8 that are currently not producing as a table.',
      icon: <Table className="w-5 h-5 text-sky-400" />,
      category: 'Production Table',
      expectedType: 'DataTable',
    },
    {
      title: 'WELL-0001 13-Week Trend',
      query: 'Show a 13-week line chart of wellhead and ambient temperatures for WELL-0001.',
      icon: <LineChart className="w-5 h-5 text-amber-400" />,
      category: 'Telemetry Chart',
      expectedType: 'Line Chart',
    },
    {
      title: 'NE Block 7 Downtime Comparison',
      query: 'Show top downtime wells in Northeast Block 7 as a bar chart.',
      icon: <BarChart2 className="w-5 h-5 text-emerald-400" />,
      category: 'Operational Outage',
      expectedType: 'Bar Chart',
    },
    {
      title: 'NE Block 8 Incident Map',
      query: 'Map the environmental spills in Northeast Block 8 with coordinates.',
      icon: <MapPin className="w-5 h-5 text-rose-400" />,
      category: 'Geospatial',
      expectedType: 'Interactive Map',
    },
    {
      title: '2026 Incident Heatmap',
      query: 'Show a monthly heatmap of all spills across all areas in 2026.',
      icon: <Calendar className="w-5 h-5 text-purple-400" />,
      category: 'Risk Intelligence',
      expectedType: 'Matrix Heatmap',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 flex flex-col items-center justify-center min-h-[70vh]">
      {/* Brand Hero */}
      <div className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Gemma 4 · Autonomous Telemetry & Operations Copilot</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 light:text-slate-900 tracking-tight">
          Field Asset Intelligence
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
          Ask questions across SCADA telemetry, maintenance work orders, SOP manuals, and human inspection logs.
        </p>
      </div>

      {/* 6 Suggested Questions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
        {suggestedQuestions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(item.query)}
            className="group text-left p-4 rounded-xl bg-industrial-900/90 light:bg-white border border-industrial-800 light:border-slate-200 hover:border-amber-500/50 light:hover:border-amber-500/50 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3"
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-industrial-950 light:bg-slate-100 border border-industrial-800 light:border-slate-200 group-hover:border-amber-500/30 transition">
                {item.icon}
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase tracking-wider">
                  {item.category}
                </span>
                <span className="text-slate-600 text-[10px]">·</span>
                <span className="text-[10px] font-mono text-amber-400/90 font-medium">
                  {item.expectedType}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-200 light:text-slate-800 group-hover:text-amber-300 light:group-hover:text-amber-600 transition">
                {item.title}
              </h3>
              <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-snug">
                "{item.query}"
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
