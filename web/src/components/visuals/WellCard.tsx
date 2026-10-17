import React from 'react';
import { WellCardData } from '../../types';
import { AlertTriangle, CheckCircle, ShieldAlert, Wrench, Edit3, MessageSquare, Clock } from 'lucide-react';

interface WellCardProps {
  card: WellCardData;
}

export const WellCard: React.FC<WellCardProps> = ({ card }) => {
  const delta = Number(card.delta_c ?? 0);
  const threshold = Number(card.threshold_c ?? 15);
  const ratio = threshold > 0 ? Math.min(Math.max(delta / threshold, 0), 1.5) : 0;
  const isBreach = delta > threshold;
  const gaugePercent = Math.min(Math.round((ratio / 1.5) * 100), 100);

  return (
    <div className="bg-industrial-900 light:bg-white border border-industrial-800 light:border-slate-200 rounded-xl p-5 shadow-lg flex flex-col gap-4 text-slate-100 light:text-slate-900 transition-all hover:border-amber-500/40">
      {/* Top Header: Well ID, Type, Area, Status Pill */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-bold font-mono tracking-tight text-amber-400">
              {card.well}
            </h4>
            {card.name && card.name !== card.well && (
              <span className="text-xs text-slate-400 font-mono">({card.name})</span>
            )}
            <span className="px-2 py-0.5 rounded text-xs font-mono bg-industrial-800 light:bg-slate-100 text-slate-300 light:text-slate-700 border border-industrial-700 light:border-slate-300">
              {card.type}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{card.area}</p>
        </div>

        <div className="flex items-center gap-2">
          {card.producing ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 border border-emerald-500/50 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Producing
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-950/80 border border-rose-500/50 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              Not producing
            </span>
          )}
        </div>
      </div>

      {/* Delta Temperature Gauge */}
      <div className="bg-industrial-950/70 light:bg-slate-50 border border-industrial-800/80 light:border-slate-200 rounded-lg p-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-300 light:text-slate-700 font-medium">
            Wellhead − air: <strong className={isBreach ? "text-rose-400 font-mono" : "text-amber-400 font-mono"}>{delta.toFixed(1)} °C</strong>
          </span>
          <span className="text-slate-400 text-[11px] font-mono">
            limit {threshold.toFixed(1)} °C {isBreach && <span className="text-rose-400 font-bold ml-1">BREACH</span>}
          </span>
        </div>

        {/* Horizontal gauge bar */}
        <div className="w-full h-2 bg-industrial-800 light:bg-slate-200 rounded-full overflow-hidden relative">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isBreach ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-500'
            }`}
            style={{ width: `${gaugePercent}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mt-1.5">
          <span>Wellhead: {card.wellhead_c !== undefined ? `${Number(card.wellhead_c).toFixed(1)} °C` : '--'}</span>
          <span>Ambient: {card.ambient_c !== undefined ? `${Number(card.ambient_c).toFixed(1)} °C` : '--'}</span>
        </div>
      </div>

      {/* Last Inspection Metadata & Stale Warning */}
      <div className="text-xs space-y-1 border-t border-industrial-800/60 light:border-slate-200 pt-3">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <span className="text-slate-400">Last Inspection:</span>
          <span className="font-mono text-slate-300 light:text-slate-700">
            {card.inspection || 'None'} · {card.date || 'N/A'}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>{card.method || 'Unknown method'}</span>
          <span>Inspector: {card.inspector || 'Unassigned'}</span>
        </div>

        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <span className="text-slate-400 text-xs">Recorded status:</span>
          <span className="font-mono text-xs text-slate-300 light:text-slate-700">
            {card.recorded_status || (card.producing ? 'Producing' : 'Not producing')}
          </span>
          {card.stale && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-950/80 border border-orange-500/60 text-orange-400">
              <Clock className="w-3 h-3" />
              out of date
            </span>
          )}
        </div>

        {card.inspector_note && (
          <p className="italic text-slate-400 text-[11px] mt-1 pl-2 border-l-2 border-slate-700">
            "{card.inspector_note}"
          </p>
        )}
      </div>

      {/* Reasons / Downtime Callouts (Amber) */}
      {card.reasons && card.reasons.length > 0 && (
        <div className="space-y-1.5">
          {card.reasons.map((r, i) => (
            <div
              key={i}
              className="flex items-start gap-2 bg-amber-950/40 border border-amber-600/40 rounded-lg p-2.5 text-xs text-amber-200 light:text-amber-900"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-300 light:text-amber-800 block text-[11px] uppercase tracking-wide">
                  Root Cause / Reason
                </span>
                <span>{r}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Corrections Callouts (Purple) */}
      {card.corrections && card.corrections.length > 0 && (
        <div className="space-y-1.5">
          {card.corrections.map((c, i) => (
            <div
              key={i}
              className="flex items-start gap-2 bg-purple-950/40 border border-purple-600/40 rounded-lg p-2.5 text-xs text-purple-200 light:text-purple-900"
            >
              <Edit3 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-mono text-purple-300 light:text-purple-800 font-semibold">
                  {c.field}: {String(c.original)} → {String(c.corrected)}
                </span>
                <p className="text-[11px] text-purple-200/80 light:text-purple-950">
                  by {c.by || c.author || 'User'} — {c.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Conflicts Callouts (Red) */}
      {card.conflicts && card.conflicts.length > 0 && (
        <div className="space-y-1.5">
          {card.conflicts.map((conf, i) => (
            <div
              key={i}
              className="flex items-start gap-2 bg-red-950/50 border border-red-600/50 rounded-lg p-2.5 text-xs text-red-200 light:text-red-900"
            >
              <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-red-400 block text-[11px] uppercase tracking-wide">
                  ⚠ Conflict Detected
                </span>
                <span>{conf}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Claims Callouts with Verification Badges */}
      {card.claims && card.claims.length > 0 && (
        <div className="space-y-1.5">
          {card.claims.map((claim, i) => {
            const v = (claim.verification || '').toLowerCase();
            const isContradicted = v === 'contradicted';
            const isConfirmed = v === 'consistent' || v === 'confirmed';
            return (
              <div
                key={i}
                className="flex items-start justify-between gap-2 bg-industrial-950 light:bg-slate-100 border border-industrial-800 light:border-slate-200 rounded-lg p-2.5 text-xs"
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-slate-400 block">Claim by {claim.by || claim.author || 'team'}:</span>
                    <span className="text-slate-200 light:text-slate-800">{claim.text}</span>
                  </div>
                </div>
                <div>
                  {isContradicted && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950 border border-rose-500 text-rose-400 whitespace-nowrap">
                      unconfirmed
                    </span>
                  )}
                  {isConfirmed && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 border border-emerald-500 text-emerald-400 whitespace-nowrap">
                      confirmed
                    </span>
                  )}
                  {!isContradicted && !isConfirmed && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 border border-slate-600 text-slate-300 whitespace-nowrap">
                      {claim.verification || 'pending'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const WellCardGrid: React.FC<{ cards: WellCardData[] }> = ({ cards }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-3">
      {cards.map((c, idx) => (
        <WellCard key={c.well || idx} card={c} />
      ))}
    </div>
  );
};
