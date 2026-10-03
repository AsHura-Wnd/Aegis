import React from 'react';
import { RiskAssessment } from '../types/risk';
import { AlertTriangle, ShieldAlert, ShieldCheck, TrendingDown, TrendingUp, Zap } from 'lucide-react';

interface RiskBannerProps {
  risk: RiskAssessment;
  activeHazardCount: number;
}

export const RiskBanner: React.FC<RiskBannerProps> = ({ risk, activeHazardCount }) => {
  const getLevelStyles = () => {
    switch (risk.riskLevel) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-950/40 border-red-500/50 text-red-300',
          badge: 'bg-red-500 text-white shadow-red-500/50 shadow-sm animate-pulse',
          bar: 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500',
          icon: ShieldAlert,
          iconColor: 'text-red-400',
        };
      case 'HIGH':
        return {
          bg: 'bg-amber-950/40 border-amber-500/50 text-amber-300',
          badge: 'bg-amber-500 text-black font-semibold',
          bar: 'bg-gradient-to-r from-emerald-500 via-amber-500 to-orange-500',
          icon: AlertTriangle,
          iconColor: 'text-amber-400',
        };
      case 'MODERATE':
        return {
          bg: 'bg-yellow-950/30 border-yellow-500/40 text-yellow-300',
          badge: 'bg-yellow-500 text-black font-medium',
          bar: 'bg-gradient-to-r from-emerald-500 to-yellow-500',
          icon: AlertTriangle,
          iconColor: 'text-yellow-400',
        };
      case 'LOW':
      default:
        return {
          bg: 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300',
          badge: 'bg-emerald-500/90 text-black font-semibold',
          bar: 'bg-emerald-500',
          icon: ShieldCheck,
          iconColor: 'text-emerald-400',
        };
    }
  };

  const style = getLevelStyles();
  const IconComponent = style.icon;

  return (
    <div className={`rounded-xl border p-4 backdrop-blur-md transition-all duration-300 ${style.bg}`}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Score & Level */}
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-xl bg-[#0d121d] border border-white/10 shrink-0">
            <IconComponent className={`w-8 h-8 ${style.iconColor}`} />
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono tracking-wider text-slate-400 uppercase">
                Overall Mission Risk
              </span>
              <span className={`px-2 py-0.5 text-xs rounded-full font-bold tracking-wider ${style.badge}`}>
                {risk.riskLevel} RISK
              </span>
              {risk.delta !== 0 && (
                <span className={`flex items-center text-xs font-mono ${risk.delta > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {risk.delta > 0 ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
                  {risk.delta > 0 ? `+${risk.delta}` : risk.delta} pts
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-bold font-mono text-white tracking-tight">
                {risk.currentScore}
              </span>
              <span className="text-xs font-mono text-slate-400">/ 100</span>
              <span className="text-xs text-slate-400 ml-2 hidden sm:inline">
                {activeHazardCount === 0
                  ? 'All 9 hazard vectors nominal'
                  : `${activeHazardCount} active hazard vector${activeHazardCount > 1 ? 's' : ''}`}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Dynamic explanation of why score changed */}
        <div className="flex-1 w-full md:w-auto bg-[#0a0e18]/80 border border-white/10 rounded-lg p-2.5 px-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-slate-300">WHY SCORE CHANGED & DRIVING CONCERN:</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-sans line-clamp-2">
            {risk.reasonForChange}
          </p>
          {risk.compoundingFactors.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {risk.compoundingFactors.map((cf, idx) => (
                <span key={idx} className="text-[10px] bg-red-900/60 text-red-200 border border-red-500/40 px-1.5 py-0.5 rounded">
                  {cf}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: Risk Progress Bar Gauge */}
        <div className="w-full md:w-48 shrink-0 flex flex-col justify-center">
          <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>LOW (0)</span>
            <span>CRITICAL (100)</span>
          </div>
          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
              style={{ width: `${Math.max(4, risk.currentScore)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
            <span>Primary:</span>
            <span className="text-slate-300 truncate max-w-[130px] font-medium" title={risk.primaryConcern}>
              {risk.primaryConcern}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
