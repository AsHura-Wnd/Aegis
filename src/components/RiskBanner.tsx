import React from 'react';
import { RiskAssessment } from '../types/risk';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';

interface RiskBannerProps {
  risk: RiskAssessment;
  activeHazardCount: number;
  missionName?: string;
  currentObjective?: string;
  operationalMode?: string;
}

export const RiskBanner: React.FC<RiskBannerProps> = ({
  risk,
  activeHazardCount,
  missionName,
  currentObjective,
  operationalMode,
}) => {
  const getLevelStyles = () => {
    switch (risk.riskLevel) {
      case 'CRITICAL':
        return {
          panelClass: 'border-rose-500/40 bg-rose-950/20 shadow-[0_8px_30px_rgba(244,63,94,0.12)]',
          badge: 'bg-rose-950/60 text-rose-300 border-rose-500/40',
          barColor: 'bg-rose-500',
          textColor: 'text-rose-400',
          strokeColor: '#f43f5e',
          icon: ShieldAlert,
        };
      case 'HIGH':
        return {
          panelClass: 'border-amber-500/35 bg-amber-950/15 shadow-[0_8px_30px_rgba(245,158,11,0.08)]',
          badge: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
          barColor: 'bg-amber-500',
          textColor: 'text-amber-400',
          strokeColor: '#f59e0b',
          icon: AlertTriangle,
        };
      case 'MODERATE':
        return {
          panelClass: 'border-yellow-500/30 bg-yellow-950/10 shadow-sm',
          badge: 'bg-yellow-950/50 text-yellow-300 border-yellow-500/30',
          barColor: 'bg-yellow-400',
          textColor: 'text-yellow-400',
          strokeColor: '#eab308',
          icon: AlertTriangle,
        };
      case 'LOW':
      default:
        return {
          panelClass: 'aegis-card border-white/8',
          badge: 'bg-emerald-950/40 text-emerald-400 border-emerald-500/25',
          barColor: 'bg-emerald-400',
          textColor: 'text-emerald-400',
          strokeColor: '#10b981',
          icon: ShieldCheck,
        };
    }
  };

  const style = getLevelStyles();

  // Circular gauge calculations
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, risk.currentScore)) / 100) * circumference;

  return (
    <div
      className={`rounded-2xl p-3 md:p-3.5 backdrop-blur-xl transition-all duration-300 relative overflow-hidden border ${style.panelClass}`}
    >
      {/* Top Mission Briefing Bar */}
      {(missionName || currentObjective || operationalMode) && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 mb-2.5 border-b border-white/[0.08] text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Mission:</span>
            <span className="text-zinc-100 font-bold">{missionName || 'Jezero Primary Exploration'}</span>
            <span className="text-zinc-700">/</span>
            <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Objective:</span>
            <span className="text-zinc-300 font-medium">{currentObjective || 'Transit to Waypoint 2 (Mid-Valley Crater)'}</span>
          </div>
          {operationalMode && (
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 uppercase tracking-wider text-[10px]">Autonomy Mode:</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-200 font-mono font-bold text-[11px]">
                {operationalMode.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
        {/* Left: Circular Dial & Risk Overview */}
        <div className="flex items-center gap-3.5 shrink-0">
          <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 60 60">
              <circle
                cx="30"
                cy="30"
                r={radius}
                className="text-zinc-800/80"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="30"
                cy="30"
                r={radius}
                stroke={style.strokeColor}
                strokeWidth="3.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-space font-bold text-base text-white tracking-tight leading-none">
                {risk.currentScore}
              </span>
              <span className="font-mono text-[7px] text-zinc-500 leading-none mt-0.5">/100</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-500 tracking-wider">00.</span>
              <span className="text-xs font-space tracking-wider text-zinc-200 font-semibold uppercase">
                Overall Mission Risk
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-mono rounded border font-semibold ${style.badge}`}>
                {risk.riskLevel}
              </span>
              {risk.delta !== 0 && (
                <span
                  className={`flex items-center text-xs font-mono font-semibold ${
                    risk.delta > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {risk.delta > 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline" />
                  )}
                  {risk.delta > 0 ? `+${risk.delta}` : risk.delta} pts
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-sans text-zinc-400">
                {activeHazardCount === 0
                  ? 'All 9 hazard vectors nominal'
                  : `${activeHazardCount} active hazard vector${activeHazardCount > 1 ? 's' : ''} detected`}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-xs font-sans text-zinc-300">
                Primary: <strong className="text-white font-medium">{risk.primaryConcern}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Center: Concise Driver Explainability */}
        <div className="flex-1 max-w-xl bg-black/40 border border-white/5 rounded-xl p-3 text-xs">
          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 mb-1">
            <Zap className="w-3.5 h-3.5 text-zinc-300" />
            <span className="font-bold tracking-wider uppercase text-zinc-200">
              Why Score Changed & Driving Concern:
            </span>
          </div>
          <p className="text-zinc-300 font-sans text-xs leading-relaxed">
            {risk.reasonForChange}
          </p>

          {/* Compounding Risk Warning Callout if present */}
          {risk.compoundingFactors.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/5 flex flex-col gap-1">
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                Compounding:
              </span>
              {risk.compoundingFactors.map((factor, idx) => (
                <div
                  key={idx}
                  className="text-[11px] text-amber-200/90 font-mono bg-amber-950/30 border border-amber-500/20 px-2 py-0.5 rounded"
                >
                  {factor}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Subdued Linear Scale */}
        <div className="w-full lg:w-44 shrink-0">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-1">
            <span>Nominal (0)</span>
            <span>Critical (100)</span>
          </div>
          <div className="w-full bg-zinc-900/80 h-1 rounded-full overflow-hidden border border-white/5">
            <div
              className={`h-full transition-all duration-500 rounded-full ${style.barColor}`}
              style={{ width: `${Math.min(100, Math.max(2, risk.currentScore))}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 mt-1">
            <span>Model:</span>
            <span className="text-zinc-400 font-medium">9-Vector Dynamic Compounding</span>
          </div>
        </div>
      </div>
    </div>
  );
};
