import React from 'react';
import { DEFAULT_HAZARD_CONFIGS } from '../engines/hazardEngine';
import { HazardRuleConfig, HazardType } from '../types/hazard';
import { soundFX } from '../utils/audio';
import { Layers, ShieldCheck, Sliders, X } from 'lucide-react';

interface HazardMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  configs: Record<HazardType, HazardRuleConfig>;
  onToggleRule: (type: HazardType) => void;
}

export const HazardMatrixModal: React.FC<HazardMatrixModalProps> = ({
  isOpen,
  onClose,
  configs,
  onToggleRule,
}) => {
  if (!isOpen) return null;

  const rules = Object.values(configs);

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#070b16] border border-cyan-500/50 rounded-2xl max-w-4xl w-full shadow-[0_0_40px_rgba(0,229,255,0.2)] p-6 overflow-y-auto max-h-[90vh] hud-panel-pro">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.3)]">
              <Layers className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-space font-bold text-white tracking-wide">
                AEGIS 9-Vector Hazard Detection Rules Matrix
              </h2>
              <p className="text-xs text-slate-400 font-space">
                Modular rule-based engine specifications, thresholds, and autonomous mitigation protocols.
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

        {/* Rules Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-space border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 text-[11px]">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Hazard Rule Vector</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Warning / Critical Threshold</th>
                <th className="py-2.5 px-3">Autonomous Mitigation Protocol</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {rules.map((rule, idx) => (
                <tr key={rule.hazardType} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 text-slate-500 font-bold">{idx + 1}</td>
                  <td className="py-3 px-3 font-semibold text-slate-100 flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        rule.enabled ? 'bg-cyan-400 shadow-[0_0_6px_#00e5ff]' : 'bg-slate-600'
                      }`}
                    />
                    {rule.hazardName}
                  </td>
                  <td className="py-3 px-3 text-cyan-400 font-semibold">{rule.category}</td>
                  <td className="py-3 px-3 text-amber-300/90">{rule.description}</td>
                  <td className="py-3 px-3 text-slate-300 font-space text-xs">
                    {rule.defaultAction}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => {
                        soundFX.playClick();
                        onToggleRule(rule.hazardType);
                      }}
                      className={`px-3 py-1 rounded-full text-[10px] font-space font-bold transition-all ${
                        rule.enabled
                          ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                          : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-space">
          <span>Active Rules: {rules.filter((r) => r.enabled).length} / 9</span>
          <span>Click any rule status pill to toggle live evaluation in simulation</span>
        </div>
      </div>
    </div>
  );
};
