import React from 'react';
import { SCENARIO_CATALOG } from '../simulation/scenarioDefinitions';
import { ScenarioId } from '../types/scenario';
import { soundFX } from '../utils/audio';
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
    <div className="rounded-2xl hud-panel-pro p-4 md:p-5 shadow-2xl border border-white/10">
      {/* Header & Main Playback Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="font-space font-semibold text-xs tracking-wider text-white">
              Scenario Simulator & Fault Injection
            </h3>
          </div>
          <p className="text-xs text-slate-400 font-space mt-0.5">
            Test rover autonomy across 6 deterministic real-time fault scenarios in Jezero Crater.
          </p>
        </div>

        {/* Playback Controls Hub */}
        <div className="flex items-center gap-2">
          {/* Speed Buttons */}
          <div className="flex rounded-lg bg-black/60 border border-white/10 p-0.5 shadow-inner">
            {[1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => {
                  soundFX.playClick();
                  onSpeedChange(s);
                }}
                className={`px-2.5 py-1 text-xs font-space rounded font-semibold transition-all ${
                  speedMultiplier === s
                    ? 'bg-cyan-500 text-black font-bold shadow-[0_0_8px_rgba(0,229,255,0.5)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Step Button */}
          <button
            onClick={() => {
              soundFX.playClick();
              onStep();
            }}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all hover:border-cyan-500/30"
            title="Step 1 simulation tick"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Start / Pause Button */}
          <button
            onClick={() => {
              soundFX.playClick();
              onTogglePlay();
            }}
            className={`px-4 py-2 rounded-lg font-space text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
              isRunning
                ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-amber-500/20'
                : 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-cyan-500/30'
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
            onClick={() => {
              soundFX.playClick();
              onReset();
            }}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all hover:border-cyan-500/30"
            title="Reset Simulation (Seed 1337)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 6 Cybernetic Scenario Injection Pods */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {scenarios.map((sc) => {
          const isActive = activeScenarioId === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => {
                soundFX.playAlert();
                onInjectScenario(sc.id);
              }}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-300 group relative overflow-hidden ${
                isActive
                  ? 'border-red-500 bg-red-950/50 shadow-[0_0_20px_rgba(239,68,68,0.35)] ring-1 ring-red-500'
                  : 'border-white/10 bg-[#070a14] hover:border-cyan-500/40 hover:bg-[#0c1222] shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`p-1.5 rounded-lg transition-all ${
                      isActive ? 'bg-red-500/20 text-red-300' : 'bg-white/5 group-hover:bg-white/10'
                    }`}
                  >
                    {getIcon(sc.id)}
                  </div>
                  {isActive && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />}
                </div>
                <h4 className="text-xs font-semibold font-space text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-1">
                  {sc.name}
                </h4>
                <p className="text-[10.5px] text-slate-400 mt-1 line-clamp-2 leading-tight font-sans">
                  {sc.shortDesc}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                <span
                  className={`text-[10px] font-space px-2 py-0.5 rounded font-bold ${
                    isActive
                      ? 'bg-red-500/30 text-red-200 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                      : 'text-slate-400 group-hover:text-cyan-400'
                  }`}
                >
                  {isActive ? 'Triggered' : 'Inject'}
                </span>
                <span className="text-[10px] font-space text-slate-500 font-semibold">
                  {sc.expectedRiskLevel}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Quick Action: Clear Faults / Replay */}
      <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {activeScenarioId ? (
            <div className="flex items-center gap-2 text-amber-300 font-space text-xs bg-amber-950/40 border border-amber-500/30 px-2.5 py-1 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]" />
              Active Fault: <strong className="text-amber-200">{activeScenarioId}</strong>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-400 font-space text-xs bg-emerald-950/30 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              All fault injectors disengaged (Nominal)
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 font-space">
          <button
            onClick={() => {
              soundFX.playClick();
              onReplay();
            }}
            className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all flex items-center gap-1.5 font-semibold hover:border-cyan-500/30"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" /> Replay Demo
          </button>

          <button
            onClick={() => {
              soundFX.playSuccess();
              onClearFaults();
            }}
            disabled={!activeScenarioId}
            className={`px-4 py-1.5 text-xs rounded-lg font-bold transition-all ${
              activeScenarioId
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer'
                : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
            }`}
          >
            Clear All Faults / Recover
          </button>
        </div>
      </div>
    </div>
  );
};
