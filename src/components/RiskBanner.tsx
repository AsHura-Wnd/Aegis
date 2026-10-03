import React from 'react';
import { RiskAssessment } from '../types/risk';
import {
  AlertOctagon,
  AlertTriangle,
  Flame,
  Gauge,
  Radio,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';

interface RiskBannerProps {
  risk: RiskAssessment;
  activeHazardCount: number;
}

export const RiskBanner: React.FC<RiskBannerProps> = ({ risk, activeHazardCount }) => {
  const getLevelStyles = () => {
    switch (risk.riskLevel) {
      case 'CRITICAL':
        return {
          panelClass: 'hud-panel-danger border-red-500/70 shadow-[0_0_30px_rgba(239,68,68,0.25)]',
          badge: 'bg-red-500 text-white font-bold tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse',
          barColor: 'from-amber-500 via-orange-500 to-red-500',
          textColor: 'text-red-400',
          strokeColor: '#ef4444',
          icon: ShieldAlert,
        };
      case 'HIGH':
        return {
          panelClass: 'hud-panel-pro border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.2)]',
          badge: 'bg-amber-500 text-black font-extrabold tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.6)]',
          barColor: 'from-emerald-500 via-amber-500 to-orange-500',
          textColor: 'text-amber-400',
          strokeColor: '#f59e0b',
          icon: AlertTriangle,
        };
      case 'MODERATE':
        return {
          panelClass: 'hud-panel-pro border-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.15)]',
          badge: 'bg-yellow-400 text-black font-bold tracking-wider',
          barColor: 'from-emerald-500 to-yellow-500',
          textColor: 'text-yellow-400',
          strokeColor: '#eab308',
          icon: AlertTriangle,
        };
      case 'LOW':
      default:
        return {
          panelClass: 'hud-panel-pro border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
          badge: 'bg-emerald-500 text-black font-bold tracking-wider',
          barColor: 'from-cyan-500 to-emerald-500',
          textColor: 'text-emerald-400',
          strokeColor: '#10b981',
          icon: ShieldCheck,
        };
    }
  };

  const style = getLevelStyles();
  const IconComponent = style.icon;

  // Circular gauge calculations
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, risk.currentScore)) / 100) * circumference;

  return (
    <div
      className={`rounded-2xl p-4 md:p-5 backdrop-blur-xl transition-all duration-300 relative overflow-hidden ${style.panelClass}`}
    >
      {/* Background Subtle Tech Watermark */}
      <div className="absolute right-4 -bottom-6 text-white/[0.02] font-orbitron font-black text-8xl select-none pointer-events-none">
        AEGIS-RISK
      </div>

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
        {/* Left: Holographic Circular Risk Dial & Level */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Circular SVG Meter */}
          <div className="relative w-18 h-18 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 76 76">
              {/* Track */}
              <circle
                cx="38"
                cy="38"
                r={radius}
                className="text-slate-800/80"
                strokeWidth="5.5"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Progress */}
              <circle
                cx="38"
                cy="38"
                r={radius}
                stroke={style.strokeColor}
                strokeWidth="5.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-orbitron font-extrabold text-xl text-white tracking-tight">
                {risk.currentScore}
              </span>
              <span className="font-mono text-[8px] text-slate-400">/ 100</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-space tracking-wide text-slate-300 font-semibold">
                Overall Mission Risk
              </span>
              <span className={`px-2.5 py-0.5 text-[11px] rounded-full font-space font-bold ${style.badge}`}>
                {risk.riskLevel.charAt(0) + risk.riskLevel.slice(1).toLowerCase()} Risk
              </span>
              {risk.delta !== 0 && (
                <span
                  className={`flex items-center text-xs font-mono font-bold ${
                    risk.delta > 0 ? 'text-red-400 glow-red' : 'text-emerald-400 glow-emerald'
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
              <span className="text-xs font-space text-slate-300 font-medium">
                {activeHazardCount === 0
                  ? 'All 9 hazard vectors nominal'
                  : `${activeHazardCount} active hazard vector${activeHazardCount > 1 ? 's' : ''} detected`}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-space text-cyan-400">
                Primary: <strong className="text-slate-200">{risk.primaryConcern}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Center: Real-Time Explainability Driver Callout */}
        <div className="flex-1 w-full lg:w-auto bg-[#060a14]/90 border border-white/10 rounded-xl p-3 px-4 shadow-inner">
          <div className="flex items-center gap-2 text-xs text-slate-300 font-space mb-1">
            <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="font-bold text-cyan-300 tracking-wide">
              Why score changed & driving concern:
            </span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-space font-normal">
            {risk.reasonForChange}
          </p>
          {risk.compoundingFactors.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-space text-amber-400 font-semibold">
                Compounding Factors:
              </span>
              {risk.compoundingFactors.map((cf, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-mono bg-red-950/80 text-red-200 border border-red-500/50 px-2 py-0.5 rounded shadow-sm"
                >
                  {cf}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: Risk Spectrum Bar */}
        <div className="w-full lg:w-56 shrink-0 flex flex-col justify-center">
          <div className="flex justify-between text-[11px] font-space text-slate-400 mb-1 font-semibold">
            <span className="text-emerald-400">Nominal (0)</span>
            <span className="text-red-400">Critical (100)</span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/15 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${style.barColor}`}
              style={{ width: `${Math.max(5, risk.currentScore)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1.5">
            <span>Dynamic Model:</span>
            <span className="text-cyan-400 font-semibold">Compounding (9-Vector)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
