import React from 'react';
import { SCENARIO_CATALOG } from '../simulation/scenarioDefinitions';
import { DetectedHazard } from '../types/hazard';
import { RiskAssessment } from '../types/risk';
import { ScenarioId } from '../types/scenario';
import { RoverTelemetry } from '../types/telemetry';
import { soundFX } from '../utils/audio';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Eye,
  Radio,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface RealtimeScenarioPanelProps {
  activeScenarioId: ScenarioId | null;
  isRunning: boolean;
  telemetry: RoverTelemetry;
  activeHazards: DetectedHazard[];
  riskAssessment: RiskAssessment;
  backendConnected: boolean;
  onClearFaults: () => void;
}

export const RealtimeScenarioPanel: React.FC<RealtimeScenarioPanelProps> = ({
  activeScenarioId,
  isRunning,
  telemetry,
  activeHazards,
  riskAssessment,
  backendConnected,
  onClearFaults,
}) => {
  const activeScenario = activeScenarioId ? SCENARIO_CATALOG[activeScenarioId] : null;
  const isFaultActive = Boolean(activeScenarioId && activeScenario);

  // View mode state: default 'hazard' matches reference screenshot; can toggle to 'nominal' or 'auto'
  const [hudViewMode, setHudViewMode] = React.useState<'auto' | 'hazard' | 'nominal'>('hazard');

  // Determine whether an obstacle/hazard is currently detected
  const isObstacleDetected = hudViewMode === 'hazard' 
    ? true 
    : hudViewMode === 'nominal' 
    ? false 
    : (isFaultActive && activeScenario?.id === 'HAZARDOUS_TERRAIN') ||
      activeHazards.some(h => ['DANGEROUS_TERRAIN'].includes(h.hazardType) && h.severity !== 'LOW') ||
      telemetry.roughnessIndex > 0.38 ||
      telemetry.slopeAngle > 15;

  // Determine current detection label & bounding box parameters based on active scenario or hazards
  const getHazardOverlay = () => {
    if (!isFaultActive && !isObstacleDetected) {
      return {
        boxTitle: 'CLEAR CORRIDOR',
        riskLabel: 'RISK: NOMINAL',
        isDanger: false,
        coords: 'left-[26%] top-[40%] w-[30%] h-[46%]',
        telemetryLine: `REGOLITH TRANSIT // CLEARANCE: 0.65m // SLOPE: ${telemetry.slopeAngle.toFixed(1)}°`,
      };
    }

    if (activeScenario?.id === 'HAZARDOUS_TERRAIN' || isObstacleDetected) {
      return {
        boxTitle: 'ROCK FIELD',
        riskLabel: 'RISK: HIGH',
        isDanger: true,
        coords: 'left-[50%] top-[34%] w-[38%] h-[48%]',
        telemetryLine: `JAGGED BOULDERS // SLOPE: ${telemetry.slopeAngle.toFixed(1)}° // ROUGHNESS: ${telemetry.roughnessIndex.toFixed(2)}`,
      };
    }

    switch (activeScenario?.id) {
      case 'ROVER_STUCK':
        return {
          boxTitle: 'LOOSE DUNE SAND',
          riskLabel: 'RISK: CRITICAL',
          isDanger: true,
          coords: 'left-[25%] top-[38%] w-[50%] h-[48%]',
          telemetryLine: `SINKAGE DETECTED // SLIP: ${(telemetry.wheelSlipAverage * 100).toFixed(0)}% // VELOCITY: 0.00 m/s`,
        };
      case 'LOW_BATTERY':
        return {
          boxTitle: 'POWER DEFICIT',
          riskLabel: 'RISK: CRITICAL',
          isDanger: true,
          coords: 'left-[20%] top-[20%] w-[60%] h-[60%]',
          telemetryLine: `SOC: ${telemetry.batteryLevel.toFixed(1)}% // BUS: ${telemetry.batteryVoltage.toFixed(1)}V // RECHARGE NEEDED`,
        };
      case 'SOLAR_DUST':
        return {
          boxTitle: 'DUST STORM FRONT',
          riskLabel: 'RISK: HIGH',
          isDanger: true,
          coords: 'left-[15%] top-[15%] w-[70%] h-[70%]',
          telemetryLine: `FERRIC DEPOSITION // ARRAY EFFICIENCY: ${telemetry.solarEfficiency.toFixed(1)}% // DUST: ${telemetry.dustAccumulation.toFixed(0)}%`,
        };
      case 'EXTREME_TEMP':
        return {
          boxTitle: 'THERMAL EXCURSION',
          riskLabel: 'RISK: CRITICAL',
          isDanger: true,
          coords: 'left-[30%] top-[25%] w-[42%] h-[54%]',
          telemetryLine: `ACTUATOR OVERHEAT // MOTOR: ${telemetry.motorAverageTemp.toFixed(1)}°C // CORE: ${telemetry.internalTemp.toFixed(1)}°C`,
        };
      case 'COMM_LOSS':
        return {
          boxTitle: 'ORBITER LOS / SHADOW',
          riskLabel: 'RISK: HIGH',
          isDanger: true,
          coords: 'left-[22%] top-[22%] w-[56%] h-[56%]',
          telemetryLine: `DOWNLINK ATTENUATED // RSSI: ${telemetry.signalStrengthDbm} dBm // PACKET LOSS: ${telemetry.packetLossPercent}%`,
        };
      default:
        return {
          boxTitle: 'DETECTED ANOMALY',
          riskLabel: 'RISK: ELEVATED',
          isDanger: true,
          coords: 'left-[30%] top-[30%] w-[40%] h-[50%]',
          telemetryLine: `ACTIVE VECTOR COUNT: ${activeHazards.length}`,
        };
    }
  };

  const overlay = getHazardOverlay();

  return (
    <div className="rounded-2xl aegis-card p-3 border border-white/[0.08] shadow-xl flex flex-col justify-between h-full">
      {/* Header & Status Indicator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Eye className={`w-4 h-4 ${isFaultActive ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`} />
          </div>
          <span className="editorial-num">03.</span>
          <h3 className="font-syne font-bold text-xs tracking-wider uppercase text-zinc-100">
            Real-Time Scenario & Hazard Sensor Monitor
          </h3>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase transition-all ${
              isFaultActive
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.35)]'
                : 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isFaultActive ? 'Fault Injected // Active' : 'Nominal Simulation'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
          <span className="flex items-center gap-1.5 bg-zinc-900/80 border border-white/10 px-2 py-0.5 rounded text-cyan-300">
            <Zap className="w-3 h-3 text-cyan-400" />
            20Hz Stereo Vision
          </span>
          <span className="hidden sm:inline bg-zinc-900/80 border border-white/10 px-2 py-0.5 rounded">
            {backendConnected ? 'Backend Synced' : 'Backend Synced'}
          </span>
        </div>
      </div>

      {/* Main HUD Viewport: Martian Surface & Real-Time Hazard Bounding Box */}
      <div className="relative w-full flex-1 min-h-[200px] rounded-xl overflow-hidden border border-white/15 bg-black">
        {/* Background Martian Surface Terrain (Photorealistic Haz-Cam View) */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{
            backgroundImage: `url('/mars_hazcam.jpg')`,
            filter: isFaultActive && activeScenario?.id === 'SOLAR_DUST' ? 'contrast(75%) brightness(65%) sepia(85%)' : 'none',
          }}
        />

        {/* Tactical Scanlines & Depth Vignette */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_49%,rgba(255,255,255,0.03)_50%,transparent_51%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.35)_51%)] bg-[length:100%_4px] opacity-25 pointer-events-none" />

        {/* HUD Top Left Marker */}
        <div className="absolute top-2 left-2 text-[9px] font-mono text-zinc-300 tracking-wider flex items-center gap-1.5 bg-black/75 px-2 py-0.5 rounded border border-white/10 backdrop-blur-md z-20">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          • HAZ-CAM-FWD // STEREO DEPTH 3D
        </div>

        {/* HUD Top Right Marker + Interactive Perception Switcher */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
          <button
            onClick={() => setHudViewMode(m => m === 'auto' ? 'hazard' : m === 'hazard' ? 'nominal' : 'auto')}
            title="Toggle perception view: Auto / Force Hazard / Clear Corridor"
            className="text-[8.5px] font-mono text-zinc-300 bg-black/75 hover:bg-black/95 px-2 py-0.5 rounded border border-white/15 backdrop-blur-md transition-all flex items-center gap-1"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isObstacleDetected ? 'bg-rose-400' : 'bg-emerald-400'}`} />
            {hudViewMode === 'auto' ? 'PERCEPTION: AUTO' : hudViewMode === 'hazard' ? 'PERCEPTION: ROCK FIELD' : 'PERCEPTION: CLEAR PATH'}
          </button>
          <div className="text-[9px] font-mono text-zinc-300 bg-black/75 px-2 py-0.5 rounded border border-white/10 backdrop-blur-md">
            AZIMUTH: {telemetry.heading ? `${telemetry.heading}°` : '249°'} // SECTOR 4
          </div>
        </div>

        {/* Credible Hazard Detection: Render either Detected Obstacle OR Nominal Safe Corridor */}
        {isObstacleDetected ? (
          <>
            {/* Ground Range Footprint / Radar Ripple (Visual match to reference screenshot over dense rock field on right) */}
            <div className="absolute left-[46%] top-[44%] w-[44%] h-[34%] rounded-[100%] border border-dashed border-rose-500/70 bg-rose-500/15 shadow-[0_0_25px_rgba(244,63,94,0.35)] pointer-events-none transform -rotate-2 animate-pulse" />

            {/* Dynamic Tactical Bounding Box (Visual match to reference screenshot) */}
            <div
              className="absolute left-[52%] top-[34%] w-[36%] h-[48%] border-2 border-rose-500 bg-rose-950/25 shadow-[0_0_18px_rgba(244,63,94,0.4)] rounded-md flex flex-col justify-between p-1.5 z-10"
            >
              {/* Target Corner Accents */}
              <div className="flex items-center justify-between text-[9px] font-mono font-bold">
                <span className="px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-rose-600 text-white shadow-sm">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {overlay.boxTitle}
                </span>
                <span className="px-1.5 py-0.5 rounded uppercase font-semibold bg-black/80 text-rose-300 border border-rose-500/30">
                  {overlay.riskLabel}
                </span>
              </div>

              {/* Center Targeting Reticle */}
              <div className="self-center flex items-center justify-center opacity-80">
                <div className="w-6 h-6 border border-rose-400 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                </div>
              </div>

              {/* Bottom Telemetry Tag inside Target */}
              <div className="text-[8.5px] font-mono text-zinc-200 bg-black/85 px-1.5 py-0.5 rounded border border-white/10 self-start">
                {overlay.telemetryLine}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Nominal Safe Corridor Ground Footprint (Highlights central clear path between dome rock and boulders) */}
            <div className="absolute left-[28%] top-[48%] w-[28%] h-[36%] rounded-[100%] border border-dashed border-emerald-400/50 bg-emerald-500/10 shadow-[0_0_18px_rgba(52,211,153,0.2)] pointer-events-none transform -rotate-1" />

            {/* Nominal Safe Corridor Bounding HUD */}
            <div
              className="absolute left-[27%] top-[40%] w-[30%] h-[46%] border border-dashed border-emerald-400/60 bg-emerald-950/15 shadow-[0_0_14px_rgba(52,211,153,0.15)] rounded-md flex flex-col justify-between p-1.5 z-10"
            >
              {/* Target Corner Accents */}
              <div className="flex items-center justify-between text-[9px] font-mono font-bold">
                <span className="px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-emerald-700/85 text-white shadow-sm">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  CLEAR CORRIDOR
                </span>
                <span className="px-1.5 py-0.5 rounded uppercase font-semibold bg-black/80 text-emerald-300 border border-emerald-500/30">
                  RISK: NOMINAL
                </span>
              </div>

              {/* Center Targeting Reticle */}
              <div className="self-center flex items-center justify-center opacity-70">
                <div className="w-6 h-6 border border-emerald-400/80 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
              </div>

              {/* Bottom Telemetry Tag inside Target */}
              <div className="text-[8.5px] font-mono text-zinc-200 bg-black/85 px-1.5 py-0.5 rounded border border-white/10 self-start">
                {overlay.telemetryLine}
              </div>
            </div>
          </>
        )}

        {/* Bottom Left Horizon Overlay */}
        <div className="absolute bottom-2 left-2 text-[9px] font-mono text-zinc-300 bg-black/75 px-2 py-0.5 rounded border border-white/10 backdrop-blur-md z-20">
          MODE: <strong className="text-white uppercase">{telemetry.operationalMode}</strong> // SPEED: {telemetry.speed.toFixed(2)} m/s
        </div>

        {isFaultActive && (
          <div className="absolute bottom-2 right-2 z-20">
            <button
              onClick={() => {
                soundFX.playSuccess();
                onClearFaults();
              }}
              className="text-[9.5px] font-mono px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/50 flex items-center gap-1 transition-all"
            >
              <RotateCcw className="w-3 h-3" /> Clear Fault
            </button>
          </div>
        )}
      </div>

      {/* Synchronized Real-Time Simulation Status Bar */}
      <div className="mt-3 pt-3 border-t border-white/[0.08] grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Left: Active Event & Description */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
            <Radio className="w-3 h-3 text-cyan-400" />
            Current Simulation Event:
          </div>
          <p className="text-xs font-mono text-zinc-200 leading-snug">
            {isFaultActive && activeScenario ? (
              <>
                <strong className="text-amber-300">{activeScenario.name}:</strong>{' '}
                <span className="text-zinc-300">{activeScenario.shortDesc}</span>
              </>
            ) : (
              <>
                <strong className="text-emerald-400">Baseline Autonomous Exploration:</strong>{' '}
                <span className="text-zinc-400">
                  Navigating to {telemetry.currentObjective} across nominal regolith at {telemetry.speed.toFixed(2)} m/s. All 9 hazard vectors nominal.
                </span>
              </>
            )}
          </p>
        </div>

        {/* Right: AEGIS Autonomous Response & Action */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
            <Cpu className="w-3 h-3 text-purple-400" />
            AEGIS Autonomous Response:
          </div>
          <p className="text-xs font-mono text-zinc-200 leading-snug">
            {isFaultActive && activeScenario ? (
              <span className="text-cyan-300">
                {activeHazards[0]?.recommendedAction || activeScenario.suggestedMitigation}
              </span>
            ) : (
              <span className="text-zinc-400">
                Continuous 10Hz odometry & terrain scan. Traversal envelope locked. No emergency evasive action required.
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
