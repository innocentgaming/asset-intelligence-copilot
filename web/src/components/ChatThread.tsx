import React, { useState } from 'react';
import { ChatMessage } from '../types';
import { MarkdownContent } from './CitationRenderer';
import { VisualRenderer } from './visuals/VisualRenderer';
import {
  Cpu,
  User as UserIcon,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Layers,
  Database,
} from 'lucide-react';

interface ChatThreadProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onRetry?: (lastPrompt: string) => void;
}

export const ChatThread: React.FC<ChatThreadProps> = ({
  messages,
  isLoading,
  onRetry,
}) => {
  const [openTraces, setOpenTraces] = useState<Record<string, boolean>>({});

  const toggleTrace = (id: string) => {
    setOpenTraces((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getLastUserMessage = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i].content;
    }
    return '';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {messages.map((msg) => {
        const isUser = msg.role === 'user';
        const isTraceOpen = !!openTraces[msg.id];

        if (isUser) {
          return (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[85%] sm:max-w-[70%] bg-industrial-900 light:bg-slate-200 border border-industrial-800 light:border-slate-300 rounded-2xl rounded-tr-sm px-4 py-3 shadow-md">
                <div className="flex items-center gap-2 mb-1 justify-end text-[10px] text-slate-400 font-mono">
                  <span>Operator</span>
                  <span>·</span>
                  <span>{msg.timestamp || 'Now'}</span>
                </div>
                <div className="text-xs sm:text-sm text-slate-100 light:text-slate-900 leading-relaxed font-sans whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            </div>
          );
        }

        // Error message panel
        if (msg.isError) {
          return (
            <div
              key={msg.id}
              className="w-full bg-rose-950/40 border border-rose-600/50 rounded-xl p-4 shadow-lg text-rose-200 space-y-3 animate-fade-in"
            >
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs font-mono">
                <AlertCircle className="w-4 h-4" />
                <span>Execution Error</span>
              </div>
              <p className="text-xs text-rose-200/90 leading-relaxed font-mono">
                {msg.content}
              </p>
              {onRetry && (
                <button
                  onClick={() => onRetry(getLastUserMessage())}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition shadow"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Query</span>
                </button>
              )}
            </div>
          );
        }

        // Assistant Response Panel
        return (
          <div
            key={msg.id}
            className="w-full bg-industrial-900/90 light:bg-white border border-industrial-800 light:border-slate-200 rounded-xl p-4 sm:p-5 shadow-lg space-y-4 animate-fade-in"
          >
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-industrial-800/80 light:border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-mono font-bold text-amber-400">
                  FlytOps Copilot
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-industrial-950 light:bg-slate-100 border border-industrial-800 light:border-slate-300 text-slate-400">
                  gemma-4-31b-it
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {msg.timestamp || 'Verified Response'}
              </span>
            </div>

            {/* Markdown Answer */}
            <MarkdownContent content={msg.content} />

            {/* Visuals */}
            {msg.visuals && msg.visuals.length > 0 && (
              <div className="pt-2">
                {msg.visuals.map((visual, vIdx) => (
                  <VisualRenderer key={vIdx} visual={visual} />
                ))}
              </div>
            )}

            {/* Sources Row */}
            {msg.sources && msg.sources.length > 0 && (
              <div className="pt-2 border-t border-industrial-800/60 light:border-slate-200 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1 font-semibold">
                  <Database className="w-3 h-3 text-amber-400" />
                  Sources:
                </span>
                {msg.sources.map((src, sIdx) => (
                  <span
                    key={sIdx}
                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-industrial-950 light:bg-slate-100 border border-industrial-800 light:border-slate-300 text-slate-300 light:text-slate-700"
                  >
                    {src}
                  </span>
                ))}
              </div>
            )}

            {/* Collapsible Tool Trace: "How I got this" */}
            {msg.trace && msg.trace.length > 0 && (
              <div className="pt-2 border-t border-industrial-800/60 light:border-slate-200">
                <button
                  onClick={() => toggleTrace(msg.id)}
                  className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-amber-400 transition"
                  aria-expanded={isTraceOpen}
                >
                  {isTraceOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  <span className="font-medium">
                    How I got this ({msg.trace.length} tool {msg.trace.length === 1 ? 'step' : 'steps'})
                  </span>
                </button>

                {isTraceOpen && (
                  <div className="mt-2.5 space-y-2 bg-industrial-950 light:bg-slate-50 border border-industrial-800 light:border-slate-200 rounded-lg p-3 text-xs font-mono overflow-x-auto">
                    {msg.trace.map((step, tIdx) => (
                      <div
                        key={tIdx}
                        className="border-b border-industrial-800/80 light:border-slate-200 last:border-b-0 pb-2 mb-2 last:pb-0 last:mb-0"
                      >
                        <div className="flex items-center gap-2 text-amber-400 font-semibold">
                          <Layers className="w-3.5 h-3.5" />
                          <span>Tool: {step.tool}</span>
                        </div>
                        {step.args && Object.keys(step.args).length > 0 && (
                          <div className="text-[11px] text-slate-400 mt-1 pl-5">
                            <span className="text-slate-400">Args: </span>
                            <span className="text-slate-300 light:text-slate-700">
                              {JSON.stringify(step.args)}
                            </span>
                          </div>
                        )}
                        {step.result_preview && (
                          <div className="text-[11px] text-emerald-400 mt-1 pl-5 truncate">
                            <span className="text-slate-400">Preview: </span>
                            <span>{step.result_preview}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Loading Skeleton Panel */}
      {isLoading && (
        <div className="w-full bg-industrial-900 light:bg-white border border-industrial-800 light:border-slate-200 rounded-xl p-5 shadow-lg space-y-4 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-amber-500/20" />
            <div className="h-4 w-32 bg-industrial-800 light:bg-slate-200 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-5/6 bg-industrial-800 light:bg-slate-200 rounded" />
            <div className="h-3 w-4/6 bg-industrial-800 light:bg-slate-200 rounded" />
            <div className="h-3 w-3/6 bg-industrial-800 light:bg-slate-200 rounded" />
          </div>
          <div className="h-36 w-full bg-industrial-950/60 light:bg-slate-100 rounded-lg border border-industrial-800/50 light:border-slate-200" />
        </div>
      )}
    </div>
  );
};
