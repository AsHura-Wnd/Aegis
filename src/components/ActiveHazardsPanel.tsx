import React from 'react';
import { DetectedHazard } from '../types/hazard';
import { soundFX } from '../utils/audio';
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
        return 'bg-red-500/20 text-red-300 border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.3)]';
      case 'MODERATE':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
    }
  };

  return (
    <div className="rounded-2xl hud-panel-pro p-4 shadow-xl flex flex-col h-full border border-white/10">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <ShieldAlert className={`w-4 h-4 ${hazards.length > 0 ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`} />
          </div>
          <h3 className="font-space font-semibold text-xs tracking-wider text-white">
            9-Vector Hazard Detection Engine
          </h3>
          <span
            className={`text-[10px] font-space px-2 py-0.5 rounded-full font-bold ${
              hazards.length > 0
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {hazards.length} Active
          </span>
        </div>

        <button
          onClick={() => {
            soundFX.playClick();
            onOpenMatrix();
          }}
          className="text-[11px] font-space text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors font-semibold"
        >
          <Layers className="w-3.5 h-3.5" /> View 9 Rules Matrix
        </button>
      </div>

      {/* Hazards List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[360px] pr-1">
        {hazards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-9 text-center bg-[#060912]/80 rounded-xl border border-dashed border-emerald-500/30 p-5 shadow-inner">
            <div className="relative mb-3">
              <ShieldCheck className="w-12 h-12 text-emerald-400 opacity-90 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
              <div className="absolute inset-0 rounded-full bg-emerald-400/10 animate-ping" />
            </div>
            <h4 className="font-space font-bold text-sm text-emerald-300 tracking-wide">
              All Systems Nominal
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1.5 font-rajdhani leading-relaxed">
              All 9 continuous hazard vectors (Battery, Overheating, Cold, Wheel Slip, Stuck, Solar Dust, Weak Comm, Dangerous Terrain, Power Drain) are within acceptable thresholds.
            </p>
          </div>
        ) : (
          hazards.map((h) => (
            <div
              key={h.id}
              className={`p-3.5 rounded-xl border transition-all shadow-md ${
                h.severity === 'CRITICAL'
                  ? 'border-red-500/60 bg-red-950/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                  : 'border-amber-500/50 bg-[#101422]'
              }`}
            >
              {/* Header: Name & Severity */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={`w-4 h-4 ${
                      h.severity === 'CRITICAL' ? 'text-red-400 animate-pulse' : 'text-amber-400'
                    }`}
                  />
                  <span className="font-mono font-bold text-xs text-slate-100 tracking-wide">
                    {h.hazardName}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${getSeverityStyle(
                    h.severity
                  )}`}
                >
                  {h.severity}
                </span>
              </div>

              {/* Reason for detection */}
              <p className="text-xs text-slate-300 font-sans leading-relaxed mb-2.5">
                {h.reason}
              </p>

              {/* Relevant Telemetry Badges */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {h.relevantTelemetry.map((t, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 border border-white/10 text-[10px] font-mono"
                  >
                    <span className="text-slate-400">{t.label}:</span>
                    <strong className="text-cyan-300 font-semibold">{t.value}</strong>
                    <span className="text-slate-500 text-[9px]">({t.threshold})</span>
                  </div>
                ))}
              </div>

              {/* Recommended Action & Mitigation button */}
              <div className="pt-2.5 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="text-[11px] text-amber-200/90 font-sans leading-tight">
                  <span className="font-semibold text-amber-400 font-space text-[11px] tracking-wide">
                    Recommended Action:
                  </span>{' '}
                  {h.recommendedAction}
                </div>

                <button
                  onClick={() => {
                    soundFX.playSuccess();
                    onExecuteMitigation(h);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(0,229,255,0.2)] text-[11px] font-mono font-bold flex items-center gap-1.5 shrink-0 transition-all"
                >
                  <Wrench className="w-3.5 h-3.5" /> Execute Mitigation
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
