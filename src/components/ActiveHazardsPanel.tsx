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
        return 'bg-red-500/15 text-red-300 border-red-500/40';
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
      case 'MODERATE':
        return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40';
      default:
        return 'bg-zinc-800 text-zinc-300 border-white/10';
    }
  };

  return (
    <div className="rounded-2xl aegis-card p-4 flex flex-col h-full border border-white/[0.08]">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
        <div className="flex items-baseline gap-2.5">
          <span className="editorial-num">03.</span>
          <h3 className="font-syne font-bold text-xs tracking-wider uppercase text-zinc-100">
            9-Vector Hazard Detection Engine
          </h3>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
              hazards.length > 0
                ? 'bg-red-950/80 text-red-300 border border-red-500/40'
                : 'bg-zinc-900 text-zinc-400 border border-white/10'
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
          className="text-[11px] font-mono text-zinc-400 hover:text-zinc-100 flex items-center gap-1.5 transition-colors font-medium"
        >
          <Layers className="w-3.5 h-3.5" /> View 9 Rules Matrix
        </button>
      </div>

      {/* Hazards List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[360px] pr-1">
        {hazards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-zinc-900/30 rounded-xl border border-dashed border-white/10 p-5">
            <div className="mb-2.5">
              <ShieldCheck className="w-10 h-10 text-zinc-400" />
            </div>
            <h4 className="font-syne font-bold text-sm text-zinc-200 tracking-wide uppercase">
              All Systems Nominal
            </h4>
            <p className="text-xs text-zinc-500 max-w-sm mt-1 font-mono leading-relaxed">
              All 9 continuous hazard vectors (Battery, Overheating, Cold, Wheel Slip, Stuck, Solar Dust, Weak Comm, Dangerous Terrain, Power Drain) are within acceptable thresholds.
            </p>
          </div>
        ) : (
          hazards.map((h) => (
            <div
              key={h.id}
              className={`p-3.5 rounded-xl border transition-all ${
                h.severity === 'CRITICAL'
                  ? 'border-red-500/50 bg-red-950/20'
                  : 'border-amber-500/40 bg-amber-950/15'
              }`}
            >
              {/* Header: Name & Severity */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={`w-4 h-4 ${
                      h.severity === 'CRITICAL' ? 'text-red-400 animate-pulse' : 'text-amber-400'
                    }`}
                  />
                  <span className="font-mono font-bold text-xs text-zinc-100 tracking-wide uppercase">
                    {h.hazardName}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold uppercase ${getSeverityStyle(
                    h.severity
                  )}`}
                >
                  {h.severity}
                </span>
              </div>

              {/* Reason for detection */}
              <p className="text-xs text-zinc-300 font-sans leading-relaxed mb-2.5">
                {h.reason}
              </p>

              {/* Relevant Telemetry Badges */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {h.relevantTelemetry.map((t, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/60 border border-white/[0.08] text-[10px] font-mono"
                  >
                    <span className="text-zinc-500">{t.label}:</span>
                    <strong className="text-zinc-200 font-semibold">{t.value}</strong>
                    <span className="text-zinc-600 text-[9px]">({t.threshold})</span>
                  </div>
                ))}
              </div>

              {/* Recommended Action & Mitigation button */}
              <div className="pt-2.5 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="text-[11px] text-zinc-400 font-sans leading-tight">
                  <span className="font-semibold text-zinc-200 font-mono text-[11px] uppercase tracking-wide">
                    Action:
                  </span>{' '}
                  {h.recommendedAction}
                </div>

                <button
                  onClick={() => {
                    soundFX.playSuccess();
                    onExecuteMitigation(h);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-black text-[11px] font-mono font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-sm"
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
