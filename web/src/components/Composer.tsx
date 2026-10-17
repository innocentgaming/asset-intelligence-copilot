import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';

interface ComposerProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const LOADING_STATUSES = [
  'Reading inspections…',
  'Checking SOPs…',
  'Analyzing telemetry trends…',
  'Verifying sensor limits…',
  'Building the visual…',
];

export const Composer: React.FC<ComposerProps> = ({
  onSendMessage,
  isLoading,
  disabled = false,
}) => {
  const [input, setInput] = useState('');
  const [statusIdx, setStatusIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cycle loading messages when in loading state
  useEffect(() => {
    if (!isLoading) {
      setStatusIdx(0);
      return;
    }

    const interval = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % LOADING_STATUSES.length);
    }, 1800);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading || disabled) return;

    onSendMessage(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="sticky bottom-0 bg-industrial-950/95 light:bg-white/95 backdrop-blur border-t border-industrial-800 light:border-slate-200 p-3 sm:p-4 z-20">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* Loading status cycling indicator banner */}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 bg-industrial-900 light:bg-amber-50/80 border border-amber-500/30 px-3 py-1.5 rounded-lg animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <Sparkles className="w-3.5 h-3.5" />
            <span>{LOADING_STATUSES[statusIdx]}</span>
          </div>
        )}

        {/* Input & Action controls */}
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-industrial-900 light:bg-slate-100 border border-industrial-800 light:border-slate-300 rounded-xl p-2 focus-within:border-amber-500/60 transition shadow-inner">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || disabled}
            placeholder="Ask about wells, temperatures, downtime, SOP limits, or spills (Enter to send, Shift+Enter for newline)..."
            className="flex-1 bg-transparent border-0 outline-none resize-none text-slate-100 light:text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm px-2 py-1 max-h-40 font-sans"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading || disabled}
            className="p-2 rounded-lg bg-amber-400 hover:bg-amber-500 text-industrial-950 disabled:opacity-30 disabled:cursor-not-allowed transition flex-shrink-0"
            aria-label="Send query"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-industrial-950" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
          <span>Shift + Enter for new line</span>
          <span>FlytBase Gemma 4 Engine</span>
        </div>
      </div>
    </div>
  );
};
