import React, { useState } from 'react';
import { RoverTelemetry, TelemetryHistoryPoint } from '../types/telemetry';
import { RoverHologram } from './RoverHologram';
import {
  Activity,
  Battery,
  BatteryCharging,
  Clock,
  Compass,
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

  // Gradient SVG Sparkline helper - minimalist aesthetic
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
    const width = 80;
    const height = 22;

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
      <svg width={width} height={height} className="overflow-visible shrink-0 opacity-80 hover:opacity-100 transition-opacity">
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon fill={`url(#grad-${id})`} points={areaPoints} />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.8"
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

  const getCardStatusBorder = (isAlert: boolean, isWarn: boolean) => {
    if (isAlert) return 'border-red-500/40 bg-red-950/15 ring-1 ring-red-500/20';
    if (isWarn) return 'border-amber-500/40 bg-amber-950/15 ring-1 ring-amber-500/20';
    return 'border-white/[0.08] hover:border-white/20';
  };

  return (
    <div className="space-y-3">
      {/* Section Header with Numbered Hierarchy */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-baseline gap-2.5">
          <span className="editorial-num">01.</span>
          <h2 className="font-syne font-bold text-xs tracking-wider uppercase text-zinc-100">
            Subsystem Telemetry
          </h2>
          <span className="hidden sm:inline text-[11px] font-mono text-zinc-500">
            / Live Flight Stream 10Hz
          </span>
        </div>

        <button
          onClick={() => setShowSchematic(!showSchematic)}
          className={`px-3 py-1.5 text-xs font-mono rounded-lg border flex items-center gap-2 transition-all ${
            showSchematic
              ? 'bg-zinc-100 text-black border-zinc-100 font-bold'
              : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border-white/10'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{showSchematic ? 'Hide Rover Blueprint' : 'Show 6WD Rover Blueprint'}</span>
        </button>
      </div>

      {/* Optional Interactive Rover Schematic */}
      {showSchematic && <RoverHologram telemetry={telemetry} />}

      {/* Primary Flight Vitals Tier (Prominent Essential Metrics) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 px-0.5">
          <span className="uppercase tracking-wider font-semibold text-zinc-400">Primary Flight Vitals</span>
          <span className="text-[10px]">Autonomy Safety Critical</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* 1. BATTERY SOC */}
        <div
          className={`p-3 rounded-xl aegis-card transition-all duration-300 relative group ${getCardStatusBorder(
            isBattAlert,
            isBattWarn
          )}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              {telemetry.netPowerWatts >= 0 ? (
                <BatteryCharging className="w-4 h-4 text-zinc-300" />
              ) : (
                <Battery
                  className={`w-4 h-4 ${
                    isBattAlert ? 'text-red-400 animate-pulse' : 'text-zinc-400'
                  }`}
                />
              )}
              <span className="text-xs font-mono font-medium tracking-wide text-zinc-200 uppercase">
                Battery SOC
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900/90 text-zinc-400 border border-white/5">
                {telemetry.batteryVoltage} V
              </span>
              <span className="font-mono text-[10px] text-zinc-600 font-bold">01</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xl font-syne font-bold text-white tracking-tight">
                {telemetry.batteryLevel.toFixed(1)}%
              </span>
              <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                Net:{' '}
                <span
                  className={
                    telemetry.netPowerWatts >= 0
                      ? 'text-zinc-200 font-semibold'
                      : 'text-amber-400 font-semibold'
                  }
                >
                  {telemetry.netPowerWatts >= 0 ? '+' : ''}
                  {telemetry.netPowerWatts}W
                </span>
              </div>
            </div>
            {renderSparkline(
              batteryData,
              isBattAlert ? '#f87171' : '#e4e4e7',
              'batt',
              0,
              100
            )}
          </div>
        </div>

        {/* 2. THERMAL SUBSYSTEM */}
        <div
          className={`p-3 rounded-xl aegis-card transition-all duration-300 relative group ${getCardStatusBorder(
            isTempAlert,
            isTempWarn
          )}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Thermometer
                className={`w-4 h-4 ${
                  isTempAlert ? 'text-red-400' : isTempWarn ? 'text-amber-400' : 'text-zinc-400'
                }`}
              />
              <span className="text-xs font-mono font-medium tracking-wide text-zinc-200 uppercase">
                Thermal Subsystem
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900/90 text-zinc-400 border border-white/5">
                Amb: {telemetry.ambientTemp}°C
              </span>
              <span className="font-mono text-[10px] text-zinc-600 font-bold">02</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xl font-syne font-bold text-white tracking-tight">
                {telemetry.motorAverageTemp.toFixed(1)}°C
              </span>
              <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                Core: <strong className="text-zinc-200 font-medium">{telemetry.internalTemp}°C</strong>
                {telemetry.heatersActive && (
                  <span className="text-amber-400 ml-1.5 font-bold">HTR ON</span>
                )}
              </div>
            </div>
            {renderSparkline(
              tempData,
              isTempAlert ? '#f87171' : isTempWarn ? '#fbbf24' : '#a1a1aa',
              'temp',
              -60,
              80
            )}
          </div>
        </div>

        {/* 3. SOLAR EFFICIENCY */}
        <div
          className={`p-3 rounded-xl aegis-card transition-all duration-300 relative group ${getCardStatusBorder(
            isSolarAlert,
            isSolarWarn
          )}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-mono font-medium tracking-wide text-zinc-200 uppercase">
                Solar Efficiency
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900/90 text-zinc-400 border border-white/5">
                Dust: {telemetry.dustAccumulation}%
              </span>
              <span className="font-mono text-[10px] text-zinc-600 font-bold">03</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xl font-syne font-bold text-white tracking-tight">
                {telemetry.solarEfficiency.toFixed(1)}%
              </span>
              <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                Gen: <strong className="text-zinc-200 font-medium">{telemetry.solarGenerationWatts} W</strong>
              </div>
            </div>
            {renderSparkline(
              solarData,
              isSolarAlert ? '#f87171' : '#e4e4e7',
              'solar',
              0,
              100
            )}
          </div>
        </div>

        {/* 4. RELAY LINK QUALITY */}
        <div
          className={`p-3 rounded-xl aegis-card transition-all duration-300 relative group ${getCardStatusBorder(
            isSignalAlert,
            isSignalWarn
          )}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-mono font-medium tracking-wide text-zinc-200 uppercase">
                Relay Link Quality
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                  telemetry.relayConnected
                    ? 'bg-zinc-900 text-zinc-300 border border-white/10'
                    : 'bg-red-950/80 text-red-300 border border-red-500/40 animate-pulse'
                }`}
              >
                {telemetry.relayConnected ? 'Locked' : 'LOS'}
              </span>
              <span className="font-mono text-[10px] text-zinc-600 font-bold">04</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xl font-syne font-bold text-white tracking-tight">
                {telemetry.signalStrengthDbm}{' '}
                <span className="text-xs font-normal text-zinc-500 font-mono">dBm</span>
              </span>
              <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                Loss:{' '}
                <span
                  className={
                    telemetry.packetLossPercent > 10 ? 'text-red-400 font-bold' : 'text-zinc-200'
                  }
                >
                  {telemetry.packetLossPercent}%
                </span>{' '}
                <span className="text-zinc-600">|</span> {telemetry.commLatencyMs}ms
              </div>
            </div>
            {renderSparkline(
              signalData,
              isSignalAlert ? '#f87171' : '#e4e4e7',
              'signal',
              -125,
              -60
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Mobility & Resource Dynamics Tier */}
    <div className="space-y-2 pt-0.5">
      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 px-0.5">
        <span className="uppercase tracking-wider font-semibold text-zinc-400">Locomotion & Operations Dynamics</span>
        <span className="text-[10px]">Traction / Velocity / Power Draw</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* 5. 6-WHEEL SLIP STATUS */}
        <div
          className={`p-3 rounded-xl aegis-card transition-all duration-300 relative group ${
            telemetry.wheelSlipAverage > 0.35 || telemetry.isStuck
              ? 'border-amber-500/40 bg-amber-950/15'
              : 'border-white/[0.08] hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-mono font-medium tracking-wide text-zinc-200 uppercase">
                6-Wheel Slip Status
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  telemetry.isStuck
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-zinc-900/90 text-zinc-400 border border-white/5'
                }`}
              >
                {telemetry.isStuck
                  ? 'Stuck'
                  : `${(telemetry.wheelSlipAverage * 100).toFixed(0)}% Avg`}
              </span>
              <span className="font-mono text-[10px] text-zinc-600 font-bold">05</span>
            </div>
          </div>

          {/* 6 mini wheel indicators */}
          <div className="grid grid-cols-6 gap-1 my-1.5">
            {telemetry.wheels.map((w) => (
              <div
                key={w.id}
                className={`flex flex-col items-center justify-center p-0.5 rounded border text-center transition-all ${
                  w.slipRatio > 0.6
                    ? 'border-red-500/70 bg-red-950/70 text-red-200 font-bold'
                    : w.slipRatio > 0.35
                    ? 'border-amber-500/70 bg-amber-950/70 text-amber-200 font-bold'
                    : 'border-white/5 bg-zinc-900/60 text-zinc-400'
                }`}
              >
                <span className="text-[8px] font-mono text-zinc-500">{w.id}</span>
                <span className="text-[9px] font-mono font-bold">
                  {(w.slipRatio * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>

          <div className="text-[10px] font-mono text-zinc-500 flex justify-between mt-1">
            <span>Draw: {telemetry.wheels[0]?.motorCurrent || 3.1}A</span>
            <span>Torque: {telemetry.wheels[0]?.torque || 28}Nm</span>
          </div>
        </div>

        {/* 6. SPEED & ATTITUDE */}
        <div
          className={`p-3 rounded-xl aegis-card transition-all duration-300 relative group ${
            telemetry.isStuck
              ? 'border-red-500/40 bg-red-950/15'
              : 'border-white/[0.08] hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-mono font-medium tracking-wide text-zinc-200 uppercase">
                Speed & Attitude
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900/90 text-zinc-400 border border-white/5">
                Slope: {telemetry.slopeAngle}°
              </span>
              <span className="font-mono text-[10px] text-zinc-600 font-bold">06</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xl font-syne font-bold text-white tracking-tight">
                {telemetry.speed.toFixed(3)}{' '}
                <span className="text-xs font-normal text-zinc-500 font-mono">m/s</span>
              </span>
              <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                Hdg: <strong className="text-zinc-200 font-medium">{telemetry.heading}°</strong> | Pitch:{' '}
                {telemetry.pitch}°
              </div>
            </div>
            {renderSparkline(speedData, '#e4e4e7', 'speed', 0, 0.15)}
          </div>
        </div>

        {/* 7. POWER CONSUMPTION */}
        <div
          className={`p-3 rounded-xl aegis-card transition-all duration-300 relative group ${getCardStatusBorder(
            isPowerAlert,
            isPowerWarn
          )}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-mono font-medium tracking-wide text-zinc-200 uppercase">
                Power Consumption
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                  telemetry.powerConsumptionWatts > 380
                    ? 'bg-amber-950/70 text-amber-300 border border-amber-500/40'
                    : 'bg-zinc-900/90 text-zinc-400 border border-white/5'
                }`}
              >
                {telemetry.powerConsumptionWatts > 380 ? 'High Draw' : 'Nominal'}
              </span>
              <span className="font-mono text-[10px] text-zinc-600 font-bold">07</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xl font-syne font-bold text-white tracking-tight">
                {telemetry.powerConsumptionWatts.toFixed(0)}{' '}
                <span className="text-xs font-normal text-zinc-500 font-mono">Watts</span>
              </span>
              <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                Discharge: <strong className="text-zinc-200 font-medium">{telemetry.batteryDischargeRate}W</strong>
              </div>
            </div>
            {renderSparkline(
              powerData,
              telemetry.powerConsumptionWatts > 380 ? '#fbbf24' : '#e4e4e7',
              'power',
              100,
              500
            )}
          </div>
        </div>

        {/* 8. MISSION PROGRESS */}
        <div className="p-3 rounded-xl aegis-card border border-white/[0.08] hover:border-white/20 transition-all relative group">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-mono font-medium tracking-wide text-zinc-200 uppercase">
                Mission Progress
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-white/10 font-bold">
                {telemetry.progressPercent}%
              </span>
              <span className="font-mono text-[10px] text-zinc-600 font-bold">08</span>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-syne font-bold text-white tracking-tight">
                {telemetry.distanceTraveledMeters.toFixed(1)}{' '}
                <span className="text-xs font-normal text-zinc-500 font-mono">m</span>
              </span>
              <span className="text-xs font-mono text-zinc-400 font-medium">
                {telemetry.distanceToTargetMeters}m rem
              </span>
            </div>
            <div className="w-full bg-zinc-800/80 h-1 rounded-full mt-2.5 overflow-hidden border border-white/5">
              <div
                className="bg-zinc-300 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, telemetry.progressPercent)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};
