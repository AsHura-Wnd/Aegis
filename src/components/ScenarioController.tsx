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
        return <BatteryWarning className="w-4 h-4 text-zinc-300" />;
      case 'ROVER_STUCK':
        return <AlertOctagon className="w-4 h-4 text-zinc-300" />;
      case 'COMM_LOSS':
        return <WifiOff className="w-4 h-4 text-zinc-300" />;
      case 'EXTREME_TEMP':
        return <Flame className="w-4 h-4 text-zinc-300" />;
      case 'SOLAR_DUST':
        return <SunDim className="w-4 h-4 text-zinc-300" />;
      case 'HAZARDOUS_TERRAIN':
        return <Mountain className="w-4 h-4 text-zinc-300" />;
    }
  };

  const scenarios = Object.values(SCENARIO_CATALOG);

  return (
    <div className="rounded-2xl aegis-card p-4 md:p-5 border border-white/[0.08]">
      {/* Header & Main Playback Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-white/[0.08]">
        <div>
          <div className="flex items-baseline gap-2.5">
            <span className="editorial-num">05.</span>
            <h3 className="font-syne font-bold text-xs tracking-wider uppercase text-zinc-100">
              Scenario Simulator & Fault Injection
            </h3>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            Test rover autonomy across 6 deterministic real-time fault scenarios in Jezero Crater.
          </p>
        </div>

        {/* Playback Controls Hub */}
        <div className="flex items-center gap-2">
          {/* Speed Buttons */}
          <div className="flex rounded-lg bg-zinc-900 border border-white/10 p-0.5">
            {[1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => {
                  soundFX.playClick();
                  onSpeedChange(s);
                }}
                className={`px-2.5 py-1 text-xs font-mono rounded font-semibold transition-all ${
                  speedMultiplier === s
                    ? 'bg-zinc-100 text-black font-bold'
                    : 'text-zinc-400 hover:text-white'
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
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 transition-all hover:border-white/20"
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
            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold flex items-center gap-2 transition-all ${
              isRunning
                ? 'bg-amber-400 hover:bg-amber-300 text-black'
                : 'bg-zinc-100 hover:bg-white text-black'
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
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 transition-all hover:border-white/20"
            title="Reset Simulation (Seed 1337)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 6 Minimalist Scenario Injection Pods */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {scenarios.map((sc, index) => {
          const isActive = activeScenarioId === sc.id;
          const numStr = `0${index + 1}`;
          return (
            <button
              key={sc.id}
              onClick={() => {
                soundFX.playAlert();
                onInjectScenario(sc.id);
              }}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-300 group relative ${
                isActive
                  ? 'border-red-500/70 bg-red-950/25 ring-1 ring-red-500/40'
                  : 'border-white/[0.08] bg-zinc-900/50 hover:border-white/20 hover:bg-zinc-900/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`p-1.5 rounded-lg transition-all ${
                      isActive ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-zinc-400 group-hover:text-zinc-200'
                    }`}
                  >
                    {getIcon(sc.id)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                    <span className="font-mono text-[10px] text-zinc-600 font-bold">{numStr}</span>
                  </div>
                </div>
                <h4 className="text-xs font-mono font-bold text-zinc-100 group-hover:text-white transition-colors line-clamp-1">
                  {sc.name}
                </h4>
                <p className="text-[10.5px] text-zinc-400 mt-1 line-clamp-2 leading-tight font-sans">
                  {sc.shortDesc}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between font-mono">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    isActive
                      ? 'bg-red-500/30 text-red-200'
                      : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                >
                  {isActive ? 'Triggered' : 'Inject'}
                </span>
                <span className="text-[10px] text-zinc-500 font-medium">
                  {sc.expectedRiskLevel}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Quick Action: Clear Faults / Replay */}
      <div className="mt-3.5 pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {activeScenarioId ? (
            <div className="flex items-center gap-2 text-amber-300 font-mono text-xs bg-amber-950/30 border border-amber-500/30 px-2.5 py-1 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Active Fault: <strong className="text-amber-200">{activeScenarioId}</strong>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-zinc-400 font-mono text-xs bg-zinc-900/60 border border-white/5 px-2.5 py-1 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-zinc-400" />
              All fault injectors disengaged (Nominal)
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 font-mono">
          <button
            onClick={() => {
              soundFX.playClick();
              onReplay();
            }}
            className="px-3 py-1.5 text-xs rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 transition-all flex items-center gap-1.5 font-medium hover:border-white/20"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Replay Demo
          </button>

          <button
            onClick={() => {
              soundFX.playSuccess();
              onClearFaults();
            }}
            disabled={!activeScenarioId}
            className={`px-4 py-1.5 text-xs rounded-lg font-bold transition-all ${
              activeScenarioId
                ? 'bg-zinc-100 hover:bg-white text-black cursor-pointer'
                : 'bg-white/5 text-zinc-600 cursor-not-allowed border border-white/5'
            }`}
          >
            Clear All Faults / Recover
          </button>
        </div>
      </div>
    </div>
  );
};
