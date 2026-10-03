import React from 'react';
import { DEFAULT_HAZARD_CONFIGS } from '../engines/hazardEngine';
import { HazardRuleConfig, HazardType } from '../types/hazard';
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d121d] border border-white/10 rounded-2xl max-w-4xl w-full shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                AEGIS 9-VECTOR HAZARD DETECTION RULES MATRIX
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Modular rule-based engine specifications, thresholds, and autonomous mitigation protocols.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rules Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
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
                <tr key={rule.hazardType} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3 text-slate-400 font-bold">{idx + 1}</td>
                  <td className="py-3 px-3 font-semibold text-white">
                    {rule.hazardName}
                    <div className="text-[10px] text-slate-400 font-sans mt-0.5 max-w-xs">
                      {rule.description}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300 font-mono">
                      {rule.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-cyan-300 font-mono text-[11px]">
                    {rule.moderateThreshold !== undefined ? `Warn: ${rule.moderateThreshold}` : ''}
                    {rule.criticalThreshold !== undefined ? ` | Crit: ${rule.criticalThreshold}` : ''}
                  </td>
                  <td className="py-3 px-3 font-sans text-slate-300 text-[11px] max-w-xs">
                    {rule.defaultAction}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => onToggleRule(rule.hazardType)}
                      className={`px-2 py-1 text-[10px] rounded font-mono font-semibold transition-all ${
                        rule.enabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-red-500/20 text-red-300 border border-red-500/40'
                      }`}
                    >
                      {rule.enabled ? 'ACTIVE' : 'MUTED'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono font-semibold bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg transition-all"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
};
