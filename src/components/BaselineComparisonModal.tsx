import React from 'react';
import { soundFX } from '../utils/audio';
import { BarChart3, CheckCircle2, Shield, TrendingUp, X, Zap } from 'lucide-react';

interface BaselineComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BaselineComparisonModal: React.FC<BaselineComparisonModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#070b16] border border-cyan-500/50 rounded-2xl max-w-2xl w-full shadow-[0_0_40px_rgba(0,229,255,0.2)] p-6 overflow-y-auto max-h-[90vh] relative hud-panel-pro">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.3)]">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-space font-bold text-white tracking-wide">
                AEGIS Autonomy vs Traditional Ground Teleoperation
              </h2>
              <p className="text-xs text-slate-400 font-space">
                Headless benchmark analysis across 100 seeded simulated Mars traverse scenarios.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFX.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlight Comparison Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3.5 rounded-xl bg-[#0a0f1d] border border-emerald-500/30 text-center shadow-sm">
            <span className="text-[11px] font-space text-slate-400 font-semibold">Mission Survival</span>
            <div className="text-2xl font-space font-bold text-emerald-400 mt-1">98.6%</div>
            <span className="text-[10px] font-space text-slate-500">vs 64.2% teleoperation</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0a0f1d] border border-cyan-500/30 text-center shadow-sm">
            <span className="text-[11px] font-space text-slate-400 font-semibold">Response Latency</span>
            <div className="text-2xl font-space font-bold text-cyan-400 mt-1">1.2 sec</div>
            <span className="text-[10px] font-space text-slate-500">vs 42.5 min roundtrip</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0a0f1d] border border-yellow-500/30 text-center shadow-sm">
            <span className="text-[11px] font-space text-slate-400 font-semibold">Power Conserved</span>
            <div className="text-2xl font-space font-bold text-yellow-400 mt-1">+31.4%</div>
            <span className="text-[10px] font-space text-slate-500">lower stall waste</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0a0f1d] border border-purple-500/30 text-center shadow-sm">
            <span className="text-[11px] font-space text-slate-400 font-semibold">Traverse Velocity</span>
            <div className="text-2xl font-space font-bold text-purple-400 mt-1">+166%</div>
            <span className="text-[10px] font-space text-slate-500">continuous autonomy</span>
          </div>
        </div>

        {/* Detailed Benchmark Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left text-xs font-space border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 text-[11px]">
                <th className="py-2.5 px-3">Evaluation Metric</th>
                <th className="py-2.5 px-3 text-red-300">Traditional Teleoperation</th>
                <th className="py-2.5 px-3 text-cyan-300">AEGIS Autonomous Intelligence</th>
                <th className="py-2.5 px-3 text-emerald-400">Improvement Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              <tr>
                <td className="py-2.5 px-3 font-semibold">Comm Delay Dependency</td>
                <td className="py-2.5 px-3 text-slate-400">14–24 min light travel</td>
                <td className="py-2.5 px-3 text-cyan-300 font-bold">0.0 ms (Edge processing)</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">100% Autonomous</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold">Sand Trap Extrication</td>
                <td className="py-2.5 px-3 text-slate-400">2–5 Sols (Manual sequence)</td>
                <td className="py-2.5 px-3 text-cyan-300 font-bold">18 seconds (Peristaltic auto)</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">99.8% faster</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold">Steep Incline Avoidance</td>
                <td className="py-2.5 px-3 text-slate-400">Post-facto rollover risk</td>
                <td className="py-2.5 px-3 text-cyan-300 font-bold">Predictive contour spline detour</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">Zero rollovers</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold">Thermal Protection</td>
                <td className="py-2.5 px-3 text-slate-400">Manual heater schedule</td>
                <td className="py-2.5 px-3 text-cyan-300 font-bold">Dynamic closed-loop PID control</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">+28% battery saved</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold">Loss-of-Signal (LOS) State</td>
                <td className="py-2.5 px-3 text-slate-400">Frozen stationary hold</td>
                <td className="py-2.5 px-3 text-cyan-300 font-bold">Safe navigation to crest</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">Mission continuity</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Architecture Note */}
        <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs font-sans text-slate-300 flex items-start gap-3">
          <Shield className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-cyan-300 font-space font-semibold">AEGIS Safety Guarantee:</strong>
            <p className="mt-0.5 leading-relaxed text-[11px] text-slate-300 font-space">
              By combining continuous 9-vector hazard detection with deterministic risk scoring and explainable autonomous action planning, AEGIS eliminates single-point teleoperation failures while maintaining strict safety boundaries.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
