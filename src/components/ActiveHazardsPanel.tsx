import React from 'react';
import { DetectedHazard } from '../types/hazard';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from 'lucide-react';

interface ActiveHazardsPanelProps {
  hazards: DetectedHazard[];
  onExecuteMitigation: (hazard: DetectedHazard) => void;
  onOpenMatrix: () => void;
}

export const ActiveHazardsPanel: React.FC<ActiveHazardsPanelProps> = ({
  hazards,
  onExecuteMitigation,
  onOpenMatrix,
}) => {
  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'MODERATE':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d121d]/90 backdrop-blur-md p-4 shadow-lg flex flex-col h-full">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-mono font-bold tracking-wider text-white uppercase">
            9-VECTOR HAZARD DETECTION ENGINE
          </h3>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-300">
            {hazards.length} Active
          </span>
        </div>

        <button
          onClick={onOpenMatrix}
          className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
        >
          <Layers className="w-3 h-3" /> View 9 Rules Matrix
        </button>
      </div>

      {/* Hazards List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[360px] pr-1">
        {hazards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-[#090d16] rounded-lg border border-dashed border-white/10 p-4">
            <ShieldCheck className="w-10 h-10 text-emerald-400 mb-2 opacity-90" />
            <h4 className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-wider">
              ALL SYSTEMS NOMINAL
            </h4>
            <p className="text-[11px] text-slate-400 max-w-sm mt-1">
              All 9 continuous hazard vectors (Battery, Overheating, Cold, Wheel Slip, Stuck, Solar Dust, Weak Comm, Dangerous Terrain, Power Drain) are within acceptable thresholds.
            </p>
          </div>
        ) : (
          hazards.map((h) => (
            <div
              key={h.id}
              className="p-3 rounded-lg border border-red-500/30 bg-[#121624] hover:border-red-500/50 transition-all shadow-sm"
            >
              {/* Header: Name & Severity */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className={`w-3.5 h-3.5 ${h.severity === 'CRITICAL' ? 'text-red-400 animate-pulse' : 'text-amber-400'}`} />
                  <span className="text-xs font-mono font-bold text-slate-100">
                    {h.hazardName}
                  </span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${getSeverityStyle(h.severity)}`}>
                  {h.severity}
                </span>
              </div>

              {/* Reason for detection */}
              <p className="text-xs text-slate-300 font-sans leading-relaxed mb-2">
                {h.reason}
              </p>

              {/* Relevant Telemetry Badges */}
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {h.relevantTelemetry.map((t, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/40 border border-white/5 text-[10px] font-mono"
                  >
                    <span className="text-slate-400">{t.label}:</span>
                    <span className="text-cyan-300 font-semibold">{t.value}</span>
                    <span className="text-slate-400 text-[9px]">({t.threshold})</span>
                  </div>
                ))}
              </div>

              {/* Recommended Action & Mitigation button */}
              <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="text-[11px] text-amber-200/90 font-sans leading-tight">
                  <span className="font-semibold text-amber-400 font-mono text-[10px]">RECOMMENDED ACTION:</span>{' '}
                  {h.recommendedAction}
                </div>

                <button
                  onClick={() => onExecuteMitigation(h)}
                  className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono font-semibold flex items-center gap-1 shrink-0 transition-all"
                >
                  <Wrench className="w-3 h-3" /> Execute Mitigation
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
