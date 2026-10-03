import React, { useState } from 'react';
import { OperationalMode, RoverTelemetry } from '../types/telemetry';
import { soundFX } from '../utils/audio';
import { WolfLogo } from './WolfLogo';
import {
  Activity,
  BarChart3,
  Bot,
  Compass,
  Crosshair,
  Globe,
  Layers,
  MapPin,
  Radio,
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
  backendConnected?: boolean;
  activeMissionId?: string;
  availableMissions?: Array<{ id: string; name: string }>;
  onSelectMission?: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  telemetry,
  activeTab,
  onTabChange,
  onOpenBenchmark,
  onOpenMatrix,
  seed,
  backendConnected = false,
  activeMissionId = 'primary-mission',
  availableMissions = [{ id: 'primary-mission', name: 'Jezero Primary Exploration' }],
  onSelectMission,
}) => {
  const [soundOn, setSoundOn] = useState(soundFX.isEnabled());

  const handleToggleSound = () => {
    const newState = soundFX.toggle();
    setSoundOn(newState);
  };

  const getModeBadge = (mode: OperationalMode) => {
    switch (mode) {
      case 'EMERGENCY_RECOVERY':
        return 'bg-rose-950/60 text-rose-300 border-rose-500/40 shadow-sm';
      case 'SAFE_HOLD':
        return 'bg-amber-950/60 text-amber-300 border-amber-500/40 shadow-sm';
      case 'RECHARGE_STANDBY':
        return 'bg-yellow-950/60 text-yellow-300 border-yellow-500/40 shadow-sm';
      case 'HAZARD_AVOIDANCE':
        return 'bg-purple-950/60 text-purple-300 border-purple-500/40 shadow-sm';
      case 'AUTONOMOUS_TRANSIT':
      default:
        return 'bg-zinc-900/90 text-zinc-100 border-white/15 shadow-sm';
    }
  };

  return (
    <header className="border-b border-white/[0.06] bg-black/30 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-[1520px] mx-auto px-4 lg:px-6">
        {/* Row 1: Brand & Flight Deck Status */}
        <div className="py-2 flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Brand Crest & Tactical Identification */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white transition-all hover:border-white/20 shrink-0">
              <WolfLogo className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-space font-extrabold text-lg tracking-[0.16em] text-white">
                  AEGIS
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10 tracking-widest font-medium">
                  MARS 2026 // IIIT-D
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10 tracking-widest font-medium hidden sm:inline">
                  SOL 214 // SECTOR 4
                </span>
              </div>
              <p className="text-[11px] font-sans text-zinc-400 tracking-normal hidden sm:block mt-0.5">
                Autonomous Planetary Rover Mission-Intelligence & Safety Dashboard
              </p>
            </div>
          </div>

          {/* Right: Mission Clock, Mode & Target Waypoint */}
          <div className="flex items-center gap-2.5 font-mono text-xs">
            {/* Mission Elapsed Time (MET) */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
              <span className="text-zinc-400 text-[10px] font-mono uppercase tracking-wider">Clock:</span>
              <span className="font-mono font-bold text-white tracking-wider text-xs">
                {telemetry.formattedTime}
              </span>
            </div>

            {/* Operational Mode Badge */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 text-[10px] hidden md:inline font-mono uppercase tracking-wider">Mode:</span>
              <span
                className={`px-3 py-1 rounded-full border font-space font-medium text-xs tracking-wider transition-all ${getModeBadge(
                  telemetry.operationalMode
                )}`}
              >
                {telemetry.operationalMode.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
              </span>
            </div>

            {/* Current Target Objective */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-zinc-300 px-3 py-1.5 rounded-full bg-black/60 border border-white/10">
              <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate max-w-[260px] font-sans">
                {telemetry.currentObjective || 'Transit to Waypoint 5 (Science Primary)'}
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Secondary Controls & Mission Configuration */}
        <div className="py-2 flex items-center justify-between gap-3 border-t border-white/[0.05] flex-wrap">
          <div className="flex items-center gap-2.5">
            {/* Audio Feedback Button */}
            <button
              onClick={handleToggleSound}
              className={`p-2 text-xs font-mono rounded-xl border transition-all ${
                soundOn
                  ? 'bg-white/10 text-white border-white/20'
                  : 'bg-black/50 text-zinc-400 border-white/10 hover:text-zinc-200 hover:border-white/20'
              }`}
              title={soundOn ? 'Tactical Audio Feedback ON (Click to Mute)' : 'Tactical Audio Feedback MUTED (Click to Enable)'}
            >
              {soundOn ? <Volume2 className="w-3.5 h-3.5 text-zinc-200" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* 9-Vector Rules Matrix Modal Button */}
            <button
              onClick={() => {
                soundFX.playClick();
                onOpenMatrix();
              }}
              className="px-3 py-1.5 text-xs font-mono rounded-xl bg-black/50 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 hover:border-white/20 flex items-center gap-1.5 transition-all font-medium"
              title="Inspect 9 Hazard Rules Matrix"
            >
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              <span>Rules (9)</span>
            </button>

            {/* Autonomy Benchmark Comparison Modal Button */}
            <button
              onClick={() => {
                soundFX.playClick();
                onOpenBenchmark();
              }}
              className="px-3 py-1.5 text-xs font-mono rounded-xl bg-black/50 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 hover:border-white/20 flex items-center gap-1.5 transition-all font-medium"
              title="View Autonomy Benchmark Comparison"
            >
              <BarChart3 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Benchmark</span>
            </button>

            {/* Backend Connection Indicator */}
            <span
              className={`text-xs font-mono px-3 py-1 rounded-full border flex items-center gap-1.5 font-medium ${
                backendConnected
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                  : 'bg-amber-950/40 text-amber-400 border-amber-500/30'
              }`}
              title={backendConnected ? 'Connected to AEGIS Backend REST API (Port 3001)' : 'Offline: Local Fallback Simulation'}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  backendConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span>{backendConnected ? 'API 3001: ONLINE' : 'API: LOCAL'}</span>
            </span>

            {/* Active Mission Switcher */}
            {availableMissions.length > 0 && onSelectMission && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Mission:</span>
                <select
                  value={activeMissionId}
                  onChange={(e) => {
                    soundFX.playClick();
                    onSelectMission(e.target.value);
                  }}
                  className="text-xs font-mono bg-black/70 text-zinc-200 border border-white/10 rounded-lg px-2.5 py-1 focus:outline-none focus:border-white/30 cursor-pointer"
                  title="Switch Active Mission Instance"
                >
                  {availableMissions.map((m) => (
                    <option key={m.id} value={m.id} className="bg-zinc-900 text-zinc-200">
                      {m.id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <span className="text-xs font-mono text-zinc-500 border border-white/8 px-2 py-0.5 rounded bg-black/40 hidden sm:inline">
              SEED: {seed}
            </span>
          </div>
        </div>

        {/* Row 3: Numbered Navigation Bar */}
        <div className="flex items-center gap-1 border-t border-white/[0.05] overflow-x-auto">
          {[
            { id: 'DASHBOARD', idx: '00', label: 'Mission Overview', icon: Globe },
            { id: 'MAP', idx: '01', label: 'Tactical Terrain Map', icon: Crosshair },
            { id: 'TELEMETRY', idx: '02', label: 'Telemetry Analytics', icon: Zap },
            { id: 'ASSISTANT', idx: '03', label: 'AEGIS-Core AI', icon: Bot },
            { id: 'LOGS', idx: '04', label: 'Decision Stream', icon: Radio },
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
                className={`px-4 py-2 text-xs font-mono flex items-center gap-2 border-b-2 transition-all shrink-0 tracking-wider ${
                  isActive
                    ? 'border-white text-white font-bold bg-white/[0.04]'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-white/[0.01]'
                }`}
              >
                <span className={`text-[10px] font-mono ${isActive ? 'text-zinc-300' : 'text-zinc-600'}`}>
                  {tab.idx}
                </span>
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                <span className="uppercase tracking-wider font-space text-[11px]">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
