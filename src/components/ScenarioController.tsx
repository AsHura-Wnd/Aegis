import React from 'react';
import { SCENARIO_CATALOG } from '../simulation/scenarioDefinitions';
import { ScenarioId } from '../types/scenario';
import {
  AlertOctagon,
  BatteryWarning,
  CheckCircle2,
  Flame,
  Mountain,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Sparkles,
  SunDim,
  WifiOff,
} from 'lucide-react';

interface ScenarioControllerProps {
  isRunning: boolean;
  onTogglePlay: () => void;
  onStep: () => void;
  onReset: () => void;
  onReplay: () => void;
  speedMultiplier: number;
  onSpeedChange: (speed: number) => void;
  activeScenarioId: ScenarioId | null;
  onInjectScenario: (id: ScenarioId) => void;
  onClearFaults: () => void;
}

export const ScenarioController: React.FC<ScenarioControllerProps> = ({
  isRunning,
  onTogglePlay,
  onStep,
  onReset,
  onReplay,
  speedMultiplier,
  onSpeedChange,
  activeScenarioId,
  onInjectScenario,
  onClearFaults,
}) => {
  const getIcon = (id: ScenarioId) => {
    switch (id) {
      case 'LOW_BATTERY':
        return <BatteryWarning className="w-4 h-4 text-red-400" />;
      case 'ROVER_STUCK':
        return <AlertOctagon className="w-4 h-4 text-orange-400" />;
      case 'COMM_LOSS':
        return <WifiOff className="w-4 h-4 text-purple-400" />;
      case 'EXTREME_TEMP':
        return <Flame className="w-4 h-4 text-amber-400" />;
      case 'SOLAR_DUST':
        return <SunDim className="w-4 h-4 text-yellow-400" />;
      case 'HAZARDOUS_TERRAIN':
        return <Mountain className="w-4 h-4 text-rose-400" />;
    }
  };

  const scenarios = Object.values(SCENARIO_CATALOG);

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d121d]/90 backdrop-blur-md p-4 shadow-lg">
      {/* Header & Main Playback Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-mono font-bold tracking-wider text-white uppercase">
              SCENARIO SIMULATOR & FAULT INJECTION
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
            Test rover autonomy across 6 deterministic real-time fault scenarios.
          </p>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          {/* Speed Buttons */}
          <div className="flex rounded-lg bg-black/40 border border-white/10 p-0.5">
            {[1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-2 py-1 text-[11px] font-mono rounded ${
                  speedMultiplier === s
                    ? 'bg-cyan-500 text-black font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Step Button */}
          <button
            onClick={onStep}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all"
            title="Step 1 simulation tick"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Start / Pause Button */}
          <button
            onClick={onTogglePlay}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-400 text-black'
                : 'bg-cyan-500 hover:bg-cyan-400 text-black'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Start
              </>
            )}
          </button>

          {/* Reset Button */}
          <button
            onClick={onReset}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all"
            title="Reset Simulation (Seed 1337)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scenario Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {scenarios.map((sc) => {
          const isActive = activeScenarioId === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => onInjectScenario(sc.id)}
              className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all duration-200 group ${
                isActive
                  ? 'border-red-500 bg-red-950/40 shadow-red-500/20 shadow-md ring-1 ring-red-500/50'
                  : 'border-white/10 bg-[#090d16] hover:border-cyan-500/40 hover:bg-[#0f1524]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="p-1.5 rounded bg-white/5 group-hover:bg-white/10 transition-all">
                    {getIcon(sc.id)}
                  </div>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  )}
                </div>
                <h4 className="text-xs font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-1">
                  {sc.name}
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                  {sc.shortDesc}
                </p>
              </div>

              <div className="mt-2.5 pt-1.5 border-t border-white/5 flex items-center justify-between">
                <span className={`text-[9px] font-mono px-1 rounded ${
                  isActive ? 'bg-red-500/20 text-red-300 font-bold' : 'text-slate-400'
                }`}>
                  {isActive ? 'TRIGGERED' : 'INJECT'}
                </span>
                <span className="text-[9px] font-mono text-slate-400">
                  {sc.expectedRiskLevel}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Quick Action: Clear Faults / Replay */}
      <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {activeScenarioId ? (
            <div className="flex items-center gap-1.5 text-amber-300 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Active Fault: <strong>{activeScenarioId}</strong>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              All fault injectors disengaged (Nominal)
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onReplay}
            className="px-2.5 py-1 text-xs font-mono rounded bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Replay Demo
          </button>

          <button
            onClick={onClearFaults}
            disabled={!activeScenarioId}
            className={`px-3 py-1 text-xs font-mono rounded font-semibold transition-all ${
              activeScenarioId
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/30 shadow-sm'
                : 'bg-white/5 text-slate-400 cursor-not-allowed border border-white/5'
            }`}
          >
            Clear All Faults / Recover
          </button>
        </div>
      </div>
    </div>
  );
};
