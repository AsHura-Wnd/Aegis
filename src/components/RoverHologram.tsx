import React, { useState } from 'react';
import { RoverTelemetry } from '../types/telemetry';
import {
  Activity,
  Battery,
  Compass,
  Cpu,
  Eye,
  Flame,
  Radio,
  Shield,
  Sun,
  Wrench,
  Zap,
} from 'lucide-react';

interface RoverHologramProps {
  telemetry: RoverTelemetry;
}

export const RoverHologram: React.FC<RoverHologramProps> = ({ telemetry }) => {
  const [selectedSubsystem, setSelectedSubsystem] = useState<string | null>('CHASSIS');

  // Slip color helper for wheels
  const getWheelColor = (slip: number) => {
    if (slip > 0.6) return '#ef4444'; // critical red
    if (slip > 0.35) return '#f59e0b'; // warning amber
    return '#10b981'; // nominal emerald
  };

  // Thermal core color
  const getCoreColor = (temp: number) => {
    if (temp > 45) return '#ef4444';
    if (temp > 35) return '#f59e0b';
    if (temp < -20) return '#38bdf8';
    return '#00e5ff';
  };

  return (
    <div className="relative rounded-xl hud-panel-pro p-4 overflow-hidden flex flex-col md:flex-row items-center gap-6">
      {/* Decorative corner labels */}
      <div className="absolute top-2 left-3 font-space text-[10px] text-cyan-400/80 tracking-wide flex items-center gap-2 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        Chassis Schematic // 6WD Rocker-Bogie Platform
      </div>
      <div className="absolute top-2 right-3 font-space text-[10px] text-slate-500">
        Rev: 4.2-Diag
      </div>

      {/* SVG Interactive Rover Chassis Blueprint */}
      <div className="relative w-full max-w-[340px] h-[260px] flex items-center justify-center shrink-0 mt-3 md:mt-0">
        <svg
          viewBox="0 0 340 260"
          className="w-full h-full select-none drop-shadow-[0_0_15px_rgba(0,229,255,0.2)]"
        >
          <defs>
            <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={getCoreColor(telemetry.internalTemp)} stopOpacity="0.8" />
              <stop offset="70%" stopColor={getCoreColor(telemetry.internalTemp)} stopOpacity="0.2" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="solarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="50%" stopColor="#0369a1" />
              <stop offset="100%" stopColor="#075985" />
            </linearGradient>
          </defs>

          {/* Background Technical Grid Circles */}
          <circle cx="170" cy="130" r="110" fill="none" stroke="rgba(0, 229, 255, 0.08)" strokeDasharray="3 3" />
          <circle cx="170" cy="130" r="75" fill="none" stroke="rgba(0, 229, 255, 0.12)" />
          <line x1="170" y1="10" x2="170" y2="250" stroke="rgba(0, 229, 255, 0.06)" />
          <line x1="20" y1="130" x2="320" y2="130" stroke="rgba(0, 229, 255, 0.06)" />

          {/* Heading Line Indicator */}
          <g transform={`rotate(${telemetry.heading}, 170, 130)`}>
            <line x1="170" y1="130" x2="170" y2="25" stroke="#00e5ff" strokeWidth="1.5" strokeDasharray="4 2" />
            <polygon points="170,16 165,26 175,26" fill="#00e5ff" />
          </g>

          {/* Rocker-Bogie Suspension Arms */}
          {/* Left Rocker */}
          <path d="M 125 130 L 70 80 L 60 70 M 70 80 L 60 135 M 60 135 L 60 200" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
          {/* Right Rocker */}
          <path d="M 215 130 L 270 80 L 280 70 M 270 80 L 280 135 M 280 135 L 280 200" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round" />

          {/* Rover Central Avionics Chassis Box */}
          <rect
            x="115"
            y="75"
            width="110"
            height="110"
            rx="8"
            fill="url(#bodyGrad)"
            stroke="#38bdf8"
            strokeWidth="1.5"
            className="cursor-pointer transition-all hover:stroke-cyan-300"
            onClick={() => setSelectedSubsystem('CHASSIS')}
          />

          {/* Solar Array Panels on Top */}
          <rect
            x="125"
            y="85"
            width="90"
            height="35"
            rx="3"
            fill="url(#solarGrad)"
            stroke="#0284c7"
            strokeWidth="1"
            className="cursor-pointer"
            onClick={() => setSelectedSubsystem('SOLAR')}
          />
          {/* Solar Grid Lines */}
          <line x1="147" y1="85" x2="147" y2="120" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
          <line x1="170" y1="85" x2="170" y2="120" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
          <line x1="192" y1="85" x2="192" y2="120" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />

          {/* Internal Core Thermal Heatmap Glow */}
          <circle
            cx="170"
            cy="150"
            r="32"
            fill="url(#coreGlow)"
            className="cursor-pointer animate-pulse-halo"
            onClick={() => setSelectedSubsystem('THERMAL')}
          />
          <circle cx="170" cy="150" r="12" fill="#0f172a" stroke="#00e5ff" strokeWidth="1.5" />
          <text x="170" y="153" textAnchor="middle" fill="#00e5ff" fontSize="8" fontFamily="monospace" fontWeight="bold">
            RTG
          </text>

          {/* MastCam Azimuth Head */}
          <circle cx="170" cy="55" r="9" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
          <circle cx="170" cy="55" r="3" fill="#f59e0b" />
          <line x1="170" y1="64" x2="170" y2="75" stroke="#f59e0b" strokeWidth="2" />

          {/* 6 Wheels (FL, ML, RL, FR, MR, RR) */}
          {[
            { id: 'FL', x: 45, y: 55, wheel: telemetry.wheels[0] },
            { id: 'ML', x: 45, y: 120, wheel: telemetry.wheels[2] },
            { id: 'RL', x: 45, y: 185, wheel: telemetry.wheels[4] },
            { id: 'FR', x: 275, y: 55, wheel: telemetry.wheels[1] },
            { id: 'MR', x: 275, y: 120, wheel: telemetry.wheels[3] },
            { id: 'RR', x: 275, y: 185, wheel: telemetry.wheels[5] },
          ].map((item) => {
            const slip = item.wheel ? item.wheel.slipRatio : 0;
            const color = getWheelColor(slip);
            return (
              <g
                key={item.id}
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => setSelectedSubsystem(`WHEEL_${item.id}`)}
              >
                <rect
                  x={item.x}
                  y={item.y}
                  width="20"
                  height="34"
                  rx="4"
                  fill="#0b0f19"
                  stroke={color}
                  strokeWidth="2"
                />
                {/* Tread Lines */}
                <line x1={item.x + 3} y1={item.y + 8} x2={item.x + 17} y2={item.y + 8} stroke={color} strokeWidth="1.2" />
                <line x1={item.x + 3} y1={item.y + 17} x2={item.x + 17} y2={item.y + 17} stroke={color} strokeWidth="1.2" />
                <line x1={item.x + 3} y1={item.y + 26} x2={item.x + 17} y2={item.y + 26} stroke={color} strokeWidth="1.2" />
                {/* Wheel Identifier */}
                <text
                  x={item.x + 10}
                  y={item.y + 44}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="7.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {item.id}
                </text>
                {/* Slip Badge */}
                <text
                  x={item.x + 10}
                  y={item.y - 4}
                  textAnchor="middle"
                  fill={color}
                  fontSize="8"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {(slip * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating status tag */}
        <div className="absolute bottom-1 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded border border-white/10 font-space text-[10.5px] text-cyan-300">
          Heading {telemetry.heading}° // Attitude {telemetry.pitch}° Pitch
        </div>
      </div>

      {/* Subsystem Telemetry Quick-Diagnostic Readouts */}
      <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {/* Subsystem 1: Power & Battery */}
        <div
          onClick={() => setSelectedSubsystem('POWER')}
          className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
            selectedSubsystem === 'POWER'
              ? 'border-cyan-400 bg-cyan-950/30'
              : 'border-white/10 bg-black/30 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-space text-slate-400 flex items-center gap-1 font-semibold">
              <Zap className="w-3 h-3 text-cyan-400" /> Power Bus
            </span>
            <span className="text-[10px] font-space text-cyan-300 font-bold">
              {telemetry.batteryVoltage}V
            </span>
          </div>
          <div className="text-base font-space font-bold text-white">
            {telemetry.powerConsumptionWatts.toFixed(0)}W
          </div>
          <div className="text-[10px] font-space text-slate-400 mt-0.5">
            Net: <span className={telemetry.netPowerWatts >= 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
              {telemetry.netPowerWatts >= 0 ? '+' : ''}{telemetry.netPowerWatts}W
            </span>
          </div>
        </div>

        {/* Subsystem 2: Solar Photovoltaics */}
        <div
          onClick={() => setSelectedSubsystem('SOLAR')}
          className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
            selectedSubsystem === 'SOLAR'
              ? 'border-yellow-400 bg-yellow-950/30'
              : 'border-white/10 bg-black/30 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-space text-slate-400 flex items-center gap-1 font-semibold">
              <Sun className="w-3 h-3 text-yellow-400" /> Solar Array
            </span>
            <span className="text-[10px] font-space text-yellow-400 font-bold">
              {telemetry.solarGenerationWatts}W
            </span>
          </div>
          <div className="text-base font-space font-bold text-white">
            {telemetry.solarEfficiency.toFixed(1)}%
          </div>
          <div className="text-[10px] font-space text-slate-400 mt-0.5">
            Dust Cover: <strong className="text-slate-200">{telemetry.dustAccumulation}%</strong>
          </div>
        </div>

        {/* Subsystem 3: Thermal Distribution */}
        <div
          onClick={() => setSelectedSubsystem('THERMAL')}
          className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
            selectedSubsystem === 'THERMAL'
              ? 'border-amber-400 bg-amber-950/30'
              : 'border-white/10 bg-black/30 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-space text-slate-400 flex items-center gap-1 font-semibold">
              <Flame className="w-3 h-3 text-amber-400" /> Thermal Core
            </span>
            <span className="text-[10px] font-space text-slate-400">
              Amb: {telemetry.ambientTemp}°C
            </span>
          </div>
          <div className="text-base font-space font-bold text-white">
            {telemetry.motorAverageTemp.toFixed(1)}°C
          </div>
          <div className="text-[10px] font-space text-slate-400 mt-0.5">
            Core: <strong className="text-slate-200">{telemetry.internalTemp}°C</strong>
            {telemetry.heatersActive && <span className="text-amber-400 ml-1.5 font-bold">HTR ON</span>}
          </div>
        </div>

        {/* Subsystem 4: 6-Wheel Rocker-Bogie Traction */}
        <div
          onClick={() => setSelectedSubsystem('TRACTION')}
          className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
            selectedSubsystem === 'TRACTION'
              ? 'border-purple-400 bg-purple-950/30'
              : 'border-white/10 bg-black/30 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-space text-slate-400 flex items-center gap-1 font-semibold">
              <Activity className="w-3 h-3 text-purple-400" /> 6-Wheel Traction
            </span>
            <span className={`text-[10px] font-space px-1.5 py-0.2 rounded font-bold ${telemetry.isStuck ? 'bg-red-500 text-white' : 'text-slate-400'}`}>
              {telemetry.isStuck ? 'Stuck' : 'Traction OK'}
            </span>
          </div>
          <div className="text-base font-space font-bold text-white">
            {(telemetry.wheelSlipAverage * 100).toFixed(0)}% <span className="text-xs font-normal text-slate-400">avg slip</span>
          </div>
          <div className="text-[10px] font-space text-slate-400 mt-0.5">
            Current: {telemetry.wheels[0]?.motorCurrent || 3.1}A | {telemetry.wheels[0]?.torque || 28}Nm
          </div>
        </div>

        {/* Subsystem 5: Deep Space Network Comm */}
        <div
          onClick={() => setSelectedSubsystem('COMM')}
          className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
            selectedSubsystem === 'COMM'
              ? 'border-cyan-400 bg-cyan-950/30'
              : 'border-white/10 bg-black/30 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-space text-slate-400 flex items-center gap-1 font-semibold">
              <Radio className="w-3 h-3 text-cyan-400" /> DSN Telemetry
            </span>
            <span className="text-[10px] font-space text-emerald-400 font-bold">
              {telemetry.relayConnected ? 'Link Lock' : 'LOS'}
            </span>
          </div>
          <div className="text-base font-space font-bold text-white">
            {telemetry.signalStrengthDbm} <span className="text-xs font-normal text-slate-400">dBm</span>
          </div>
          <div className="text-[10px] font-space text-slate-400 mt-0.5">
            Loss: {telemetry.packetLossPercent}% | Latency: {telemetry.commLatencyMs}ms
          </div>
        </div>

        {/* Subsystem 6: Navigation & Traverse */}
        <div
          onClick={() => setSelectedSubsystem('NAV')}
          className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
            selectedSubsystem === 'NAV'
              ? 'border-emerald-400 bg-emerald-950/30'
              : 'border-white/10 bg-black/30 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-space text-slate-400 flex items-center gap-1 font-semibold">
              <Compass className="w-3 h-3 text-emerald-400" /> Traverse Speed
            </span>
            <span className="text-[10px] font-space text-slate-400">
              Slope: {telemetry.slopeAngle}°
            </span>
          </div>
          <div className="text-base font-space font-bold text-white">
            {telemetry.speed.toFixed(3)} <span className="text-xs font-normal text-slate-400">m/s</span>
          </div>
          <div className="text-[10px] font-space text-slate-400 mt-0.5">
            Terrain: <strong className="text-slate-300">{telemetry.currentTerrain.toLowerCase().split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
