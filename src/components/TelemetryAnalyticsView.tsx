import React from 'react';
import { RoverTelemetry, TelemetryHistoryPoint } from '../types/telemetry';
import { Activity, Battery, Flame, Gauge, Radio, Sun, Zap } from 'lucide-react';

interface TelemetryAnalyticsViewProps {
  telemetry: RoverTelemetry;
  history: TelemetryHistoryPoint[];
}

export const TelemetryAnalyticsView: React.FC<TelemetryAnalyticsViewProps> = ({
  telemetry,
  history,
}) => {
  const recentHistory = history.slice(-40);

  // SVG Chart Generator with clean labels and grid
  const renderMultiChart = (
    series: { name: string; data: number[]; color: string; unit: string }[],
    title: string,
    minY: number,
    maxY: number
  ) => {
    const width = 500;
    const height = 160;
    const padding = { top: 20, right: 30, bottom: 25, left: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const range = maxY - minY || 1;

    return (
      <div className="p-4 rounded-2xl aegis-card border border-white/[0.08]">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-syne font-bold text-xs text-white uppercase tracking-wider">
            {title}
          </h4>
          <div className="flex items-center gap-3">
            {series.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 text-[11px] font-mono">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-zinc-400">{s.name}:</span>
                <strong className="text-white font-bold">
                  {s.data[s.data.length - 1] ?? 0}
                  {s.unit}
                </strong>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[380px]">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = padding.top + chartH * (1 - pct);
              const val = minY + range * pct;
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeDasharray="2 3"
                  />
                  <text
                    x={padding.left - 6}
                    y={y + 3}
                    textAnchor="end"
                    fill="#71717a"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {val.toFixed(0)}
                  </text>
                </g>
              );
            })}

            {/* Series Polylines */}
            {series.map((s) => {
              if (s.data.length < 2) return null;
              const points = s.data
                .map((val, idx) => {
                  const x = padding.left + (idx / (s.data.length - 1)) * chartW;
                  const y = padding.top + chartH - ((val - minY) / range) * chartH;
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(' ');

              return (
                <polyline
                  key={s.name}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points}
                />
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="p-4 rounded-2xl aegis-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-white/[0.08]">
        <div>
          <div className="flex items-baseline gap-2.5">
            <span className="editorial-num">02.</span>
            <h2 className="font-syne font-bold text-xs tracking-wider uppercase text-zinc-100">
              High-Frequency Subsystem Telemetry Analytics
            </h2>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            Multi-vector time-series trend analysis buffer over the last 60 simulation cycles.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300">
            Buffer: {history.length} pts
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 font-bold">
            Sampling: 1000ms
          </span>
        </div>
      </div>

      {/* 2x2 Grid of Subsystem Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Power Dynamics */}
        {renderMultiChart(
          [
            {
              name: 'Battery SOC',
              data: recentHistory.map((h) => Number(h.battery.toFixed(1))),
              color: '#ffffff',
              unit: '%',
            },
            {
              name: 'Solar Eff.',
              data: recentHistory.map((h) => Number(h.solar.toFixed(1))),
              color: '#f59e0b',
              unit: '%',
            },
          ],
          'Power & Storage (Battery SOC vs Solar Efficiency)',
          0,
          100
        )}

        {/* Chart 2: Thermal Management */}
        {renderMultiChart(
          [
            {
              name: 'Motors',
              data: recentHistory.map((h) => Number(h.temperature.toFixed(1))),
              color: '#fb923c',
              unit: '°C',
            },
          ],
          'Thermal Equilibrium (Drive Motors Temperature)',
          -20,
          90
        )}

        {/* Chart 3: Locomotion & Slip */}
        {renderMultiChart(
          [
            {
              name: 'Traverse Speed',
              data: recentHistory.map((h) => Number((h.speed * 100).toFixed(1))),
              color: '#e4e4e7',
              unit: 'cm/s',
            },
            {
              name: 'Avg Slip',
              data: recentHistory.map((h) => Number((h.wheelSlip * 100).toFixed(0))),
              color: '#f87171',
              unit: '%',
            },
          ],
          'Locomotion Dynamics (Speed cm/s vs Slip %)',
          0,
          100
        )}

        {/* Chart 4: Comm Relay & Mission Risk */}
        {renderMultiChart(
          [
            {
              name: 'Mission Risk Score',
              data: recentHistory.map((h) => h.riskScore),
              color: '#c084fc',
              unit: 'pts',
            },
          ],
          'Dynamic Risk Score Over Time',
          0,
          100
        )}
      </div>

      {/* Numerical Subsystem Summary Table */}
      <div className="p-4 rounded-2xl aegis-card border border-white/[0.08] overflow-x-auto">
        <h3 className="font-syne font-bold text-xs text-white uppercase tracking-wider mb-3">
          Instantaneous Sensor Telemetry Summary Matrix
        </h3>
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="border-b border-white/[0.08] text-zinc-500 text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-3">Subsystem Metric</th>
              <th className="py-2.5 px-3">Current Value</th>
              <th className="py-2.5 px-3">Nominal Range</th>
              <th className="py-2.5 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <tr>
              <td className="py-2.5 px-3 text-zinc-300 font-semibold">Battery State of Charge</td>
              <td className="py-2.5 px-3 text-white font-bold">{telemetry.batteryLevel.toFixed(1)}% ({telemetry.batteryVoltage}V)</td>
              <td className="py-2.5 px-3 text-zinc-400">&gt; 25% (Critical: &lt; 15%)</td>
              <td className="py-2.5 px-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${telemetry.batteryLevel > 25 ? 'bg-zinc-900 text-zinc-300 border border-white/10' : 'bg-red-950/80 text-red-300 border border-red-500/40'}`}>
                  {telemetry.batteryLevel > 25 ? 'Nominal' : 'Warning'}
                </span>
              </td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 text-zinc-300 font-semibold">Drive Motor Temperature</td>
              <td className="py-2.5 px-3 text-white font-bold">{telemetry.motorAverageTemp.toFixed(1)}°C</td>
              <td className="py-2.5 px-3 text-zinc-400">-40°C to +50°C (Limit: 68°C)</td>
              <td className="py-2.5 px-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${telemetry.motorAverageTemp < 50 ? 'bg-zinc-900 text-zinc-300 border border-white/10' : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'}`}>
                  {telemetry.motorAverageTemp < 50 ? 'Nominal' : 'High'}
                </span>
              </td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 text-zinc-300 font-semibold">Rocker-Bogie Wheel Slip</td>
              <td className="py-2.5 px-3 text-white font-bold">{(telemetry.wheelSlipAverage * 100).toFixed(0)}%</td>
              <td className="py-2.5 px-3 text-zinc-400">&lt; 35% (Stall: &gt; 60%)</td>
              <td className="py-2.5 px-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${telemetry.wheelSlipAverage < 0.35 ? 'bg-zinc-900 text-zinc-300 border border-white/10' : 'bg-red-950/80 text-red-300 border border-red-500/40'}`}>
                  {telemetry.wheelSlipAverage < 0.35 ? 'Traction OK' : 'Slip Critical'}
                </span>
              </td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 text-zinc-300 font-semibold">Relay Comm Signal</td>
              <td className="py-2.5 px-3 text-white font-bold">{telemetry.signalStrengthDbm} dBm ({telemetry.packetLossPercent}% loss)</td>
              <td className="py-2.5 px-3 text-zinc-400">&gt; -92 dBm (LOS: &lt; -108 dBm)</td>
              <td className="py-2.5 px-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${telemetry.relayConnected ? 'bg-zinc-900 text-zinc-300 border border-white/10' : 'bg-red-950/80 text-red-300 border border-red-500/40'}`}>
                  {telemetry.relayConnected ? 'Locked' : 'LOS'}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
