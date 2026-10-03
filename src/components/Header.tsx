import React, { useState } from 'react';
import { OperationalMode, RoverTelemetry } from '../types/telemetry';
import { soundFX } from '../utils/audio';
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
  Zap,
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
  const [soundOn, setSoundOn] = useState(soundFX.isEnabled());

  const handleToggleSound = () => {
    const newState = soundFX.toggle();
    setSoundOn(newState);
  };

  const getModeBadge = (mode: OperationalMode) => {
    switch (mode) {
      case 'EMERGENCY_RECOVERY':
        return 'bg-red-500/20 text-red-300 border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse';
      case 'SAFE_HOLD':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.3)]';
      case 'RECHARGE_STANDBY':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/60 shadow-[0_0_15px_rgba(234,179,8,0.3)]';
      case 'HAZARD_AVOIDANCE':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.3)]';
      case 'AUTONOMOUS_TRANSIT':
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_15px_rgba(0,229,255,0.25)]';
    }
  };

  return (
    <header className="border-b border-cyan-500/20 bg-[#04060d]/95 backdrop-blur-xl sticky top-0 z-40 shadow-2xl">
      {/* Top Aerospace Command Bar */}
      <div className="max-w-[1440px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Mission Crest & Tactical ID */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/40 shadow-[0_0_20px_rgba(0,229,255,0.3)]">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-orbitron font-extrabold text-lg tracking-wider text-white glow-cyan">
                AEGIS
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 tracking-widest font-semibold">
                MARS 2026 // IIIT-D
              </span>
              <span className="hidden xl:inline text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                SOL 214 // SECTOR 4
              </span>
            </div>
            <p className="text-[11px] font-space text-slate-400 tracking-wide hidden sm:block">
              Autonomous Planetary Rover Mission-Intelligence & Safety Dashboard
            </p>
          </div>
        </div>

        {/* Center: Flight Clock, Operational Mode & DSN Relay Status */}
        <div className="flex items-center gap-2 sm:gap-4 font-mono text-xs">
          {/* Mission Elapsed Time (MET) */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#070b14] border border-cyan-500/30 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
            <span className="text-slate-400 text-[11px] font-semibold">Clock:</span>
            <span className="font-space font-bold text-white tracking-wider text-xs">
              {telemetry.formattedTime}
            </span>
          </div>

          {/* Operational Mode Badge */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] hidden md:inline font-mono">Mode:</span>
            <span
              className={`px-3 py-1 rounded-lg border font-space font-bold text-xs tracking-wide transition-all duration-300 ${getModeBadge(
                telemetry.operationalMode
              )}`}
            >
              {telemetry.operationalMode.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
            </span>
          </div>

          {/* Current Target Objective */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 px-2.5 py-1 rounded-lg bg-black/40 border border-white/5">
            <MapPin className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            <span className="truncate max-w-[210px] text-slate-300 font-rajdhani text-xs font-semibold">
              {telemetry.currentObjective}
            </span>
          </div>
        </div>

        {/* Right: Quick Tools, Audio Toggle & Rules */}
        <div className="flex items-center gap-2">
          {/* Sound FX Toggle Button */}
          <button
            onClick={handleToggleSound}
            className={`p-1.5 text-xs font-mono rounded-lg border transition-all ${
              soundOn
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(0,229,255,0.2)]'
                : 'bg-white/5 text-slate-500 border-white/10 hover:text-slate-300'
            }`}
            title={soundOn ? 'Tactical Audio Feedback ON (Click to Mute)' : 'Tactical Audio Feedback MUTED (Click to Enable)'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* 9-Vector Rules Matrix Modal Button */}
          <button
            onClick={() => {
              soundFX.playClick();
              onOpenMatrix();
            }}
            className="px-2.5 py-1 text-xs font-mono rounded-lg bg-white/5 hover:bg-cyan-500/10 text-slate-200 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/30 flex items-center gap-1.5 transition-all shadow-sm"
            title="Inspect 9 Hazard Rules Matrix"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline font-semibold">Rules (9)</span>
          </button>

          {/* Autonomy Benchmark Comparison Modal Button */}
          <button
            onClick={() => {
              soundFX.playClick();
              onOpenBenchmark();
            }}
            className="px-2.5 py-1 text-xs font-mono rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-200 border border-cyan-500/40 flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,229,255,0.15)] font-semibold"
            title="View Autonomy Benchmark Comparison (P2 Feature)"
          >
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Benchmark</span>
          </button>

          <span className="text-[10px] font-mono text-slate-500 border border-white/5 px-2 py-1 rounded bg-black/50">
            SEED: {seed}
          </span>
        </div>
      </div>

      {/* Futuristic Flight Deck Navigation Tabs */}
      <div className="max-w-[1440px] mx-auto px-4 flex items-center gap-1 border-t border-white/5 overflow-x-auto">
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
              onClick={() => {
                soundFX.playClick();
                onTabChange(tab.id as any);
              }}
              className={`px-4 py-2 text-xs font-mono flex items-center gap-2 border-b-2 transition-all shrink-0 tracking-wider font-semibold ${
                isActive
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 shadow-[inset_0_-2px_8px_rgba(0,229,255,0.2)]'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-white/[0.02]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
