import React, { useState } from 'react';
import { RoverTelemetry, TelemetryHistoryPoint } from '../types/telemetry';
import { RoverHologram } from './RoverHologram';
import {
  Activity,
  Battery,
  BatteryCharging,
  Clock,
  Compass,
  Eye,
  Gauge,
  Layers,
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
  const [showSchematic, setShowSchematic] = useState(false);

  // Gradient SVG Sparkline helper
  const renderSparkline = (
    data: number[],
    color: string,
    id: string,
    minVal?: number,
    maxVal?: number
  ) => {
    if (data.length < 2) return null;
    const min = minVal ?? Math.min(...data);
    const max = maxVal ?? Math.max(...data);
    const range = max - min || 1;
    const width = 110;
    const height = 32;

    const points = data
      .map((val, idx) => {
        const x = (idx / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const firstX = 0;
    const lastX = width;
    const areaPoints = `${firstX},${height} ${points} ${lastX},${height}`;

    return (
      <svg width={width} height={height} className="overflow-visible shrink-0 drop-shadow-sm">
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon fill={`url(#grad-${id})`} points={areaPoints} />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  const recentHistory = history.slice(-20);
  const batteryData = recentHistory.map((h) => h.battery);
  const tempData = recentHistory.map((h) => h.temperature);
  const solarData = recentHistory.map((h) => h.solar);
  const signalData = recentHistory.map((h) => h.signal);
  const speedData = recentHistory.map((h) => h.speed);
  const powerData = recentHistory.map((h) => h.power);

  const getStatusBorder = (isAlert: boolean, isWarn: boolean) => {
    if (isAlert) return 'border-red-500/60 bg-red-950/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
    if (isWarn) return 'border-amber-500/50 bg-amber-950/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]';
    return 'border-white/10 bg-[#070b14]/85 text-cyan-400';
  };

  const isBattAlert = telemetry.batteryLevel <= 15;
  const isBattWarn = telemetry.batteryLevel <= 25;
  const isTempAlert = telemetry.motorAverageTemp >= 68;
  const isTempWarn = telemetry.motorAverageTemp >= 50;
  const isSolarAlert = telemetry.solarEfficiency <= 35;
  const isSolarWarn = telemetry.solarEfficiency <= 60;
  const isSignalAlert = telemetry.signalStrengthDbm <= -108;
  const isSignalWarn = telemetry.signalStrengthDbm <= -92;
  const isPowerAlert = telemetry.powerConsumptionWatts >= 450;
  const isPowerWarn = telemetry.powerConsumptionWatts >= 380;

  return (
    <div className="space-y-3">
      {/* Subsystem Header with Schematic Toggle */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00e5ff]" />
          <h2 className="font-space font-bold text-xs tracking-wide text-slate-200">
            Live Flight Subsystem Telemetry
          </h2>
          <span className="text-[10px] font-space px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            10Hz Sensor Stream
          </span>
        </div>

        <button
          onClick={() => setShowSchematic(!showSchematic)}
          className={`px-3 py-1 text-xs font-space rounded-lg border flex items-center gap-1.5 transition-all ${
            showSchematic
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(0,229,255,0.25)] font-bold'
              : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>{showSchematic ? 'Hide Rover Blueprint' : 'Show 6WD Rover Blueprint'}</span>
        </button>
      </div>

      {/* Optional Interactive Rover Schematic */}
      {showSchematic && <RoverHologram telemetry={telemetry} />}

      {/* 8 Aerospace Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. BATTERY SOC */}
        <div
          className={`p-3.5 rounded-xl border hud-panel-pro transition-all duration-300 ${getStatusBorder(
            isBattAlert,
            isBattWarn
          )}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {telemetry.netPowerWatts >= 0 ? (
                <BatteryCharging className="w-4 h-4 text-emerald-400" />
              ) : (
                <Battery
                  className={`w-4 h-4 ${
                    isBattAlert ? 'text-red-400 animate-pulse' : 'text-cyan-400'
                  }`}
                />
              )}
              <span className="text-xs font-space font-bold tracking-wide text-slate-200">
                Battery SOC
              </span>
            </div>
            <span className="text-[10px] font-space px-1.5 py-0.5 rounded bg-black/50 text-slate-300 border border-white/5 font-semibold">
              {telemetry.batteryVoltage} V
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-space font-bold text-white tracking-tight">
                {telemetry.batteryLevel.toFixed(1)}%
              </span>
              <div className="text-[11px] font-space text-slate-400 mt-0.5">
                Net:{' '}
                <span
                  className={
                    telemetry.netPowerWatts >= 0
                      ? 'text-emerald-400 font-bold'
                      : 'text-amber-400 font-bold'
                  }
                >
                  {telemetry.netPowerWatts >= 0 ? '+' : ''}
                  {telemetry.netPowerWatts}W
                </span>
              </div>
            </div>
            {renderSparkline(
              batteryData,
              isBattAlert ? '#ef4444' : '#00e5ff',
              'batt',
              0,
              100
            )}
          </div>
        </div>

        {/* 2. THERMAL SUBSYSTEM */}
        <div
          className={`p-3.5 rounded-xl border hud-panel-pro transition-all duration-300 ${getStatusBorder(
            isTempAlert,
            isTempWarn
          )}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-space font-bold tracking-wide text-slate-200">
                Thermal Subsystem
              </span>
            </div>
            <span className="text-[10px] font-space px-1.5 py-0.5 rounded bg-black/50 text-slate-300 border border-white/5">
              Amb: {telemetry.ambientTemp}°C
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-space font-bold text-white tracking-tight">
                {telemetry.motorAverageTemp.toFixed(1)}°C
              </span>
              <div className="text-[11px] font-space text-slate-400 mt-0.5">
                Core: <strong className="text-slate-200">{telemetry.internalTemp}°C</strong>
                {telemetry.heatersActive && (
                  <span className="text-amber-400 ml-1.5 font-bold">HTR ON</span>
                )}
              </div>
            </div>
            {renderSparkline(
              tempData,
              isTempAlert ? '#ef4444' : isTempWarn ? '#f59e0b' : '#38bdf8',
              'temp',
              -60,
              80
            )}
          </div>
        </div>

        {/* 3. SOLAR EFFICIENCY */}
        <div
          className={`p-3.5 rounded-xl border hud-panel-pro transition-all duration-300 ${getStatusBorder(
            isSolarAlert,
            isSolarWarn
          )}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-space font-bold tracking-wide text-slate-200">
                Solar Efficiency
              </span>
            </div>
            <span className="text-[10px] font-space px-1.5 py-0.5 rounded bg-black/50 text-slate-300 border border-white/5">
              Dust: {telemetry.dustAccumulation}%
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-space font-bold text-white tracking-tight">
                {telemetry.solarEfficiency.toFixed(1)}%
              </span>
              <div className="text-[11px] font-space text-slate-400 mt-0.5">
                Output: <strong className="text-yellow-400">{telemetry.solarGenerationWatts} W</strong>
              </div>
            </div>
            {renderSparkline(solarData, '#eab308', 'solar', 0, 100)}
          </div>
        </div>

        {/* 4. RELAY LINK QUALITY */}
        <div
          className={`p-3.5 rounded-xl border hud-panel-pro transition-all duration-300 ${getStatusBorder(
            isSignalAlert,
            isSignalWarn
          )}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-space font-bold tracking-wide text-slate-200">
                Relay Link Quality
              </span>
            </div>
            <span
              className={`text-[10px] font-space px-1.5 py-0.5 rounded font-bold ${
                telemetry.relayConnected
                  ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-950/80 text-red-400 border border-red-500/40 animate-pulse'
              }`}
            >
              {telemetry.relayConnected ? 'Locked' : 'LOS'}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-space font-bold text-white tracking-tight">
                {telemetry.signalStrengthDbm}{' '}
                <span className="text-xs font-normal text-slate-400">dBm</span>
              </span>
              <div className="text-[11px] font-space text-slate-400 mt-0.5">
                Drop:{' '}
                <span
                  className={
                    telemetry.packetLossPercent > 10 ? 'text-red-400 font-bold' : 'text-slate-200'
                  }
                >
                  {telemetry.packetLossPercent}%
                </span>{' '}
                | Latency: {telemetry.commLatencyMs}ms
              </div>
            </div>
            {renderSparkline(
              signalData,
              isSignalAlert ? '#ef4444' : '#22d3ee',
              'signal',
              -125,
              -60
            )}
          </div>
        </div>

        {/* 5. 6-WHEEL SLIP STATUS */}
        <div
          className={`p-3.5 rounded-xl border hud-panel-pro transition-all duration-300 ${
            telemetry.wheelSlipAverage > 0.35 || telemetry.isStuck
              ? 'border-amber-500/60 bg-amber-950/20'
              : 'border-white/10 bg-[#070b14]/85'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-space font-bold tracking-wide text-slate-200">
                6-Wheel Slip Status
              </span>
            </div>
            <span
              className={`text-[10px] font-space px-2 py-0.5 rounded font-bold ${
                telemetry.isStuck
                  ? 'bg-red-500 text-white animate-pulse shadow-[0_0_10px_#ef4444]'
                  : 'bg-black/50 text-slate-300 border border-white/5'
              }`}
            >
              {telemetry.isStuck
                ? 'Stuck'
                : `${(telemetry.wheelSlipAverage * 100).toFixed(0)}% Avg Slip`}
            </span>
          </div>

          {/* 6 mini wheel indicators */}
          <div className="grid grid-cols-6 gap-1 my-1.5">
            {telemetry.wheels.map((w) => (
              <div
                key={w.id}
                className={`flex flex-col items-center justify-center p-1 rounded border text-center transition-all ${
                  w.slipRatio > 0.6
                    ? 'border-red-500/70 bg-red-950/70 text-red-200 font-bold'
                    : w.slipRatio > 0.35
                    ? 'border-amber-500/70 bg-amber-950/70 text-amber-200 font-bold'
                    : 'border-white/10 bg-black/50 text-emerald-300'
                }`}
              >
                <span className="text-[8.5px] font-space font-semibold">{w.id}</span>
                <span className="text-[9.5px] font-space font-bold">
                  {(w.slipRatio * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>

          <div className="text-[10px] font-space text-slate-400 flex justify-between mt-1">
            <span>Motors: {telemetry.wheels[0]?.motorCurrent || 3.1}A draw</span>
            <span>Torque: {telemetry.wheels[0]?.torque || 28}Nm</span>
          </div>
        </div>

        {/* 6. SPEED & ATTITUDE */}
        <div
          className={`p-3.5 rounded-xl border hud-panel-pro transition-all duration-300 ${
            telemetry.isStuck
              ? 'border-red-500/60 bg-red-950/20'
              : 'border-white/10 bg-[#070b14]/85'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-space font-bold tracking-wide text-slate-200">
                Speed & Attitude
              </span>
            </div>
            <span className="text-[10px] font-space px-1.5 py-0.5 rounded bg-black/50 text-slate-300 border border-white/5">
              Slope: {telemetry.slopeAngle}°
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-space font-bold text-white tracking-tight">
                {telemetry.speed.toFixed(3)}{' '}
                <span className="text-xs font-normal text-slate-400">m/s</span>
              </span>
              <div className="text-[11px] font-space text-slate-400 mt-0.5">
                Heading: <strong className="text-slate-200">{telemetry.heading}°</strong> | Pitch:{' '}
                {telemetry.pitch}°
              </div>
            </div>
            {renderSparkline(speedData, '#06b6d4', 'speed', 0, 0.15)}
          </div>
        </div>

        {/* 7. POWER CONSUMPTION */}
        <div
          className={`p-3.5 rounded-xl border hud-panel-pro transition-all duration-300 ${getStatusBorder(
            isPowerAlert,
            isPowerWarn
          )}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-space font-bold tracking-wide text-slate-200">
                Power Consumption
              </span>
            </div>
            <span
              className={`text-[10px] font-space px-1.5 py-0.5 rounded font-bold ${
                telemetry.powerConsumptionWatts > 380
                  ? 'bg-red-950/70 text-red-300 border border-red-500/40'
                  : 'bg-black/50 text-slate-300 border border-white/5'
              }`}
            >
              {telemetry.powerConsumptionWatts > 380 ? 'High Draw' : 'Nominal'}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-space font-bold text-white tracking-tight">
                {telemetry.powerConsumptionWatts.toFixed(0)}{' '}
                <span className="text-xs font-normal text-slate-400">Watts</span>
              </span>
              <div className="text-[11px] font-space text-slate-400 mt-0.5">
                Discharge: <strong className="text-amber-400">{telemetry.batteryDischargeRate}W</strong>
              </div>
            </div>
            {renderSparkline(
              powerData,
              telemetry.powerConsumptionWatts > 380 ? '#f43f5e' : '#a855f7',
              'power',
              100,
              500
            )}
          </div>
        </div>

        {/* 8. MISSION PROGRESS */}
        <div className="p-3.5 rounded-xl border border-white/10 bg-[#070b14]/85 hud-panel-pro transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-space font-bold tracking-wide text-slate-200">
                Mission Progress
              </span>
            </div>
            <span className="text-[10px] font-space px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-bold">
              {telemetry.progressPercent}% Done
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-space font-bold text-white tracking-tight">
                {telemetry.distanceTraveledMeters.toFixed(1)}{' '}
                <span className="text-xs font-normal text-slate-400">m</span>
              </span>
              <span className="text-xs font-space text-slate-400 font-semibold">
                {telemetry.distanceToTargetMeters}m to go
              </span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full mt-2 overflow-hidden border border-white/10 p-0.5">
              <div
                className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, telemetry.progressPercent)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
