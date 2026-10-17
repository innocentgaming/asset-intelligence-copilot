import React, { useState } from 'react';
import { X, Sparkles, Terminal, Code2, Cpu, ExternalLink, Copy, Check, BookOpen } from 'lucide-react';

interface SkillModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SkillModal: React.FC<SkillModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'skill' | 'ollama' | 'hermes'>('skill');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const ollamaSnippet = `# 1. Pull Google Gemma 4 model (31B or edge 9B)
ollama pull gemma4:31b

# 2. Run Gemma 4 locally
ollama run gemma4:31b

# 3. Configure environment in .env
COPILOT_PRESET=ollama
COPILOT_BASE_URL=http://localhost:11434/v1
COPILOT_MODEL=gemma4:31b

# 4. Start Copilot
python -m copilot.server --data ds/sample-data`;

  const skillSnippet = `---
name: asset-intelligence-copilot
license: MIT
description: Autonomous oil & gas well asset intelligence copilot using Google Gemma 4 and deterministic SCADA telemetry analytics.
metadata:
  version: 2.0.0
  publisher: FlytBase-AHC
  supported_models:
    - google/gemma-4-31b-it
    - gemma4:31b (ollama)
---`;

  const hermesSnippet = `from copilot.agent import Agent
from copilot.data import DataIndexer
from copilot.memory import MemoryManager

indexer = DataIndexer("ds/sample-data")
memory = MemoryManager()
copilot = Agent(indexer, memory)

response = copilot.run_query(
    user_name="Michael Turner",
    query="What is the current status of WELL-0001?"
)`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-industrial-900 light:bg-white border border-industrial-700 light:border-slate-300 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 light:text-slate-900">
        {/* Header */}
        <div className="p-4 border-b border-industrial-800 light:border-slate-200 flex items-center justify-between bg-industrial-950/80 light:bg-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono text-slate-100 light:text-slate-900">
                Agent Skills & Google Gemma 4 Hub
              </h2>
              <p className="text-[11px] text-slate-400">
                Agent Skill Open Standard · Ollama Edge Setup · Hermes Agent Harness
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-industrial-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-industrial-800 light:border-slate-200 px-4 bg-industrial-950/40 light:bg-slate-50 gap-2">
          <button
            onClick={() => setActiveTab('skill')}
            className={`py-2.5 px-3 text-xs font-mono border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'skill'
                ? 'border-amber-400 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Agent Skill (SKILL.md)</span>
          </button>

          <button
            onClick={() => setActiveTab('ollama')}
            className={`py-2.5 px-3 text-xs font-mono border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'ollama'
                ? 'border-amber-400 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Gemma 4 with Ollama</span>
          </button>

          <button
            onClick={() => setActiveTab('hermes')}
            className={`py-2.5 px-3 text-xs font-mono border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'hermes'
                ? 'border-amber-400 text-amber-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Hermes Agent Harness</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'skill' && (
            <div className="space-y-3">
              <div className="bg-industrial-950 light:bg-slate-50 border border-industrial-800 light:border-slate-200 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider">
                  Open Standard Agent Skill Definition
                </h3>
                <p className="text-xs text-slate-300 light:text-slate-600 leading-relaxed">
                  This repository implements the <strong>Agent Skill Open Standard</strong>. The skill is declared in <code className="text-amber-300 font-mono text-[11px]">SKILL.md</code> and automatically discoverable in <code className="text-amber-300 font-mono text-[11px]">.agents/skills/asset-intelligence-copilot/</code>.
                </p>
                <div className="relative mt-2">
                  <pre className="bg-industrial-900 light:bg-slate-100 p-3 rounded-lg font-mono text-[11px] text-slate-300 light:text-slate-800 overflow-x-auto border border-industrial-800 light:border-slate-300">
                    {skillSnippet}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(skillSnippet, 'skill')}
                    className="absolute top-2 right-2 p-1.5 rounded bg-industrial-800 hover:bg-industrial-700 text-slate-300"
                    title="Copy snippet"
                  >
                    {copiedCode === 'skill' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-industrial-950/60 light:bg-slate-50 border border-industrial-800 light:border-slate-200 rounded-lg">
                  <span className="font-semibold text-sky-400 block mb-1">Dynamic Telemetry Rules</span>
                  <p className="text-slate-400 text-[11px]">
                    Delta T = T_wellhead - T_air &ge; 15.0 &deg;C (T200) / 20.0 &deg;C (T350). Evaluated deterministically with zero math hallucination.
                  </p>
                </div>
                <div className="p-3 bg-industrial-950/60 light:bg-slate-50 border border-industrial-800 light:border-slate-200 rounded-lg">
                  <span className="font-semibold text-emerald-400 block mb-1">7-Day Outage Ledger</span>
                  <p className="text-slate-400 text-[11px]">
                    Strict accounting of 7 days downtime per down weekly inspection; skips add 0 days.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ollama' && (
            <div className="space-y-3">
              <div className="bg-industrial-950 light:bg-slate-50 border border-industrial-800 light:border-slate-200 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider">
                  How to Run Google Gemma 4 Locally with Ollama
                </h3>
                <p className="text-xs text-slate-300 light:text-slate-600 leading-relaxed">
                  For offline drilling rigs, air-gapped SCADA systems, and edge execution, Google Gemma 4 runs locally using Ollama:
                </p>
                <div className="relative mt-2">
                  <pre className="bg-industrial-900 light:bg-slate-100 p-3 rounded-lg font-mono text-[11px] text-slate-300 light:text-slate-800 overflow-x-auto border border-industrial-800 light:border-slate-300">
                    {ollamaSnippet}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(ollamaSnippet, 'ollama')}
                    className="absolute top-2 right-2 p-1.5 rounded bg-industrial-800 hover:bg-industrial-700 text-slate-300"
                    title="Copy snippet"
                  >
                    {copiedCode === 'ollama' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-industrial-950/60 light:bg-slate-50 border border-industrial-800 light:border-slate-200 rounded-lg text-xs space-y-1">
                <span className="font-semibold text-amber-400 block">Edge Memory Sizing Guide</span>
                <p className="text-[11px] text-slate-400">
                  - <strong>gemma4:31b:</strong> Recommended for workstations with &ge; 24 GB VRAM.<br />
                  - <strong>gemma4:9b:</strong> Optimized for laptops and edge devices (&le; 16 GB VRAM).<br />
                  - <strong>gemma4:e4b:</strong> Ultra-lightweight edge deployment on edge IoT boxes.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'hermes' && (
            <div className="space-y-3">
              <div className="bg-industrial-950 light:bg-slate-50 border border-industrial-800 light:border-slate-200 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider">
                  Hermes Agent Harness Workflow Integration
                </h3>
                <p className="text-xs text-slate-300 light:text-slate-600 leading-relaxed">
                  This skill exposes 8 deterministic function schemas conforming to the Hermes Agent harness in <code className="text-amber-300 font-mono text-[11px]">hermes_agent_tools.json</code>:
                </p>
                <div className="relative mt-2">
                  <pre className="bg-industrial-900 light:bg-slate-100 p-3 rounded-lg font-mono text-[11px] text-slate-300 light:text-slate-800 overflow-x-auto border border-industrial-800 light:border-slate-300">
                    {hermesSnippet}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(hermesSnippet, 'hermes')}
                    className="absolute top-2 right-2 p-1.5 rounded bg-industrial-800 hover:bg-industrial-700 text-slate-300"
                    title="Copy snippet"
                  >
                    {copiedCode === 'hermes' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-industrial-800 light:border-slate-200 bg-industrial-950/80 light:bg-slate-100 flex items-center justify-between text-xs font-mono text-slate-400 px-4">
          <span>FlytBase Asset Intelligence Challenge</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
