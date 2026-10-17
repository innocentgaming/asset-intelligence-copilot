import React, { useState, useEffect } from 'react';
import { KnowledgeResponse } from '../types';
import { fetchKnowledge } from '../api';
import {
  X,
  BookOpen,
  Edit3,
  Sliders,
  MessageSquare,
  RefreshCw,
  Clock,
  User as UserIcon,
} from 'lucide-react';

interface KnowledgeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KnowledgeDrawer: React.FC<KnowledgeDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'corrections' | 'rules' | 'claims'>('corrections');
  const [knowledge, setKnowledge] = useState<KnowledgeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchKnowledge();
      setKnowledge(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch shared knowledge');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-industrial-900 light:bg-white border-l border-industrial-800 light:border-slate-200 shadow-2xl flex flex-col text-slate-100 light:text-slate-900">
          {/* Header */}
          <div className="p-4 border-b border-industrial-800 light:border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold font-mono text-slate-100 light:text-slate-900">
                Shared Knowledge Store
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                disabled={loading}
                className="p-1 rounded text-slate-400 hover:text-slate-200 transition"
                title="Refresh Knowledge"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-industrial-800 light:border-slate-200 px-4 bg-industrial-950/40 light:bg-slate-50">
            <button
              onClick={() => setActiveTab('corrections')}
              className={`flex-1 py-2.5 text-xs font-mono font-medium border-b-2 text-center transition flex items-center justify-center gap-1.5 ${
                activeTab === 'corrections'
                  ? 'border-amber-400 text-amber-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Corrections</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-industrial-800 light:bg-slate-200 font-mono">
                {knowledge?.corrections?.length ?? 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`flex-1 py-2.5 text-xs font-mono font-medium border-b-2 text-center transition flex items-center justify-center gap-1.5 ${
                activeTab === 'rules'
                  ? 'border-amber-400 text-amber-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Team Rules</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-industrial-800 light:bg-slate-200 font-mono">
                {knowledge?.rules?.length ?? 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('claims')}
              className={`flex-1 py-2.5 text-xs font-mono font-medium border-b-2 text-center transition flex items-center justify-center gap-1.5 ${
                activeTab === 'claims'
                  ? 'border-amber-400 text-amber-400 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Claims</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-industrial-800 light:bg-slate-200 font-mono">
                {knowledge?.claims?.length ?? 0}
              </span>
            </button>
          </div>

          {/* Drawer Body Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {error && (
              <div className="p-3 bg-rose-950/60 border border-rose-600/60 rounded-lg text-xs text-rose-300">
                {error}
              </div>
            )}

            {/* TAB 1: CORRECTIONS */}
            {activeTab === 'corrections' && (
              <div className="space-y-3">
                {(!knowledge?.corrections || knowledge.corrections.length === 0) ? (
                  <p className="text-xs text-slate-400 italic text-center py-8">
                    No field corrections recorded yet.
                  </p>
                ) : (
                  knowledge.corrections.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-industrial-950 light:bg-slate-50 border border-industrial-800 light:border-slate-200 rounded-lg space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-amber-400 font-semibold">
                          {item.record_id}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.created_at ? item.created_at.substring(0, 10) : ''}
                        </span>
                      </div>
                      <div className="text-xs font-mono font-medium text-purple-300 light:text-purple-800">
                        {item.field}: <span className="line-through text-slate-400">{String(item.original)}</span> → <strong className="text-emerald-400">{String(item.corrected)}</strong>
                      </div>
                      <div className="text-xs text-slate-300 light:text-slate-600">
                        Reason: {item.reason}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1 border-t border-industrial-800 light:border-slate-200">
                        <UserIcon className="w-3 h-3 text-slate-500" />
                        <span>Author: {item.author}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: RULES */}
            {activeTab === 'rules' && (
              <div className="space-y-3">
                {(!knowledge?.rules || knowledge.rules.length === 0) ? (
                  <p className="text-xs text-slate-400 italic text-center py-8">
                    No custom team rules active.
                  </p>
                ) : (
                  knowledge.rules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-industrial-950 light:bg-slate-50 border border-industrial-800 light:border-slate-200 rounded-lg space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-amber-400 font-bold">
                          {rule.rule}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-industrial-800 light:bg-slate-200 text-slate-300 light:text-slate-700 font-mono">
                          {rule.equipment_kind || 'Equipment'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 light:text-slate-700">
                        Scope: <span className="font-mono text-slate-200 light:text-slate-900">{rule.scope_type} = {rule.scope_value}</span>
                      </div>
                      <div className="text-xs text-slate-300 light:text-slate-700">
                        Value: <strong className="font-mono text-amber-300 light:text-amber-700">{String(rule.value)}</strong>
                      </div>
                      <div className="text-[10px] text-slate-400 pt-1 border-t border-industrial-800 light:border-slate-200">
                        Author: {rule.author}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: CLAIMS */}
            {activeTab === 'claims' && (
              <div className="space-y-3">
                {(!knowledge?.claims || knowledge.claims.length === 0) ? (
                  <p className="text-xs text-slate-400 italic text-center py-8">
                    No operator claims registered.
                  </p>
                ) : (
                  knowledge.claims.map((claim, idx) => {
                    const v = (claim.verification || '').toLowerCase();
                    const isContradicted = v === 'contradicted';
                    const isConfirmed = v === 'consistent' || v === 'confirmed';

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-industrial-950 light:bg-slate-50 border border-industrial-800 light:border-slate-200 rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-amber-400">
                            {claim.well_id}
                          </span>
                          {isContradicted && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950 border border-rose-500 text-rose-400">
                              unconfirmed
                            </span>
                          )}
                          {isConfirmed && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 border border-emerald-500 text-emerald-400">
                              confirmed
                            </span>
                          )}
                          {!isContradicted && !isConfirmed && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 border border-slate-600 text-slate-300">
                              {claim.verification || 'future'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-200 light:text-slate-800 leading-relaxed">
                          "{claim.text}"
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-industrial-800 light:border-slate-200">
                          <span>By: {claim.author}</span>
                          <span>{claim.created_at ? claim.created_at.substring(0, 10) : ''}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
