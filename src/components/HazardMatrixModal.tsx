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
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0c0c11] border border-white/10 rounded-2xl max-w-4xl w-full p-6 overflow-y-auto max-h-[90vh] aegis-card shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-200">
              <Layers className="w-5 h-5 text-zinc-300" />
            </div>
            <div>
              <h2 className="text-sm font-syne font-bold text-white tracking-wide uppercase">
                AEGIS 9-Vector Hazard Detection Rules Matrix
              </h2>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Modular rule-based engine specifications, thresholds, and autonomous mitigation protocols.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFX.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all border border-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rules Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] text-zinc-500 text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Hazard Rule Vector</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Warning / Critical Threshold</th>
                <th className="py-2.5 px-3">Autonomous Mitigation Protocol</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-zinc-300">
              {rules.map((rule, idx) => (
                <tr key={rule.hazardType} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 text-zinc-600 font-bold">0{idx + 1}</td>
                  <td className="py-3 px-3 font-semibold text-zinc-100 flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        rule.enabled ? 'bg-zinc-200' : 'bg-zinc-700'
                      }`}
                    />
                    {rule.hazardName}
                  </td>
                  <td className="py-3 px-3 text-zinc-400 font-medium">{rule.category}</td>
                  <td className="py-3 px-3 text-zinc-400">{rule.description}</td>
                  <td className="py-3 px-3 text-zinc-300 font-sans text-xs">
                    {rule.defaultAction}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => {
                        soundFX.playClick();
                        onToggleRule(rule.hazardType);
                      }}
                      className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase transition-all ${
                        rule.enabled
                          ? 'bg-zinc-100 text-black'
                          : 'bg-zinc-900 text-zinc-500 border border-white/5'
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

        {/* Footer */}
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-4 mt-2 border-t border-white/5">
          <span>Continuous Evaluator Cycle: 100ms • Dynamic compounding risk enabled</span>
          <button
            onClick={() => {
              soundFX.playClick();
              onClose();
            }}
            className="px-3 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
};
