import React, { useState } from 'react';
import { AutonomousDecision } from '../engines/decisionEngine';
import { LogCategory, LogEntry } from '../types/log';
import { soundFX } from '../utils/audio';
import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle,
  Clock,
  Compass,
  FileText,
  Filter,
  Flame,
  Radio,
  Sparkles,
  Zap,
} from 'lucide-react';

interface DecisionLogProps {
  logs: LogEntry[];
  recentDecision: AutonomousDecision | null;
  onClearLogs: () => void;
}

export const DecisionLog: React.FC<DecisionLogProps> = ({
  logs,
  recentDecision,
  onClearLogs,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | 'ALL'>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const filteredLogs = logs.filter((l) => {
    if (selectedCategory !== 'ALL' && l.category !== selectedCategory) return false;
    if (filterSeverity !== 'ALL' && l.severity !== filterSeverity) return false;
    return true;
  });

  const getCategoryBadge = (cat: LogCategory) => {
    switch (cat) {
      case 'HAZARD':
        return 'bg-red-500/20 text-red-300 border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.3)]';
      case 'DECISION':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_8px_rgba(0,229,255,0.2)]';
      case 'SCENARIO':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'MODE_CHANGE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  const exportJson = () => {
    soundFX.playClick();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `aegis-mission-log-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="rounded-2xl hud-panel-pro p-4 shadow-xl flex flex-col h-full border border-white/10">
      {/* Log Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-cyan-400" />
          <h3 className="font-space font-semibold text-xs tracking-wider text-white">
            Autonomous Decision & Event Stream
          </h3>
          <span className="text-[10px] font-space px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">
            {filteredLogs.length} / {logs.length} Records
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportJson}
            className="px-2.5 py-1 text-[11px] font-space rounded-lg bg-white/5 hover:bg-cyan-500/10 text-slate-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/30 flex items-center gap-1.5 transition-all font-semibold"
            title="Download complete JSON mission telemetry and event log"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-cyan-400" /> Export JSON
          </button>
        </div>
      </div>

      {/* Prominent Recent Autonomous Decision Card */}
      {recentDecision && (
        <div className="mb-3 p-3.5 rounded-xl border border-cyan-500/50 bg-gradient-to-r from-cyan-950/40 via-[#0a1222] to-[#060913] shadow-[0_0_20px_rgba(0,229,255,0.15)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-[11px] font-space font-semibold text-cyan-300 tracking-wide">
                Most Recent Autonomous Decision
              </span>
            </div>
            <span className="text-[10px] font-space text-slate-400">
              {recentDecision.time} (Confidence: <strong className="text-emerald-400">{recentDecision.confidencePercent}%</strong>)
            </span>
          </div>

          <div className="text-xs font-bold font-mono text-white mb-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            {recentDecision.actionTaken}
          </div>

          <p className="text-[11.5px] text-slate-300 font-sans leading-relaxed mb-2">
            {recentDecision.rationale}
          </p>

          <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-400 pt-1.5 border-t border-white/5">
            <span>
              Target Mode: <strong className="text-cyan-300">{recentDecision.recommendedMode}</strong>
            </span>
            <span>•</span>
            <span>
              Trigger: <strong className="text-amber-300">{recentDecision.triggerHazard || 'NOMINAL'}</strong>
            </span>
            <span>•</span>
            <span>
              Current Mode: <strong className="text-cyan-300">{recentDecision.operationalMode}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 border-b border-white/5 font-space text-[11px]">
        {[
          { key: 'ALL', label: 'All Logs' },
          { key: 'DECISION', label: 'Decisions' },
          { key: 'HAZARD', label: 'Hazards' },
          { key: 'SCENARIO', label: 'Scenarios' },
          { key: 'MODE_CHANGE', label: 'Mode Changes' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => {
              soundFX.playClick();
              setSelectedCategory(item.key as any);
            }}
            className={`px-3 py-1 rounded-full transition-all font-semibold shrink-0 ${
              selectedCategory === item.key
                ? 'bg-cyan-500 text-black shadow-[0_0_8px_rgba(0,229,255,0.4)]'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Real-Time Terminal Event Log Stream */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] pr-1 font-space text-xs">
        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-slate-500">
            No event logs found for this filter criteria.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-2.5 rounded-xl border border-white/5 bg-[#070b14]/70 hover:border-cyan-500/30 transition-all"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-semibold">{log.time}</span>
                  <span
                    className={`text-[9.5px] px-2 py-0.5 rounded border font-semibold ${getCategoryBadge(
                      log.category
                    )}`}
                  >
                    {log.category}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-space">
                  Source: {log.source}
                </span>
              </div>

              <div className="font-bold text-slate-200 text-[11px] mb-0.5">{log.title}</div>
              <p className="text-[10.5px] text-slate-400 font-sans leading-relaxed">
                {log.description}
              </p>

              {log.recommendedAction && (
                <div className="mt-1.5 pt-1 border-t border-white/5 text-[10px] text-amber-300/90 font-sans">
                  <strong className="text-amber-400 font-space font-semibold">Action:</strong> {log.recommendedAction}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
