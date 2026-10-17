import React from 'react';
import { UserMetaResponse } from '../types';
import { Sun, Moon, Database, Menu, BookOpen, Sparkles } from 'lucide-react';

interface HeaderProps {
  meta: UserMetaResponse | null;
  isDark: boolean;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
  onOpenKnowledge: () => void;
  onOpenSkillHub: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  meta,
  isDark,
  onToggleTheme,
  onToggleSidebar,
  onOpenKnowledge,
  onOpenSkillHub,
}) => {
  const wellsCount = meta?.wells ?? 200;
  const today = meta?.today ?? '2026-10-16';
  const model = meta?.model ?? 'gemma-4-31b-it';

  return (
    <header className="h-14 border-b border-industrial-800 light:border-slate-200 bg-industrial-950/90 light:bg-white backdrop-blur flex items-center justify-between px-4 sticky top-0 z-20">
      {/* Left: Mobile Menu + Title info */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-industrial-800 transition"
          aria-label="Toggle Navigation Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Live Data Badge */}
        <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-industrial-900 light:bg-slate-100 border border-industrial-800 light:border-slate-300 text-slate-300 light:text-slate-700 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{wellsCount} wells</span>
          <span className="text-slate-600 light:text-slate-400">·</span>
          <span>today {today}</span>
          <span className="text-slate-600 light:text-slate-400">·</span>
          <span className="text-amber-400 font-semibold">{model}</span>
        </div>
      </div>

      {/* Right controls: Skill Hub, Knowledge Drawer & Theme Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSkillHub}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 light:text-amber-700 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition shadow-sm"
          aria-label="Open Agent Skills and Gemma 4 Hub"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Agent Skill & Gemma 4 Hub</span>
        </button>

        <button
          onClick={onOpenKnowledge}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 light:text-slate-700 bg-industrial-900 hover:bg-industrial-800 light:bg-slate-100 light:hover:bg-slate-200 border border-industrial-800 light:border-slate-300 transition"
          aria-label="Open Shared Knowledge Drawer"
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Shared Knowledge</span>
        </button>

        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-industrial-800 light:hover:bg-slate-200 transition"
          aria-label="Toggle Dark/Light Mode"
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>
    </header>
  );
};
