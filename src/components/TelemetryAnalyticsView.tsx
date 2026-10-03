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

  // SVG Chart Generator with labels and grid
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
      <div className="p-4 rounded-xl border border-white/10 bg-[#0d121d]/90 backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            {title}
          </h4>
          <div className="flex items-center gap-3">
            {series.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-slate-300">{s.name}:</span>
                <strong className="text-white">
                  {s.data[s.data.length - 1] ?? 0}{s.unit}
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
                    stroke="rgba(255, 255, 255, 0.06)"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left - 6}
                    y={y + 3}
                    textAnchor="end"
                    fill="#64748b"
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
                  strokeWidth="2.2"
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
            HIGH-FREQUENCY SUBSYSTEM TELEMETRY ANALYTICS
          </h2>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Real-time digital sampling stream across avionics, mobility, thermal, and power buses.
          </p>
        </div>
        <span className="text-xs font-mono px-2 py-1 rounded bg-white/5 text-cyan-300 border border-white/10">
          BUFFER: {recentHistory.length} Ticks
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Power Subsystem Chart */}
        {renderMultiChart(
          [
            { name: 'Battery', data: recentHistory.map((h) => h.battery), color: '#00e5ff', unit: '%' },
            { name: 'Solar', data: recentHistory.map((h) => h.solar), color: '#eab308', unit: '%' },
          ],
          'Power Reserves: Battery State-of-Charge vs Solar Yield',
          0,
          100
        )}

        {/* Thermal Balance Chart */}
        {renderMultiChart(
          [
            { name: 'Motor Temp', data: recentHistory.map((h) => h.temperature), color: '#f97316', unit: '°C' },
            { name: 'Power Draw', data: recentHistory.map((h) => h.power / 5), color: '#a855f7', unit: ' (x5W)' },
          ],
          'Thermal-Electromechanical Correlation',
          -20,
          100
        )}

        {/* Mobility Dynamics Chart */}
        {renderMultiChart(
          [
            { name: 'Slip Ratio', data: recentHistory.map((h) => h.wheelSlip * 100), color: '#ef4444', unit: '%' },
            { name: 'Speed', data: recentHistory.map((h) => h.speed * 500), color: '#10b981', unit: ' (m/s*500)' },
          ],
          'Mobility & Traction Dynamics',
          0,
          100
        )}

        {/* Risk Trend Chart */}
        {renderMultiChart(
          [
            { name: 'Risk Score', data: recentHistory.map((h) => h.riskScore), color: '#ec4899', unit: '/100' },
            { name: 'Signal Link', data: recentHistory.map((h) => Math.max(0, h.signal + 120)), color: '#38bdf8', unit: ' dBm' },
          ],
          'Overall Mission Risk vs Downlink Carrier Quality',
          0,
          100
        )}
      </div>

      {/* Subsystem Technical Status Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-white/10 bg-[#0d121d]/80 text-xs font-mono">
          <div className="text-cyan-400 font-bold mb-2 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> ELECTRICAL BUS PROFILE
          </div>
          <div className="space-y-1 text-slate-300">
            <div className="flex justify-between"><span>Nominal Bus:</span> <span>{telemetry.batteryVoltage} V</span></div>
            <div className="flex justify-between"><span>Solar Output:</span> <span>{telemetry.solarGenerationWatts} W</span></div>
            <div className="flex justify-between"><span>Base Avionics Draw:</span> <span>120.0 W</span></div>
            <div className="flex justify-between"><span>Actuator Load:</span> <span>{(telemetry.powerConsumptionWatts - 120).toFixed(0)} W</span></div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-white/10 bg-[#0d121d]/80 text-xs font-mono">
          <div className="text-amber-400 font-bold mb-2 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" /> THERMAL LOOP METRICS
          </div>
          <div className="space-y-1 text-slate-300">
            <div className="flex justify-between"><span>Chassis Core:</span> <span>{telemetry.internalTemp}°C</span></div>
            <div className="flex justify-between"><span>Motor Average:</span> <span>{telemetry.motorAverageTemp}°C</span></div>
            <div className="flex justify-between"><span>Ambient Jezero:</span> <span>{telemetry.ambientTemp}°C</span></div>
            <div className="flex justify-between"><span>Heaters Loop:</span> <span>{telemetry.heatersActive ? 'ACTIVE' : 'STANDBY'}</span></div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-white/10 bg-[#0d121d]/80 text-xs font-mono">
          <div className="text-emerald-400 font-bold mb-2 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5" /> ROCKER-BOGIE MOBILITY
          </div>
          <div className="space-y-1 text-slate-300">
            <div className="flex justify-between"><span>Terrain Incline:</span> <span>{telemetry.slopeAngle}°</span></div>
            <div className="flex justify-between"><span>Terrain Roughness:</span> <span>{telemetry.roughnessIndex}</span></div>
            <div className="flex justify-between"><span>Average Slip:</span> <span>{(telemetry.wheelSlipAverage * 100).toFixed(0)}%</span></div>
            <div className="flex justify-between"><span>Drive Status:</span> <span>{telemetry.isStuck ? 'STALL SINKAGE' : 'TRACKING'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
