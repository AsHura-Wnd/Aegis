import React from 'react';
import { RoverTelemetry, TelemetryHistoryPoint } from '../types/telemetry';
import {
  Battery,
  BatteryCharging,
  Clock,
  Compass,
  Gauge,
  Radio,
  Sun,
  Thermometer,
  Zap,
} from 'lucide-react';

interface TelemetryCardsProps {
  telemetry: RoverTelemetry;
  history: TelemetryHistoryPoint[];
}

export const TelemetryCards: React.FC<TelemetryCardsProps> = ({ telemetry, history }) => {
  // Sparkline helper
  const renderSparkline = (
    data: number[],
    color: string,
    minVal?: number,
    maxVal?: number
  ) => {
    if (data.length < 2) return null;
    const min = minVal ?? Math.min(...data);
    const max = maxVal ?? Math.max(...data);
    const range = max - min || 1;
    const width = 120;
    const height = 28;

    const points = data
      .map((val, idx) => {
        const x = (idx / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return (
      <svg width={width} height={height} className="overflow-visible shrink-0 opacity-80">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  // Recent history slices (up to 20 samples)
  const recentHistory = history.slice(-20);
  const batteryData = recentHistory.map((h) => h.battery);
  const tempData = recentHistory.map((h) => h.temperature);
  const solarData = recentHistory.map((h) => h.solar);
  const signalData = recentHistory.map((h) => h.signal);
  const speedData = recentHistory.map((h) => h.speed);
  const powerData = recentHistory.map((h) => h.power);

  // Status helper
  const getCardStatus = (val: number, warnThresh: number, critThresh: number, invert = false) => {
    if (!invert) {
      if (val >= critThresh) return 'border-red-500/50 bg-red-950/20 text-red-400';
      if (val >= warnThresh) return 'border-amber-500/50 bg-amber-950/20 text-amber-400';
      return 'border-white/10 bg-[#0d121d]/80 text-emerald-400';
    } else {
      if (val <= critThresh) return 'border-red-500/50 bg-red-950/20 text-red-400';
      if (val <= warnThresh) return 'border-amber-500/50 bg-amber-950/20 text-amber-400';
      return 'border-white/10 bg-[#0d121d]/80 text-emerald-400';
    }
  };

  const battStatus = getCardStatus(telemetry.batteryLevel, 25, 15, true);
  const tempStatus = getCardStatus(telemetry.motorAverageTemp, 50, 68);
  const solarStatus = getCardStatus(telemetry.solarEfficiency, 60, 35, true);
  const signalStatus = getCardStatus(telemetry.signalStrengthDbm, -92, -108, true);
  const speedStatus = telemetry.isStuck ? 'border-red-500/50 bg-red-950/20 text-red-400' : 'border-white/10 bg-[#0d121d]/80 text-cyan-400';
  const powerStatus = getCardStatus(telemetry.powerConsumptionWatts, 380, 450);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Battery & Power Storage */}
      <div className={`p-3.5 rounded-xl border backdrop-blur-md transition-all ${battStatus}`}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            {telemetry.netPowerWatts >= 0 ? (
              <BatteryCharging className="w-4 h-4 text-emerald-400" />
            ) : (
              <Battery className={`w-4 h-4 ${telemetry.batteryLevel <= 25 ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`} />
            )}
            <span className="text-xs font-mono font-medium text-slate-300">BATTERY SOC</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-300">
            {telemetry.batteryVoltage} V
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {telemetry.batteryLevel.toFixed(1)}%
            </span>
            <div className="text-[11px] font-mono text-slate-400">
              Net: <span className={telemetry.netPowerWatts >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                {telemetry.netPowerWatts >= 0 ? '+' : ''}{telemetry.netPowerWatts}W
              </span>
            </div>
          </div>
          {renderSparkline(batteryData, telemetry.batteryLevel <= 25 ? '#ef4444' : '#00e5ff', 0, 100)}
        </div>
      </div>

      {/* 2. Subsystem Temperatures */}
      <div className={`p-3.5 rounded-xl border backdrop-blur-md transition-all ${tempStatus}`}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono font-medium text-slate-300">THERMAL SUBSYSTEM</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-300">
            Amb: {telemetry.ambientTemp}°C
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {telemetry.motorAverageTemp.toFixed(1)}°C
            </span>
            <div className="text-[11px] font-mono text-slate-400">
              Core: <span className="text-slate-200">{telemetry.internalTemp}°C</span>
              {telemetry.heatersActive && <span className="text-amber-400 ml-1.5">HTR ON</span>}
            </div>
          </div>
          {renderSparkline(tempData, telemetry.motorAverageTemp >= 50 ? '#f59e0b' : '#38bdf8', -60, 80)}
        </div>
      </div>

      {/* 3. Solar Generation & Efficiency */}
      <div className={`p-3.5 rounded-xl border backdrop-blur-md transition-all ${solarStatus}`}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-mono font-medium text-slate-300">SOLAR EFFICIENCY</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-300">
            Dust: {telemetry.dustAccumulation}%
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {telemetry.solarEfficiency.toFixed(1)}%
            </span>
            <div className="text-[11px] font-mono text-slate-400">
              Output: <span className="text-yellow-400">{telemetry.solarGenerationWatts} W</span>
            </div>
          </div>
          {renderSparkline(solarData, '#eab308', 0, 100)}
        </div>
      </div>

      {/* 4. Communication Quality */}
      <div className={`p-3.5 rounded-xl border backdrop-blur-md transition-all ${signalStatus}`}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-medium text-slate-300">RELAY LINK QUALITY</span>
          </div>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${telemetry.relayConnected ? 'bg-emerald-950/60 text-emerald-400' : 'bg-red-950/80 text-red-400'}`}>
            {telemetry.relayConnected ? 'LOCKED' : 'LOS'}
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {telemetry.signalStrengthDbm} <span className="text-sm font-normal text-slate-400">dBm</span>
            </span>
            <div className="text-[11px] font-mono text-slate-400">
              Drop: <span className={telemetry.packetLossPercent > 10 ? 'text-red-400' : 'text-slate-200'}>
                {telemetry.packetLossPercent}%
              </span> | Latency: {telemetry.commLatencyMs}ms
            </div>
          </div>
          {renderSparkline(signalData, telemetry.signalStrengthDbm < -95 ? '#ef4444' : '#22d3ee', -125, -60)}
        </div>
      </div>

      {/* 5. 6-Wheel Articulation & Slip */}
      <div className={`p-3.5 rounded-xl border backdrop-blur-md transition-all ${telemetry.wheelSlipAverage > 0.35 || telemetry.isStuck ? 'border-amber-500/50 bg-amber-950/20' : 'border-white/10 bg-[#0d121d]/80'}`}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-mono font-medium text-slate-300">6-WHEEL SLIP STATUS</span>
          </div>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${telemetry.isStuck ? 'bg-red-500 text-white font-bold animate-pulse' : 'bg-white/5 text-slate-300'}`}>
            {telemetry.isStuck ? 'STUCK' : `${(telemetry.wheelSlipAverage * 100).toFixed(0)}% AVG SLIP`}
          </span>
        </div>

        {/* 6 mini wheel pills */}
        <div className="grid grid-cols-6 gap-1 my-1">
          {telemetry.wheels.map((w) => (
            <div
              key={w.id}
              className={`flex flex-col items-center justify-center p-1 rounded border text-center transition-all ${
                w.slipRatio > 0.6
                  ? 'border-red-500/60 bg-red-950/60 text-red-200'
                  : w.slipRatio > 0.35
                  ? 'border-amber-500/60 bg-amber-950/60 text-amber-200'
                  : 'border-white/10 bg-black/40 text-emerald-300'
              }`}
            >
              <span className="text-[9px] font-mono font-semibold">{w.id}</span>
              <span className="text-[10px] font-mono font-bold">{(w.slipRatio * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
        <div className="text-[10px] font-mono text-slate-400 flex justify-between mt-1">
          <span>Motors: {telemetry.wheels[0]?.motorCurrent}A draw</span>
          <span>Torque: {telemetry.wheels[0]?.torque}Nm</span>
        </div>
      </div>

      {/* 6. Locomotion Speed & Incline */}
      <div className={`p-3.5 rounded-xl border backdrop-blur-md transition-all ${speedStatus}`}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-medium text-slate-300">SPEED & ATTITUDE</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-300">
            Slope: {telemetry.slopeAngle}°
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {telemetry.speed.toFixed(3)} <span className="text-sm font-normal text-slate-400">m/s</span>
            </span>
            <div className="text-[11px] font-mono text-slate-400">
              Heading: <span className="text-slate-200">{telemetry.heading}°</span> | Pitch: {telemetry.pitch}°
            </div>
          </div>
          {renderSparkline(speedData, '#06b6d4', 0, 0.15)}
        </div>
      </div>

      {/* 7. Total Power Consumption */}
      <div className={`p-3.5 rounded-xl border backdrop-blur-md transition-all ${powerStatus}`}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono font-medium text-slate-300">POWER CONSUMPTION</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-300">
            {telemetry.powerConsumptionWatts > 380 ? 'HIGH DRAW' : 'NOMINAL'}
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {telemetry.powerConsumptionWatts.toFixed(0)} <span className="text-sm font-normal text-slate-400">Watts</span>
            </span>
            <div className="text-[11px] font-mono text-slate-400">
              Discharge: <span className="text-amber-400">{telemetry.batteryDischargeRate}W</span>
            </div>
          </div>
          {renderSparkline(powerData, telemetry.powerConsumptionWatts > 380 ? '#f43f5e' : '#a855f7', 100, 500)}
        </div>
      </div>

      {/* 8. Mission Progress & Objective */}
      <div className="p-3.5 rounded-xl border border-white/10 bg-[#0d121d]/80 backdrop-blur-md transition-all">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-medium text-slate-300">MISSION PROGRESS</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-emerald-400 font-semibold">
            {telemetry.progressPercent}% DONE
          </span>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {telemetry.distanceTraveledMeters.toFixed(1)} <span className="text-sm font-normal text-slate-400">m</span>
            </span>
            <span className="text-xs font-mono text-slate-400">
              {telemetry.distanceToTargetMeters}m to go
            </span>
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full mt-2 overflow-hidden border border-white/5">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, telemetry.progressPercent)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
