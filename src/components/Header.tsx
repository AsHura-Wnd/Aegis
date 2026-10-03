import React from 'react';
import { OperationalMode, RoverTelemetry } from '../types/telemetry';
import {
  Activity,
  BarChart3,
  Bot,
  Compass,
  Cpu,
  Globe,
  Layers,
  MapPin,
  Radio,
  Satellite,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface HeaderProps {
  telemetry: RoverTelemetry;
  activeTab: 'DASHBOARD' | 'MAP' | 'TELEMETRY' | 'ASSISTANT' | 'LOGS';
  onTabChange: (tab: 'DASHBOARD' | 'MAP' | 'TELEMETRY' | 'ASSISTANT' | 'LOGS') => void;
  onOpenBenchmark: () => void;
  onOpenMatrix: () => void;
  seed: number;
}

export const Header: React.FC<HeaderProps> = ({
  telemetry,
  activeTab,
  onTabChange,
  onOpenBenchmark,
  onOpenMatrix,
  seed,
}) => {
  const getModeBadge = (mode: OperationalMode) => {
    switch (mode) {
      case 'EMERGENCY_RECOVERY':
        return 'bg-red-500/20 text-red-300 border-red-500/50 animate-pulse';
      case 'SAFE_HOLD':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'RECHARGE_STANDBY':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'HAZARD_AVOIDANCE':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/50';
      case 'AUTONOMOUS_TRANSIT':
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    }
  };

  return (
    <header className="border-b border-white/10 bg-[#080c15]/95 backdrop-blur-md sticky top-0 z-40">
      {/* Top Banner: Mission ID, Clock & System Mode */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Project Branding */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-cyan-500/20 shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-base tracking-wider text-white">
                AEGIS
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                MARS 2026 // IIIT-D
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans hidden sm:block">
              Autonomous Planetary Rover Mission-Intelligence & Safety System
            </p>
          </div>
        </div>

        {/* Center: Live Mission Clock & Status Pills */}
        <div className="flex items-center gap-2 sm:gap-4 font-mono text-xs">
          {/* Mission Elapsed Time */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/40 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400 text-[11px]">CLOCK:</span>
            <span className="font-bold text-white tracking-wider">{telemetry.formattedTime}</span>
          </div>

          {/* Operational Mode Pill */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] hidden md:inline">MODE:</span>
            <span className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-xs tracking-wider ${getModeBadge(telemetry.operationalMode)}`}>
              {telemetry.operationalMode.replace('_', ' ')}
            </span>
          </div>

          {/* Target Location */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-yellow-400" />
            <span className="truncate max-w-[200px] text-slate-300">
              {telemetry.currentObjective}
            </span>
          </div>
        </div>

        {/* Right: Quick Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenMatrix}
            className="px-2.5 py-1 text-xs font-mono rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center gap-1 transition-all"
            title="Inspect 9 Hazard Rules Matrix"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Rules (9)</span>
          </button>

          <button
            onClick={onOpenBenchmark}
            className="px-2.5 py-1 text-xs font-mono rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 transition-all"
            title="View Autonomy Benchmark Comparison (P2 Feature)"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Benchmark</span>
          </button>

          <span className="text-[10px] font-mono text-slate-500 border border-white/5 px-1.5 py-1 rounded bg-black/40">
            SEED: {seed}
          </span>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 border-t border-white/5 overflow-x-auto">
        {[
          { id: 'DASHBOARD', label: 'Mission Overview', icon: Globe },
          { id: 'MAP', label: 'Tactical Terrain Map', icon: Compass },
          { id: 'TELEMETRY', label: 'Telemetry Analytics', icon: Activity },
          { id: 'ASSISTANT', label: 'AEGIS-Core AI', icon: Bot },
          { id: 'LOGS', label: 'Decision Stream', icon: Radio },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as any)}
              className={`px-3 py-2 text-xs font-mono flex items-center gap-1.5 border-b-2 transition-all shrink-0 ${
                isActive
                  ? 'border-cyan-400 text-cyan-300 font-bold bg-cyan-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
