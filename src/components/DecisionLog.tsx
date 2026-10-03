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
        return 'bg-red-500/15 text-red-300 border-red-500/40';
      case 'DECISION':
        return 'bg-zinc-800 text-zinc-200 border-white/10';
      case 'SCENARIO':
        return 'bg-purple-950/50 text-purple-300 border-purple-500/30';
      case 'MODE_CHANGE':
        return 'bg-amber-950/50 text-amber-300 border-amber-500/30';
      default:
        return 'bg-zinc-900 text-zinc-400 border-white/5';
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
    <div className="rounded-2xl aegis-card p-4 flex flex-col h-full border border-white/[0.08]">
      {/* Log Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-white/[0.08]">
        <div className="flex items-baseline gap-2.5">
          <span className="editorial-num">04.</span>
          <h3 className="font-syne font-bold text-xs tracking-wider uppercase text-zinc-100">
            Autonomous Decision & Event Stream
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-white/10 font-semibold">
            {filteredLogs.length} / {logs.length}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportJson}
            className="px-2.5 py-1 text-[11px] font-mono rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 flex items-center gap-1.5 transition-all font-medium"
            title="Download complete JSON mission telemetry and event log"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" /> Export JSON
          </button>
        </div>
      </div>

      {/* Prominent Recent Autonomous Decision Card */}
      {recentDecision && (
        <div className="mb-3 p-3.5 rounded-xl border border-white/15 bg-zinc-900/60 relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
              <span className="text-[11px] font-mono font-medium text-zinc-200 uppercase tracking-wide">
                Most Recent Autonomous Decision
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {recentDecision.time} (Confidence: <strong className="text-zinc-200">{recentDecision.confidencePercent}%</strong>)
            </span>
          </div>

          <div className="text-xs font-bold font-mono text-white mb-1">
            {recentDecision.actionTaken}
          </div>

          <p className="text-[11.5px] text-zinc-300 font-sans leading-relaxed mb-2">
            {recentDecision.rationale}
          </p>

          <div className="flex flex-wrap gap-2 text-[10px] font-mono text-zinc-400 pt-1.5 border-t border-white/5">
            <span>
              Target Mode: <strong className="text-zinc-200">{recentDecision.recommendedMode}</strong>
            </span>
            <span>•</span>
            <span>
              Trigger: <strong className="text-amber-300">{recentDecision.triggerHazard || 'NOMINAL'}</strong>
            </span>
            <span>•</span>
            <span>
              Current Mode: <strong className="text-zinc-200">{recentDecision.operationalMode}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 border-b border-white/[0.06] font-mono text-[11px]">
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
            className={`px-3 py-1 rounded-full transition-all font-medium shrink-0 ${
              selectedCategory === item.key
                ? 'bg-zinc-100 text-black font-bold'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Real-Time Event Log Stream */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] pr-1 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-zinc-500">
            No event logs found for this filter criteria.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-2.5 rounded-xl border border-white/[0.06] bg-zinc-900/40 hover:border-white/20 transition-all"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-400 font-medium">{log.time}</span>
                  <span
                    className={`text-[9.5px] px-2 py-0.5 rounded border uppercase font-medium ${getCategoryBadge(
                      log.category
                    )}`}
                  >
                    {log.category}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500">
                  Source: {log.source}
                </span>
              </div>

              <div className="font-bold text-zinc-200 text-[11px] mb-0.5">{log.title}</div>
              <p className="text-[10.5px] text-zinc-400 font-sans leading-relaxed">
                {log.description}
              </p>

              {log.recommendedAction && (
                <div className="mt-1.5 pt-1 border-t border-white/5 text-[10px] text-zinc-400 font-sans">
                  <strong className="text-zinc-300 font-mono font-semibold uppercase">Action:</strong> {log.recommendedAction}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
